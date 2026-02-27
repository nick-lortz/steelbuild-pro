import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Fetch all non-terminal submittals
    const allSubmittals = await base44.asServiceRole.entities.Submittal.list('-due_date', 500);
    const activeSubmittals = allSubmittals.filter(s =>
      !['approved', 'voided', 'rejected'].includes(s.status)
    );

    if (activeSubmittals.length === 0) {
      return Response.json({ success: true, processed: 0 });
    }

    // Fetch projects map for names
    const projectIds = [...new Set(activeSubmittals.map(s => s.project_id))];
    const projectsRaw = await Promise.all(
      projectIds.map(id => base44.asServiceRole.entities.Project.filter({ id }).then(r => r[0]))
    );
    const projectMap = {};
    projectsRaw.forEach(p => { if (p) projectMap[p.id] = p; });

    const overdue = [];
    const dueSoon = []; // due within 3 business days

    for (const s of activeSubmittals) {
      if (!s.due_date) continue;
      const due = new Date(s.due_date);
      const diffMs = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 0) overdue.push({ ...s, days_overdue: Math.abs(diffDays) });
      else if (diffDays <= 3) dueSoon.push({ ...s, days_until_due: diffDays });
    }

    const emailsSent = [];

    // Helper to build email body
    const buildEmailBody = (items, label) => {
      let body = `<h2>Submittal ${label} — ${todayStr}</h2><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:13px;">`;
      body += `<tr style="background:#f0f0f0;"><th>Submittal</th><th>Project</th><th>Type</th><th>Status</th><th>Due Date</th><th>Reviewer</th></tr>`;
      for (const s of items) {
        const proj = projectMap[s.project_id];
        const sub = `SUB-${String(s.submittal_number).padStart(3, '0')}: ${s.title}`;
        const projLabel = proj ? `${proj.project_number} – ${proj.name}` : s.project_id;
        const extra = label === 'Overdue Items' ? `(${s.days_overdue}d overdue)` : `(due in ${s.days_until_due}d)`;
        body += `<tr><td>${sub} ${extra}</td><td>${projLabel}</td><td>${s.type}</td><td>${s.status}</td><td>${s.due_date}</td><td>${s.reviewer || 'Unassigned'}</td></tr>`;
      }
      body += '</table>';
      return body;
    };

    // Collect unique reviewer emails for overdue items
    const reviewerOverdueMap = {};
    for (const s of overdue) {
      if (s.reviewer) {
        if (!reviewerOverdueMap[s.reviewer]) reviewerOverdueMap[s.reviewer] = [];
        reviewerOverdueMap[s.reviewer].push(s);
      }
    }

    // Send per-reviewer overdue reminders
    for (const [email, items] of Object.entries(reviewerOverdueMap)) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `[Action Required] ${items.length} Overdue Submittal(s) — ${todayStr}`,
        body: buildEmailBody(items, 'Overdue Items')
      });
      emailsSent.push({ to: email, type: 'overdue', count: items.length });
    }

    // Collect unique reviewer emails for due-soon items
    const reviewerDueSoonMap = {};
    for (const s of dueSoon) {
      if (s.reviewer) {
        if (!reviewerDueSoonMap[s.reviewer]) reviewerDueSoonMap[s.reviewer] = [];
        reviewerDueSoonMap[s.reviewer].push(s);
      }
    }

    // Send per-reviewer due-soon reminders
    for (const [email, items] of Object.entries(reviewerDueSoonMap)) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `[Reminder] ${items.length} Submittal(s) Due Within 3 Days — ${todayStr}`,
        body: buildEmailBody(items, 'Due Soon')
      });
      emailsSent.push({ to: email, type: 'due_soon', count: items.length });
    }

    return Response.json({
      success: true,
      today: todayStr,
      overdue_count: overdue.length,
      due_soon_count: dueSoon.length,
      emails_sent: emailsSent
    });

  } catch (error) {
    console.error('checkOverdueSubmittals error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});