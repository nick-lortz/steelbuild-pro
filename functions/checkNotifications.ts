import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Scheduled function to check for overdue items and send notifications
 * This can be called via cron job or manually
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all projects, RFIs, drawings, tasks, invoices, financials, and expenses
    const [projects, rfis, drawings, tasks, invoices, financials, expenses] = await Promise.all([
      base44.asServiceRole.entities.Project.list(),
      base44.asServiceRole.entities.RFI.list(),
      base44.asServiceRole.entities.DrawingSet.list(),
      base44.asServiceRole.entities.Task.list(),
      base44.asServiceRole.entities.ClientInvoice.list(),
      base44.asServiceRole.entities.Financial.list(),
      base44.asServiceRole.entities.Expense.list(),
    ]);

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    let notificationCount = 0;

    // Check overdue RFIs
    for (const rfi of rfis) {
      if (rfi.status !== 'answered' && rfi.status !== 'closed' && rfi.due_date && rfi.assigned_to) {
        const dueDate = new Date(rfi.due_date);
        
        // Overdue
        if (dueDate < now) {
          const project = projects.find(p => p.id === rfi.project_id);
          await base44.asServiceRole.entities.Notification.create({
            user_email: rfi.assigned_to,
            type: 'rfi_overdue',
            title: 'Overdue RFI',
            message: `RFI-${String(rfi.rfi_number).padStart(3, '0')} is overdue in project ${project?.project_number || 'Unknown'}`,
            link: `/RFIs?id=${rfi.id}`,
            link_label: 'View RFI',
            entity_type: 'RFI',
            entity_id: rfi.id,
            project_id: rfi.project_id,
            priority: 'high',
            is_read: false,
            email_sent: false,
          });
          notificationCount++;
        }
        // Due soon
        else if (dueDate <= threeDaysFromNow) {
          const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
          const project = projects.find(p => p.id === rfi.project_id);
          await base44.asServiceRole.entities.Notification.create({
            user_email: rfi.assigned_to,
            type: 'rfi_due_soon',
            title: 'RFI Due Soon',
            message: `RFI-${String(rfi.rfi_number).padStart(3, '0')} is due in ${daysUntil} day(s) in project ${project?.project_number || 'Unknown'}`,
            link: `/RFIs?id=${rfi.id}`,
            link_label: 'View RFI',
            entity_type: 'RFI',
            entity_id: rfi.id,
            project_id: rfi.project_id,
            priority: 'medium',
            is_read: false,
            email_sent: false,
          });
          notificationCount++;
        }
      }
    }

    // Check overdue drawings
    for (const drawing of drawings) {
      if (drawing.status !== 'FFF' && drawing.status !== 'As-Built' && drawing.due_date && drawing.reviewer) {
        const dueDate = new Date(drawing.due_date);
        if (dueDate < now) {
          const project = projects.find(p => p.id === drawing.project_id);
          await base44.asServiceRole.entities.Notification.create({
            user_email: drawing.reviewer,
            type: 'drawing_overdue',
            title: 'Overdue Drawing Set',
            message: `Drawing set "${drawing.set_name}" is overdue in project ${project?.project_number || 'Unknown'}`,
            link: `/Drawings?id=${drawing.id}`,
            link_label: 'View Drawing',
            entity_type: 'DrawingSet',
            entity_id: drawing.id,
            project_id: drawing.project_id,
            priority: 'high',
            is_read: false,
            email_sent: false,
          });
          notificationCount++;
        }
      }
    }

    // Check overdue tasks
    for (const task of tasks) {
      if (task.status !== 'completed' && task.status !== 'cancelled' && task.end_date) {
        const endDate = new Date(task.end_date);
        
        if (endDate < now && task.assigned_resources && task.assigned_resources.length > 0) {
          const project = projects.find(p => p.id === task.project_id);
          for (const resourceEmail of task.assigned_resources) {
            await base44.asServiceRole.entities.Notification.create({
              user_email: resourceEmail,
              type: 'task_overdue',
              title: 'Overdue Task',
              message: `Task "${task.name}" is overdue in project ${project?.project_number || 'Unknown'}`,
              link: `/Schedule?task=${task.id}`,
              link_label: 'View Task',
              entity_type: 'Task',
              entity_id: task.id,
              project_id: task.project_id,
              priority: 'high',
              is_read: false,
              email_sent: false,
            });
            notificationCount++;
          }
        }
        // Due soon
        else if (endDate > now && endDate <= threeDaysFromNow && task.assigned_resources && task.assigned_resources.length > 0) {
          const daysUntil = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
          const project = projects.find(p => p.id === task.project_id);
          for (const resourceEmail of task.assigned_resources) {
            await base44.asServiceRole.entities.Notification.create({
              user_email: resourceEmail,
              type: 'task_due_soon',
              title: 'Task Due Soon',
              message: `Task "${task.name}" is due in ${daysUntil} day(s) in project ${project?.project_number || 'Unknown'}`,
              link: `/Schedule?task=${task.id}`,
              link_label: 'View Task',
              entity_type: 'Task',
              entity_id: task.id,
              project_id: task.project_id,
              priority: 'medium',
              is_read: false,
              email_sent: false,
            });
            notificationCount++;
          }
        }
      }
    }

    // Check budget alerts
    for (const project of projects) {
      if (project.status !== 'in_progress') continue;

      const projectFinancials = financials.filter(f => f.project_id === project.id);
      const budget = projectFinancials.reduce((sum, f) => sum + (Number(f.budget_amount) || 0), 0);
      const actualFromFinancials = projectFinancials.reduce((sum, f) => sum + (Number(f.actual_amount) || 0), 0);
      const actualFromExpenses = expenses
        .filter(e => e.project_id === project.id && (e.payment_status === 'paid' || e.payment_status === 'approved'))
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const actual = actualFromFinancials + actualFromExpenses;

      if (budget > 0) {
        const spentPercent = (actual / budget) * 100;

        if (spentPercent >= 90 && project.project_manager) {
          const severity = spentPercent >= 100 ? 'critical' : spentPercent >= 95 ? 'high' : 'medium';
          await base44.asServiceRole.entities.Notification.create({
            user_email: project.project_manager,
            type: 'budget_alert',
            title: `Budget Alert: ${project.project_number}`,
            message: `Project has spent ${spentPercent.toFixed(1)}% of budget ($${actual.toLocaleString()} of $${budget.toLocaleString()})`,
            link: `/Financials?project=${project.id}`,
            link_label: 'View Financials',
            entity_type: 'Project',
            entity_id: project.id,
            project_id: project.id,
            priority: severity,
            is_read: false,
            email_sent: false,
          });
          notificationCount++;
        }
      }
    }

    return Response.json({
      success: true,
      message: `Created ${notificationCount} notifications`,
      notificationCount
    });
  } catch (error) {
    console.error('Error checking notifications:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});