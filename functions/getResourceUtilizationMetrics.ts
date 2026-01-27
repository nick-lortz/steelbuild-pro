import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resource_ids, include_unavailable = false } = await req.json();

    // Fetch resources and tasks in parallel
    const [resources, tasks] = await Promise.all([
      resource_ids && resource_ids.length > 0
        ? base44.entities.Resource.filter({ id: { $in: resource_ids } })
        : base44.entities.Resource.list(),
      base44.entities.Task.filter({
        status: { $in: ['not_started', 'in_progress'] }
      })
    ]);

    const filteredResources = include_unavailable 
      ? resources 
      : resources.filter(r => r.status !== 'unavailable');

    const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const metrics = {
      summary: {
        total: filteredResources.length,
        available: 0,
        assigned: 0,
        overallocated: 0,
        underutilized: 0
      },
      by_type: {},
      utilization: [],
      overallocated_list: [],
      underutilized_list: []
    };

    // Process each resource
    for (const resource of filteredResources) {
      // Count by status
      if (resource.status === 'available') metrics.summary.available++;
      if (resource.status === 'assigned') metrics.summary.assigned++;

      // Count by type
      const type = resource.type || 'unknown';
      if (!metrics.by_type[type]) {
        metrics.by_type[type] = { count: 0, available: 0, assigned: 0 };
      }
      metrics.by_type[type].count++;
      if (resource.status === 'available') metrics.by_type[type].available++;
      if (resource.status === 'assigned') metrics.by_type[type].assigned++;

      // Find assigned tasks
      const assignedTasks = tasks.filter(task => {
        const isAssigned = 
          (task.assigned_resources || []).includes(resource.id) ||
          (task.assigned_equipment || []).includes(resource.id);

        if (!isAssigned || !task.start_date || !task.end_date) return false;

        try {
          const taskStart = new Date(task.start_date);
          return !isNaN(taskStart.getTime()) && taskStart <= thirtyDaysOut;
        } catch {
          return false;
        }
      });

      const activeTasks = assignedTasks.filter(t => t.status === 'in_progress');
      const maxConcurrent = resource.max_concurrent_assignments || 3;
      const utilizationScore = Math.min((activeTasks.length / maxConcurrent) * 100, 100);

      // Check for over/underutilization
      if (activeTasks.length > maxConcurrent) {
        metrics.summary.overallocated++;
        metrics.overallocated_list.push({
          id: resource.id,
          name: resource.name,
          type: resource.type,
          active_tasks: activeTasks.length,
          max_concurrent: maxConcurrent,
          overload: activeTasks.length - maxConcurrent
        });
      }

      if (resource.status === 'available' && activeTasks.length === 0 && resource.type === 'labor') {
        metrics.summary.underutilized++;
        metrics.underutilized_list.push({
          id: resource.id,
          name: resource.name,
          type: resource.type,
          classification: resource.classification
        });
      }

      // Add to utilization list
      metrics.utilization.push({
        id: resource.id,
        name: resource.name,
        type: resource.type,
        status: resource.status,
        classification: resource.classification,
        active_tasks: activeTasks.length,
        upcoming_tasks: assignedTasks.length - activeTasks.length,
        utilization: Math.round(utilizationScore),
        max_concurrent: maxConcurrent
      });
    }

    // Sort utilization by score descending
    metrics.utilization.sort((a, b) => b.utilization - a.utilization);

    return Response.json({
      success: true,
      metrics,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});