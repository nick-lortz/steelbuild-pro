import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { redactPII } from './_lib/redact.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { week_id, project_ids } = await req.json();
    const MAX_NOTES = 500;

    if (!week_id) {
      return Response.json({ error: 'week_id required' }, { status: 400 });
    }

    // Fetch notes for the week
    let query = { week_id };
    if (project_ids && project_ids.length > 0) {
      // Filter by specific projects if provided
      query = { week_id, project_id: { $in: project_ids } };
    }

    const notes = await base44.entities.ProductionNote.filter(query, null, MAX_NOTES);
    const projects = await base44.entities.Project.list();

    // Get project names map
    const projectMap = {};
    projects.forEach(p => {
      projectMap[p.id] = p.name;
    });

    // Categorize notes
    const decisions = notes.filter(n => n.note_type === 'decision');
    const actions = notes.filter(n => n.note_type === 'action' && n.status !== 'done' && n.status !== 'cancelled');
    const blockers = notes.filter(n => n.note_type === 'blocker' || n.priority === 'critical');
    const risks = notes.filter(n => n.note_type === 'risk');

    // Build context for AI (redact PII from notes)
    const context = `
You are summarizing production meeting notes for week ${week_id} for a structural steel fabrication and erection company.

DECISIONS MADE (${decisions.length}):
${decisions.map(d => `- [Project] ${redactPII(d.title || d.body)} (${d.category})`).join('\n')}

OPEN ACTION ITEMS (${actions.length}):
${actions.map(a => `- [Project] ${redactPII(a.title || a.body)} | Due: ${a.due_date || 'TBD'} | Status: ${a.status}`).join('\n')}

BLOCKERS & CRITICAL ITEMS (${blockers.length}):
${blockers.map(b => `- [Project] ${redactPII(b.title || b.body)}`).join('\n')}

RISKS IDENTIFIED (${risks.length}):
${risks.map(r => `- [Project] ${redactPII(r.title || r.body)}`).join('\n')}

Generate a concise executive summary in the following format:

## Executive Summary - Week ${week_id}

### Key Decisions
[Bullet list of critical decisions, grouped by project if relevant]

### Action Items Requiring Attention
[Bullet list of high-priority or overdue actions with owners and due dates]

### Blockers & Risks
[Bullet list of items blocking progress or presenting risk]

### Recommendations
[2-3 actionable next steps based on the notes]

Keep it construction-focused, direct, and actionable. Use steel industry terminology.
`;

    const summary = await base44.integrations.Core.InvokeLLM({
      prompt: context,
      add_context_from_internet: false
    });

    return Response.json({
      summary,
      stats: {
        total_notes: notes.length,
        decisions: decisions.length,
        open_actions: actions.length,
        blockers: blockers.length,
        risks: risks.length
      }
    });

  } catch (error) {
    console.error('Error summarizing notes:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});