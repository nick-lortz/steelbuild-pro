import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function validateTaskData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Progress validation
  if (data.progress_percent != null) {
    const progress = Number(data.progress_percent);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      errors.push('progress_percent must be between 0 and 100');
    }
  }

  // Hours validation
  if (data.estimated_hours != null && (isNaN(Number(data.estimated_hours)) || Number(data.estimated_hours) < 0)) {
    errors.push('estimated_hours must be a non-negative number');
  }
  if (data.actual_hours != null && (isNaN(Number(data.actual_hours)) || Number(data.actual_hours) < 0)) {
    errors.push('actual_hours must be a non-negative number');
  }

  // Cost validation
  if (data.estimated_cost != null && (isNaN(Number(data.estimated_cost)) || Number(data.estimated_cost) < 0)) {
    errors.push('estimated_cost must be a non-negative number');
  }
  if (data.actual_cost != null && (isNaN(Number(data.actual_cost)) || Number(data.actual_cost) < 0)) {
    errors.push('actual_cost must be a non-negative number');
  }

  // Date range validation
  if (data.start_date && data.end_date) {
    if (data.start_date > data.end_date) {
      errors.push('end_date must be after start_date');
    }
  }

  // Status validation
  const validStatuses = ['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled', 'blocked'];
  if (data.status != null && !validStatuses.includes(data.status)) {
    errors.push(`status must be one of: ${validStatuses.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

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

    // Validate task data
    const validation = validateTaskData(task_data);
    if (!validation.valid) {
      return Response.json({ 
        error: 'Validation failed', 
        details: validation.errors 
      }, { status: 400 });
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