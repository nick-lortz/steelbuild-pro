import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id } = await req.json();
    
    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    // Check access
    await requireProjectAccess(base44, user, project_id, 'view');

    // Fetch open RFIs affecting sequence
    const rfis = await base44.entities.RFI.filter({
      project_id,
      status: { $in: ['submitted', 'under_review', 'reopened'] }
    });
    
    const openRfisAffectingSchedule = rfis.filter(r => 
      r.affects_sequence || r.schedule_hold_recommended
    );

    // Fetch held areas
    const tasks = await base44.entities.Task.filter({ project_id });
    const heldAreas = new Set(
      tasks.filter(t => t.hold_area).map(t => t.erection_area).filter(Boolean)
    );

    // Tasks blocked (by hold OR by open RFI)
    const rfiIdSet = new Set(openRfisAffectingSchedule.map(r => r.id));
    const blockedTasks = tasks.filter(t => 
      t.hold_area || 
      t.status === 'blocked' ||
      t.linked_rfi_ids?.some(id => rfiIdSet.has(id))
    );

    return Response.json({
      open_rfi_count: openRfisAffectingSchedule.length,
      held_areas_count: heldAreas.size,
      held_areas: Array.from(heldAreas),
      tasks_blocked_count: blockedTasks.length,
      total_tasks: tasks.length
    });

  } catch (error) {
    console.error('Get schedule impacts error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: error.message.includes('Forbidden') ? 403 : 500 });
  }
});