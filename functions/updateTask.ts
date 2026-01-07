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

    // Enforce immutability rules
    if (workPackage.status === 'complete') {
      return Response.json({ 
        error: 'Cannot edit tasks in completed work package' 
      }, { status: 400 });
    }

    // Block restricted field changes
    const blockedFields = ['project_id', 'work_package_id', 'phase'];
    const attemptedChanges = blockedFields.filter(field => 
      task_data[field] !== undefined && task_data[field] !== task[field]
    );

    if (attemptedChanges.length > 0) {
      return Response.json({ 
        error: 'Cannot change protected fields',
        blocked_fields: attemptedChanges
      }, { status: 400 });
    }

    // Validate dependencies if changed
    if (task_data.predecessor_ids && task_data.predecessor_ids.length > 0) {
      const predecessorTasks = await base44.asServiceRole.entities.Task.filter({
        id: { $in: task_data.predecessor_ids }
      });

      const invalidDeps = predecessorTasks.filter(t => t.work_package_id !== task.work_package_id);
      if (invalidDeps.length > 0) {
        return Response.json({ 
          error: 'Task dependencies cannot cross work packages',
          invalid_dependencies: invalidDeps.map(t => t.id)
        }, { status: 400 });
      }
    }

    // Update task (protected fields are stripped)
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