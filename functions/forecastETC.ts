import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, cost_code_id } = await req.json();

    // Fetch data
    const [financial, expenses, tasks, changeOrders] = await Promise.all([
      cost_code_id 
        ? base44.entities.Financial.filter({ project_id, cost_code_id })
        : base44.entities.Financial.filter({ project_id }),
      cost_code_id
        ? base44.entities.Expense.filter({ project_id, cost_code_id })
        : base44.entities.Expense.filter({ project_id }),
      base44.entities.Task.filter({ project_id }),
      base44.entities.ChangeOrder.filter({ project_id })
    ]);

    const forecasts = [];

    for (const fin of financial) {
      const currentBudget = fin.current_budget || 0;
      const actualCost = fin.actual_amount || 0;
      const committed = fin.committed_amount || 0;

      // Collect historical spend data
      const relatedExpenses = cost_code_id
        ? expenses
        : expenses.filter(e => e.cost_code_id === fin.cost_code_id);

      const sortedExpenses = relatedExpenses
        .filter(e => e.expense_date)
        .sort((a, b) => new Date(a.expense_date) - new Date(b.expense_date));

      if (sortedExpenses.length === 0) {
        forecasts.push({
          cost_code_id: fin.cost_code_id,
          category: fin.category,
          current_budget: currentBudget,
          actual_cost: actualCost,
          etc: Math.max(0, currentBudget - actualCost),
          eac: actualCost,
          method: 'no_data',
          confidence: 'low'
        });
        continue;
      }

      // Calculate burn rate
      const firstExpenseDate = new Date(sortedExpenses[0].expense_date);
      const lastExpenseDate = new Date(sortedExpenses[sortedExpenses.length - 1].expense_date);
      const daysDiff = Math.max(1, (lastExpenseDate - firstExpenseDate) / (1000 * 60 * 60 * 24));
      const burnRate = actualCost / daysDiff; // $ per day

      // Estimate remaining work
      const completedTasks = tasks.filter(t => 
        t.status === 'completed' && 
        t.cost_code_id === fin.cost_code_id
      ).length;
      const totalTasks = tasks.filter(t => t.cost_code_id === fin.cost_code_id).length;
      const workComplete = totalTasks > 0 ? completedTasks / totalTasks : (actualCost / currentBudget);
      const workRemaining = Math.max(0, 1 - workComplete);

      // Method 1: Burn rate projection
      const today = new Date();
      const projectEndDays = 90; // Default 90 days remaining
      const burnRateETC = Math.max(0, burnRate * projectEndDays * workRemaining);

      // Method 2: Performance-based
      const costPerformance = actualCost > 0 ? currentBudget / actualCost : 1;
      const performanceETC = Math.max(0, (currentBudget - actualCost) / costPerformance);

      // Method 3: Remaining budget adjusted for trends
      const budgetBasedETC = Math.max(0, currentBudget - actualCost);

      // Pending change order impact (future cost exposure)
      // Only include approved COs; pending COs are informational only
      const pendingCOImpact = changeOrders
        .filter(c => c.status === 'approved')
        .reduce((sum, c) => sum + (c.cost_impact || 0), 0);

      // Weighted ETC methods for more accurate forecasting
      const weights = { burnRate: 0.4, performance: 0.4, budget: 0.2 };
      const weightedETC = 
        burnRateETC * weights.burnRate +
        performanceETC * weights.performance +
        budgetBasedETC * weights.budget;

      // Adjusted ETC = Weighted ETC + Committed + Approved CO Impact
      // Note: Committed already includes pending expenses; COs add cost impact
      const adjustedETC = weightedETC + committed + pendingCOImpact;

      // EAC = Actual Cost To Date + ETC
      const eac = actualCost + adjustedETC;

      // Determine confidence based on data quality
      let confidence = 'high';
      if (sortedExpenses.length < 5) confidence = 'low';
      else if (sortedExpenses.length < 15) confidence = 'medium';

      forecasts.push({
        cost_code_id: fin.cost_code_id,
        category: fin.category,
        current_budget: currentBudget,
        actual_cost: actualCost,
        committed: committed,
        burn_rate: burnRate.toFixed(2),
        work_complete_pct: (workComplete * 100).toFixed(1),
        etc: Math.round(adjustedETC),
        eac: Math.round(eac),
        variance_at_completion: Math.round(currentBudget - eac),
        pending_co_impact: Math.round(pendingCOImpact),
        method: 'ai_weighted',
        confidence,
        breakdown: {
          burn_rate_etc: Math.round(burnRateETC),
          performance_etc: Math.round(performanceETC),
          budget_etc: Math.round(budgetBasedETC)
        }
      });
    }

    // Summary totals
    const summary = {
      total_budget: forecasts.reduce((s, f) => s + f.current_budget, 0),
      total_actual: forecasts.reduce((s, f) => s + f.actual_cost, 0),
      total_etc: forecasts.reduce((s, f) => s + f.etc, 0),
      total_eac: forecasts.reduce((s, f) => s + f.eac, 0),
      total_variance: 0
    };
    summary.total_variance = summary.total_budget - summary.total_eac;

    return Response.json({
      success: true,
      project_id,
      forecasts,
      summary,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});