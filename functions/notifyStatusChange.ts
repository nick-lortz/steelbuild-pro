import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;

    if (event.type === 'update' && old_data?.status !== data?.status) {
      // Status changed
      const task = data;

      // Notify assigned resources
      const resourceEmails = task.assigned_resources || [];
      const statusLabel = task.status
        .replace(/_/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      for (const email of resourceEmails) {
        await base44.functions.invoke('generateNotifications', {
          event_type: 'status_change',
          entity_type: 'Task',
          entity_id: task.id,
          project_id: task.project_id,
          recipient_email: email,
          title: `Task Status: ${task.name}`,
          message: `"${task.name}" status changed to ${statusLabel}`,
          priority: task.status === 'completed' ? 'high' : 'normal',
          action_url: `/Schedule?task=${task.id}`
        });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});