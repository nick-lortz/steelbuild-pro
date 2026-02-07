import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await req.json();

    if (!projectId) {
      return Response.json({ 
        error: 'Project ID required',
        snapshot: {},
        deliveries: [],
        conflicts: [],
        ai: { summary: 'No project selected', predictions: [], recommendations: [], confidence: 'low', missingDataReasons: ['No project'] },
        warnings: ['No project selected'],
        lastUpdated: new Date().toISOString()
      }, { status: 400 });
    }

    const project = (await base44.entities.Project.filter({ id: projectId }))[0];
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const [deliveries, workPackages, fabPackages] = await Promise.all([
      base44.entities.Delivery.filter({ project_id: projectId }),
      base44.entities.WorkPackage.filter({ project_id: projectId }),
      base44.entities.FabricationPackage.filter({ project_id: projectId })
    ]);

    const warnings = [];
    if (deliveries.length === 0) warnings.push('No deliveries scheduled');

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Snapshot metrics
    const deliveriesToday = deliveries.filter(d => 
      d.scheduled_date === today || 
      (d.delivery_date && d.delivery_date === today)
    ).length;

    const deliveriesThisWeek = deliveries.filter(d => {
      const delDate = new Date(d.scheduled_date || d.delivery_date);
      return delDate >= now && delDate <= sevenDaysOut;
    }).length;

    const late = deliveries.filter(d => 
      d.status !== 'delivered' && 
      d.status !== 'cancelled' &&
      d.scheduled_date && 
      new Date(d.scheduled_date) < now
    ).length;

    const rescheduled = deliveries.filter(d => 
      d.rescheduled_count && d.rescheduled_count > 0
    ).length;

    // Build enhanced deliveries
    const enhancedDeliveries = deliveries.map(d => {
      const linkedWP = workPackages.find(wp => 
        (d.linked_work_package_ids || []).includes(wp.id)
      );
      
      const linkedFab = fabPackages.find(fp => fp.id === d.linked_fabrication_package_id);

      return {
        id: d.id,
        date: d.scheduled_date || d.delivery_date,
        time_start: d.time_window_start,
        time_end: d.time_window_end,
        vendor: d.vendor_name || 'Unknown',
        load_description: d.load_description,
        zone: d.delivery_zone,
        crane: d.crane_assignment,
        status: d.status || 'scheduled',
        linked_package_id: d.linked_work_package_ids?.[0] || d.linked_fabrication_package_id,
        linked_package_name: linkedWP?.title || linkedFab?.package_name || null,
        notes: d.notes,
        rescheduled_count: d.rescheduled_count || 0,
        created_date: d.created_date,
        truck_number: d.truck_number,
        driver_name: d.driver_name
      };
    });

    // Detect conflicts (zone/crane/time overlap)
    const conflicts = [];
    const scheduled = enhancedDeliveries.filter(d => d.status === 'scheduled' || d.status === 'in_transit');
    
    for (let i = 0; i < scheduled.length; i++) {
      for (let j = i + 1; j < scheduled.length; j++) {
        const a = scheduled[i];
        const b = scheduled[j];

        // Same day check
        if (a.date !== b.date) continue;

        // Zone conflict
        if (a.zone && b.zone && a.zone === b.zone) {
          // Time overlap check
          if (a.time_start && a.time_end && b.time_start && b.time_end) {
            const aStart = new Date(`${a.date}T${a.time_start}`);
            const aEnd = new Date(`${a.date}T${a.time_end}`);
            const bStart = new Date(`${b.date}T${b.time_start}`);
            const bEnd = new Date(`${b.date}T${b.time_end}`);

            if (aStart < bEnd && bStart < aEnd) {
              conflicts.push({
                deliveryA: { id: a.id, name: a.load_description || a.vendor, time: `${a.time_start}-${a.time_end}` },
                deliveryB: { id: b.id, name: b.load_description || b.vendor, time: `${b.time_start}-${b.time_end}` },
                type: 'zone_time_overlap',
                reason: `Both scheduled in ${a.zone} with overlapping times`,
                severity: 'high'
              });
            }
          }
        }

        // Crane conflict
        if (a.crane && b.crane && a.crane === b.crane) {
          if (a.time_start && a.time_end && b.time_start && b.time_end) {
            const aStart = new Date(`${a.date}T${a.time_start}`);
            const aEnd = new Date(`${a.date}T${a.time_end}`);
            const bStart = new Date(`${b.date}T${b.time_start}`);
            const bEnd = new Date(`${b.date}T${b.time_end}`);

            if (aStart < bEnd && bStart < aEnd) {
              conflicts.push({
                deliveryA: { id: a.id, name: a.load_description || a.vendor, time: `${a.time_start}-${a.time_end}` },
                deliveryB: { id: b.id, name: b.load_description || b.vendor, time: `${b.time_start}-${b.time_end}` },
                type: 'crane_conflict',
                reason: `Both require ${a.crane} with overlapping times`,
                severity: 'critical'
              });
            }
          }
        }
      }
    }

    // AI analysis
    const predictions = conflicts.map(c => ({
      type: c.type,
      severity: c.severity,
      message: `Conflict: ${c.deliveryA.name} vs ${c.deliveryB.name} - ${c.reason}`,
      action: 'Adjust time windows or resources'
    }));

    const recommendations = [
      conflicts.length > 0 && {
        action: `Resolve ${conflicts.length} scheduling conflicts`,
        priority: 'critical',
        impact: 'Prevent site delays and resource contention'
      },
      enhancedDeliveries.filter(d => !d.time_start || !d.time_end).length > 0 && {
        action: 'Set time windows for deliveries missing schedules',
        priority: 'high',
        impact: 'Enable conflict detection and site coordination'
      },
      enhancedDeliveries.filter(d => !d.crane && d.status === 'scheduled').length > 0 && {
        action: 'Assign cranes to upcoming deliveries',
        priority: 'medium',
        impact: 'Ensure unloading capacity'
      }
    ].filter(Boolean);

    const missingDataReasons = [];
    if (deliveries.length === 0) missingDataReasons.push('No deliveries scheduled');
    if (deliveries.filter(d => !d.time_window_start).length > 0) {
      missingDataReasons.push('Some deliveries missing time windows');
    }

    return Response.json({
      project: {
        id: project.id,
        name: project.name,
        project_number: project.project_number
      },
      snapshot: {
        deliveriesToday,
        deliveriesThisWeek,
        conflicts: conflicts.length,
        late,
        rescheduled
      },
      deliveries: enhancedDeliveries,
      conflicts,
      ai: {
        summary: conflicts.length > 0 ? `${conflicts.length} conflicts detected - resolve immediately` :
                 late > 0 ? `${late} deliveries past target - reschedule` :
                 'Logistics on track',
        predictions,
        recommendations,
        confidence: deliveries.length > 10 ? 'high' : 'medium',
        missingDataReasons
      },
      warnings,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('getDeliveryManagementData error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});