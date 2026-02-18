import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { config } from './_lib/config.js';
import { redactPII } from './_lib/redact.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channel, message, type = 'info', project_name, attachments = [] } = await req.json();

    const token = config.SLACK_BOT_TOKEN();
    if (!token) {
      return Response.json({ 
        error: 'Slack not configured',
        setup_required: 'Add SLACK_BOT_TOKEN to environment variables'
      }, { status: 400 });
    }

    // Redact PII before sending external
    const safeMessage = redactPII(message);
    const safeProjectName = project_name ? redactPII(project_name) : 'SteelBuild-Pro Notification';
    
    // Build Slack message
    const emoji = type === 'urgent' ? ':rotating_light:' : 
                  type === 'warning' ? ':warning:' : 
                  type === 'success' ? ':white_check_mark:' : ':information_source:';

    const slackPayload = {
      channel: channel.startsWith('#') ? channel : `#${channel}`,
      text: safeMessage,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} ${safeProjectName}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: safeMessage
          }
        }
      ]
    };

    // Add attachments if provided
    if (attachments.length > 0) {
      slackPayload.blocks.push({
        type: 'context',
        elements: attachments.map(a => ({
          type: 'mrkdwn',
          text: `<${a.url}|${a.name}>`
        }))
      });
    }

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(slackPayload)
    });

    const result = await response.json();

    if (!result.ok) {
      return Response.json({ 
        error: result.error || 'Slack API error',
        details: result
      }, { status: 400 });
    }

    return Response.json({
      success: true,
      message_ts: result.ts,
      channel: result.channel
    });

  } catch (error) {
    console.error('Slack notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});