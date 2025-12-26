import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get('meetingId');

    if (!meetingId) {
      return Response.json({ error: 'meetingId required' }, { status: 400 });
    }

    // Get the recurring meeting
    const meeting = await base44.entities.Meeting.filter({ id: meetingId });
    if (!meeting || meeting.length === 0) {
      return Response.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const recurringMeeting = meeting[0];

    if (!recurringMeeting.is_recurring || !recurringMeeting.recurrence_pattern) {
      return Response.json({ error: 'Meeting is not set as recurring' }, { status: 400 });
    }

    const startDate = new Date(recurringMeeting.meeting_date);
    const endDate = recurringMeeting.recurrence_end_date 
      ? new Date(recurringMeeting.recurrence_end_date)
      : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // Default 1 year

    const occurrences = [];
    let currentDate = new Date(startDate);

    // Generate occurrences based on pattern
    while (currentDate <= endDate && occurrences.length < 52) { // Max 52 occurrences
      if (currentDate > startDate) {
        occurrences.push(new Date(currentDate));
      }

      // Increment based on pattern
      switch (recurringMeeting.recurrence_pattern) {
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'quarterly':
          currentDate.setMonth(currentDate.getMonth() + 3);
          break;
        default:
          break;
      }
    }

    // Create meeting instances
    const created = [];
    for (const occurrenceDate of occurrences) {
      try {
        const newMeeting = await base44.entities.Meeting.create({
          project_id: recurringMeeting.project_id,
          title: recurringMeeting.title,
          meeting_date: occurrenceDate.toISOString(),
          duration_minutes: recurringMeeting.duration_minutes,
          location: recurringMeeting.location,
          attendees: recurringMeeting.attendees || [],
          notes: recurringMeeting.notes,
          is_recurring: false,
          parent_meeting_id: meetingId,
          reminder_sent: false,
        });
        created.push(newMeeting);
      } catch (error) {
        console.error('Failed to create occurrence:', error);
      }
    }

    return Response.json({
      success: true,
      occurrencesCreated: created.length,
      pattern: recurringMeeting.recurrence_pattern,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});