import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));

    // Get all incomplete tasks
    const tasks = await base44.asServiceRole.entities.Task.filter({
      status: { $ne: 'done' }
    });

    const notifications = [];

    for (const task of tasks) {
      if (!task.due_date || !task.assigned_to) continue;

      const dueDate = new Date(task.due_date);
      const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      // Check if task is overdue
      if (daysUntilDue < 0) {
        // Check if we already sent an overdue notification today
        const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
          user_email: task.assigned_to,
          related_entity: 'Task',
          related_id: task.id,
          type: 'task_overdue',
          created_date: { $gte: new Date(now.setHours(0, 0, 0, 0)).toISOString() }
        });

        if (existingNotifs.length === 0) {
          notifications.push({
            user_email: task.assigned_to,
            type: 'task_overdue',
            title: `Task Overdue: ${task.title}`,
            message: `Task "${task.title}" is ${Math.abs(daysUntilDue)} days overdue`,
            priority: 'high',
            related_entity: 'Task',
            related_id: task.id,
            project_id: task.project_id,
            is_read: false
          });
        }
      }
      // Check if task is due within 3 days
      else if (daysUntilDue <= 3 && daysUntilDue >= 0) {
        // Check if we already sent a due soon notification today
        const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
          user_email: task.assigned_to,
          related_entity: 'Task',
          related_id: task.id,
          type: 'task_due_soon',
          created_date: { $gte: new Date(now.setHours(0, 0, 0, 0)).toISOString() }
        });

        if (existingNotifs.length === 0) {
          notifications.push({
            user_email: task.assigned_to,
            type: 'task_due_soon',
            title: `Task Due Soon: ${task.title}`,
            message: `Task "${task.title}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
            priority: daysUntilDue === 0 ? 'high' : 'medium',
            related_entity: 'Task',
            related_id: task.id,
            project_id: task.project_id,
            is_read: false
          });
        }
      }
    }

    // Bulk create notifications
    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    return Response.json({
      success: true,
      tasks_checked: tasks.length,
      notifications_created: notifications.length,
      details: {
        overdue: notifications.filter(n => n.type === 'task_overdue').length,
        due_soon: notifications.filter(n => n.type === 'task_due_soon').length
      }
    });

  } catch (error) {
    console.error('Task deadline check failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});