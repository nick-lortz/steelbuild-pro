import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { delivery_id, old_status, new_status } = await req.json();

    if (!delivery_id || !new_status) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch delivery details
    const deliveries = await base44.asServiceRole.entities.Delivery.filter({ id: delivery_id });
    const delivery = deliveries[0];

    if (!delivery) {
      return Response.json({ error: 'Delivery not found' }, { status: 404 });
    }

    // Fetch project to get stakeholders
    const projects = await base44.asServiceRole.entities.Project.filter({ id: delivery.project_id });
    const project = projects[0];

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get all users to check preferences
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    // Determine stakeholders (project assigned users + project manager)
    const stakeholders = new Set();
    if (project.assigned_users && Array.isArray(project.assigned_users)) {
      project.assigned_users.forEach(email => stakeholders.add(email));
    }
    if (project.project_manager) {
      stakeholders.add(project.project_manager);
    }

    // Filter users based on notification preferences
    const usersToNotify = allUsers.filter(u => {
      if (!stakeholders.has(u.email)) return false;
      
      const prefs = u.notification_preferences || {};
      
      // Check if delivery notifications are enabled
      if (prefs.delivery_notifications === false) return false;
      
      // Check status-specific preferences
      if (new_status === 'delayed' && prefs.delivery_delayed === false) return false;
      if (new_status === 'delivered' && prefs.delivery_delivered === false) return false;
      if (new_status === 'in_transit' && prefs.delivery_in_transit === false) return false;
      
      return true;
    });

    const notificationsSent = [];

    // Prepare notification content
    const statusLabels = {
      'scheduled': 'Scheduled',
      'in_transit': 'In Transit',
      'delivered': 'Delivered',
      'delayed': 'Delayed',
      'cancelled': 'Cancelled'
    };

    const subject = `Delivery Status Update: ${delivery.package_name}`;
    const message = `
Delivery Status Change - ${project.name}

Package: ${delivery.package_name}
${delivery.tracking_number ? `Tracking: ${delivery.tracking_number}` : ''}
Status: ${statusLabels[old_status] || old_status} → ${statusLabels[new_status] || new_status}
${delivery.scheduled_date ? `Scheduled Date: ${new Date(delivery.scheduled_date).toLocaleDateString()}` : ''}
${delivery.actual_date && new_status === 'delivered' ? `Delivered Date: ${new Date(delivery.actual_date).toLocaleDateString()}` : ''}
${delivery.delay_reason ? `Delay Reason: ${delivery.delay_reason}` : ''}

Project: ${project.name} (${project.project_number})
    `.trim();

    // Send notifications
    for (const notifyUser of usersToNotify) {
      const prefs = notifyUser.notification_preferences || {};
      
      // Send email if enabled
      if (prefs.delivery_email !== false) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: notifyUser.email,
            subject,
            body: message
          });
          notificationsSent.push({ type: 'email', to: notifyUser.email });
        } catch (emailError) {
          console.error('Email send error:', emailError);
        }
      }

      // Create in-app notification if enabled
      if (prefs.delivery_in_app !== false) {
        try {
          await base44.asServiceRole.entities.Notification.create({
            user_email: notifyUser.email,
            title: subject,
            message,
            type: 'delivery',
            related_entity_id: delivery_id,
            priority: new_status === 'delayed' ? 'high' : 'normal',
            read: false
          });
          notificationsSent.push({ type: 'in_app', to: notifyUser.email });
        } catch (notifError) {
          console.error('In-app notification error:', notifError);
        }
      }
    }

    return Response.json({
      success: true,
      notificationsSent,
      stakeholdersCount: usersToNotify.length
    });

  } catch (error) {
    console.error('Notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});