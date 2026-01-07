import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { work_package_id, task_data } = await req.json();

    if (!work_package_id || !task_data) {
      return Response.json({ error: 'work_package_id and task_data required' }, { status: 400 });
    }

    // Get work package
    const workPackages = await base44.asServiceRole.entities.WorkPackage.filter({ id: work_package_id });
    if (!workPackages.length) {
      return Response.json({ error: 'Work package not found' }, { status: 404 });
    }

    const workPackage = workPackages[0];

    // Validate WP status
    if (workPackage.status === 'complete') {
      return Response.json({ error: 'Cannot create tasks in completed work package' }, { status: 400 });
    }

    if (workPackage.status === 'on_hold') {
      return Response.json({ error: 'Cannot create tasks in work package on hold' }, { status: 400 });
    }

    // Validate dependencies are within same work package
    if (task_data.predecessor_ids && task_data.predecessor_ids.length > 0) {
      const predecessorTasks = await base44.asServiceRole.entities.Task.filter({
        id: { $in: task_data.predecessor_ids }
      });

      const invalidDeps = predecessorTasks.filter(t => t.work_package_id !== work_package_id);
      if (invalidDeps.length > 0) {
        return Response.json({ 
          error: 'Task dependencies cannot cross work packages',
          invalid_dependencies: invalidDeps.map(t => t.id)
        }, { status: 400 });
      }
    }

    // Inject inherited fields from work package
    const newTask = {
      ...task_data,
      project_id: workPackage.project_id,  // INHERITED
      work_package_id,                      // REQUIRED
      phase: workPackage.phase              // INHERITED, READ-ONLY
    };

    // Create task
    const createdTask = await base44.asServiceRole.entities.Task.create(newTask);

    return Response.json({
      success: true,
      task: createdTask,
      message: 'Task created successfully'
    });

  } catch (error) {
    console.error('Error creating task:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});