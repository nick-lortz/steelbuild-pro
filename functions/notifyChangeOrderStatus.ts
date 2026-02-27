import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Entity automation: fires on ChangeOrder create/update.
 * Sends email notifications to PM and GC contact when CO status changes,
 * and records the notification in the notifications_sent array.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch (_) {}

    const event = body.event || {};
    const data = body.data || {};
    const old_data = body.old_data || {};

    // Resolve CO data — fetch if payload missing key fields
    let co = data;
    if (!co.project_id && (event.entity_id || data.id)) {
      const records = await base44.asServiceRole.entities.ChangeOrder.filter({ id: event.entity_id || data.id });
      if (records.length) co = records[0];
    }

    if (!co.project_id) {
      return Response.json({ success: true, message: 'No project_id — skipping' });
    }

    const isCreate = event.type === 'create';
    const statusChanged = event.type === 'update' && old_data.status !== co.status;

    if (!isCreate && !statusChanged) {
      return Response.json({ success: true, message: 'No notification-worthy change' });
    }

    // Fetch project for PM / GC contact emails
    const projects = await base44.asServiceRole.entities.Project.filter({ id: co.project_id });
    const project = projects[0] || {};

    const recipients = [];
    if (project.project_manager) recipients.push(project.project_manager);
    if (project.gc_email) recipients.push(project.gc_email);
    if (co.approved_by && co.approved_by.includes('@')) recipients.push(co.approved_by);
    // Deduplicate
    const uniqueRecipients = [...new Set(recipients.filter(Boolean))];

    if (uniqueRecipients.length === 0) {
      return Response.json({ success: true, message: 'No recipients configured on project' });
    }

    const coLabel = `CO-${String(co.co_number).padStart(3, '0')} – ${co.title}`;
    const projectLabel = `${project.project_number} ${project.name}`;
    const costStr = co.cost_impact >= 0
      ? `+$${co.cost_impact.toLocaleString()}`
      : `-$${Math.abs(co.cost_impact).toLocaleString()}`;
    const schedStr = co.schedule_impact_days
      ? `${co.schedule_impact_days > 0 ? '+' : ''}${co.schedule_impact_days} calendar days`
      : 'No schedule impact';

    let subject, bodyHtml;

    if (isCreate) {
      subject = `[NEW CO] ${coLabel} — ${projectLabel}`;
      bodyHtml = `
        <p>A new Change Order has been submitted for your records.</p>
        <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px;">
          <tr><td style="padding:6px 12px;color:#666;">Project</td><td style="padding:6px 12px;font-weight:bold;">${projectLabel}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:6px 12px;color:#666;">CO Number</td><td style="padding:6px 12px;font-weight:bold;font-family:monospace;">CO-${String(co.co_number).padStart(3, '0')}</td></tr>
          <tr><td style="padding:6px 12px;color:#666;">Title</td><td style="padding:6px 12px;">${co.title}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:6px 12px;color:#666;">Status</td><td style="padding:6px 12px;text-transform:uppercase;font-weight:bold;">${co.status}</td></tr>
          <tr><td style="padding:6px 12px;color:#666;">Cost Impact</td><td style="padding:6px 12px;font-weight:bold;color:${co.cost_impact >= 0 ? '#16a34a' : '#dc2626'};">${costStr}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:6px 12px;color:#666;">Schedule Impact</td><td style="padding:6px 12px;">${schedStr}</td></tr>
          ${co.description ? `<tr><td style="padding:6px 12px;color:#666;vertical-align:top;">Description</td><td style="padding:6px 12px;">${co.description}</td></tr>` : ''}
        </table>
      `;
    } else {
      const oldStatusLabel = (old_data.status || '').replace(/_/g, ' ').toUpperCase();
      const newStatusLabel = (co.status || '').replace(/_/g, ' ').toUpperCase();
      subject = `[CO STATUS] ${coLabel} → ${newStatusLabel} — ${projectLabel}`;
      bodyHtml = `
        <p>A Change Order status has been updated.</p>
        <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px;">
          <tr><td style="padding:6px 12px;color:#666;">Project</td><td style="padding:6px 12px;font-weight:bold;">${projectLabel}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:6px 12px;color:#666;">CO Number</td><td style="padding:6px 12px;font-weight:bold;font-family:monospace;">CO-${String(co.co_number).padStart(3, '0')}</td></tr>
          <tr><td style="padding:6px 12px;color:#666;">Title</td><td style="padding:6px 12px;">${co.title}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:6px 12px;color:#666;">Status Change</td><td style="padding:6px 12px;font-weight:bold;">${oldStatusLabel} → <span style="color:${co.status === 'approved' ? '#16a34a' : co.status === 'rejected' ? '#dc2626' : '#2563eb'}">${newStatusLabel}</span></td></tr>
          <tr><td style="padding:6px 12px;color:#666;">Cost Impact</td><td style="padding:6px 12px;font-weight:bold;color:${co.cost_impact >= 0 ? '#16a34a' : '#dc2626'};">${costStr}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:6px 12px;color:#666;">Schedule Impact</td><td style="padding:6px 12px;">${schedStr}</td></tr>
          ${co.status === 'approved' ? `<tr><td style="padding:6px 12px;color:#666;">Approved By</td><td style="padding:6px 12px;">${co.approved_by || 'N/A'}</td></tr>` : ''}
        </table>
      `;
    }

    // Send to all recipients
    const sentTo = [];
    for (const email of uniqueRecipients) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject,
        body: bodyHtml
      });
      sentTo.push(email);
    }

    // Record notification_sent on the CO
    const notifRecord = {
      type: isCreate ? 'submitted' : 'status_change',
      sent_to: sentTo,
      sent_at: new Date().toISOString()
    };
    const existingNotifs = co.notifications_sent || [];
    await base44.asServiceRole.entities.ChangeOrder.update(co.id, {
      notifications_sent: [...existingNotifs, notifRecord]
    });

    return Response.json({
      success: true,
      co_number: co.co_number,
      event_type: event.type,
      status: co.status,
      notified: sentTo
    });

  } catch (error) {
    console.error('notifyChangeOrderStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});