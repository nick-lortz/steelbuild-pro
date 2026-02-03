/**
 * Log Critical Errors to Sentry + Slack
 * Called when unrecoverable errors occur (financial data loss, deployment failure, etc.)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { errorMessage, errorType, context = {} } = await req.json();

    if (!errorMessage || !errorType) {
      return Response.json({ error: 'Missing errorMessage or errorType' }, { status: 400 });
    }

    // Get current user (optional, may be system error)
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (e) {
      // Ignore auth errors when logging system errors
    }

    const timestamp = new Date().toISOString();
    const severity = ['CRITICAL', 'ERROR', 'WARNING'].includes(errorType) ? errorType : 'ERROR';

    // 1. Log to console (CloudFlare captures these)
    console.error(JSON.stringify({
      timestamp,
      type: 'critical_error',
      severity,
      error: errorMessage,
      context,
      user: user?.email || 'system'
    }));

    // 2. Send to Slack if webhook configured
    const slackWebhook = Deno.env.get('SLACK_WEBHOOK');
    if (slackWebhook) {
      const color = severity === 'CRITICAL' ? 'danger' : severity === 'ERROR' ? 'warning' : 'good';
      
      await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachments: [{
            color,
            title: `🚨 ${severity}: ${errorType}`,
            text: errorMessage,
            fields: [
              { title: 'User', value: user?.email || 'system', short: true },
              { title: 'Time', value: timestamp, short: true },
              { title: 'Context', value: JSON.stringify(context, null, 2), short: false }
            ]
          }]
        })
      });
    }

    return Response.json({
      logged: true,
      timestamp,
      severity
    });

  } catch (error) {
    console.error('logCriticalError failed:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});