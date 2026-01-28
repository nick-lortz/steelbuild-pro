import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all recurring task templates
    const recurringTasks = await base44.asServiceRole.entities.Task.filter({
      is_recurring: true
    });

    const now = new Date();
    const results = {
      created: 0,
      skipped: 0,
      errors: []
    };

    for (const template of recurringTasks) {
      try {
        // Skip if no next recurrence date set
        if (!template.next_recurrence_date) {
          // Initialize next recurrence date based on start date
          const startDate = new Date(template.start_date);
          const nextDate = calculateNextOccurrence(startDate, template);
          
          await base44.asServiceRole.entities.Task.update(template.id, {
            next_recurrence_date: nextDate.toISOString().split('T')[0]
          });
          results.skipped++;
          continue;
        }

        const nextRecurrence = new Date(template.next_recurrence_date);

        // Check if it's time to create the next instance
        if (nextRecurrence <= now) {
          // Check if we've passed the end date
          if (template.recurrence_end_date && new Date(template.recurrence_end_date) < now) {
            // Mark template as inactive
            await base44.asServiceRole.entities.Task.update(template.id, {
              is_recurring: false
            });
            results.skipped++;
            continue;
          }

          // Create new instance
          const instanceData = {
            ...template,
            id: undefined,
            created_date: undefined,
            updated_date: undefined,
            parent_recurring_task_id: template.id,
            is_recurring: false,
            start_date: template.next_recurrence_date,
            end_date: addDaysToDate(template.next_recurrence_date, template.duration_days || 1),
            status: 'not_started',
            progress_percent: 0,
            actual_hours: 0,
            actual_cost: 0,
            time_logs: []
          };

          await base44.asServiceRole.entities.Task.create(instanceData);

          // Update template with next recurrence date
          const newNextDate = calculateNextOccurrence(nextRecurrence, template);
          await base44.asServiceRole.entities.Task.update(template.id, {
            next_recurrence_date: newNextDate.toISOString().split('T')[0]
          });

          results.created++;
        } else {
          results.skipped++;
        }
      } catch (error) {
        results.errors.push({
          task_id: template.id,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      message: `Created ${results.created} task instances`,
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateNextOccurrence(currentDate, template) {
  const next = new Date(currentDate);
  const interval = template.recurrence_interval || 1;

  switch (template.recurrence_pattern) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + (7 * interval));
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      break;
  }

  return next;
}

function addDaysToDate(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}