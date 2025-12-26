import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Use service role to check meetings
    const meetings = await base44.asServiceRole.entities.Meeting.list();
    const now = new Date();
    const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);
    
    const upcomingMeetings = meetings.filter(meeting => {
      if (meeting.reminder_sent) return false;
      
      const meetingDate = new Date(meeting.meeting_date);
      return meetingDate > now && meetingDate <= in15Minutes;
    });

    // Send notifications and mark as sent
    const notifications = [];
    for (const meeting of upcomingMeetings) {
      // Get attendee emails (if stored as emails)
      const attendees = meeting.attendees || [];
      
      for (const attendee of attendees) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: attendee,
            subject: `Meeting Reminder: ${meeting.title}`,
            body: `Your meeting "${meeting.title}" is starting in 15 minutes.\n\nTime: ${new Date(meeting.meeting_date).toLocaleString()}\nLocation: ${meeting.location || 'Not specified'}\n\nNotes: ${meeting.notes || 'None'}`,
          });
          
          notifications.push({ meeting: meeting.title, attendee });
        } catch (error) {
          console.error(`Failed to send notification to ${attendee}:`, error);
        }
      }
      
      // Mark reminder as sent
      await base44.asServiceRole.entities.Meeting.update(meeting.id, {
        reminder_sent: true,
      });
    }

    return Response.json({
      success: true,
      notificationsSent: notifications.length,
      meetings: upcomingMeetings.map(m => m.title),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});