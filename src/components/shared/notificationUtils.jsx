import { base44 } from '@/api/base44Client';

/**
 * Create a notification for a user
 */
export async function createNotification({
  userEmail,
  type,
  title,
  message,
  link,
  linkLabel,
  entityType,
  entityId,
  projectId,
  priority = 'medium',
  sendEmail = false
}) {
  try {
    const notification = await base44.entities.Notification.create({
      user_email: userEmail,
      type,
      title,
      message,
      link,
      link_label: linkLabel,
      entity_type: entityType,
      entity_id: entityId,
      project_id: projectId,
      priority,
      is_read: false,
      email_sent: false
    });

    // Send email if requested
    if (sendEmail) {
      try {
        await base44.integrations.Core.SendEmail({
          to: userEmail,
          subject: `[PM System] ${title}`,
          body: `
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 10px;">
                    ${title}
                  </h2>
                  <p style="font-size: 16px; margin: 20px 0;">
                    ${message}
                  </p>
                  ${link ? `
                    <div style="margin: 30px 0;">
                      <a href="${window.location.origin}${link}" 
                         style="background-color: #f59e0b; color: white; padding: 12px 24px; 
                                text-decoration: none; border-radius: 5px; display: inline-block;">
                        ${linkLabel || 'View Details'}
                      </a>
                    </div>
                  ` : ''}
                  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
                  <p style="color: #666; font-size: 12px;">
                    This is an automated notification from your Project Management System.
                  </p>
                </div>
              </body>
            </html>
          `
        });

        await base44.entities.Notification.update(notification.id, {
          email_sent: true,
          email_sent_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to send email notification:', error);
      }
    }

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}

/**
 * Notify user about task assignment
 */
export async function notifyTaskAssignment(task, project, assignedUserEmail, sendEmail = false) {
  await createNotification({
    userEmail: assignedUserEmail,
    type: 'task_assigned',
    title: 'New Task Assignment',
    message: `You've been assigned to task "${task.name}" in project ${project?.project_number || 'Unknown'}`,
    link: `/Schedule?task=${task.id}`,
    linkLabel: 'View Task',
    entityType: 'Task',
    entityId: task.id,
    projectId: task.project_id,
    priority: 'medium',
    sendEmail
  });
}

/**
 * Check for overdue items and create notifications
 */
export async function checkOverdueItems(rfis, drawings, tasks, projects, invoices = []) {
  const now = new Date();
  const notifications = [];

  // Check overdue RFIs
  for (const rfi of rfis) {
    if (rfi.status !== 'answered' && rfi.status !== 'closed' && rfi.due_date) {
      const dueDate = new Date(rfi.due_date);
      if (dueDate < now && rfi.assigned_to) {
        const project = projects.find(p => p.id === rfi.project_id);
        notifications.push(
          createNotification({
            userEmail: rfi.assigned_to,
            type: 'rfi_overdue',
            title: 'Overdue RFI',
            message: `RFI-${String(rfi.rfi_number).padStart(3, '0')} is overdue in project ${project?.project_number || 'Unknown'}`,
            link: `/RFIs?id=${rfi.id}`,
            linkLabel: 'View RFI',
            entityType: 'RFI',
            entityId: rfi.id,
            projectId: rfi.project_id,
            priority: 'high',
            sendEmail: true
          })
        );
      }
    }
  }

  // Check overdue drawings
  for (const drawing of drawings) {
    if (drawing.status !== 'FFF' && drawing.status !== 'As-Built' && drawing.due_date) {
      const dueDate = new Date(drawing.due_date);
      if (dueDate < now && drawing.reviewer) {
        const project = projects.find(p => p.id === drawing.project_id);
        notifications.push(
          createNotification({
            userEmail: drawing.reviewer,
            type: 'drawing_overdue',
            title: 'Overdue Drawing Set',
            message: `Drawing set "${drawing.set_name}" is overdue in project ${project?.project_number || 'Unknown'}`,
            link: `/Drawings?id=${drawing.id}`,
            linkLabel: 'View Drawing',
            entityType: 'DrawingSet',
            entityId: drawing.id,
            projectId: drawing.project_id,
            priority: 'high',
            sendEmail: true
          })
        );
      }
    }
  }

  // Check overdue tasks
  for (const task of tasks) {
    if (task.status !== 'completed' && task.status !== 'cancelled' && task.end_date) {
      const endDate = new Date(task.end_date);
      if (endDate < now && task.assigned_resources && task.assigned_resources.length > 0) {
        const project = projects.find(p => p.id === task.project_id);
        // Notify assigned resources (assuming they are email addresses)
        for (const resourceEmail of task.assigned_resources) {
          notifications.push(
            createNotification({
              userEmail: resourceEmail,
              type: 'task_overdue',
              title: 'Overdue Task',
              message: `Task "${task.name}" is overdue in project ${project?.project_number || 'Unknown'}`,
              link: `/Schedule?task=${task.id}`,
              linkLabel: 'View Task',
              entityType: 'Task',
              entityId: task.id,
              projectId: task.project_id,
              priority: 'high',
              sendEmail: true
            })
          );
        }
      }
    }
  }

  // Check overdue invoices
  for (const invoice of invoices) {
    if (invoice.payment_status === 'pending' || invoice.payment_status === 'overdue') {
      // Notify project manager
      const project = projects.find(p => p.id === invoice.project_id);
      if (project && project.project_manager) {
        notifications.push(
          createNotification({
            userEmail: project.project_manager,
            type: 'invoice_overdue',
            title: 'Overdue Invoice',
            message: `Invoice ${invoice.invoice_number} is pending payment in project ${project.project_number}`,
            link: `/Financials?project=${invoice.project_id}`,
            linkLabel: 'View Financials',
            entityType: 'ClientInvoice',
            entityId: invoice.id,
            projectId: invoice.project_id,
            priority: 'medium',
            sendEmail: true
          })
        );
      }
    }
  }

  await Promise.all(notifications);
  return notifications.length;
}

/**
 * Check for upcoming due dates (3 days before)
 */
export async function checkUpcomingDeadlines(rfis, tasks, projects) {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const notifications = [];

  // Check upcoming RFI deadlines
  for (const rfi of rfis) {
    if (rfi.status !== 'answered' && rfi.status !== 'closed' && rfi.due_date && rfi.assigned_to) {
      const dueDate = new Date(rfi.due_date);
      if (dueDate > now && dueDate <= threeDaysFromNow) {
        const project = projects.find(p => p.id === rfi.project_id);
        const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        notifications.push(
          createNotification({
            userEmail: rfi.assigned_to,
            type: 'rfi_due_soon',
            title: 'RFI Due Soon',
            message: `RFI-${String(rfi.rfi_number).padStart(3, '0')} is due in ${daysUntil} day(s) in project ${project?.project_number || 'Unknown'}`,
            link: `/RFIs?id=${rfi.id}`,
            linkLabel: 'View RFI',
            entityType: 'RFI',
            entityId: rfi.id,
            projectId: rfi.project_id,
            priority: 'medium',
            sendEmail: false
          })
        );
      }
    }
  }

  // Check upcoming task deadlines
  for (const task of tasks) {
    if (task.status !== 'completed' && task.status !== 'cancelled' && task.end_date) {
      const endDate = new Date(task.end_date);
      if (endDate > now && endDate <= threeDaysFromNow && task.assigned_resources && task.assigned_resources.length > 0) {
        const project = projects.find(p => p.id === task.project_id);
        const daysUntil = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        for (const resourceEmail of task.assigned_resources) {
          notifications.push(
            createNotification({
              userEmail: resourceEmail,
              type: 'task_due_soon',
              title: 'Task Due Soon',
              message: `Task "${task.name}" is due in ${daysUntil} day(s) in project ${project?.project_number || 'Unknown'}`,
              link: `/Schedule?task=${task.id}`,
              linkLabel: 'View Task',
              entityType: 'Task',
              entityId: task.id,
              projectId: task.project_id,
              priority: 'medium',
              sendEmail: false
            })
          );
        }
      }
    }
  }

  await Promise.all(notifications);
  return notifications.length;
}

/**
 * Check budget alerts (over 90% spent)
 */
export async function checkBudgetAlerts(projects, financials, expenses = []) {
  const notifications = [];

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

      // Alert at 90%, 95%, and 100%
      if (spentPercent >= 90 && project.project_manager) {
        const severity = spentPercent >= 100 ? 'critical' : spentPercent >= 95 ? 'high' : 'medium';
        notifications.push(
          createNotification({
            userEmail: project.project_manager,
            type: 'budget_alert',
            title: `Budget Alert: ${project.project_number}`,
            message: `Project has spent ${spentPercent.toFixed(1)}% of budget ($${actual.toLocaleString()} of $${budget.toLocaleString()})`,
            link: `/Financials?project=${project.id}`,
            linkLabel: 'View Financials',
            entityType: 'Project',
            entityId: project.id,
            projectId: project.id,
            priority: severity,
            sendEmail: spentPercent >= 95
          })
        );
      }
    }
  }

  await Promise.all(notifications);
  return notifications.length;
}