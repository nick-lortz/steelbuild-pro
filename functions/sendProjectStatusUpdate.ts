/**
 * SEND PROJECT STATUS UPDATE VIA GMAIL
 * 
 * Sends project status emails using Gmail API.
 * Compiles project health, blockers, and key metrics.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function requireUser(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) throw { status: 401, message: 'Unauthorized' };
  return user;
}

function ok(data) {
  return Response.json({ success: true, data }, { status: 200 });
}

function serverError(message, error = null) {
  console.error('[SERVER_ERROR]', message, error);
  return Response.json({ success: false, error: message }, { status: 500 });
}

Deno.serve(async (req) => {
  try {
    const user = await requireUser(req);
    const base44 = createClientFromRequest(req);
    
    const { project_id, recipient_emails, include_blockers, include_metrics } = await req.json();
    
    if (!project_id || !recipient_emails?.length) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get project details
    const projects = await base44.entities.Project.filter({ id: project_id });
    const project = projects[0];
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Get project pulse
    const pulse = await base44.functions.invoke('getProjectPulse', { project_id });
    
    // Build email content
    const subject = `Project Status Update: ${project.project_number} - ${project.name}`;
    
    let body = `PROJECT STATUS UPDATE\n`;
    body += `=====================\n\n`;
    body += `Project: ${project.project_number} - ${project.name}\n`;
    body += `Phase: ${project.phase}\n`;
    body += `Status: ${project.status}\n`;
    body += `PM: ${project.project_manager || 'Not assigned'}\n\n`;
    
    if (include_metrics && pulse.data?.counts) {
      body += `KEY METRICS\n`;
      body += `-----------\n`;
      body += `Open RFIs: ${pulse.data.counts.rfi_open}\n`;
      body += `Open Submittals: ${pulse.data.counts.submittal_open}\n`;
      body += `Open Change Orders: ${pulse.data.counts.co_open}\n`;
      body += `Overdue Tasks: ${pulse.data.counts.tasks_overdue}\n`;
      body += `Overdue Deliveries: ${pulse.data.counts.deliveries_overdue}\n`;
      body += `Drawings Pending: ${pulse.data.counts.drawings_pending}\n\n`;
    }
    
    if (include_blockers && pulse.data?.blockers?.length > 0) {
      body += `CRITICAL BLOCKERS\n`;
      body += `-----------------\n`;
      pulse.data.blockers.slice(0, 5).forEach((blocker, idx) => {
        body += `${idx + 1}. [${blocker.severity.toUpperCase()}] ${blocker.title}\n`;
        body += `   ${blocker.reason}\n`;
        body += `   Action: ${blocker.recommended_action}\n\n`;
      });
    }
    
    body += `\n---\n`;
    body += `Generated: ${new Date().toLocaleString()}\n`;
    body += `Sent by: ${user.full_name || user.email}\n`;
    
    // Send emails to each recipient using built-in email
    for (const email of recipient_emails) {
      await base44.integrations.Core.SendEmail({
        from_name: `${project.name} Status`,
        to: email,
        subject: subject,
        body: body
      });
    }
    
    return ok({ 
      sent: true, 
      recipients: recipient_emails.length,
      project: project.project_number
    });
    
  } catch (error) {
    return serverError('Failed to send project status update', error);
  }
});