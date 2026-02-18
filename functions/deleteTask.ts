import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { task_id } = await req.json();

    if (!task_id) {
      return Response.json({ error: 'task_id required' }, { status: 400 });
    }

    const tasks = await base44.asServiceRole.entities.Task.filter({ id: task_id });
    if (!tasks.length) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = tasks[0];
    await requireProjectAccess(base44, user, task.project_id);

    // Delete task directly
    await base44.asServiceRole.entities.Task.delete(task_id);

    return Response.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting task:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});