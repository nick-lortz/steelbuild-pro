import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { resource_id, start_date, end_date, exclude_allocation_id } = await req.json();

  if (!resource_id || !start_date || !end_date) {
    return Response.json({ 
      error: 'resource_id, start_date, and end_date required' 
    }, { status: 400 });
  }

  const resource = await base44.entities.Resource.filter({ id: resource_id });
  if (!resource || resource.length === 0) {
    return Response.json({ error: 'Resource not found' }, { status: 404 });
  }

  const resourceData = resource[0];

  // Get all allocations for this resource
  const allocations = await base44.entities.ResourceAllocation.filter({ 
    resource_id 
  });

  // Get all tasks assigned to this resource
  const allTasks = await base44.entities.Task.list('-start_date', 1000);
  const assignedTasks = allTasks.filter(task => {
    const assignedResources = task.assigned_resources || [];
    const assignedEquipment = task.assigned_equipment || [];
    return assignedResources.includes(resource_id) || assignedEquipment.includes(resource_id);
  });

  // Filter to date range
  const startISO = new Date(start_date);
  const endISO = new Date(end_date);

  const isOverlapping = (itemStart, itemEnd) => {
    const iStart = new Date(itemStart);
    const iEnd = new Date(itemEnd);
    return (iStart <= endISO && iEnd >= startISO);
  };

  const conflictingAllocations = allocations.filter(alloc => {
    if (exclude_allocation_id && alloc.id === exclude_allocation_id) return false;
    return isOverlapping(alloc.start_date, alloc.end_date);
  });

  const conflictingTasks = assignedTasks.filter(task => {
    if (!task.start_date || !task.end_date) return false;
    return isOverlapping(task.start_date, task.end_date);
  });

  // Calculate capacity
  const weeklyCapacity = resourceData.weekly_capacity_hours || 40;
  const durationDays = Math.ceil((endISO - startISO) / (1000 * 60 * 60 * 24));
  const weeksInPeriod = Math.ceil(durationDays / 7);
  const totalCapacityHours = weeksInPeriod * weeklyCapacity;

  // Calculate demand
  const allocationDemand = conflictingAllocations.reduce(
    (sum, alloc) => sum + (alloc.allocation_percentage || 0),
    0
  );

  const taskHoursDemand = conflictingTasks.reduce((sum, task) => 
    sum + (task.estimated_hours || task.planned_shop_hours || task.planned_field_hours || 0),
    0
  );

  const utilizationPercent = totalCapacityHours > 0 
    ? Math.round((taskHoursDemand / totalCapacityHours) * 100)
    : 0;

  // Get project details
  const projectIds = [
    ...new Set([
      ...conflictingAllocations.map(a => a.project_id),
      ...conflictingTasks.map(t => t.project_id)
    ])
  ].filter(Boolean);

  const projects = await base44.entities.Project.filter({ 
    id: { $in: projectIds } 
  });

  const isAvailable = allocationDemand < 100 && utilizationPercent < 100;
  const availabilityStatus = 
    utilizationPercent > 100 ? 'overallocated' :
    utilizationPercent > 80 ? 'near_capacity' :
    utilizationPercent > 50 ? 'moderate' :
    'available';

  return Response.json({
    success: true,
    resource: {
      id: resourceData.id,
      name: resourceData.name,
      type: resourceData.type,
      classification: resourceData.classification,
      skill_level: resourceData.skill_level,
      status: resourceData.status
    },
    date_range: {
      start: start_date,
      end: end_date,
      duration_days: durationDays,
      weeks: weeksInPeriod
    },
    capacity: {
      weekly_hours: weeklyCapacity,
      total_hours: totalCapacityHours,
      available_hours: Math.max(0, totalCapacityHours - taskHoursDemand)
    },
    demand: {
      allocation_percent: allocationDemand,
      task_hours: taskHoursDemand,
      utilization_percent: utilizationPercent
    },
    availability: {
      is_available: isAvailable,
      status: availabilityStatus,
      can_accept_more: utilizationPercent < 90
    },
    conflicts: {
      allocation_count: conflictingAllocations.length,
      task_count: conflictingTasks.length,
      project_count: projectIds.length,
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        project_number: p.project_number
      }))
    },
    recommendations: 
      utilizationPercent > 100 ? 
        ['Resource is overallocated', 'Reassign tasks or delay work', 'Consider bringing in additional resources'] :
      utilizationPercent > 80 ?
        ['Resource is near capacity', 'Monitor closely', 'Plan contingency resources'] :
        ['Resource has capacity', 'Can accept additional work']
  });
});