import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';

/**
 * Recalculate float consumption for tasks
 * Rule: float_consumed_hours = max(0, actual_variance_hours)
 * where actual_variance_hours = (actual_end - baseline_end) in hours
 */

function dateDiffHours(date1, date2) {
  if (!date1 || !date2) return 0;
  const diff = new Date(date2) - new Date(date1);
  return Math.floor(diff / (1000 * 60 * 60));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, task_id = null, erection_area = null } = await req.json();
    
    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    // Check access
    await requireProjectAccess(base44, user, project_id, 'view');

    // Build query
    const query = { project_id };
    if (task_id) {
      query.id = task_id;
    } else if (erection_area) {
      query.erection_area = erection_area;
    }

    // Fetch tasks
    const tasks = await base44.entities.Task.filter(query);

    let updated = 0;

    for (const task of tasks) {
      // Only calculate if baseline exists
      if (!task.baseline_end) continue;

      const currentEnd = task.end_date || new Date().toISOString().split('T')[0];
      const varianceHours = dateDiffHours(task.baseline_end, currentEnd);
      const consumedHours = Math.max(0, varianceHours);

      // Update if changed
      if (task.float_consumed_hours !== consumedHours) {
        await base44.asServiceRole.entities.Task.update(task.id, {
          float_consumed_hours: consumedHours
        });
        updated++;
      }
    }

    return Response.json({
      success: true,
      tasks_evaluated: tasks.length,
      tasks_updated: updated
    });

  } catch (error) {
    console.error('Float recalc error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: error.message.includes('Forbidden') ? 403 : 500 });
  }
});