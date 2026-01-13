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

    // Inject work package fields
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