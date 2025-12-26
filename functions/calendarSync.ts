import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, eventData } = await req.json();
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    if (action === 'fetchWeekEvents') {
      // Get events for the current week
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${startOfWeek.toISOString()}&` +
        `timeMax=${endOfWeek.toISOString()}&` +
        `singleEvents=true&` +
        `orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      return Response.json({ events: data.items || [] });
    }

    if (action === 'createEvent') {
      // Check for double bookings first
      const { start, end } = eventData;
      const checkResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${start}&` +
        `timeMax=${end}&` +
        `singleEvents=true`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      const existingEvents = await checkResponse.json();
      if (existingEvents.items && existingEvents.items.length > 0) {
        return Response.json({ 
          error: 'Double booking detected', 
          conflictingEvents: existingEvents.items 
        }, { status: 400 });
      }

      // Create event with reminder
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...eventData,
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'email', minutes: 30 },
                { method: 'popup', minutes: 15 },
              ],
            },
          }),
        }
      );

      const data = await response.json();
      return Response.json({ event: data });
    }

    if (action === 'updateEvent') {
      const { eventId, updates } = eventData;
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      const data = await response.json();
      return Response.json({ event: data });
    }

    if (action === 'deleteEvent') {
      const { eventId } = eventData;
      
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});