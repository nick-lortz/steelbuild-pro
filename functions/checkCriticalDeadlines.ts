import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Admin-only scheduled task
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const today = new Date();
    const threeDaysOut = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));
    const notifications = [];

    // Check RFI deadlines
    const rfis = await base44.asServiceRole.entities.RFI.filter({
      status: { $in: ['submitted', 'under_review'] }
    });

    for (const rfi of rfis) {
      if (!rfi.due_date) continue;
      
      const dueDate = new Date(rfi.due_date);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue <= 0) {
        // Overdue
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: rfi.assigned_to || rfi.created_by,
          subject: `OVERDUE: RFI #${rfi.rfi_number} - ${rfi.subject}`,
          body: `RFI #${rfi.rfi_number} is now ${Math.abs(daysUntilDue)} days overdue.\n\nProject: ${rfi.project_id}\nStatus: ${rfi.status}\nDue: ${rfi.due_date}\n\nImmediate action required.`
        });
        notifications.push(`Overdue alert: RFI #${rfi.rfi_number}`);
      } else if (daysUntilDue <= 2) {
        // Urgent - 2 days or less
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: rfi.assigned_to || rfi.created_by,
          subject: `URGENT: RFI #${rfi.rfi_number} due in ${daysUntilDue} day(s)`,
          body: `RFI #${rfi.rfi_number} "${rfi.subject}" is due in ${daysUntilDue} day(s).\n\nProject: ${rfi.project_id}\nStatus: ${rfi.status}\nDue: ${rfi.due_date}\n\nPlease prioritize.`
        });
        notifications.push(`Urgent alert: RFI #${rfi.rfi_number}`);
      }
    }

    // Check critical task delays
    const tasks = await base44.asServiceRole.entities.Task.filter({
      status: 'in_progress',
      is_critical: true
    });

    for (const task of tasks) {
      if (!task.end_date) continue;
      
      const endDate = new Date(task.end_date);
      const daysUntilEnd = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilEnd <= 0 && task.progress_percent < 100) {
        // Critical task overdue
        const projects = await base44.asServiceRole.entities.Project.filter({ id: task.project_id });
        const pm = projects[0]?.project_manager;
        
        if (pm) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: pm,
            subject: `CRITICAL: Task "${task.name}" overdue on critical path`,
            body: `Critical path task is ${Math.abs(daysUntilEnd)} days overdue.\n\nTask: ${task.name}\nProject: ${task.project_id}\nProgress: ${task.progress_percent}%\nPlanned End: ${task.end_date}\n\nThis may impact project completion.`
          });
          notifications.push(`Critical delay: ${task.name}`);
        }
      } else if (daysUntilEnd <= 3 && task.progress_percent < 70) {
        // At-risk critical task
        const projects = await base44.asServiceRole.entities.Project.filter({ id: task.project_id });
        const pm = projects[0]?.project_manager;
        
        if (pm) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: pm,
            subject: `AT RISK: Critical task "${task.name}" - ${daysUntilEnd} days remaining`,
            body: `Critical path task is at risk of delay.\n\nTask: ${task.name}\nProject: ${task.project_id}\nProgress: ${task.progress_percent}%\nDays Remaining: ${daysUntilEnd}\nPlanned End: ${task.end_date}\n\nReview and mitigate risk.`
          });
          notifications.push(`At-risk alert: ${task.name}`);
        }
      }
    }

    // Check fabrication hold areas
    const holdTasks = await base44.asServiceRole.entities.Task.filter({
      hold_area: true,
      task_type: 'ERECTION'
    });

    if (holdTasks.length > 0) {
      const projectGroups = {};
      for (const task of holdTasks) {
        if (!projectGroups[task.project_id]) projectGroups[task.project_id] = [];
        projectGroups[task.project_id].push(task);
      }

      for (const [projectId, tasks] of Object.entries(projectGroups)) {
        const projects = await base44.asServiceRole.entities.Project.filter({ id: projectId });
        const pm = projects[0]?.project_manager;
        
        if (pm) {
          const taskList = tasks.map(t => `- ${t.name} (${t.erection_area}): ${t.hold_reason}`).join('\n');
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: pm,
            subject: `${tasks.length} areas on hold - erection impact`,
            body: `The following erection areas are currently on hold:\n\n${taskList}\n\nReview hold status and clear when ready.`
          });
          notifications.push(`Hold areas: ${tasks.length} on project ${projectId}`);
        }
      }
    }

    return Response.json({ 
      success: true, 
      notifications,
      count: notifications.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Deadline check error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});