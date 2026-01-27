import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action, eventData } = await req.json();

  if (action === 'fetchWeekEvents') {
    try {
      const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
      
      const now = new Date();
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${now.toISOString()}&timeMax=${weekEnd.toISOString()}&orderBy=startTime&singleEvents=true`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      return Response.json({ events: data.items || [] });
    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  if (action === 'createEvent') {
    try {
      const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventData)
        }
      );

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.status}`);
      }

      const event = await response.json();
      return Response.json({ event });
    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
});