import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { task_id, resource_ids = [], equipment_ids = [], task_start_date, task_end_date } = await req.json();

    const allResourceIds = [...resource_ids, ...equipment_ids];
    if (allResourceIds.length === 0) {
      return Response.json({ valid: true });
    }

    // Fetch all resources
    const resources = await base44.entities.Resource.filter({
      id: { $in: allResourceIds }
    });

    const errors = [];

    // Check 1: All IDs exist
    const foundIds = resources.map(r => r.id);
    const missingIds = allResourceIds.filter(id => !foundIds.includes(id));
    if (missingIds.length > 0) {
      errors.push(`Resources not found: ${missingIds.join(', ')}`);
    }

    // Check 2: No unavailable resources
    const unavailable = resources.filter(r => r.status === 'unavailable');
    if (unavailable.length > 0) {
      errors.push(`Unavailable resources: ${unavailable.map(r => r.name).join(', ')}`);
    }

    // Check 3: Date availability conflicts
    if (task_start_date && task_end_date) {
      for (const resource of resources) {
        if (resource.availability_start && new Date(task_start_date) < new Date(resource.availability_start)) {
          errors.push(`${resource.name} not available until ${resource.availability_start}`);
        }
        if (resource.availability_end && new Date(task_end_date) > new Date(resource.availability_end)) {
          errors.push(`${resource.name} availability ends ${resource.availability_end}`);
        }
      }
    }

    // Check 4: Max concurrent capacity for labor
    const laborResources = resources.filter(r => r.type === 'labor');
    if (laborResources.length > 0 && task_start_date && task_end_date) {
      const tasks = await base44.entities.Task.list();
      
      for (const resource of laborResources) {
        // Count concurrent active tasks for this resource
        const concurrentTasks = tasks.filter(t => 
          t.id !== task_id &&
          t.status === 'in_progress' &&
          (t.assigned_resources || []).includes(resource.id) &&
          t.start_date && t.end_date &&
          // Check date overlap
          new Date(t.start_date) <= new Date(task_end_date) &&
          new Date(t.end_date) >= new Date(task_start_date)
        );

        const maxConcurrent = resource.max_concurrent_assignments || 3;
        if (concurrentTasks.length >= maxConcurrent) {
          errors.push(`${resource.name} overallocated: ${concurrentTasks.length}/${maxConcurrent} concurrent tasks`);
        }
      }
    }

    // Check 5: Equipment booking conflicts
    const equipmentResources = resources.filter(r => r.type === 'equipment');
    if (equipmentResources.length > 0 && task_start_date && task_end_date) {
      const bookings = await base44.entities.EquipmentBooking.list();
      
      for (const equipment of equipmentResources) {
        const conflicts = bookings.filter(b =>
          b.resource_id === equipment.id &&
          b.status !== 'cancelled' &&
          b.start_date && b.end_date &&
          new Date(b.start_date) <= new Date(task_end_date) &&
          new Date(b.end_date) >= new Date(task_start_date)
        );

        if (conflicts.length > 0) {
          errors.push(`${equipment.name} already booked: ${conflicts.map(c => c.project_id).join(', ')}`);
        }
      }
    }

    if (errors.length > 0) {
      return Response.json({
        valid: false,
        errors,
        warnings: errors.filter(e => e.includes('overallocated'))
      });
    }

    return Response.json({ valid: true, message: 'All resources available' });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});