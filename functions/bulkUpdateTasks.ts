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

    const { project_id, task_ids, updates } = await req.json();
    
    if (!project_id || !task_ids || !updates) {
      return Response.json({ 
        error: 'project_id, task_ids, and updates required' 
      }, { status: 400 });
    }

    if (!Array.isArray(task_ids) || task_ids.length === 0) {
      return Response.json({ error: 'task_ids must be non-empty array' }, { status: 400 });
    }

    // Check access
    await requireProjectAccess(base44, user, project_id, 'edit');

    // Fetch current state for audit
    const beforeTasks = await base44.entities.Task.filter({
      id: { $in: task_ids }
    });

    // Bulk update
    const results = await Promise.all(
      task_ids.map(id => base44.asServiceRole.entities.Task.update(id, updates))
    );

    // Audit log
    const fields = Object.keys(updates);
    await auditScheduleAction(base44, {
      project_id,
      event_type: 'TASK_BULK_UPDATE',
      actor_user_id: user.id,
      actor_email: user.email,
      task_ids,
      diff_summary: `Updated ${fields.join(', ')} for ${task_ids.length} tasks`,
      before: beforeTasks.map(t => ({ id: t.id, ...fields.reduce((acc, f) => ({ ...acc, [f]: t[f] }), {}) })),
      after: results.map(t => ({ id: t.id, ...fields.reduce((acc, f) => ({ ...acc, [f]: t[f] }), {}) }))
    });

    return Response.json({
      success: true,
      updated_count: results.length
    });

  } catch (error) {
    console.error('Bulk update error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: error.message.includes('Forbidden') ? 403 : 500 });
  }
});