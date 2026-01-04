import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get('timeframe') || '12_months';
    const projectIdsFilter = searchParams.get('project_ids')?.split(',').filter(Boolean);

    // Calculate date cutoff
    const monthsBack = timeframe === '3_months' ? 3 : timeframe === '6_months' ? 6 : 12;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    // Fetch all data in parallel
    const [projects, financials, tasks, rfis, changeOrders, expenses] = await Promise.all([
      base44.entities.Project.list(),
      base44.entities.Financial.list(),
      base44.entities.Task.list(),
      base44.entities.RFI.list(),
      base44.entities.ChangeOrder.list(),
      base44.entities.Expense.list()
    ]);

    // Filter projects if specified
    let filteredProjects = projectIdsFilter 
      ? projects.filter(p => projectIdsFilter.includes(p.id))
      : projects.filter(p => p.status === 'in_progress' || p.status === 'awarded');

    const projectIds = new Set(filteredProjects.map(p => p.id));

    // Financial rollup
    const financialByProject = {};
    let totalBudget = 0;
    let totalActual = 0;
    let totalCommitted = 0;

    financials.filter(f => projectIds.has(f.project_id)).forEach(f => {
      if (!financialByProject[f.project_id]) {
        financialByProject[f.project_id] = { budget: 0, actual: 0, committed: 0 };
      }
      const budget = Number(f.budget_amount) || 0;
      const actual = Number(f.actual_amount) || 0;
      const committed = Number(f.committed_amount) || 0;

      financialByProject[f.project_id].budget += budget;
      financialByProject[f.project_id].actual += actual;
      financialByProject[f.project_id].committed += committed;
      
      totalBudget += budget;
      totalActual += actual;
      totalCommitted += committed;
    });

    // Add expense actuals
    const paidExpenses = expenses.filter(e => 
      projectIds.has(e.project_id) && 
      (e.payment_status === 'paid' || e.payment_status === 'approved') &&
      e.expense_date >= cutoffStr
    );

    paidExpenses.forEach(e => {
      const amount = Number(e.amount) || 0;
      if (!financialByProject[e.project_id]) {
        financialByProject[e.project_id] = { budget: 0, actual: 0, committed: 0 };
      }
      financialByProject[e.project_id].actual += amount;
      totalActual += amount;
    });

    const totalContractValue = filteredProjects.reduce((sum, p) => sum + (Number(p.contract_value) || 0), 0);
    const activeProjects = filteredProjects.filter(p => p.status === 'in_progress').length;

    // Task metrics (filtered)
    const filteredTasks = tasks.filter(t => projectIds.has(t.project_id));
    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress').length;
    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = filteredTasks.filter(t => {
      return t.status !== 'completed' && t.end_date && t.end_date < today;
    }).length;

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const scheduleAdherence = totalTasks > 0 ? ((totalTasks - overdueTasks) / totalTasks) * 100 : 100;

    // RFI/CO metrics (filtered)
    const filteredRFIs = rfis.filter(r => projectIds.has(r.project_id));
    const openRFIs = filteredRFIs.filter(r => r.status !== 'closed' && r.status !== 'answered').length;
    
    const filteredCOs = changeOrders.filter(co => projectIds.has(co.project_id));
    const pendingCOs = filteredCOs.filter(co => co.status === 'pending' || co.status === 'submitted').length;

    // Project health scoring with detailed component scores
    const projectMetrics = filteredProjects.map(p => {
      const pFinancials = financialByProject[p.id] || { budget: 0, actual: 0, committed: 0 };
      const pTasks = filteredTasks.filter(t => t.project_id === p.id);
      const pCompleted = pTasks.filter(t => t.status === 'completed').length;
      const pOnTime = pTasks.filter(t => {
        return t.status === 'completed' || (t.end_date && t.end_date >= today);
      }).length;
      const pOverdue = pTasks.filter(t => {
        return t.status !== 'completed' && t.end_date && t.end_date < today;
      }).length;
      const pRFIs = filteredRFIs.filter(r => r.project_id === p.id && r.status !== 'closed' && r.status !== 'answered').length;
      const pCOs = filteredCOs.filter(co => co.project_id === p.id && (co.status === 'pending' || co.status === 'submitted')).length;

      const budgetUsed = pFinancials.budget > 0 ? (pFinancials.actual / pFinancials.budget) * 100 : 0;
      
      // Component scores (0-100 scale)
      let budgetScore = 100;
      if (budgetUsed > 100) budgetScore = Math.max(0, 100 - (budgetUsed - 100) * 2);
      else if (budgetUsed > 90) budgetScore = 90 - (budgetUsed - 90);

      const scheduleScore = pTasks.length > 0 ? (pOnTime / pTasks.length) * 100 : 100;
      const rfiScore = Math.max(0, 100 - (pRFIs * 5));
      const coScore = Math.max(0, 100 - (pCOs * 10));

      // Weighted health score
      const healthScore = Math.round(
        (budgetScore * 0.4) + 
        (scheduleScore * 0.35) + 
        (rfiScore * 0.15) + 
        (coScore * 0.1)
      );

      // Primary risk factor
      const scores = { budget: budgetScore, schedule: scheduleScore, rfis: rfiScore, change_orders: coScore };
      const primaryRisk = Object.entries(scores).sort((a, b) => a[1] - b[1])[0][0];

      // Days until completion
      const targetDate = p.target_completion ? new Date(p.target_completion) : null;
      const daysRemaining = targetDate ? Math.ceil((targetDate - new Date()) / (1000 * 60 * 60 * 24)) : null;

      return {
        id: p.id,
        project_number: p.project_number,
        name: p.name,
        status: p.status,
        contract_value: p.contract_value,
        budget: pFinancials.budget,
        actual: pFinancials.actual,
        budget_used_percent: budgetUsed,
        schedule_progress: pTasks.length > 0 ? (pCompleted / pTasks.length) * 100 : 0,
        total_tasks: pTasks.length,
        completed_tasks: pCompleted,
        overdue_tasks: pOverdue,
        open_rfis: pRFIs,
        pending_cos: pCOs,
        health_score: healthScore,
        budget_score: Math.round(budgetScore),
        schedule_score: Math.round(scheduleScore),
        rfi_score: Math.round(rfiScore),
        co_score: Math.round(coScore),
        primary_risk_factor: primaryRisk,
        days_remaining: daysRemaining,
        at_risk: healthScore < 60
      };
    });

    // Group by status with detailed metrics
    const byStatus = {};
    filteredProjects.forEach(p => {
      if (!byStatus[p.status]) {
        byStatus[p.status] = { count: 0, total_value: 0, projects: [] };
      }
      byStatus[p.status].count++;
      byStatus[p.status].total_value += Number(p.contract_value) || 0;
      byStatus[p.status].projects.push(p.id);
    });

    const byStatusArray = Object.entries(byStatus).map(([status, data]) => {
      const statusProjects = projectMetrics.filter(pm => data.projects.includes(pm.id));
      const avgCompletion = statusProjects.length > 0 
        ? statusProjects.reduce((sum, pm) => sum + pm.schedule_progress, 0) / statusProjects.length 
        : 0;

      return {
        status,
        count: data.count,
        value: data.total_value,
        avg_completion: Math.round(avgCompletion)
      };
    });

    // Top 5 at-risk projects
    const atRiskProjects = projectMetrics
      .filter(p => p.at_risk)
      .sort((a, b) => a.health_score - b.health_score)
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        name: p.name,
        number: p.project_number,
        health_score: p.health_score,
        risk_factor: p.primary_risk_factor,
        days_remaining: p.days_remaining
      }));

    // Financial trends by month
    const trends = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = monthsBack - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

      const monthExpenses = paidExpenses.filter(e => 
        e.expense_date >= monthStart && e.expense_date <= monthEnd
      );

      trends.push({
        month: monthNames[date.getMonth()],
        year: date.getFullYear(),
        budget: totalBudget / monthsBack, // Evenly distributed for now
        committed: totalCommitted / monthsBack,
        actual: monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
      });
    }

    const variance = totalBudget - totalActual;
    const utilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

    return Response.json({
      summary: {
        total_contract_value: totalContractValue,
        active_projects: activeProjects,
        total_projects: filteredProjects.length,
        at_risk_projects: atRiskProjects.length,
        budget: totalBudget,
        actual: totalActual,
        committed: totalCommitted,
        variance,
        utilization_percent: Math.round(utilization * 100) / 100
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        in_progress: inProgressTasks,
        overdue: overdueTasks,
        completion_rate: Math.round(completionRate * 100) / 100,
        schedule_adherence: Math.round(scheduleAdherence * 100) / 100
      },
      by_status: byStatusArray,
      at_risk_projects: atRiskProjects,
      trends,
      timeframe
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});