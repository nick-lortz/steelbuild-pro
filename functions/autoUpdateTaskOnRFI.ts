import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    // Triggered when RFI status changes
    const { event, data: rfi } = payload;
    
    if (!rfi || event.type !== 'update') {
      return Response.json({ message: 'No action required' });
    }

    // Only process when RFI is answered or closed
    if (!['answered', 'closed'].includes(rfi.status)) {
      return Response.json({ message: 'RFI status not actionable' });
    }

    // Find linked tasks that are blocked by this RFI
    const linkedTaskIds = rfi.linked_task_ids || [];
    if (linkedTaskIds.length === 0) {
      return Response.json({ message: 'No linked tasks' });
    }

    const updates = [];
    
    for (const taskId of linkedTaskIds) {
      const tasks = await base44.asServiceRole.entities.Task.filter({ id: taskId });
      const task = tasks[0];
      
      if (!task) continue;

      // If task is blocked or on_hold, move it to not_started or in_progress
      if (['blocked', 'on_hold'].includes(task.status)) {
        await base44.asServiceRole.entities.Task.update(taskId, {
          status: task.actual_start ? 'in_progress' : 'not_started',
          notes: `${task.notes || ''}\n[AUTO] RFI #${rfi.rfi_number} resolved - ${new Date().toISOString()}`
        });
        updates.push(`Task ${task.name} unblocked`);
      }
    }

    // Clear RFI-related constraints
    const constraints = await base44.asServiceRole.entities.Constraint.filter({
      constraint_type: 'RFI_RESPONSE_REQUIRED',
      evidence_links: { $in: [rfi.id] },
      status: 'OPEN'
    });

    for (const constraint of constraints) {
      await base44.asServiceRole.entities.Constraint.update(constraint.id, {
        status: 'CLEARED',
        cleared_at: new Date().toISOString(),
        cleared_by_user_id: 'auto_workflow'
      });
      updates.push(`Constraint cleared for ${constraint.task_id || constraint.work_package_id}`);
    }

    // Send notification
    if (rfi.assigned_to) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: rfi.assigned_to,
        subject: `RFI #${rfi.rfi_number} Resolved - Tasks Unblocked`,
        body: `RFI #${rfi.rfi_number} "${rfi.subject}" has been ${rfi.status}.\n\nLinked tasks have been automatically unblocked:\n${updates.join('\n')}`
      });
    }

    return Response.json({ 
      success: true, 
      updates,
      message: `Processed ${updates.length} updates for RFI #${rfi.rfi_number}`
    });
    
  } catch (error) {
    console.error('Auto-update task error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});