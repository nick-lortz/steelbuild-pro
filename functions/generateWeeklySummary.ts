import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { week_id, project_ids } = await req.json();

    if (!week_id) {
      return Response.json({ error: 'week_id required' }, { status: 400 });
    }

    // Fetch notes for the week
    let notes = await base44.entities.ProductionNote.filter({ week_id });

    // Filter by projects if specified
    if (project_ids && project_ids.length > 0) {
      notes = notes.filter(n => project_ids.includes(n.project_id));
    }

    // Fetch project details
    const projectIds = [...new Set(notes.map(n => n.project_id))];
    const projects = await Promise.all(
      projectIds.map(id => base44.entities.Project.filter({ id }))
    );
    const projectMap = {};
    projects.flat().forEach(p => {
      projectMap[p.id] = p;
    });

    // Categorize notes
    const actions = notes.filter(n => n.note_type === 'action');
    const decisions = notes.filter(n => n.note_type === 'decision');
    const generalNotes = notes.filter(n => n.note_type === 'note');

    // Build context for AI
    const context = `
Week: ${week_id}
Total Projects: ${projectIds.length}

ACTION ITEMS (${actions.length} total):
${actions.map(a => `
- ${a.title || a.body}
  Project: ${projectMap[a.project_id]?.name || 'Unknown'}
  Owner: ${a.owner_email || 'Unassigned'}
  Due: ${a.due_date || 'No date'}
  Status: ${a.status}
  Category: ${a.category}
`).join('\n')}

DECISIONS LOGGED (${decisions.length} total):
${decisions.map(d => `
- ${d.title || d.body}
  Project: ${projectMap[d.project_id]?.name || 'Unknown'}
`).join('\n')}

GENERAL NOTES (${generalNotes.length} total):
${generalNotes.slice(0, 20).map(n => `
- ${n.title || n.body}
  Project: ${projectMap[n.project_id]?.name || 'Unknown'}
  Category: ${n.category}
`).join('\n')}
`;

    // Generate summary using AI
    const summary = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a construction project manager assistant. Analyze the following production meeting notes and create a concise executive summary.

${context}

Provide a summary with these sections:
1. **Week Overview**: Brief summary of overall activity
2. **Critical Action Items**: Highlight overdue or high-priority actions (max 5)
3. **Key Decisions**: List important decisions made (max 5)
4. **Risks & Blockers**: Identify any risks or blockers mentioned
5. **By Project**: Brief status for each project mentioned

Keep it professional and construction-focused. Use clear, direct language suitable for an executive briefing.`,
      add_context_from_internet: false
    });

    // Calculate metrics
    const openActions = actions.filter(a => a.status === 'open' || a.status === 'in_progress');
    const overdueActions = openActions.filter(a => {
      if (!a.due_date) return false;
      return new Date(a.due_date) < new Date();
    });

    return Response.json({
      summary: summary,
      metrics: {
        total_notes: notes.length,
        actions: actions.length,
        decisions: decisions.length,
        general: generalNotes.length,
        open_actions: openActions.length,
        overdue_actions: overdueActions.length,
        projects_count: projectIds.length
      },
      week_id
    });

  } catch (error) {
    console.error('Summary generation error:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate summary' 
    }, { status: 500 });
  }
});