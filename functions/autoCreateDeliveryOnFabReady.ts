import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // Only process Fabrication updates
    if (event.type !== 'update') {
      return Response.json({ message: 'Not an update event' });
    }

    const fabrication = data;
    const oldFabrication = old_data || {};

    // Only proceed if status changed TO ready_to_ship
    if (fabrication.fabrication_status !== 'ready_to_ship' || oldFabrication.fabrication_status === 'ready_to_ship') {
      return Response.json({ message: 'Fabrication status not newly ready_to_ship' });
    }

    // Check if delivery already exists
    if (fabrication.linked_delivery_id) {
      return Response.json({ message: 'Delivery already linked' });
    }

    const existingDeliveries = await base44.asServiceRole.entities.Delivery.filter({
      project_id: fabrication.project_id,
      package_name: fabrication.package_name
    });

    if (existingDeliveries.length > 0) {
      // Link existing delivery
      await base44.asServiceRole.entities.Fabrication.update(fabrication.id, {
        linked_delivery_id: existingDeliveries[0].id
      });
      return Response.json({ message: 'Linked to existing delivery', deliveryId: existingDeliveries[0].id });
    }

    // Calculate suggested delivery date (fab completion + 3 day lead time)
    const fabCompletionDate = fabrication.actual_completion || fabrication.target_completion || new Date().toISOString().split('T')[0];
    const suggestedDate = new Date(fabCompletionDate);
    suggestedDate.setDate(suggestedDate.getDate() + 3); // 3-day lead time
    const scheduledDate = suggestedDate.toISOString().split('T')[0];

    // Find related work package for additional context
    const workPackages = await base44.asServiceRole.entities.WorkPackage.filter({
      project_id: fabrication.project_id,
      package_number: fabrication.package_name
    });
    const workPackage = workPackages[0];

    // Create delivery record
    const delivery = await base44.asServiceRole.entities.Delivery.create({
      project_id: fabrication.project_id,
      package_name: fabrication.package_name,
      package_number: fabrication.package_name,
      scheduled_date: scheduledDate,
      delivery_status: 'scheduled',
      weight_tons: fabrication.weight_tons || 0,
      piece_count: fabrication.piece_count || 0,
      carrier: '',
      notes: `Auto-created from fabrication ready-to-ship. Suggested date based on ${fabCompletionDate} + 3-day lead time.`,
      linked_task_ids: workPackage?.id ? [workPackage.id] : []
    });

    // Link delivery back to fabrication
    await base44.asServiceRole.entities.Fabrication.update(fabrication.id, {
      linked_delivery_id: delivery.id
    });

    // Get project for notifications
    const projects = await base44.asServiceRole.entities.Project.filter({ id: fabrication.project_id });
    const project = projects[0];

    const notifications = [];

    // Notify logistics coordinator (project manager for now, or assigned_to if available)
    const logisticsEmail = project?.project_manager;
    if (logisticsEmail) {
      notifications.push({
        user_email: logisticsEmail,
        type: 'fabrication_deadline',
        title: `Delivery Created: ${fabrication.package_name}`,
        message: `Fabrication package ${fabrication.package_name} (${project.name}) is ready to ship. Delivery auto-created for ${scheduledDate}. Confirm carrier and delivery details.`,
        priority: 'high',
        related_entity_type: 'Delivery',
        related_entity_id: delivery.id,
        project_id: fabrication.project_id,
        is_read: false
      });
    }

    // Notify superintendent about upcoming delivery
    if (project?.superintendent) {
      notifications.push({
        user_email: project.superintendent,
        type: 'fabrication_deadline',
        title: `Delivery Scheduled: ${fabrication.package_name} - ${scheduledDate}`,
        message: `Package ${fabrication.package_name} ready to ship from shop. Delivery scheduled ${scheduledDate}. Prepare for offload and installation. Weight: ${fabrication.weight_tons || 0}T, Pieces: ${fabrication.piece_count || 0}.`,
        priority: 'medium',
        related_entity_type: 'Delivery',
        related_entity_id: delivery.id,
        project_id: fabrication.project_id,
        is_read: false
      });
    }

    // Create notifications
    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    return Response.json({
      message: 'Delivery created successfully',
      deliveryId: delivery.id,
      scheduledDate: scheduledDate,
      notifications: notifications.length
    });

  } catch (error) {
    console.error('Auto-create delivery error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});