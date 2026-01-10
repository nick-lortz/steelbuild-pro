// RUM backend endpoint for aggregating metrics
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const body = await req.json();
    const { eventType, data, sessionId, timestamp } = body;

    // Store metric in database (optional - could use external service)
    // For now, just log to console
    console.log('RUM Event:', {
      eventType,
      user: user.email,
      sessionId,
      timestamp,
      data
    });

    // In production, you would:
    // 1. Send to Sentry/Firebase/Bugsnag
    // 2. Store in time-series DB
    // 3. Aggregate for dashboards
    // 4. Alert on critical thresholds

    return Response.json({ success: true });
  } catch (error) {
    console.error('RUM endpoint error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});