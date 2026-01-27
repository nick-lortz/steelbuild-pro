import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_ids, date_from, date_to } = await req.json();

    // Build query filters
    const projectFilter = project_ids && project_ids.length > 0 
      ? { id: { $in: project_ids } } 
      : {};

    // Fetch only necessary data with filters
    const [projects, tasks, financials, rfis, changeOrders] = await Promise.all([
      base44.entities.Project.filter(projectFilter),
      base44.entities.Task.filter({ 
        ...(project_ids?.length > 0 ? { project_id: { $in: project_ids } } : {}),
        ...(date_from ? { end_date: { $gte: date_from } } : {}),
        ...(date_to ? { start_date: { $lte: date_to } } : {})
      }),
      base44.entities.Financial.filter(
        project_ids?.length > 0 ? { project_id: { $in: project_ids } } : {}
      ),
      base44.entities.RFI.filter(
        project_ids?.length > 0 ? { project_id: { $in: project_ids } } : {}
      ),
      base44.entities.ChangeOrder.filter(
        project_ids?.length > 0 ? { project_id: { $in: project_ids } } : {}
      )
    ]);

    // Aggregate metrics
    const metrics = {
      portfolio: {
        total_projects: projects.length,
        active_projects: projects.filter(p => p.status === 'in_progress').length,
        total_contract_value: projects.reduce((sum, p) => sum + (p.contract_value || 0), 0),
        total_tasks: tasks.length,
        completed_tasks: tasks.filter(t => t.status === 'completed').length
      },
      financial: {
        total_budget: 0,
        total_actual: 0,
        total_forecast: 0,
        variance: 0,
        variance_percent: 0
      },
      schedule: {
        on_track: 0,
        at_risk: 0,
        delayed: 0,
        critical_tasks: tasks.filter(t => t.is_critical).length
      },
      quality: {
        open_rfis: rfis.filter(r => r.status !== 'closed' && r.status !== 'answered').length,
        overdue_rfis: rfis.filter(r => 
          r.status !== 'closed' && 
          r.due_date && 
          new Date(r.due_date) < new Date()
        ).length,
        pending_cos: changeOrders.filter(c => c.status === 'pending' || c.status === 'submitted').length,
        approved_co_value: changeOrders
          .filter(c => c.status === 'approved')
          .reduce((sum, c) => sum + (c.cost_impact || 0), 0)
      },
      by_project: []
    };

    // Financial aggregation
    financials.forEach(f => {
      metrics.financial.total_budget += f.current_budget || 0;
      metrics.financial.total_actual += f.actual_amount || 0;
      metrics.financial.total_forecast += f.forecast_amount || 0;
    });

    metrics.financial.variance = metrics.financial.total_budget - metrics.financial.total_actual;
    metrics.financial.variance_percent = metrics.financial.total_budget > 0
      ? ((metrics.financial.variance / metrics.financial.total_budget) * 100).toFixed(1)
      : 0;

    // Per-project metrics
    for (const project of projects) {
      const projectTasks = tasks.filter(t => t.project_id === project.id);
      const projectFinancials = financials.filter(f => f.project_id === project.id);
      const projectRFIs = rfis.filter(r => r.project_id === project.id);

      const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
      const scheduleHealth = projectTasks.length > 0 
        ? (completedTasks / projectTasks.length) * 100 
        : 0;

      const projectBudget = projectFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
      const projectActual = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      const costVariance = projectBudget - projectActual;
      const costVariancePercent = projectBudget > 0 ? (costVariance / projectBudget) * 100 : 0;

      // Determine health status
      let status = 'on_track';
      if (scheduleHealth < 70 || costVariancePercent < -10) {
        status = 'at_risk';
      }
      if (scheduleHealth < 50 || costVariancePercent < -20) {
        status = 'delayed';
      }

      if (status === 'on_track') metrics.schedule.on_track++;
      if (status === 'at_risk') metrics.schedule.at_risk++;
      if (status === 'delayed') metrics.schedule.delayed++;

      metrics.by_project.push({
        project_id: project.id,
        project_number: project.project_number,
        name: project.name,
        status: project.status,
        health: status,
        contract_value: project.contract_value || 0,
        budget: projectBudget,
        actual: projectActual,
        cost_variance: costVariance,
        cost_variance_percent: costVariancePercent.toFixed(1),
        schedule_progress: scheduleHealth.toFixed(1),
        open_rfis: projectRFIs.filter(r => r.status !== 'closed').length,
        critical_tasks: projectTasks.filter(t => t.is_critical).length
      });
    }

    return Response.json({
      success: true,
      metrics,
      filters_applied: {
        project_ids: project_ids?.length || 0,
        date_from,
        date_to
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});