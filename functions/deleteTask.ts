import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    // Get task and work package
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: task_id });
    if (!tasks.length) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = tasks[0];

    const workPackages = await base44.asServiceRole.entities.WorkPackage.filter({ 
      id: task.work_package_id 
    });
    if (!workPackages.length) {
      return Response.json({ error: 'Work package not found' }, { status: 404 });
    }

    const workPackage = workPackages[0];

    // Enforce deletion rules
    if (workPackage.status === 'complete') {
      return Response.json({ 
        error: 'Cannot delete tasks from completed work packages' 
      }, { status: 400 });
    }

    // Only allow deletion in active phase
    if (workPackage.phase !== task.phase) {
      return Response.json({ 
        error: 'Can only delete tasks from active phase' 
      }, { status: 400 });
    }

    // Remove this task from all dependencies
    const dependentTasks = await base44.asServiceRole.entities.Task.filter({
      work_package_id: task.work_package_id,
      predecessor_ids: { $contains: task_id }
    });

    for (const depTask of dependentTasks) {
      const updatedPredecessors = depTask.predecessor_ids.filter(id => id !== task_id);
      await base44.asServiceRole.entities.Task.update(depTask.id, {
        predecessor_ids: updatedPredecessors
      });
    }

    // Delete task
    await base44.asServiceRole.entities.Task.delete(task_id);

    return Response.json({
      success: true,
      updated_dependencies: dependentTasks.length,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting task:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});