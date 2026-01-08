import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch portfolio data
    const [projects, sovItems, changeOrders, expenses, tasks, rfis] = await Promise.all([
      base44.asServiceRole.entities.Project.list(),
      base44.asServiceRole.entities.SOVItem.list(),
      base44.asServiceRole.entities.ChangeOrder.list(),
      base44.asServiceRole.entities.Expense.list(),
      base44.asServiceRole.entities.Task.list(),
      base44.asServiceRole.entities.RFI.list()
    ]);

    // Filter active projects
    const activeProjects = projects.filter(p => 
      p.status === 'in_progress' || p.status === 'awarded'
    );

    // Portfolio metrics
    const portfolioMetrics = activeProjects.map(project => {
      const projectSOV = sovItems.filter(s => s.project_id === project.id);
      const projectCOs = changeOrders.filter(co => co.project_id === project.id);
      const projectExpenses = expenses.filter(e => e.project_id === project.id);
      const projectTasks = tasks.filter(t => t.project_id === project.id);
      const projectRFIs = rfis.filter(r => r.project_id === project.id);

      const contractValue = projectSOV.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);
      const signedExtras = projectCOs
        .filter(co => co.status === 'approved')
        .reduce((sum, co) => sum + (co.cost_impact || 0), 0);
      const totalContract = contractValue + signedExtras;
      
      const earnedToDate = projectSOV.reduce((sum, s) => 
        sum + ((s.scheduled_value || 0) * ((s.percent_complete || 0) / 100)), 0);
      
      const actualCost = projectExpenses
        .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      
      const percentComplete = totalContract > 0 ? (earnedToDate / totalContract) * 100 : 0;
      const estimatedCostAtCompletion = percentComplete > 0 ? (actualCost / percentComplete) * 100 : actualCost;
      const projectedMargin = totalContract - estimatedCostAtCompletion;
      const projectedMarginPercent = totalContract > 0 ? (projectedMargin / totalContract) * 100 : 0;

      const overdueTasks = projectTasks.filter(t => 
        t.status !== 'completed' && 
        t.end_date && 
        new Date(t.end_date) < new Date()
      ).length;

      const openRFIs = projectRFIs.filter(r => 
        r.status !== 'closed' && r.status !== 'answered'
      ).length;

      return {
        project_id: project.id,
        project_number: project.project_number,
        project_name: project.name,
        status: project.status,
        phase: project.phase,
        contract_value: totalContract,
        earned_revenue: earnedToDate,
        actual_cost: actualCost,
        estimated_cost_at_completion: estimatedCostAtCompletion,
        projected_margin: projectedMargin,
        projected_margin_percent: projectedMarginPercent,
        percent_complete: percentComplete,
        overdue_tasks: overdueTasks,
        open_rfis: openRFIs,
        risk_tier: projectedMarginPercent < 5 ? 'red' : projectedMarginPercent < 10 ? 'yellow' : 'green'
      };
    });

    // Portfolio rollup (NO DERIVED CALCULATIONS - source of truth only)
    const portfolioRollup = {
      total_contract_value: portfolioMetrics.reduce((sum, p) => sum + p.contract_value, 0),
      total_earned_revenue: portfolioMetrics.reduce((sum, p) => sum + p.earned_revenue, 0),
      total_actual_cost: portfolioMetrics.reduce((sum, p) => sum + p.actual_cost, 0),
      total_projected_margin: portfolioMetrics.reduce((sum, p) => sum + p.projected_margin, 0),
      
      projects_at_risk: portfolioMetrics.filter(p => p.risk_tier === 'red').length,
      projects_watch: portfolioMetrics.filter(p => p.risk_tier === 'yellow').length,
      projects_on_track: portfolioMetrics.filter(p => p.risk_tier === 'green').length,
      
      total_overdue_tasks: portfolioMetrics.reduce((sum, p) => sum + p.overdue_tasks, 0),
      total_open_rfis: portfolioMetrics.reduce((sum, p) => sum + p.open_rfis, 0)
    };

    return Response.json({
      success: true,
      generated_at: new Date().toISOString(),
      portfolio_rollup: portfolioRollup,
      project_details: portfolioMetrics
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});