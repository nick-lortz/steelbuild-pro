import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action, eventData, eventId } = await req.json();

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

      // Convert datetime-local format to proper ISO format
      const formattedEventData = {
        ...eventData,
        start: {
          dateTime: new Date(eventData.start.dateTime).toISOString(),
          timeZone: 'America/Phoenix'
        },
        end: {
          dateTime: new Date(eventData.end.dateTime).toISOString(),
          timeZone: 'America/Phoenix'
        }
      };

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formattedEventData)
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Google Calendar API error: ${response.status} - ${errorData}`);
      }

      const event = await response.json();
      return Response.json({ event });
    } catch (error) {
      console.error('Create event error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  if (action === 'updateEvent') {
    try {
      if (!eventId) {
        return Response.json({ error: 'Event ID required' }, { status: 400 });
      }

      const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

      // Convert datetime-local format to proper ISO format
      const formattedEventData = {
        ...eventData,
        start: {
          dateTime: new Date(eventData.start.dateTime).toISOString(),
          timeZone: 'America/Phoenix'
        },
        end: {
          dateTime: new Date(eventData.end.dateTime).toISOString(),
          timeZone: 'America/Phoenix'
        }
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formattedEventData)
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Google Calendar API error: ${response.status} - ${errorData}`);
      }

      const event = await response.json();
      return Response.json({ event });
    } catch (error) {
      console.error('Update event error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
});