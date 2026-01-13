import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { task_id, task_data } = await req.json();

    if (!task_id || !task_data) {
      return Response.json({ error: 'task_id and task_data required' }, { status: 400 });
    }

    // Get task and work package
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: { $eq: task_id } });
    if (!tasks.length) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    // Update task directly without constraints
    const updatedTask = await base44.asServiceRole.entities.Task.update(task_id, task_data);

    return Response.json({
      success: true,
      task: updatedTask,
      message: 'Task updated successfully'
    });

  } catch (error) {
    console.error('Error updating task:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});