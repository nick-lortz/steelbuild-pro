import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all projects
    const projects = await base44.entities.Project.list();
    
    // Fetch financials for all projects
    const financials = await base44.entities.Financial.list();
    
    // Fetch tasks for all projects
    const tasks = await base44.entities.Task.list();
    
    // Fetch RFIs
    const rfis = await base44.entities.RFI.list();
    
    // Fetch Change Orders
    const changeOrders = await base44.entities.ChangeOrder.list();

    // Calculate portfolio-level metrics
    const totalContractValue = projects.reduce((sum, p) => sum + (Number(p.contract_value) || 0), 0);
    const activeProjects = projects.filter(p => p.status === 'in_progress').length;
    const totalProjects = projects.length;

    // Financial rollup
    let totalBudget = 0;
    let totalActual = 0;
    let totalCommitted = 0;

    const financialByProject = {};
    financials.forEach(f => {
      if (!financialByProject[f.project_id]) {
        financialByProject[f.project_id] = { budget: 0, actual: 0, committed: 0 };
      }
      financialByProject[f.project_id].budget += Number(f.budget_amount) || 0;
      financialByProject[f.project_id].actual += Number(f.actual_amount) || 0;
      financialByProject[f.project_id].committed += Number(f.committed_amount) || 0;
      
      totalBudget += Number(f.budget_amount) || 0;
      totalActual += Number(f.actual_amount) || 0;
      totalCommitted += Number(f.committed_amount) || 0;
    });

    // Task metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'completed') return false;
      const today = new Date().toISOString().split('T')[0];
      return t.end_date && t.end_date < today;
    }).length;

    // RFI/CO metrics
    const openRFIs = rfis.filter(r => r.status !== 'closed' && r.status !== 'answered').length;
    const pendingCOs = changeOrders.filter(co => co.status === 'pending' || co.status === 'submitted').length;

    // Project health scoring
    const projectMetrics = projects.map(p => {
      const pFinancials = financialByProject[p.id] || { budget: 0, actual: 0, committed: 0 };
      const pTasks = tasks.filter(t => t.project_id === p.id);
      const pCompleted = pTasks.filter(t => t.status === 'completed').length;
      const pOverdue = pTasks.filter(t => {
        if (t.status === 'completed') return false;
        const today = new Date().toISOString().split('T')[0];
        return t.end_date && t.end_date < today;
      }).length;

      const budgetUsed = pFinancials.budget > 0 ? (pFinancials.actual / pFinancials.budget) * 100 : 0;
      const scheduleProgress = pTasks.length > 0 ? (pCompleted / pTasks.length) * 100 : 0;

      // Health score: budget performance (50%) + schedule performance (30%) + overdue penalty (20%)
      let healthScore = 100;
      
      // Budget factor
      if (budgetUsed > 100) healthScore -= (budgetUsed - 100) * 0.5;
      else if (budgetUsed > 90) healthScore -= 10;
      
      // Schedule factor
      if (scheduleProgress < 50) healthScore -= 20;
      else if (scheduleProgress < 75) healthScore -= 10;
      
      // Overdue penalty
      if (pOverdue > 0) healthScore -= Math.min(pOverdue * 5, 30);

      healthScore = Math.max(0, Math.min(100, healthScore));

      return {
        id: p.id,
        project_number: p.project_number,
        name: p.name,
        status: p.status,
        contract_value: p.contract_value,
        budget: pFinancials.budget,
        actual: pFinancials.actual,
        budget_used_percent: budgetUsed,
        schedule_progress: scheduleProgress,
        total_tasks: pTasks.length,
        completed_tasks: pCompleted,
        overdue_tasks: pOverdue,
        health_score: Math.round(healthScore),
        at_risk: healthScore < 70 || budgetUsed > 95 || pOverdue > 5
      };
    });

    // Group by status
    const byStatus = projects.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});

    const atRiskCount = projectMetrics.filter(p => p.at_risk).length;

    return Response.json({
      summary: {
        total_projects: totalProjects,
        active_projects: activeProjects,
        at_risk_projects: atRiskCount,
        total_contract_value: totalContractValue,
        total_budget: totalBudget,
        total_actual: totalActual,
        total_committed: totalCommitted,
        budget_utilization: totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        overdue_tasks: overdueTasks,
        completion_rate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
        open_rfis: openRFIs,
        pending_change_orders: pendingCOs,
        by_status: byStatus
      },
      projects: projectMetrics.sort((a, b) => a.health_score - b.health_score)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});