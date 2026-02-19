import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { callLLMSafe } from './_lib/aiPolicy.js';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { document_id, file_url, summary_type = 'executive' } = await req.json();

  if (!document_id && !file_url) {
    return Response.json({ error: 'document_id or file_url required' }, { status: 400 });
  }

  let doc = null;
  let targetFileUrl = file_url;

  if (document_id) {
    const docs = await base44.entities.Document.filter({ id: document_id });
    doc = docs[0];
    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }
    targetFileUrl = doc.file_url;
  }

  if (!targetFileUrl) {
    return Response.json({ error: 'No file to summarize' }, { status: 400 });
  }

  // Build prompt based on summary type
  const prompts = {
    executive: `Provide an EXECUTIVE SUMMARY of this construction document for project leadership.

Focus on:
- What is this document (type, purpose, scope)?
- Key decisions, approvals, or actions required
- Cost impacts, schedule impacts, or risks
- Critical milestones or deadlines
- Dependencies on other work

Keep it to 3-5 concise sentences. Think like a PM briefing an executive.`,

    technical: `Provide a TECHNICAL SUMMARY of this construction document for field/shop teams.

Focus on:
- Structural elements, connections, details covered
- Material specifications and quantities
- Installation requirements and sequence
- Quality control and inspection requirements
- Dimensions, tolerances, and critical callouts

Keep it practical and field-ready. 4-6 sentences.`,

    action_items: `Extract all ACTION ITEMS and REQUIREMENTS from this construction document.

List:
- Required approvals or submittals
- Open questions or clarifications needed
- Pending decisions or selections
- Coordination requirements with other trades
- Inspection hold points
- Procurement or fabrication deadlines

Format as a bulleted list of actionable items.`,

    full: `Provide a COMPREHENSIVE SUMMARY of this construction document.

Include:
1. Document Overview: type, purpose, scope, applicable phases
2. Key Technical Content: structural elements, materials, specs, quantities
3. Requirements & Actions: approvals, inspections, submittals, decisions
4. Schedule & Logistics: milestones, lead times, sequencing
5. Cost & Commercial: budget impacts, change orders, cost codes
6. Risks & Issues: open questions, conflicts, missing info

Organize clearly with headers. Be thorough but concise.`
  };

  const prompt = prompts[summary_type] || prompts.executive;

  const summary = await callLLMSafe(base44, {
    prompt,
    file_urls: [targetFileUrl],
    payload: null,
    project_id: doc?.project_id,
    response_json_schema: {
      type: 'object',
      properties: {
        summary_text: { type: 'string' },
        key_points: {
          type: 'array',
          items: { type: 'string' }
        },
        action_items: {
          type: 'array',
          items: { type: 'string' }
        },
        risks_identified: {
          type: 'array',
          items: { type: 'string' }
        },
        estimated_review_time_minutes: { type: 'number' }
      }
    }
  });

  // Update document with summary if document_id provided
  if (document_id && doc) {
    await base44.entities.Document.update(document_id, {
      description: summary.summary_text?.substring(0, 500) || doc.description,
      notes: doc.notes + `\n\nAI_SUMMARY_${summary_type.toUpperCase()}: ${JSON.stringify(summary)}`
    });
  }

  return Response.json({
    success: true,
    summary_type,
    summary
  });
});