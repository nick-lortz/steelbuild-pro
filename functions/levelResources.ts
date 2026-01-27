import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id } = await req.json();

    // Fetch data
    const [tasks, resources] = await Promise.all([
      base44.entities.Task.filter({ project_id }),
      base44.entities.Resource.list()
    ]);

    // Build resource demand timeline
    const demandByDate = {};
    const resourceDemand = {};

    tasks.forEach(task => {
      if (!task.start_date || !task.end_date) return;

      const startDate = new Date(task.start_date);
      const endDate = new Date(task.end_date);
      const taskResources = [
        ...(task.assigned_resources || []),
        ...(task.assigned_equipment || [])
      ];

      // Calculate demand for each day
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        
        if (!demandByDate[dateKey]) {
          demandByDate[dateKey] = { date: dateKey, demand: 0, tasks: [] };
        }

        taskResources.forEach(resId => {
          if (!resourceDemand[resId]) {
            resourceDemand[resId] = {};
          }
          if (!resourceDemand[resId][dateKey]) {
            resourceDemand[resId][dateKey] = 0;
          }
          resourceDemand[resId][dateKey]++;
        });

        demandByDate[dateKey].demand += taskResources.length;
        demandByDate[dateKey].tasks.push(task.id);
      }
    });

    // Identify overallocated resources
    const overallocations = [];
    Object.keys(resourceDemand).forEach(resId => {
      const resource = resources.find(r => r.id === resId);
      if (!resource) return;

      const maxConcurrent = resource.max_concurrent_assignments || 3;
      const dates = resourceDemand[resId];

      Object.keys(dates).forEach(date => {
        if (dates[date] > maxConcurrent) {
          overallocations.push({
            resource_id: resId,
            resource_name: resource.name,
            date,
            demand: dates[date],
            capacity: maxConcurrent,
            overload: dates[date] - maxConcurrent
          });
        }
      });
    });

    // Generate leveling suggestions
    const suggestions = [];

    overallocations.forEach(oa => {
      const affectedTasks = tasks.filter(t => {
        const resources = [...(t.assigned_resources || []), ...(t.assigned_equipment || [])];
        return resources.includes(oa.resource_id) &&
               t.start_date <= oa.date &&
               t.end_date >= oa.date;
      });

      // Sort by priority (critical path, then due date)
      affectedTasks.sort((a, b) => {
        if (a.is_critical && !b.is_critical) return -1;
        if (!a.is_critical && b.is_critical) return 1;
        return new Date(a.end_date) - new Date(b.end_date);
      });

      // Suggest delaying non-critical tasks
      for (let i = 0; i < affectedTasks.length && oa.overload > 0; i++) {
        const task = affectedTasks[i];
        if (task.is_critical) continue; // Don't delay critical tasks

        suggestions.push({
          action: 'delay_task',
          task_id: task.id,
          task_name: task.name,
          resource_id: oa.resource_id,
          resource_name: oa.resource_name,
          conflict_date: oa.date,
          reason: `Overallocated by ${oa.overload}`,
          suggested_delay_days: 1,
          impact: 'medium'
        });

        oa.overload--;
      }

      // If still overloaded, suggest reassignment
      if (oa.overload > 0) {
        const availableResources = resources.filter(r => 
          r.type === resources.find(res => res.id === oa.resource_id)?.type &&
          r.id !== oa.resource_id &&
          (!resourceDemand[r.id] || !resourceDemand[r.id][oa.date])
        );

        if (availableResources.length > 0) {
          suggestions.push({
            action: 'reassign_resource',
            task_id: affectedTasks[affectedTasks.length - 1]?.id,
            task_name: affectedTasks[affectedTasks.length - 1]?.name,
            from_resource: oa.resource_id,
            from_resource_name: oa.resource_name,
            to_resource: availableResources[0].id,
            to_resource_name: availableResources[0].name,
            conflict_date: oa.date,
            reason: `No capacity for ${oa.resource_name}`,
            impact: 'low'
          });
        }
      }
    });

    // Calculate leveling metrics
    const demandArray = Object.values(demandByDate).map(d => d.demand);
    const avgDemand = demandArray.reduce((a, b) => a + b, 0) / demandArray.length;
    const peakDemand = Math.max(...demandArray);
    const variance = demandArray.reduce((sum, val) => sum + Math.pow(val - avgDemand, 2), 0) / demandArray.length;
    const standardDeviation = Math.sqrt(variance);

    return Response.json({
      success: true,
      project_id,
      metrics: {
        avg_demand: avgDemand.toFixed(1),
        peak_demand: peakDemand,
        std_deviation: standardDeviation.toFixed(1),
        overallocated_days: overallocations.length,
        total_overload: overallocations.reduce((s, o) => s + o.overload, 0)
      },
      overallocations: overallocations.slice(0, 20), // Top 20
      suggestions: suggestions.slice(0, 10), // Top 10 suggestions
      timeline: Object.values(demandByDate).sort((a, b) => a.date.localeCompare(b.date)),
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});