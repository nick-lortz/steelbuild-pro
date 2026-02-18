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

    const { project_id, from_sequence_number, delta } = await req.json();
    
    if (!project_id || from_sequence_number === undefined || delta === undefined) {
      return Response.json({ 
        error: 'project_id, from_sequence_number, and delta required' 
      }, { status: 400 });
    }

    // Check access
    await requireProjectAccess(base44, user, project_id, 'edit');

    // Fetch tasks to shift
    const tasks = await base44.entities.Task.filter({ project_id });
    const tasksToShift = tasks.filter(t => 
      t.install_sequence_number >= from_sequence_number
    );

    if (tasksToShift.length === 0) {
      return Response.json({
        success: true,
        shifted_count: 0,
        message: 'No tasks to shift'
      });
    }

    // Update sequence numbers
    const updates = await Promise.all(
      tasksToShift.map(t => 
        base44.asServiceRole.entities.Task.update(t.id, {
          install_sequence_number: t.install_sequence_number + delta
        })
      )
    );

    // Audit log
    await auditScheduleAction(base44, {
      project_id,
      event_type: 'TASK_SEQUENCE_PUSH',
      actor_user_id: user.id,
      actor_email: user.email,
      task_ids: tasksToShift.map(t => t.id),
      diff_summary: `Pushed sequence from ${from_sequence_number} by ${delta} (${tasksToShift.length} tasks)`
    });

    return Response.json({
      success: true,
      shifted_count: updates.length
    });

  } catch (error) {
    console.error('Push sequence error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: error.message.includes('Forbidden') ? 403 : 500 });
  }
});