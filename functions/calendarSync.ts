import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, task_id, meeting_id } = await req.json();
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    if (action === 'sync_task') {
      const task = await base44.entities.Task.list().then(t => t.find(tsk => tsk.id === task_id));
      const project = await base44.entities.Project.list().then(p => p.find(pr => pr.id === task.project_id));

      const event = {
        summary: `[SteelBuild] ${task.name}`,
        description: `Project: ${project?.project_number}\nPhase: ${task.phase}\nStatus: ${task.status}\n\nTask ID: ${task_id}`,
        start: {
          date: task.start_date
        },
        end: {
          date: task.end_date
        }
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      const calendarEvent = await response.json();
      return Response.json({ success: true, eventId: calendarEvent.id });
    }

    if (action === 'sync_meeting') {
      const meeting = await base44.entities.Meeting.list().then(m => m.find(mtg => mtg.id === meeting_id));
      const project = await base44.entities.Project.list().then(p => p.find(pr => pr.id === meeting.project_id));

      const event = {
        summary: meeting.title,
        description: `Project: ${project?.project_number}\nLocation: ${meeting.location || 'TBD'}\nAttendees: ${meeting.attendees?.join(', ') || 'N/A'}\n\nNotes:\n${meeting.notes || ''}`,
        start: {
          dateTime: new Date(meeting.meeting_date).toISOString(),
          timeZone: Deno.env.get('TZ') || 'America/Phoenix'
        },
        end: {
          dateTime: new Date(new Date(meeting.meeting_date).getTime() + (meeting.duration_minutes || 60) * 60000).toISOString(),
          timeZone: Deno.env.get('TZ') || 'America/Phoenix'
        },
        attendees: meeting.attendees?.map(email => ({ email })) || []
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      const calendarEvent = await response.json();
      return Response.json({ success: true, eventId: calendarEvent.id });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});