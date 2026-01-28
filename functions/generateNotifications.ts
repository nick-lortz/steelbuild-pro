import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { event_type, entity_type, entity_id, project_id, recipient_email } = body;

    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter(
      { user_id: recipient_email },
      '-created_date',
      1
    );

    if (!prefs.length) {
      return Response.json({ message: 'No preferences found' });
    }

    const pref = prefs[0];

    // Check if notification type is enabled
    const enabledMap = {
      deadline: pref.deadline_alerts,
      status_change: pref.status_changes,
      task_assigned: pref.task_assigned,
      rfi_response: pref.rfi_responses,
      delivery_update: pref.delivery_updates
    };

    if (!enabledMap[event_type]) {
      return Response.json({ message: 'Notification type disabled for user' });
    }

    // Build notification
    const notificationData = {
      user_id: recipient_email,
      type: event_type,
      entity_type,
      entity_id,
      project_id,
      priority: body.priority || 'normal',
      channels: [],
      title: body.title,
      message: body.message,
      action_url: body.action_url
    };

    // Determine channels
    if (pref.in_app_enabled) notificationData.channels.push('in_app');
    if (pref.email_enabled) notificationData.channels.push('email');

    // Create notification
    const notification = await base44.asServiceRole.entities.Notification.create(notificationData);

    // Send email if enabled and not in quiet hours
    if (notificationData.channels.includes('email')) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const inQuietHours = pref.quiet_hours_enabled &&
        pref.quiet_hours_start &&
        pref.quiet_hours_end &&
        currentTime >= pref.quiet_hours_start &&
        currentTime <= pref.quiet_hours_end;

      if (!inQuietHours || pref.email_digest_frequency === 'immediate') {
        await base44.integrations.Core.SendEmail({
          to: recipient_email,
          subject: `[${entity_type}] ${notificationData.title}`,
          body: `${notificationData.message}\n\nView details: ${notificationData.action_url || 'Check app for more info'}`
        });

        await base44.asServiceRole.entities.Notification.update(notification.id, {
          email_sent: true,
          email_sent_at: new Date().toISOString()
        });
      }
    }

    return Response.json({ notification, message: 'Notification created' });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});