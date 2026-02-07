import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await req.json();
    if (!projectId) {
      return Response.json({ error: 'projectId required' }, { status: 400 });
    }

    // Fetch project
    const projects = await base44.entities.Project.filter({ id: projectId });
    const project = projects[0];
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch all financial data
    const [budgetLines, expenses, sovItems, changeOrders, estimatedCosts, costCodes] = await Promise.all([
      base44.entities.Financial.filter({ project_id: projectId }),
      base44.entities.Expense.filter({ project_id: projectId }),
      base44.entities.SOVItem.filter({ project_id: projectId }),
      base44.entities.ChangeOrder.filter({ project_id: projectId }),
      base44.entities.EstimatedCostToComplete.filter({ project_id: projectId }),
      base44.entities.CostCode.list()
    ]);

    const warnings = [];
    if (budgetLines.length === 0) warnings.push('No budget lines found');
    if (expenses.length === 0) warnings.push('No expenses recorded');
    if (sovItems.length === 0) warnings.push('No SOV items found');

    // Calculate snapshot metrics
    const currentBudget = budgetLines.reduce((sum, b) => sum + (Number(b.current_budget) || 0), 0);
    const actualToDate = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const committed = budgetLines.reduce((sum, b) => sum + (Number(b.committed_amount) || 0), 0);
    const totalETC = estimatedCosts.reduce((sum, etc) => sum + (Number(etc.estimated_remaining_cost) || 0), 0);
    const eac = actualToDate + totalETC;
    const projectedOverUnder = currentBudget - eac;

    // Calculate burn rate (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentExpenses = expenses.filter(e => e.expense_date && new Date(e.expense_date) >= thirtyDaysAgo);
    const actualDays = Math.min(30, Math.ceil((Date.now() - thirtyDaysAgo.getTime()) / (24 * 60 * 60 * 1000)));
    const burnRate = actualDays > 0 ? recentExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) / actualDays : 0;

    // Breakdown by category
    const categories = ['labor', 'material', 'equipment', 'subcontract', 'other'];
    const byCategory = categories.map(cat => {
      const catBudget = budgetLines.filter(b => b.category === cat);
      const catExpenses = expenses.filter(e => e.category === cat);
      const catETC = estimatedCosts.filter(etc => etc.category === cat);

      const budget = catBudget.reduce((sum, b) => sum + (Number(b.current_budget) || 0), 0);
      const actual = catExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const committedAmt = catBudget.reduce((sum, b) => sum + (Number(b.committed_amount) || 0), 0);
      const etc = catETC.reduce((sum, e) => sum + (Number(e.estimated_remaining_cost) || 0), 0);
      const forecast = actual + etc;
      const variance = budget - forecast;
      const variancePct = budget > 0 ? (variance / budget) * 100 : 0;

      return {
        category: cat,
        budget,
        actual,
        committed: committedAmt,
        forecast,
        variance,
        variancePct
      };
    });

    // Top cost codes
    const costCodeMap = new Map();
    budgetLines.forEach(b => {
      const ccId = b.cost_code_id;
      if (!ccId) return;
      
      if (!costCodeMap.has(ccId)) {
        const cc = costCodes.find(c => c.id === ccId);
        costCodeMap.set(ccId, {
          code: cc?.code || 'Unknown',
          name: cc?.name || 'Unknown',
          budget: 0,
          actual: 0,
          committed: 0,
          forecast: 0,
          variance: 0,
          variancePct: 0
        });
      }
      
      const entry = costCodeMap.get(ccId);
      entry.budget += Number(b.current_budget) || 0;
      entry.committed += Number(b.committed_amount) || 0;
    });

    expenses.forEach(e => {
      const ccId = e.cost_code_id;
      if (!ccId || !costCodeMap.has(ccId)) return;
      const entry = costCodeMap.get(ccId);
      entry.actual += Number(e.amount) || 0;
    });

    estimatedCosts.forEach(etc => {
      const budgetLine = budgetLines.find(b => b.id === etc.financial_id);
      if (!budgetLine || !budgetLine.cost_code_id) return;
      const ccId = budgetLine.cost_code_id;
      if (!costCodeMap.has(ccId)) return;
      const entry = costCodeMap.get(ccId);
      entry.forecast += Number(etc.estimated_remaining_cost) || 0;
    });

    const byCostCodeTop = Array.from(costCodeMap.values())
      .map(entry => {
        entry.forecast = entry.actual + entry.forecast;
        entry.variance = entry.budget - entry.forecast;
        entry.variancePct = entry.budget > 0 ? (entry.variance / entry.budget) * 100 : 0;
        return entry;
      })
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
      .slice(0, 10);

    // Billing metrics
    const contractValue = sovItems.reduce((sum, s) => sum + (Number(s.scheduled_value) || 0), 0);
    const approvedCOs = changeOrders.filter(co => co.status === 'approved');
    const approvedCOsValue = approvedCOs.reduce((sum, co) => sum + (Number(co.cost_impact) || 0), 0);
    const totalContractValue = contractValue + approvedCOsValue;
    
    const earnedToDate = sovItems.reduce((sum, s) => 
      sum + ((Number(s.scheduled_value) || 0) * ((Number(s.percent_complete) || 0) / 100)), 0);
    
    const billedToDate = sovItems.reduce((sum, s) => sum + (Number(s.billed_to_date) || 0), 0);
    const remainingToBill = totalContractValue - billedToDate;
    const underOverBilled = billedToDate - earnedToDate;

    // AI analysis
    const overrunDrivers = byCostCodeTop
      .filter(cc => cc.variance < 0 && Math.abs(cc.variance) > 1000)
      .slice(0, 5)
      .map(cc => ({
        costCode: cc.code,
        name: cc.name,
        overrun: Math.abs(cc.variance),
        reason: cc.variancePct < -20 ? 'Severe overrun' : 'Moderate overrun'
      }));

    const biggestDriver = overrunDrivers[0] || null;
    const portfolioHealth = projectedOverUnder >= 0 ? 'on_track' : 
                            projectedOverUnder > -currentBudget * 0.05 ? 'at_risk' : 'critical';

    const aiSummary = {
      direction: portfolioHealth === 'on_track' ? 'Budget tracking well' :
                 portfolioHealth === 'at_risk' ? 'Minor budget pressure' : 'Critical budget overrun',
      biggestDriver: biggestDriver ? `${biggestDriver.costCode}: $${biggestDriver.overrun.toLocaleString()} over` : 'None',
      risk: portfolioHealth,
      confidence: estimatedCosts.length > 5 ? 'high' : estimatedCosts.length > 0 ? 'medium' : 'low'
    };

    const aiDrivers = overrunDrivers.map(d => ({
      driver: `Cost code ${d.costCode} overrun`,
      impactedAmount: d.overrun,
      reason: d.reason,
      severity: d.overrun > currentBudget * 0.1 ? 'critical' : 'high'
    }));

    const aiActions = [
      overrunDrivers.length > 0 && {
        action: 'Review cost control on overrun cost codes',
        owner: 'Project Manager',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        impact: 'Prevent further overruns',
        priority: 'high'
      },
      estimatedCosts.length === 0 && {
        action: 'Complete ETC estimates for all cost codes',
        owner: 'Finance Team',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        impact: 'Improve forecast accuracy',
        priority: 'medium'
      },
      underOverBilled < -totalContractValue * 0.05 && {
        action: 'Accelerate billing to reduce underbilling',
        owner: 'Billing Team',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        impact: 'Improve cashflow',
        priority: 'high'
      }
    ].filter(Boolean);

    const missingDataReasons = [];
    if (budgetLines.length === 0) missingDataReasons.push('No budget established');
    if (expenses.length === 0) missingDataReasons.push('No expenses recorded');
    if (estimatedCosts.length === 0) missingDataReasons.push('No ETC forecasts');

    // Data integrity checks
    const integrityWarnings = [];
    const budgetsWithoutCostCode = budgetLines.filter(b => !b.cost_code_id);
    if (budgetsWithoutCostCode.length > 0) {
      integrityWarnings.push(`${budgetsWithoutCostCode.length} budget lines missing cost code`);
    }
    
    const expensesWithoutCostCode = expenses.filter(e => !e.cost_code_id);
    if (expensesWithoutCostCode.length > 0) {
      integrityWarnings.push(`${expensesWithoutCostCode.length} expenses missing cost code`);
    }

    const negativeAmounts = expenses.filter(e => Number(e.amount) < 0);
    if (negativeAmounts.length > 0) {
      integrityWarnings.push(`${negativeAmounts.length} expenses with negative amounts`);
    }

    return Response.json({
      project: {
        id: project.id,
        project_number: project.project_number,
        name: project.name,
        contract_value: Number(project.contract_value) || totalContractValue
      },
      snapshot: {
        currentBudget,
        actualToDate,
        committed,
        eac,
        projectedOverUnder,
        burnRate
      },
      breakdown: {
        byCategory,
        byCostCodeTop
      },
      billing: {
        contractValue: totalContractValue,
        earnedToDate,
        billedToDate,
        remainingToBill,
        underOverBilled
      },
      ai: {
        summary: aiSummary,
        drivers: aiDrivers,
        actions: aiActions,
        confidence: aiSummary.confidence,
        missingDataReasons
      },
      warnings,
      integrityWarnings,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('getFinancialsDashboardData error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});