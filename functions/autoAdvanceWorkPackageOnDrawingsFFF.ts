import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process DrawingSet updates
    if (event.type !== 'update') {
      return Response.json({ message: 'Not an update event' });
    }

    const drawingSet = data;

    // Only proceed if status changed to FFF
    if (drawingSet.status !== 'FFF') {
      return Response.json({ message: 'Drawing set not FFF' });
    }

    // Find all work packages that link to this drawing set
    const workPackages = await base44.asServiceRole.entities.WorkPackage.filter({
      linked_drawing_set_ids: { $contains: drawingSet.id }
    });

    if (workPackages.length === 0) {
      return Response.json({ message: 'No work packages linked to this drawing set' });
    }

    const notifications = [];

    // Check each work package to see if all drawing sets are now FFF
    for (const wp of workPackages) {
      // Skip if already in fabrication or beyond
      if (wp.phase !== 'detailing') {
        continue;
      }

      const linkedDrawingSetIds = wp.linked_drawing_set_ids || [];
      if (linkedDrawingSetIds.length === 0) {
        continue;
      }

      // Fetch all linked drawing sets
      const linkedDrawingSets = await base44.asServiceRole.entities.DrawingSet.filter({
        id: { $in: linkedDrawingSetIds }
      });

      // Check if all are FFF
      const allFFF = linkedDrawingSets.every(ds => ds.status === 'FFF');

      if (allFFF) {
        // Auto-advance work package to fabrication
        await base44.asServiceRole.entities.WorkPackage.update(wp.id, {
          phase: 'fabrication'
        });

        // Create fabrication record if doesn't exist
        const existingFab = await base44.asServiceRole.entities.Fabrication.filter({
          project_id: wp.project_id,
          package_name: wp.package_number || wp.name
        });

        if (existingFab.length === 0) {
          // Auto-create fabrication record
          const targetDate = wp.target_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          
          await base44.asServiceRole.entities.Fabrication.create({
            project_id: wp.project_id,
            package_name: wp.package_number || wp.name,
            description: wp.description || wp.name,
            weight_tons: wp.tonnage || 0,
            piece_count: wp.piece_count || 0,
            fabrication_status: 'not_started',
            target_completion: targetDate,
            priority: wp.priority || 'medium'
          });
        }

        // Get project for context
        const projects = await base44.asServiceRole.entities.Project.filter({ id: wp.project_id });
        const project = projects[0];

        // Notify shop manager (project superintendent)
        if (project?.superintendent) {
          notifications.push({
            user_email: project.superintendent,
            type: 'drawing_update',
            title: `Work Package Released to Fabrication: ${wp.package_number || wp.name}`,
            message: `All drawings for ${wp.package_number || wp.name} (${project.name}) are now FFF. Package advanced to fabrication phase. Fabrication record created. Target completion: ${wp.target_date || 'TBD'}.`,
            priority: 'high',
            related_entity_type: 'WorkPackage',
            related_entity_id: wp.id,
            project_id: wp.project_id,
            is_read: false
          });
        }

        // Notify PM
        if (project?.project_manager) {
          notifications.push({
            user_email: project.project_manager,
            type: 'drawing_update',
            title: `Auto-Advanced: ${wp.package_number || wp.name} → Fabrication`,
            message: `Work package ${wp.package_number || wp.name} automatically advanced to fabrication phase (all ${linkedDrawingSets.length} drawing sets FFF). Fabrication record created. Shop notified.`,
            priority: 'medium',
            related_entity_type: 'WorkPackage',
            related_entity_id: wp.id,
            project_id: wp.project_id,
            is_read: false
          });
        }
      }
    }

    // Bulk create notifications
    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    return Response.json({
      message: 'Processing complete',
      packagesAdvanced: notifications.length / 2, // 2 notifications per package (shop + PM)
      notifications: notifications.length
    });

  } catch (error) {
    console.error('Auto-advance error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});