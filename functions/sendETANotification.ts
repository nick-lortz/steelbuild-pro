import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  const { delivery_id, notification_type, minutes_away } = await req.json();

  if (!delivery_id || !notification_type) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const deliveries = await base44.asServiceRole.entities.Delivery.filter({ id: delivery_id });
  if (!deliveries || deliveries.length === 0) {
    return Response.json({ error: 'Delivery not found' }, { status: 404 });
  }

  const delivery = deliveries[0];
  const projects = await base44.asServiceRole.entities.Project.filter({ id: delivery.project_id });
  const project = projects[0];

  if (!delivery.contact_email && !project?.gc_email) {
    return Response.json({ error: 'No contact email configured' }, { status: 400 });
  }

  const notificationMessages = {
    '2h_warning': {
      subject: `🚚 Delivery ETA Update: ${delivery.package_name} - 2 Hours Away`,
      body: `Your steel delivery is approximately 2 hours away.

DELIVERY DETAILS
Package: ${delivery.package_name}
Project: ${project?.name || 'N/A'}
Carrier: ${delivery.carrier || 'N/A'}
ETA: ${minutes_away ? `~${Math.round(minutes_away)} minutes` : 'TBD'}

SITE INFORMATION
Delivery Location: ${delivery.ship_to_location || 'See project address'}
Site Contact: ${delivery.contact_name || 'N/A'}
Phone: ${delivery.contact_phone || 'N/A'}

${delivery.site_constraints?.gate_hours ? `Gate Hours: ${delivery.site_constraints.gate_hours}` : ''}
${delivery.receiving_requirements?.length > 0 ? `Required Equipment: ${delivery.receiving_requirements.join(', ')}` : ''}

${delivery.notes ? `Notes: ${delivery.notes}` : ''}

Please ensure receiving crew and equipment are ready.`
    },
    '1h_warning': {
      subject: `🚚 Delivery Alert: ${delivery.package_name} - 1 Hour Away`,
      body: `Your steel delivery will arrive in approximately 1 hour.

Package: ${delivery.package_name}
Project: ${project?.name || 'N/A'}
ETA: ${minutes_away ? `~${Math.round(minutes_away)} minutes` : 'TBD'}
Contact: ${delivery.contact_name || 'N/A'} - ${delivery.contact_phone || 'N/A'}

${delivery.receiving_requirements?.length > 0 ? `Equipment Needed: ${delivery.receiving_requirements.join(', ')}` : ''}

Final preparation reminder.`
    },
    '30min_warning': {
      subject: `🚚 Delivery Imminent: ${delivery.package_name} - 30 Minutes`,
      body: `Your steel delivery is 30 minutes away.

Package: ${delivery.package_name}
Weight: ${delivery.weight_tons || 'N/A'} tons
Pieces: ${delivery.piece_count || 'N/A'}

Receiving crew should be on standby.`
    },
    'arrived': {
      subject: `✅ Delivery Arrived: ${delivery.package_name}`,
      body: `Delivery has arrived on site.

Package: ${delivery.package_name}
Project: ${project?.name || 'N/A'}
Arrival Time: ${new Date().toLocaleString()}

Begin receiving process.`
    }
  };

  const notification = notificationMessages[notification_type];
  if (!notification) {
    return Response.json({ error: 'Invalid notification type' }, { status: 400 });
  }

  // Send to site contact and GC
  const recipients = [
    delivery.contact_email,
    project?.gc_email,
    project?.project_manager
  ].filter(Boolean);

  const uniqueRecipients = [...new Set(recipients)];

  // Send emails
  for (const recipient of uniqueRecipients) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: recipient,
        subject: notification.subject,
        body: notification.body,
        from_name: 'SteelBuild Pro Delivery Tracking'
      });
    } catch (emailError) {
      console.error(`Failed to send to ${recipient}:`, emailError);
    }
  }

  // Log notification sent
  const eta_notifications_sent = [
    ...(delivery.eta_notifications_sent || []),
    {
      type: notification_type,
      sent_at: new Date().toISOString(),
      recipients: uniqueRecipients
    }
  ];

  await base44.asServiceRole.entities.Delivery.update(delivery_id, { eta_notifications_sent });

  return Response.json({ 
    success: true, 
    recipients: uniqueRecipients,
    notification_type 
  });
});