import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check environment variables for API keys
    const hasSlackToken = !!Deno.env.get('SLACK_BOT_TOKEN');
    const hasTeamsWebhook = !!Deno.env.get('TEAMS_WEBHOOK_URL');
    const hasQBCredentials = !!Deno.env.get('QUICKBOOKS_CLIENT_ID') && !!Deno.env.get('QUICKBOOKS_CLIENT_SECRET');

    // Check Google Drive connector
    let driveConnected = false;
    try {
      await base44.asServiceRole.connectors.getAccessToken('googledrive');
      driveConnected = true;
    } catch {
      driveConnected = false;
    }

    return Response.json({
      google_drive: {
        connected: driveConnected,
        last_sync: null
      },
      slack: {
        connected: hasSlackToken,
        channel_count: 0
      },
      teams: {
        configured: hasTeamsWebhook
      },
      quickbooks: {
        connected: hasQBCredentials
      },
      recent_activity: []
    });

  } catch (error) {
    console.error('Integration status error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});