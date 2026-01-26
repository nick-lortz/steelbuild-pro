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

    // Get task to verify access
    const tasks = await base44.asServiceRole.entities.Task.filter({ id: task_id });
    if (!tasks.length) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = tasks[0];

    // Verify user has access to the project
    const projects = await base44.asServiceRole.entities.Project.filter({ id: task.project_id });
    if (!projects.length) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = projects[0];
    const hasAccess = user.role === 'admin' || 
      project.project_manager === user.email || 
      project.superintendent === user.email ||
      (project.assigned_users && project.assigned_users.includes(user.email));

    if (!hasAccess) {
      return Response.json({ error: 'Access denied to this project' }, { status: 403 });
    }

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