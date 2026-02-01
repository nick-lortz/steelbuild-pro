import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { team_id, channel_id, message } = await req.json();

    if (!team_id || !channel_id || !message) {
      return Response.json({ 
        error: 'team_id, channel_id, and message are required' 
      }, { status: 400 });
    }

    // Get Teams access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('msteams');

    if (!accessToken) {
      return Response.json({ 
        error: 'Teams connector not authorized' 
      }, { status: 401 });
    }

    // Post to Teams channel using Microsoft Graph API
    const graphUrl = `https://graph.microsoft.com/v1.0/teams/${team_id}/channels/${channel_id}/messages`;

    const response = await fetch(graphUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        body: {
          contentType: 'html',
          content: message
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Teams API error:', error);
      return Response.json({ 
        error: 'Failed to post to Teams', 
        details: error 
      }, { status: response.status });
    }

    const result = await response.json();

    return Response.json({
      success: true,
      message_id: result.id,
      posted_at: result.createdDateTime
    });

  } catch (error) {
    console.error('Error posting to Teams:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});