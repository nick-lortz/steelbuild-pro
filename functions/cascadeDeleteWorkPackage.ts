import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { work_package_id } = await req.json();

    if (!work_package_id) {
      return Response.json({ error: 'work_package_id required' }, { status: 400 });
    }

    // Verify work package exists
    const workPackages = await base44.asServiceRole.entities.WorkPackage.filter({ id: work_package_id });
    if (!workPackages.length) {
      return Response.json({ error: 'Work package not found' }, { status: 404 });
    }

    // Delete all tasks in this work package
    const tasks = await base44.asServiceRole.entities.Task.filter({ work_package_id });
    let deletedTasks = 0;

    for (const task of tasks) {
      await base44.asServiceRole.entities.Task.delete(task.id);
      deletedTasks++;
    }

    // Delete the work package
    await base44.asServiceRole.entities.WorkPackage.delete(work_package_id);

    return Response.json({
      success: true,
      deleted_tasks: deletedTasks,
      message: `Work package and ${deletedTasks} tasks deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting work package:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});