import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';

/**
 * Aggregate analytics across user's assigned projects.
 * Returns: project trends, cost performance, resource allocation, risk metrics.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { start_date, end_date, project_ids = [] } = await req.json();

    // Get user's projects
    let filter = {};
    if (user.role !== 'admin') {
      filter = {
        '$or': [
          { 'project_manager': user.email },
          { 'superintendent': user.email },
          { 'assigned_users': { '$contains': user.email } }
        ]
      };
    }

    // Optionally filter by specific projects
    if (project_ids.length > 0) {
      filter.id = { '$in': project_ids };
    }

    const projects = await base44.asServiceRole.entities.Project.filter(filter);
    const projectIds = projects.map(p => p.id);

    if (projectIds.length === 0) {
      return Response.json({
        projects: [],
        cost_trends: [],
        schedule_trends: [],
        resource_allocation: {},
        risk_metrics: [],
        summary: {
          total_projects: 0,
          avg_cost_health: 0,
          avg_schedule_health: 0,
          at_risk_count: 0
        }
      });
    }

    // Fetch related data
    const tasks = await base44.asServiceRole.entities.Task.filter({ 
      'project_id': { '$in': projectIds } 
    });
    const financials = await base44.asServiceRole.entities.Financial.filter({
      'project_id': { '$in': projectIds }
    });
    const resources = await base44.asServiceRole.entities.Resource.filter({});
    const laborHours = await base44.asServiceRole.entities.LaborHours.filter({
      'project_id': { '$in': projectIds }
    });

    // === PROJECT TRENDS ===
    const costTrends = projects.map(p => {
      const budget = financials
        .filter(f => f.project_id === p.id)
        .reduce((sum, f) => sum + (f.current_budget || 0), 0);
      const actual = financials
        .filter(f => f.project_id === p.id)
        .reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      const health = budget > 0 ? Math.round((actual / budget) * 100) : 0;

      return {
        project_id: p.id,
        project_name: p.name,
        date: new Date(p.created_date).toISOString().split('T')[0],
        budget: budget,
        actual: actual,
        cost_health: health,
        status: p.status
      };
    });

    const scheduleTrends = projects.map(p => {
      const projectTasks = tasks.filter(t => t.project_id === p.id);
      const completed = projectTasks.filter(t => t.status === 'completed').length;
      const total = projectTasks.length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

      let daysSlip = 0;
      if (p.target_completion) {
        const target = new Date(p.target_completion);
        const latest = projectTasks
          .filter(t => t.end_date)
          .map(t => new Date(t.end_date))
          .sort((a, b) => b - a)[0];
        if (latest && latest > target) {
          daysSlip = Math.ceil((latest - target) / (1000 * 60 * 60 * 24));
        }
      }

      return {
        project_id: p.id,
        project_name: p.name,
        date: new Date(p.start_date).toISOString().split('T')[0],
        progress: progress,
        schedule_slip_days: daysSlip,
        total_tasks: total,
        completed_tasks: completed
      };
    });

    // === RESOURCE ALLOCATION ===
    const resourceAllocation = {};
    laborHours.forEach(lh => {
      const key = lh.crew_employee || 'Unassigned';
      if (!resourceAllocation[key]) {
        resourceAllocation[key] = { hours: 0, projects: new Set() };
      }
      resourceAllocation[key].hours += lh.hours || 0;
      resourceAllocation[key].projects.add(lh.project_id);
    });

    const resourceData = Object.entries(resourceAllocation).map(([crew, data]) => ({
      crew: crew,
      total_hours: data.hours,
      projects_assigned: data.projects.size,
      utilization_pct: Math.min(100, Math.round((data.hours / 160) * 100)) // 160 = 4 weeks
    }));

    // === RISK METRICS ===
    const riskMetrics = projects.map(p => {
      const projectBudget = financials
        .filter(f => f.project_id === p.id)
        .reduce((sum, f) => sum + (f.current_budget || 0), 0);
      const projectActual = financials
        .filter(f => f.project_id === p.id)
        .reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      const costHealth = projectBudget > 0 ? (projectActual / projectBudget) * 100 : 0;

      const projectTasks = tasks.filter(t => t.project_id === p.id);
      const overdueTasks = projectTasks.filter(t => 
        t.status !== 'completed' && t.end_date && t.end_date < new Date().toISOString().split('T')[0]
      ).length;

      let riskScore = 0;
      if (costHealth > 85) riskScore += 30;
      if (overdueTasks > 0) riskScore += 20;
      if (p.status === 'on_hold') riskScore += 15;

      return {
        project_id: p.id,
        project_name: p.name,
        risk_score: Math.min(100, riskScore),
        cost_variance: Math.round(projectActual - projectBudget),
        overdue_tasks: overdueTasks,
        status: p.status
      };
    });

    // === SUMMARY ===
    const avgCostHealth = costTrends.length > 0 
      ? Math.round(costTrends.reduce((sum, t) => sum + t.cost_health, 0) / costTrends.length)
      : 0;
    const avgScheduleHealth = scheduleTrends.length > 0
      ? Math.round(scheduleTrends.reduce((sum, t) => sum + t.progress, 0) / scheduleTrends.length)
      : 0;
    const atRiskCount = riskMetrics.filter(r => r.risk_score > 50).length;

    return Response.json({
      projects: projects,
      cost_trends: costTrends.sort((a, b) => new Date(a.date) - new Date(b.date)),
      schedule_trends: scheduleTrends.sort((a, b) => new Date(a.date) - new Date(b.date)),
      resource_allocation: resourceData.sort((a, b) => b.total_hours - a.total_hours),
      risk_metrics: riskMetrics.sort((a, b) => b.risk_score - a.risk_score),
      summary: {
        total_projects: projects.length,
        avg_cost_health: avgCostHealth,
        avg_schedule_health: avgScheduleHealth,
        at_risk_count: atRiskCount
      }
    });
  } catch (error) {
    console.error('[getAnalyticsData]', error.message);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});