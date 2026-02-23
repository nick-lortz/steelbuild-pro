import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function requireUser(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) throw { status: 401, message: 'Unauthorized' };
  return { user, base44 };
}

function ok(data) {
  return Response.json({ success: true, data }, { status: 200 });
}

function unauthorized(message = 'Unauthorized') {
  return Response.json({ success: false, error: message }, { status: 401 });
}

function serverError(message = 'Internal server error', error = null) {
  console.error('[SERVER_ERROR]', message, error);
  return Response.json({ success: false, error: message }, { status: 500 });
}

Deno.serve(async (req) => {
  try {
    const { base44 } = await requireUser(req);
    
    // Get user's accessible projects
    const projects = await base44.entities.Project.filter({
      status: { $in: ['awarded', 'in_progress', 'on_hold'] }
    });
    
    if (projects.length === 0) {
      return ok({
        total_savings_all_projects: 0,
        avg_savings_per_project: 0,
        top_3_risk_categories: [],
        number_of_fab_holds_prevented: 0,
        number_of_install_holds_prevented: 0,
        trend_last_30_days: []
      });
    }
    
    const projectIds = projects.map(p => p.id);
    
    // Get all ROI events for accessible projects
    const events = await base44.entities.ROIEvent.filter({
      project_id: { $in: projectIds }
    });
    
    // Calculate last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentEvents = events.filter(e => 
      new Date(e.created_date) >= thirtyDaysAgo
    );
    
    // Total savings
    const totalSavings = events.reduce((sum, e) => sum + (e.estimated_cost_impact || 0), 0);
    const avgSavingsPerProject = projects.length > 0 ? totalSavings / projects.length : 0;
    
    // Risk category aggregation
    const riskCategories = {};
    events.forEach(e => {
      const category = e.event_type;
      if (!riskCategories[category]) {
        riskCategories[category] = {
          type: category,
          count: 0,
          total_savings: 0
        };
      }
      riskCategories[category].count++;
      riskCategories[category].total_savings += e.estimated_cost_impact || 0;
    });
    
    const top3RiskCategories = Object.values(riskCategories)
      .sort((a, b) => b.total_savings - a.total_savings)
      .slice(0, 3);
    
    // Fab and install holds prevented
    const fabHoldsPrevented = events.filter(e => 
      e.event_type === 'fab_hold_prevented' || e.event_type === 'gate_blocked'
    ).length;
    
    const installHoldsPrevented = events.filter(e => 
      e.event_type === 'install_hold_prevented' || e.event_type === 'install_ready_improved'
    ).length;
    
    // Trend last 30 days (daily rollup)
    const trendData = {};
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const dateKey = date.toISOString().split('T')[0];
      trendData[dateKey] = { date: dateKey, savings: 0, events: 0 };
    }
    
    recentEvents.forEach(e => {
      const dateKey = e.created_date.split('T')[0];
      if (trendData[dateKey]) {
        trendData[dateKey].savings += e.estimated_cost_impact || 0;
        trendData[dateKey].events++;
      }
    });
    
    const trendLast30Days = Object.values(trendData);
    
    return ok({
      total_savings_all_projects: totalSavings,
      avg_savings_per_project: Math.round(avgSavingsPerProject),
      top_3_risk_categories: top3RiskCategories,
      number_of_fab_holds_prevented: fabHoldsPrevented,
      number_of_install_holds_prevented: installHoldsPrevented,
      trend_last_30_days: trendLast30Days,
      projects_evaluated: projects.length,
      total_events: events.length,
      recent_events: recentEvents.length
    });
    
  } catch (error) {
    if (error?.status === 401) return unauthorized(error.message);
    return serverError('Failed to get portfolio ROI', error);
  }
});