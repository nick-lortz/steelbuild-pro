import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { webhook_url, title, message, type = 'info', facts = [] } = await req.json();

    const webhookURL = webhook_url || Deno.env.get('TEAMS_WEBHOOK_URL');
    
    if (!webhookURL) {
      return Response.json({ 
        error: 'Teams not configured',
        setup_required: 'Provide webhook_url or add TEAMS_WEBHOOK_URL to environment variables'
      }, { status: 400 });
    }

    // Build Teams adaptive card
    const themeColor = type === 'urgent' ? 'FF0000' :
                       type === 'warning' ? 'FFA500' :
                       type === 'success' ? '00FF00' : '0078D4';

    const teamsPayload = {
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      "themeColor": themeColor,
      "title": title,
      "text": message,
      "sections": facts.length > 0 ? [{
        "facts": facts
      }] : []
    };

    const response = await fetch(webhookURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(teamsPayload)
    });

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ 
        error: 'Teams webhook failed',
        details: error
      }, { status: 400 });
    }

    return Response.json({
      success: true,
      sent_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Teams notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});