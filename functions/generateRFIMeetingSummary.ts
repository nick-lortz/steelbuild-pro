import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate meeting summary of open/critical RFIs
 * Returns: executive summary, blockers, action items, next steps
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { project_id, meeting_date } = await req.json();

    // Fetch open RFIs
    const rfis = await base44.entities.RFI.filter({
      project_id,
      status: { $ne: 'closed' }
    });

    const blockers = rfis.filter(r => r.blocker_info?.is_blocker);
    const overdue = rfis.filter(r => r.due_date && new Date(r.due_date) < new Date());
    const critical = rfis.filter(r => r.priority === 'critical');

    const rfiSummary = rfis.map(r => 
      `RFI #${r.rfi_number}: ${r.subject} (${r.status}, ${r.priority}) - Type: ${r.rfi_type}`
    ).join('\n');

    const prompt = `You are a construction project manager. Generate a concise meeting summary.

Meeting Date: ${meeting_date}

Open RFIs (${rfis.length} total):
${rfiSummary}

Critical/Blockers (${critical.length}):
${critical.map(r => `- RFI #${r.rfi_number}: ${r.subject}`).join('\n')}

Overdue (${overdue.length}):
${overdue.map(r => `- RFI #${r.rfi_number}: Due ${r.due_date}`).join('\n')}

Generate a meeting summary with:
1. Executive Summary (1 paragraph, current RFI status)
2. Critical Blockers (what's stopping work, impacts, owners)
3. Action Items (who does what by when)
4. Next Meeting Triggers (what needs to change to escalate/resolve)`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          executive_summary: { type: 'string' },
          critical_blockers: { type: 'array', items: { type: 'string' } },
          action_items: { type: 'array', items: { type: 'string' } },
          next_meeting_triggers: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json({
      ...result,
      meeting_date,
      total_open_rfis: rfis.length,
      critical_count: critical.length,
      overdue_count: overdue.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});