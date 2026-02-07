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

    // Fetch all cost control data
    const [budgetLines, expenses, costCodes, estimatedCosts] = await Promise.all([
      base44.entities.Financial.filter({ project_id: projectId }),
      base44.entities.Expense.filter({ project_id: projectId }),
      base44.entities.CostCode.list(),
      base44.entities.EstimatedCostToComplete.filter({ project_id: projectId })
    ]);

    const warnings = [];
    if (budgetLines.length === 0) warnings.push('No budget lines established');
    if (expenses.length === 0) warnings.push('No expenses recorded');
    if (costCodes.length === 0) warnings.push('Cost codes not initialized');

    // Build cost code map
    const ccMap = new Map();
    costCodes.forEach(cc => ccMap.set(cc.id, cc));

    // Calculate snapshot metrics
    const currentBudget = budgetLines.reduce((sum, b) => sum + (Number(b.current_budget) || 0), 0);
    const actualToDate = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const committed = budgetLines.reduce((sum, b) => sum + (Number(b.committed_amount) || 0), 0);
    const totalETC = estimatedCosts.reduce((sum, etc) => sum + (Number(etc.estimated_remaining_cost) || 0), 0);
    const eac = actualToDate + totalETC;
    const projectedVariance = currentBudget - eac;
    const budgetRemaining = currentBudget - actualToDate;
    const committedRemaining = committed - actualToDate;

    // Spend velocity (last 7 and 30 days)
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    
    const last7DaysExpenses = expenses.filter(e => e.expense_date && new Date(e.expense_date) >= sevenDaysAgo);
    const last30DaysExpenses = expenses.filter(e => e.expense_date && new Date(e.expense_date) >= thirtyDaysAgo);
    
    const spendVelocity7d = last7DaysExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) / 7;
    const spendVelocity30d = last30DaysExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) / 30;

    // Build budget lines with variance
    const lines = budgetLines.map(b => {
      const cc = ccMap.get(b.cost_code_id);
      const ccExpenses = expenses.filter(e => e.cost_code_id === b.cost_code_id);
      const actual = ccExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const ccETC = estimatedCosts.find(etc => etc.category === b.category && etc.project_id === projectId);
      const etc = Number(ccETC?.estimated_remaining_cost) || 0;
      const forecast = actual + etc;
      const variance = Number(b.current_budget) - forecast;

      const flags = [];
      if (!b.cost_code_id) flags.push('Missing Budget');
      if (actual === 0 && Number(b.current_budget) > 0) flags.push('No Actuals');
      if (variance < 0) flags.push('Over Budget');
      if (Number(b.committed_amount) > Number(b.current_budget) * 0.8) flags.push('Commit Spike');
      if (forecast > Number(b.current_budget)) flags.push('Forecast Risk');

      return {
        id: b.id,
        costCode: cc?.code || 'Unknown',
        costCodeName: cc?.name || 'Unknown',
        category: b.category,
        original: Number(b.original_budget) || 0,
        changes: Number(b.approved_changes) || 0,
        current: Number(b.current_budget) || 0,
        actual,
        committed: Number(b.committed_amount) || 0,
        etc,
        forecast,
        variance,
        variancePct: Number(b.current_budget) > 0 ? (variance / Number(b.current_budget)) * 100 : 0,
        flags
      };
    });

    // Variance drivers
    const overBudget = lines
      .filter(l => l.variance < 0)
      .sort((a, b) => a.variance - b.variance)
      .slice(0, 5)
      .map(l => ({
        costCode: l.costCode,
        name: l.costCodeName,
        overrun: Math.abs(l.variance),
        variancePct: l.variancePct
      }));

    const trendingUp = lines
      .filter(l => l.forecast > l.current && l.current > 0)
      .sort((a, b) => (b.forecast - b.current) - (a.forecast - a.current))
      .slice(0, 5)
      .map(l => ({
        costCode: l.costCode,
        name: l.costCodeName,
        risk: l.forecast - l.current,
        forecastedOverrun: l.forecast > l.current ? l.forecast - l.current : 0
      }));

    const unallocated = expenses
      .filter(e => !e.cost_code_id)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Commitments by category
    const commitmentsByCategory = ['labor', 'material', 'equipment', 'subcontract', 'other'].map(cat => {
      const catLines = budgetLines.filter(b => b.category === cat);
      const committed = catLines.reduce((sum, b) => sum + (Number(b.committed_amount) || 0), 0);
      return { category: cat, committed };
    });

    // Top commitments by value
    const topCommitments = lines
      .filter(l => l.committed > 0)
      .sort((a, b) => b.committed - a.committed)
      .slice(0, 5)
      .map(l => ({
        costCode: l.costCode,
        name: l.costCodeName,
        committed: l.committed,
        actual: l.actual,
        exposure: l.committed - l.actual
      }));

    // AI analysis
    const aiSummary = {
      direction: projectedVariance >= 0 ? 'Tracking within budget' :
                 projectedVariance > -currentBudget * 0.05 ? 'Minor variance risk' : 'Significant overrun risk',
      riskLevel: projectedVariance >= 0 ? 'low' :
                 projectedVariance > -currentBudget * 0.05 ? 'medium' : 'high',
      keyDriver: overBudget[0] ? `${overBudget[0].costCode}: $${(overBudget[0].overrun / 1000).toFixed(0)}K over` : 'None',
      confidence: estimatedCosts.length > 5 ? 'high' : estimatedCosts.length > 0 ? 'medium' : 'low'
    };

    const aiAlerts = [
      ...overBudget.slice(0, 3).map(d => ({
        type: 'overrun',
        costCode: d.costCode,
        message: `${d.costCode} is $${(d.overrun / 1000).toFixed(0)}K over budget (${Math.abs(d.variancePct).toFixed(1)}%)`,
        severity: d.variancePct < -20 ? 'critical' : 'high'
      })),
      unallocated > 1000 && {
        type: 'unallocated',
        message: `$${(unallocated / 1000).toFixed(0)}K in expenses without cost code assignment`,
        severity: 'high'
      },
      estimatedCosts.length === 0 && {
        type: 'missing_etc',
        message: 'No ETC estimates provided - forecast accuracy is low',
        severity: 'medium'
      }
    ].filter(Boolean);

    const aiRecommendations = [
      overBudget.length > 0 && {
        action: 'Review cost control measures for overrun cost codes',
        impact: 'Prevent further variance escalation',
        priority: 'high',
        affectedCodes: overBudget.slice(0, 3).map(d => d.costCode)
      },
      unallocated > currentBudget * 0.02 && {
        action: 'Assign cost codes to unallocated expenses',
        impact: 'Improve budget tracking accuracy',
        priority: 'medium'
      },
      estimatedCosts.length === 0 && {
        action: 'Complete ETC estimates for all active cost codes',
        impact: 'Enable accurate EAC forecasting',
        priority: 'high'
      },
      projectedVariance < -currentBudget * 0.1 && {
        action: 'Consider change order for scope additions',
        impact: 'Formalize budget adjustments',
        priority: 'critical'
      }
    ].filter(Boolean);

    const missingDataReasons = [];
    if (budgetLines.length === 0) missingDataReasons.push('No budget established');
    if (estimatedCosts.length === 0) missingDataReasons.push('No ETC forecasts');
    if (unallocated > 0) missingDataReasons.push('Unallocated expenses exist');

    // Data integrity checks
    const integrityWarnings = [];
    const budgetsWithoutCostCode = budgetLines.filter(b => !b.cost_code_id);
    const expensesWithoutCostCode = expenses.filter(e => !e.cost_code_id);
    const negativeExpenses = expenses.filter(e => Number(e.amount) < 0);
    const orphanedBudgets = budgetLines.filter(b => b.cost_code_id && !ccMap.has(b.cost_code_id));

    if (budgetsWithoutCostCode.length > 0) {
      integrityWarnings.push(`${budgetsWithoutCostCode.length} budget lines missing cost code`);
    }
    if (expensesWithoutCostCode.length > 0) {
      integrityWarnings.push(`${expensesWithoutCostCode.length} expenses missing cost code`);
    }
    if (negativeExpenses.length > 0) {
      integrityWarnings.push(`${negativeExpenses.length} expenses with negative amounts`);
    }
    if (orphanedBudgets.length > 0) {
      integrityWarnings.push(`${orphanedBudgets.length} budget lines reference invalid cost codes`);
    }

    return Response.json({
      project: {
        id: project.id,
        project_number: project.project_number,
        name: project.name
      },
      snapshot: {
        currentBudget,
        budgetRemaining,
        committedRemaining,
        costToDate: actualToDate,
        etc: totalETC,
        eac,
        projectedVariance,
        projectedVariancePct: currentBudget > 0 ? (projectedVariance / currentBudget) * 100 : 0,
        spendVelocity7d,
        spendVelocity30d
      },
      lines,
      drivers: {
        overBudget,
        trendingUp,
        unallocated
      },
      commitments: {
        byCategory: commitmentsByCategory,
        topCommitments,
        total: committed,
        exposure: committed - actualToDate
      },
      ai: {
        summary: aiSummary,
        alerts: aiAlerts,
        recommendations: aiRecommendations,
        confidence: aiSummary.confidence,
        missingDataReasons
      },
      warnings,
      integrityWarnings,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('getBudgetControlData error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});