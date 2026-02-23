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
    const { project_id } = await req.json();
    
    if (!project_id) {
      return Response.json({ error: 'Missing project_id' }, { status: 400 });
    }
    
    // Get all ROI events for project
    const events = await base44.entities.ROIEvent.filter({ project_id });
    
    // Calculate last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentEvents = events.filter(e => 
      new Date(e.created_date) >= thirtyDaysAgo
    );
    
    // Aggregate metrics
    const totalSavings = events.reduce((sum, e) => sum + (e.estimated_cost_impact || 0), 0);
    const totalHoursSaved = events.reduce((sum, e) => sum + (e.estimated_hours_saved || 0), 0);
    
    const shipmentBlocksPrevented = events.filter(e => 
      e.event_type === 'shipment_blocked' || e.event_type === 'shipment_released'
    ).length;
    
    const installBlocksPrevented = events.filter(e => 
      e.event_type === 'install_hold_prevented' || e.event_type === 'install_ready_improved'
    ).length;
    
    const gateOverrides = events.filter(e => e.event_type === 'gate_override').length;
    
    // Top blocker types (last 30 days)
    const blockerCounts = {};
    recentEvents.forEach(e => {
      if (e.event_type.includes('blocked') || e.event_type.includes('prevented')) {
        blockerCounts[e.event_type] = (blockerCounts[e.event_type] || 0) + 1;
      }
    });
    
    const topBlockerTypes = Object.entries(blockerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
    
    // Average days to resolution (gate_blocked → gate_opened or blocker_resolved)
    const blockedEvents = events.filter(e => e.event_type === 'gate_blocked');
    const resolvedEvents = events.filter(e => 
      e.event_type === 'gate_opened' || e.event_type === 'blocker_resolved'
    );
    
    let totalResolutionDays = 0;
    let resolutionCount = 0;
    
    for (const blocked of blockedEvents) {
      const resolved = resolvedEvents.find(r => 
        r.related_entity_id === blocked.related_entity_id &&
        new Date(r.created_date) > new Date(blocked.created_date)
      );
      
      if (resolved) {
        const days = Math.ceil(
          (new Date(resolved.created_date) - new Date(blocked.created_date)) / (1000 * 60 * 60 * 24)
        );
        totalResolutionDays += days;
        resolutionCount++;
      }
    }
    
    const avgDaysToResolution = resolutionCount > 0 
      ? Math.round(totalResolutionDays / resolutionCount) 
      : 0;
    
    return ok({
      project_id,
      total_estimated_savings: totalSavings,
      total_hours_saved: totalHoursSaved,
      number_of_shipment_blocks_prevented: shipmentBlocksPrevented,
      number_of_install_blocks_prevented: installBlocksPrevented,
      number_of_gate_overrides: gateOverrides,
      top_blocker_types: topBlockerTypes,
      average_days_to_resolution: avgDaysToResolution,
      last_30_days: {
        savings: recentEvents.reduce((sum, e) => sum + (e.estimated_cost_impact || 0), 0),
        events_count: recentEvents.length
      }
    });
    
  } catch (error) {
    if (error?.status === 401) return unauthorized(error.message);
    return serverError('Failed to get project ROI', error);
  }
});