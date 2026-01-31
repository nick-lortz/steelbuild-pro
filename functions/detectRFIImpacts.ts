import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Detect what work is blocked by an RFI
 * Check: fabrication readiness, delivery schedule, erection sequences
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { project_id, linked_task_ids, linked_piece_marks, linked_delivery_ids } = await req.json();

    const impacts = {
      fabrication_blocked: false,
      delivery_blocked: false,
      erection_blocked: false,
      affected_piece_marks: [],
      blocked_tasks: [],
      blocked_deliveries: [],
      blocked_crews: [],
      days_of_impact: 0
    };

    // Check tasks
    if (linked_task_ids && linked_task_ids.length > 0) {
      const tasks = await base44.entities.Task.filter({
        project_id,
        id: { $in: linked_task_ids }
      });

      tasks.forEach(task => {
        if (task.phase === 'fabrication') impacts.fabrication_blocked = true;
        if (task.phase === 'delivery') impacts.delivery_blocked = true;
        if (task.phase === 'erection') impacts.erection_blocked = true;
        impacts.blocked_tasks.push({
          task_id: task.id,
          task_name: task.name,
          phase: task.phase,
          start_date: task.start_date,
          assigned_resources: task.assigned_resources
        });
      });
    }

    // Check deliveries
    if (linked_delivery_ids && linked_delivery_ids.length > 0) {
      const deliveries = await base44.entities.Delivery.filter({
        project_id,
        id: { $in: linked_delivery_ids }
      });

      if (deliveries.length > 0) {
        impacts.delivery_blocked = true;
        impacts.blocked_deliveries = deliveries.map(d => ({
          delivery_id: d.id,
          package_name: d.package_name,
          scheduled_date: d.scheduled_date,
          weight_tons: d.weight_tons
        }));
      }
    }

    // Check crews impacted
    if (impacts.blocked_tasks.length > 0) {
      const crews = await base44.entities.Crew.filter({
        project_id,
        status: 'active'
      });

      const crewMap = {};
      crews.forEach(c => crewMap[c.id] = c);

      impacts.blocked_tasks.forEach(task => {
        if (task.assigned_resources) {
          task.assigned_resources.forEach(resourceId => {
            if (crewMap[resourceId]) {
              impacts.blocked_crews.push({
                crew_id: resourceId,
                crew_name: crewMap[resourceId].crew_name,
                crew_lead: crewMap[resourceId].crew_lead
              });
            }
          });
        }
      });
    }

    return Response.json(impacts);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});