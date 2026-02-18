import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';
import { auditScheduleAction } from './utils/auditSchedule.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, erection_area, hold = true, reason = '' } = await req.json();
    
    if (!project_id || !erection_area) {
      return Response.json({ 
        error: 'project_id and erection_area required' 
      }, { status: 400 });
    }

    // Check access
    await requireProjectAccess(base44, user, project_id, 'edit');

    // Fetch tasks in area
    const tasks = await base44.entities.Task.filter({
      project_id,
      erection_area
    });

    if (tasks.length === 0) {
      return Response.json({
        success: true,
        updated_count: 0,
        message: 'No tasks in specified area'
      });
    }

    // Update all tasks in area
    const updates = await Promise.all(
      tasks.map(t => 
        base44.asServiceRole.entities.Task.update(t.id, {
          hold_area: hold,
          hold_reason: hold ? reason : null,
          status: hold ? 'on_hold' : t.status
        })
      )
    );

    // Audit log
    await auditScheduleAction(base44, {
      project_id,
      event_type: 'TASK_HOLD_AREA',
      actor_user_id: user.id,
      actor_email: user.email,
      task_ids: tasks.map(t => t.id),
      diff_summary: `${hold ? 'Held' : 'Released'} area "${erection_area}" (${tasks.length} tasks)${hold && reason ? `: ${reason}` : ''}`
    });

    return Response.json({
      success: true,
      updated_count: updates.length,
      area: erection_area,
      hold_status: hold
    });

  } catch (error) {
    console.error('Hold area error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: error.message.includes('Forbidden') ? 403 : 500 });
  }
});