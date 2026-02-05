import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, title, body, data, priority = 'normal' } = await req.json();

    // Get user's push subscription and preferences
    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({ 
      user_email: userId || user.email 
    });
    
    const userPref = prefs[0];
    if (!userPref?.push_enabled || !userPref?.push_subscription) {
      return Response.json({ error: 'Push notifications not enabled for user' }, { status: 400 });
    }

    // Check if this notification type is enabled
    const notificationType = data?.type;
    if (notificationType && userPref.push_notification_types) {
      if (!userPref.push_notification_types.includes(notificationType)) {
        return Response.json({ message: 'Notification type disabled by user', skipped: true });
      }
    }

    // Send push notification using Web Push API
    const webpush = await import('npm:web-push@3.6.7');
    
    const vapidKeys = {
      publicKey: Deno.env.get('VAPID_PUBLIC_KEY'),
      privateKey: Deno.env.get('VAPID_PRIVATE_KEY')
    };

    webpush.setVapidDetails(
      'mailto:notifications@steelbuildpro.com',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        priority
      },
      vibrate: priority === 'critical' ? [200, 100, 200] : [100],
      requireInteraction: priority === 'critical',
      tag: data?.tag || 'general'
    });

    await webpush.sendNotification(
      userPref.push_subscription,
      payload
    );

    // Log notification
    await base44.asServiceRole.entities.Notification.create({
      user_email: userId || user.email,
      type: notificationType || 'system',
      title,
      message: body,
      priority,
      data,
      read: false,
      sent_via: 'push'
    });

    return Response.json({ success: true, message: 'Push notification sent' });

  } catch (error) {
    console.error('Push notification error:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});