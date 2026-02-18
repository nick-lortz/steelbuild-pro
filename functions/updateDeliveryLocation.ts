import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Webhook endpoint for GPS tracking updates
 * Requires HMAC signature validation (X-Signature header)
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  // WEBHOOK SECURITY: Validate HMAC signature
  const signature = req.headers.get('x-signature');
  const webhookSecret = Deno.env.get('DELIVERY_WEBHOOK_SECRET');
  
  if (!webhookSecret) {
    return Response.json({ 
      error: 'Webhook not configured',
      required_secrets: ['DELIVERY_WEBHOOK_SECRET']
    }, { status: 500 });
  }
  
  if (!signature) {
    return Response.json({ error: 'Missing X-Signature header' }, { status: 401 });
  }
  
  // Read raw body for HMAC validation
  const rawBody = await req.text();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const expectedSignature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(rawBody)
  );
  
  const expectedHex = Array.from(new Uint8Array(expectedSignature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Timing-safe comparison
  if (signature !== expectedHex) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  // Validate timestamp to prevent replay (±5 min)
  const timestampHeader = req.headers.get('x-timestamp');
  if (timestampHeader) {
    const requestTime = parseInt(timestampHeader);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (Math.abs(now - requestTime) > fiveMinutes) {
      return Response.json({ error: 'Request timestamp too old' }, { status: 401 });
    }
  }
  
  const { delivery_id, lat, lng, speed_mph, heading } = JSON.parse(rawBody);

  if (!delivery_id || !lat || !lng) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const delivery = await base44.asServiceRole.entities.Delivery.filter({ id: delivery_id });
  if (!delivery || delivery.length === 0) {
    return Response.json({ error: 'Delivery not found' }, { status: 404 });
  }

  const currentDelivery = delivery[0];
  
  // Additional validation: ensure delivery is in trackable state
  if (!['confirmed', 'in_transit'].includes(currentDelivery.delivery_status)) {
    return Response.json({ 
      error: 'Delivery not in trackable state',
      current_status: currentDelivery.delivery_status
    }, { status: 400 });
  }
  const timestamp = new Date().toISOString();

  // Update current location
  const current_location = {
    lat,
    lng,
    timestamp,
    speed_mph: speed_mph || 0,
    heading: heading || 0
  };

  // Add to location history
  const location_history = [
    ...(currentDelivery.location_history || []),
    { lat, lng, timestamp }
  ].slice(-100); // Keep last 100 points

  // Calculate distance to destination (simple straight-line distance)
  let distance_remaining_miles = null;
  let estimated_arrival = null;

  if (currentDelivery.ship_to_coords?.lat && currentDelivery.ship_to_coords?.lng) {
    const toRad = (deg) => deg * Math.PI / 180;
    const R = 3959; // Earth radius in miles
    const dLat = toRad(currentDelivery.ship_to_coords.lat - lat);
    const dLon = toRad(currentDelivery.ship_to_coords.lng - lng);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat)) * Math.cos(toRad(currentDelivery.ship_to_coords.lat)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    distance_remaining_miles = R * c;

    // Estimate ETA (assume average speed of 50mph if no speed data)
    const avgSpeed = speed_mph && speed_mph > 5 ? speed_mph : 50;
    const hoursRemaining = distance_remaining_miles / avgSpeed;
    const etaDate = new Date(Date.now() + hoursRemaining * 60 * 60 * 1000);
    estimated_arrival = etaDate.toISOString();
  }

  // Update delivery
  const updates = {
    current_location,
    location_history,
    distance_remaining_miles,
    estimated_arrival
  };

  await base44.asServiceRole.entities.Delivery.update(delivery_id, updates);

  // Check if we need to send ETA notifications
  if (estimated_arrival && currentDelivery.contact_email) {
    const minutesUntilArrival = (new Date(estimated_arrival) - new Date()) / 1000 / 60;
    const sentNotifications = currentDelivery.eta_notifications_sent || [];
    
    // 2-hour warning
    if (minutesUntilArrival <= 120 && minutesUntilArrival > 115 && 
        !sentNotifications.some(n => n.type === '2h_warning')) {
      await base44.asServiceRole.functions.invoke('sendETANotification', {
        delivery_id,
        notification_type: '2h_warning',
        minutes_away: Math.round(minutesUntilArrival)
      });
    }
    
    // 1-hour warning
    if (minutesUntilArrival <= 60 && minutesUntilArrival > 55 && 
        !sentNotifications.some(n => n.type === '1h_warning')) {
      await base44.asServiceRole.functions.invoke('sendETANotification', {
        delivery_id,
        notification_type: '1h_warning',
        minutes_away: Math.round(minutesUntilArrival)
      });
    }
    
    // 30-minute warning
    if (minutesUntilArrival <= 30 && minutesUntilArrival > 25 && 
        !sentNotifications.some(n => n.type === '30min_warning')) {
      await base44.asServiceRole.functions.invoke('sendETANotification', {
        delivery_id,
        notification_type: '30min_warning',
        minutes_away: Math.round(minutesUntilArrival)
      });
    }
  }

  return Response.json({ 
    success: true, 
    current_location,
    distance_remaining_miles,
    estimated_arrival 
  });
});