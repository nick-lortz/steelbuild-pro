import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PMA Communication Analysis
 * Scans messages, RFI comments, production notes, and daily logs
 * for conflict signals, risk language, and escalation patterns.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id, lookback_days = 14 } = await req.json();
    if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });

    const now = new Date();
    const cutoff = new Date(now - lookback_days * 86400000);

    // Fetch all communication artifacts in parallel
    const [messages, rfis, productionNotes, dailyLogs, meetings] = await Promise.all([
      base44.entities.Message.filter({ project_id }),
      base44.entities.RFI.filter({ project_id }),
      base44.entities.ProductionNote.filter({ project_id }),
      base44.entities.DailyLog.filter({ project_id }),
      base44.entities.Meeting.filter({ project_id })
    ]);

    // Filter to lookback window
    const recentMessages = messages.filter(m => m.created_date && new Date(m.created_date) >= cutoff);
    const recentNotes = productionNotes.filter(n => n.created_date && new Date(n.created_date) >= cutoff);
    const recentLogs = dailyLogs.filter(l => l.log_date && new Date(l.log_date) >= cutoff);
    const recentMeetings = meetings.filter(m => m.meeting_date && new Date(m.meeting_date) >= cutoff);

    // Aggregate RFI comment threads (use questions/responses as comm data)
    const rfiComms = rfis.flatMap(rfi => {
      const lines = [];
      if (rfi.question) lines.push({ source: 'RFI', text: rfi.question, date: rfi.submitted_date, ref: `RFI-${rfi.rfi_number}` });
      if (rfi.response) lines.push({ source: 'RFI Response', text: rfi.response, date: rfi.response_date, ref: `RFI-${rfi.rfi_number}` });
      if (rfi.resolution_notes) lines.push({ source: 'RFI Notes', text: rfi.resolution_notes, date: rfi.updated_date, ref: `RFI-${rfi.rfi_number}` });
      (rfi.comments || []).forEach(c => {
        if (c.comment) lines.push({ source: 'RFI Comment', text: c.comment, date: c.created_at, ref: `RFI-${rfi.rfi_number}` });
      });
      return lines.filter(l => l.date && new Date(l.date) >= cutoff);
    });

    // Meeting action items / notes
    const meetingComms = recentMeetings.flatMap(m => {
      const lines = [];
      if (m.notes) lines.push({ source: 'Meeting Notes', text: m.notes, date: m.meeting_date, ref: m.title });
      (m.action_items || []).filter(a => a.status !== 'completed').forEach(ai => {
        lines.push({ source: 'Action Item', text: `${ai.item} — assigned to ${ai.assignee || 'unassigned'}`, date: m.meeting_date, ref: m.title });
      });
      return lines;
    });

    // Production notes
    const noteComms = recentNotes.map(n => ({
      source: 'Production Note', text: n.content || n.notes || n.description || '', date: n.created_date, ref: n.title || 'Note'
    })).filter(n => n.text);

    // Daily logs
    const logComms = recentLogs.map(l => ({
      source: 'Daily Log',
      text: [l.work_performed, l.delay_reason, l.safety_notes, l.notes].filter(Boolean).join(' | '),
      date: l.log_date,
      ref: `Log ${l.log_date}`
    })).filter(l => l.text);

    // Messages
    const msgComms = recentMessages.map(m => ({
      source: 'Message', text: m.content || m.body || '', date: m.created_date, ref: m.subject || 'Message'
    })).filter(m => m.text);

    const allComms = [...rfiComms, ...meetingComms, ...noteComms, ...logComms, ...msgComms];

    // Quick heuristic pre-scan for risk keywords before LLM call
    const RISK_KEYWORDS = ['dispute', 'disagree', 'delay', 'hold', 'stop', 'conflict', 'won\'t', "can't", 'refused', 'rejected', 'overdue', 'missed', 'failed', 'not installed', 'wrong', 'incorrect', 'safety', 'incident', 'injured', 'damage', 'rework', 'backcharge', 'claim', 'change order', 'extra work', 'out of scope', 'not our scope', 'budget', 'over budget', 'at risk', 'behind schedule'];

    const flaggedItems = allComms.filter(c => {
      const lower = c.text.toLowerCase();
      return RISK_KEYWORDS.some(k => lower.includes(k));
    });

    const totalItems = allComms.length;
    const riskDensity = totalItems > 0 ? (flaggedItems.length / totalItems * 100).toFixed(1) : 0;

    // Build condensed text corpus for AI analysis (limit tokens)
    const corpus = allComms
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 60) // cap at 60 most recent
      .map(c => `[${c.source} | ${c.ref} | ${c.date}]\n${c.text.substring(0, 300)}`)
      .join('\n\n---\n\n');

    const aiPrompt = `You are a structural steel PM AI. Analyze the following project communications from the last ${lookback_days} days.

Identify:
1. CONFLICT SIGNALS — disputes, scope disagreements, subcontractor friction, GC pushback
2. SCHEDULE RISK LANGUAGE — delays mentioned, holds, out-of-sequence issues
3. COST/CLAIM EXPOSURE — backcharges, extra work, scope gap language
4. SAFETY CONCERNS — near misses, incidents, hazard flags
5. RECURRING PATTERNS — topics/issues mentioned more than once (early warning)

For each finding, cite the source (RFI #, Meeting, Log date, etc.).

Output JSON with this structure:
{
  "overall_risk": "low|medium|high|critical",
  "risk_summary": "2-sentence summary",
  "conflicts": [{ "title": "...", "description": "...", "source": "...", "severity": "low|medium|high" }],
  "schedule_risks": [{ "title": "...", "description": "...", "source": "..." }],
  "cost_exposure": [{ "title": "...", "description": "...", "source": "..." }],
  "safety_flags": [{ "title": "...", "description": "...", "source": "..." }],
  "recurring_patterns": [{ "pattern": "...", "occurrences": 2, "implication": "..." }],
  "recommended_actions": ["..."]
}

PROJECT COMMUNICATIONS (${totalItems} items, ${flaggedItems.length} pre-flagged):
${corpus || 'No communications found in this period.'}`;

    const raw = await base44.integrations.Core.InvokeLLM({
      prompt: aiPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          overall_risk: { type: 'string' },
          risk_summary: { type: 'string' },
          conflicts: { type: 'array', items: { type: 'object' } },
          schedule_risks: { type: 'array', items: { type: 'object' } },
          cost_exposure: { type: 'array', items: { type: 'object' } },
          safety_flags: { type: 'array', items: { type: 'object' } },
          recurring_patterns: { type: 'array', items: { type: 'object' } },
          recommended_actions: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json({
      success: true,
      lookback_days,
      total_communications: totalItems,
      flagged_count: flaggedItems.length,
      risk_density_pct: parseFloat(riskDensity),
      analysis: raw,
      generated_at: now.toISOString()
    });

  } catch (err) {
    console.error('[PMA] Communication analysis error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});