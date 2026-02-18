import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Get all tasks with upcoming deadlines
    const tasks = await base44.asServiceRole.entities.Task.list('-end_date');
    const now = new Date();
    const notifiedTasks = new Set();

    for (const task of tasks) {
      if (!task.end_date || task.status === 'completed') continue;

      const endDate = new Date(task.end_date);
      const daysUntil = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

      // Get user preferences to determine notification threshold
      const assignedEmail = task.assigned_resources?.[0];
      const prefs = assignedEmail 
        ? await base44.asServiceRole.entities.NotificationPreference.filter(
            { user_email: assignedEmail },
            '-created_date',
            1
          )
        : [];

      const daysBefore = prefs?.[0]?.deadline_days_before || 3;

      if (daysUntil > 0 && daysUntil <= daysBefore && !notifiedTasks.has(task.id)) {
        const wp = task.work_package_id
          ? await base44.asServiceRole.entities.WorkPackage.filter(
              { id: task.work_package_id },
              '-created_date',
              1
            )
          : [];

        const project = task.project_id
          ? await base44.asServiceRole.entities.Project.filter(
              { id: task.project_id },
              '-created_date',
              1
            )
          : [];

        // Generate notification for each assigned resource
        for (const resourceEmail of task.assigned_resources || []) {
          await base44.functions.invoke('generateNotifications', {
            event_type: 'deadline',
            entity_type: 'Task',
            entity_id: task.id,
            project_id: task.project_id,
            recipient_email: resourceEmail,
            title: `Task Deadline: ${task.name}`,
            message: `"${task.name}" in ${wp?.[0]?.title} is due in ${daysUntil} day(s)`,
            priority: daysUntil === 1 ? 'critical' : daysUntil <= 2 ? 'high' : 'normal',
            action_url: `/Schedule?task=${task.id}`
          });
        }
        notifiedTasks.add(task.id);
      }
    }

    return Response.json({ checked: tasks.length, notified: notifiedTasks.size });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});