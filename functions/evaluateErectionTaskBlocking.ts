import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { task_id } = await req.json();

    if (!task_id) {
      return Response.json({ error: 'task_id required' }, { status: 400 });
    }

    const [task] = await base44.entities.Task.filter({ id: task_id });
    if (!task || task.phase !== 'erection') {
      return Response.json({ error: 'Erection task not found' }, { status: 404 });
    }

    const blockingReasons = [];

    // 1. Check linked deliveries
    if (task.linked_delivery_ids && task.linked_delivery_ids.length > 0) {
      const deliveries = await base44.entities.Delivery.filter({
        id: { $in: task.linked_delivery_ids }
      });

      const incompleteDeliveries = deliveries.filter(d => 
        d.delivery_status !== 'received' && 
        d.delivery_status !== 'closed' &&
        d.delivery_status !== 'partially_received'
      );

      if (incompleteDeliveries.length > 0) {
        blockingReasons.push({
          type: 'INCOMPLETE_DELIVERIES',
          severity: 'P0',
          message: `${incompleteDeliveries.length} required delivery(ies) incomplete`,
          details: incompleteDeliveries.map(d => ({
            delivery_id: d.id,
            delivery_number: d.delivery_number,
            status: d.delivery_status,
            expected_date: d.scheduled_date || d.requested_date
          }))
        });
      }

      // Check for unresolved delivery exceptions
      const exceptionalDeliveries = deliveries.filter(d => 
        d.exceptions && d.exceptions.some(ex => !ex.resolved)
      );

      if (exceptionalDeliveries.length > 0) {
        blockingReasons.push({
          type: 'DELIVERY_EXCEPTIONS',
          severity: 'P1',
          message: `${exceptionalDeliveries.length} delivery exception(s) unresolved`,
          details: exceptionalDeliveries.map(d => ({
            delivery_id: d.id,
            delivery_number: d.delivery_number,
            unresolved_exceptions: (d.exceptions || []).filter(ex => !ex.resolved).length
          }))
        });
      }
    }

    // 2. Check linked drawing sets
    if (task.linked_drawing_set_ids && task.linked_drawing_set_ids.length > 0) {
      const drawings = await base44.entities.DrawingSet.filter({
        id: { $in: task.linked_drawing_set_ids }
      });

      // Erection drawings must be approved (FFF or As-Built)
      const unapprovedDrawings = drawings.filter(d => 
        d.status !== 'FFF' && 
        d.status !== 'As-Built'
      );

      if (unapprovedDrawings.length > 0) {
        blockingReasons.push({
          type: 'UNAPPROVED_DRAWINGS',
          severity: 'P0',
          message: `${unapprovedDrawings.length} erection drawing(s) not approved`,
          details: unapprovedDrawings.map(d => ({
            drawing_set_id: d.id,
            set_name: d.set_name,
            current_status: d.status,
            revision: d.current_revision
          }))
        });
      }

      // Flag if QA failed on erection drawings
      const failedQA = drawings.filter(d => d.qa_status === 'fail');
      if (failedQA.length > 0) {
        blockingReasons.push({
          type: 'DRAWING_QA_FAILED',
          severity: 'P0',
          message: `${failedQA.length} drawing(s) failed QA checks`,
          details: failedQA.map(d => ({
            drawing_set_id: d.id,
            set_name: d.set_name,
            blocker_count: (d.qa_blockers || []).length
          }))
        });
      }
    }

    // 3. Check predecessor tasks
    if (task.predecessor_ids && task.predecessor_ids.length > 0) {
      const predecessors = await base44.entities.Task.filter({
        id: { $in: task.predecessor_ids }
      });

      const incompletePrerequisites = predecessors.filter(p => 
        p.status !== 'completed' && 
        p.status !== 'in_progress'
      );

      if (incompletePrerequisites.length > 0) {
        blockingReasons.push({
          type: 'INCOMPLETE_PREREQUISITES',
          severity: 'P1',
          message: `${incompletePrerequisites.length} prerequisite task(s) not started`,
          details: incompletePrerequisites.map(p => ({
            task_id: p.id,
            task_name: p.name,
            status: p.status,
            scheduled_start: p.start_date
          }))
        });
      }
    }

    // Determine final status
    const hasCriticalBlockers = blockingReasons.some(r => r.severity === 'P0');
    const shouldBlock = hasCriticalBlockers;
    const newStatus = shouldBlock ? 'blocked' : (task.status === 'blocked' ? 'not_started' : task.status);

    // Update task if status changed
    if (newStatus !== task.status) {
      await base44.asServiceRole.entities.Task.update(task_id, {
        status: newStatus
      });
    }

    return Response.json({
      task_id,
      is_blocked: shouldBlock,
      blocking_reasons: blockingReasons,
      new_status: newStatus,
      critical_count: blockingReasons.filter(r => r.severity === 'P0').length,
      warning_count: blockingReasons.filter(r => r.severity === 'P1').length
    });
  } catch (error) {
    console.error('Erection task blocking evaluation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});