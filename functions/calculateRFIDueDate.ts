import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Auto-calculate RFI due date based on impacted task start date
 * Standard: 48 hours before impacted work begins
 * Escalates if task starts within 3 days (shortens due date)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { project_id, rfi_id, linked_task_ids } = await req.json();

    if (!linked_task_ids || linked_task_ids.length === 0) {
      return Response.json({ due_date: null, days_until_impact: null });
    }

    // Fetch impacted tasks
    const tasks = await base44.entities.Task.filter({
      project_id,
      id: { $in: linked_task_ids }
    });

    if (!tasks || tasks.length === 0) {
      return Response.json({ due_date: null, days_until_impact: null });
    }

    // Find earliest task start (critical impact)
    const earliestStart = new Date(
      Math.min(...tasks.map(t => new Date(t.start_date).getTime()))
    );

    const today = new Date();
    const daysUntilImpact = Math.ceil((earliestStart - today) / (1000 * 60 * 60 * 24));

    // Due date: 48 hours before impact, or 24 hours if critical (< 3 days)
    const dueOffset = daysUntilImpact <= 3 ? 1 : 2;
    const dueDateObj = new Date(earliestStart);
    dueDateObj.setDate(dueDateObj.getDate() - dueOffset);

    const dueDate = dueDateObj.toISOString().split('T')[0];
    const priority = daysUntilImpact <= 3 ? 'critical' : daysUntilImpact <= 7 ? 'high' : 'medium';

    return Response.json({
      due_date: dueDate,
      days_until_impact: daysUntilImpact,
      calculated_priority: priority,
      impacted_task_start: earliestStart.toISOString().split('T')[0]
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});