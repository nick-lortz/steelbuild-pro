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

    // Get existing task to verify access
    const existingTasks = await base44.asServiceRole.entities.Task.filter({ id: task_id });
    if (!existingTasks.length) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    const existingTask = existingTasks[0];

    // Verify user has access to the project
    const projects = await base44.asServiceRole.entities.Project.filter({ id: existingTask.project_id });
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

    // Update task
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