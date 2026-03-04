import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * ProjectSolver backend — v2 with:
 * 1. Confidence scoring injected into all structured outputs
 * 2. Ambiguity detection → clarification mode (no auto-action)
 * 3. PII detection in extracted text (warn, don't store raw PII)
 * 4. Safety/regulatory/contractual flag detection
 * 5. Audit event logged for every AI suggestion
 * 6. Human-readable explanation + out-of-the-box justification in SOLUTION
 */

// ── PII patterns ──────────────────────────────────────────────────────────────
const PII_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/,                              // SSN
  /\b(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/, // Phone
  /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i,                    // Email
];

function containsPII(text) {
  return PII_PATTERNS.some(p => p.test(text));
}

function redactPII(text) {
  let out = text;
  out = out.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN REDACTED]');
  out = out.replace(/\b(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g, '[PHONE REDACTED]');
  out = out.replace(/\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/gi, '[EMAIL REDACTED]');
  return out;
}

// ── Safety/regulatory keyword detection ──────────────────────────────────────
function detectRiskFlags(text) {
  const flags = [];
  const lower = text.toLowerCase();
  if (/safety|osha|fall protection|collapse|overload|weld|bolt tension|seismic|lateral|shear|buckling/.test(lower))
    flags.push('safety');
  if (/aisc|aws d1|ibc|asce|building code|ndt|certified|engineer of record|eor|pe stamp|inspection/.test(lower))
    flags.push('regulatory');
  if (/entitlement|claim|notice|liquidated|delay damages|contractual|directive/.test(lower))
    flags.push('contractual');
  return flags;
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are ProjectSolver, an expert AI assistant for structural steel project managers.
Domain: fabrication, erection, detailing, RFIs, change orders, delivery, sequencing, field issues, safety, cost control.

Rules:
- Direct, professional, no filler. Use steel industry terminology.
- When given files: extract critical info first, then answer.
- For site photos: identify visible issues, safety concerns, construction defects related to steel erection.
- For drawings: check member sizes, connections, missing dims, clash risks, sequence issues.
- For RFIs/PDFs: summarize, assess impact, draft structured response.
- For XLSX schedules: flag float consumption, critical path risks, milestone gaps.

CRITICAL VALIDATION RULES:
- If you are less than 60% confident in any extraction or conclusion, set "confidence_score" < 0.6 and "ambiguous": true. List specific clarifying_questions instead of proposing automatic actions.
- If the input lacks grid references, drawing revision, member marks, or specific dimensions needed to write a valid RFI or CO, mark as ambiguous and ask for them.
- For SOLUTION outputs of type "out_of_the_box", you MUST include an "ootb_justification" field explaining WHY the unconventional approach was selected over standard methods, what tradeoffs were accepted, and what additional approvals are required.
- Every output MUST include "confidence_score" (0.0-1.0), "human_explanation" (1-3 sentence plain-English summary of what this output means and what the PM should do), and "flags" array (safety|regulatory|contractual — empty array if none).

ALWAYS include a JSON block at the end wrapped in <structured_output>...</structured_output> tags.

Output schemas (include confidence_score, human_explanation, flags in ALL types):

CLARIFICATION (use when ambiguous or confidence < 0.60):
{"type":"clarification","ambiguous":true,"confidence_score":0.45,"summary":"What I could determine so far","clarifying_questions":["Q1","Q2"],"human_explanation":"I need more information before I can draft an action item.","flags":[]}

ISSUE: {"type":"issue","severity":"critical|high|medium|low","title":"...","description":"...","location":"...","affected_work":[],"recommended_action":"...","estimated_cost_impact":0,"estimated_schedule_impact_days":0,"confidence_score":0.85,"human_explanation":"...","flags":[]}

RISK: {"type":"risk","category":"schedule|cost|safety|quality|scope","description":"...","probability":"high|medium|low","impact":"high|medium|low","mitigation":"...","risk_score":0,"confidence_score":0.80,"human_explanation":"...","flags":[]}

RFI_DRAFT: {"type":"rfi_draft","subject":"...","question":"...","location_area":"...","rfi_type":"connection_detail|member_size_length|embed_anchor|tolerance_fitup|coating_finish|erection_sequence|other","priority":"low|medium|high|critical","impact_severity":"low|medium|high|blocking","is_install_blocker":false,"is_release_blocker":false,"confidence_score":0.82,"human_explanation":"...","flags":[]}

CO_DRAFT: {"type":"co_draft","title":"...","description":"...","scope_of_change":"...","cost_impact":0,"schedule_impact_days":0,"justification":"...","confidence_score":0.75,"human_explanation":"...","flags":[]}

SOLUTION: {"type":"solution","proposal_type":"standard|mitigation|out_of_the_box","title":"...","summary":"...","steps":[],"resources_needed":[],"estimated_hours":0,"estimated_cost":0,"estimated_delay_days":0,"confidence_score":0.80,"tradeoffs":[],"prerequisites":[],"ootb_justification":"(required if out_of_the_box)","human_explanation":"...","flags":[]}`;

function parseStructuredOutput(text) {
  const match = text.match(/<structured_output>([\s\S]*?)<\/structured_output>/);
  if (!match) return null;
  try { return JSON.parse(match[1].trim()); } catch { return null; }
}

function cleanContent(text) {
  return text.replace(/<structured_output>[\s\S]*?<\/structured_output>/g, '').trim();
}

async function logAuditEvent(base44, { projectId, sessionId, actor, actionType, output, confidence, flags }) {
  try {
    await base44.asServiceRole.entities.PSAuditLog.create({
      project_id:       projectId,
      session_id:       sessionId,
      actor:            actor,
      action_type:      actionType,
      output_type:      output?.type || 'unknown',
      output_payload:   output || {},
      confidence_score: confidence || 0,
      flags:            flags || [],
      budget_amount:    output?.cost_impact || 0,
    });
  } catch (_) { /* audit failure must not break the request */ }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { session_id, project_id, message, file_urls = [], file_names = [], annotations = [] } = body;

    if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });

    // ── 1. Load or create session ─────────────────────────────────────────────
    let session;
    if (session_id) {
      const sessions = await base44.entities.ProjectSolverSession.filter({ id: session_id });
      session = sessions[0];
    }
    if (!session) {
      session = await base44.entities.ProjectSolverSession.create({
        project_id,
        title: message?.slice(0, 60) || 'New Session',
        status: 'active',
        messages: [],
        extracted_documents: [],
        generated_outputs: [],
      });
    }

    const messages = session.messages || [];
    const extractedDocs = session.extracted_documents || [];

    // ── 2. OCR / extract uploaded files ──────────────────────────────────────
    const newDocs = [];
    let hasPIIInUploads = false;

    for (let i = 0; i < file_urls.length; i++) {
      const url = file_urls[i];
      const name = file_names[i] || `file-${i}`;
      if (extractedDocs.find(d => d.file_url === url)) continue;

      const ext = name.split('.').pop()?.toLowerCase();
      let extractedText = '';
      let parsedData = {};
      let piiFound = false;

      if (['pdf', 'png', 'jpg', 'jpeg', 'webp', 'dwg', 'xlsx', 'xls'].includes(ext)) {
        const ocrRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are a construction document parser specializing in structural steel. 
Extract ALL text, numbers, dimensions, member marks, grid lines, notes, revision marks, and data from this file.
For drawings: extract sheet number, title, revision, member sizes, connection details, grid references, notes.
For RFIs: extract RFI number, subject, question, location, dates, status.
For schedules (XLSX): extract task names, durations, start/finish dates, predecessors, float.
IMPORTANT: Do NOT include personal contact information (names, phone numbers, email addresses, SSNs) in raw_text. Replace them with [REDACTED].
Return as structured JSON with keys: file_type, summary, raw_text, extracted_data.`,
          file_urls: [url],
          response_json_schema: {
            type: 'object',
            properties: {
              file_type: { type: 'string' },
              summary: { type: 'string' },
              raw_text: { type: 'string' },
              extracted_data: { type: 'object' }
            }
          }
        });

        if (ocrRes?.raw_text) {
          // PII check on raw extraction before storing
          if (containsPII(ocrRes.raw_text)) {
            piiFound = true;
            hasPIIInUploads = true;
            extractedText = redactPII(ocrRes.raw_text);
          } else {
            extractedText = ocrRes.raw_text;
          }
        }
        if (ocrRes?.extracted_data) parsedData = ocrRes.extracted_data;
        if (ocrRes?.summary) parsedData.summary = ocrRes.summary;
        if (ocrRes?.file_type) parsedData.file_type = ocrRes.file_type;
      }

      newDocs.push({
        file_url: url,
        file_name: name,
        file_type: ext,
        extracted_text: extractedText,
        parsed_data: parsedData,
        pii_detected: piiFound,
        uploaded_at: new Date().toISOString(),
      });

      // Log PII event
      if (piiFound) {
        await logAuditEvent(base44, {
          projectId: project_id, sessionId: session.id, actor: user.email,
          actionType: 'pii_redacted', output: { type: 'upload', file_name: name }, confidence: 1, flags: ['pii'],
        });
      }
    }

    const allDocs = [...extractedDocs, ...newDocs];

    // ── 3. Build LLM context ──────────────────────────────────────────────────
    const docContext = allDocs.map(d =>
      `[FILE: ${d.file_name}${d.pii_detected ? ' ⚠ PII REDACTED' : ''}]\n${d.parsed_data?.summary || ''}\n${d.extracted_text?.slice(0, 2000) || ''}`
    ).join('\n\n---\n\n');

    const annotationContext = annotations.length
      ? `\n\nUSER ANNOTATIONS ON IMAGE:\n${annotations.map(a => `• ${a.label || a.text || JSON.stringify(a)}`).join('\n')}`
      : '';

    const historyMessages = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));

    const userPromptParts = [
      docContext ? `UPLOADED DOCUMENTS:\n${docContext}` : '',
      annotationContext,
      message || '',
      hasPIIInUploads ? '\n[SYSTEM NOTE: PII was detected and redacted in one or more uploaded files. Flag this in your response.]' : '',
    ].filter(Boolean).join('\n\n');

    // ── 4. Call LLM ──────────────────────────────────────────────────────────
    const llmPrompt = `${SYSTEM_PROMPT}\n\nPROJECT ID: ${project_id}\nUSER EMAIL: ${user.email}\n\nCONVERSATION HISTORY:\n${
      historyMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')
    }\n\nUSER: ${userPromptParts}`;

    const rawResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: llmPrompt,
      file_urls: file_urls.length ? file_urls : undefined,
    });

    const responseText = typeof rawResponse === 'string' ? rawResponse : JSON.stringify(rawResponse);
    const structuredOutput = parseStructuredOutput(responseText);
    const cleanedContent = cleanContent(responseText);

    // ── 5. Post-process structured output ────────────────────────────────────
    if (structuredOutput) {
      // Ensure confidence_score exists
      if (structuredOutput.confidence_score === undefined) {
        structuredOutput.confidence_score = 0.75;
      }
      // Force ambiguous if confidence < threshold
      if (structuredOutput.confidence_score < 0.60 && structuredOutput.type !== 'clarification') {
        structuredOutput.type = 'clarification';
        structuredOutput.ambiguous = true;
        if (!structuredOutput.clarifying_questions?.length) {
          structuredOutput.clarifying_questions = [
            'Please confirm the grid reference and elevation for this condition.',
            'Which drawing sheet and revision does this relate to?',
            'Confirm the affected member marks or piece numbers.',
          ];
        }
      }
      // Inject risk flags from text
      const contentFlags = detectRiskFlags(JSON.stringify(structuredOutput) + cleanedContent);
      if (!structuredOutput.flags || !structuredOutput.flags.length) {
        structuredOutput.flags = contentFlags;
      }
      // PII flag
      if (hasPIIInUploads && !structuredOutput.flags.includes('pii')) {
        structuredOutput.flags.push('pii');
      }
    }

    // ── 6. Log AI suggestion audit event ─────────────────────────────────────
    if (structuredOutput) {
      await logAuditEvent(base44, {
        projectId: project_id, sessionId: session.id, actor: user.email,
        actionType: 'ai_suggestion',
        output: structuredOutput,
        confidence: structuredOutput.confidence_score,
        flags: structuredOutput.flags || [],
      });
    }

    // ── 7. Persist messages + outputs ─────────────────────────────────────────
    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message || (file_names.length ? `Uploaded: ${file_names.join(', ')}` : ''),
      file_urls,
      file_names,
      annotations,
      created_at: new Date().toISOString(),
    };

    const assistantMsg = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: cleanedContent,
      structured_output: structuredOutput,
      created_at: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg, assistantMsg];

    const generatedOutputs = session.generated_outputs || [];
    if (structuredOutput) {
      generatedOutputs.push({
        output_type: structuredOutput.type || 'solution',
        payload: structuredOutput,
        created_at: new Date().toISOString(),
        applied: false,
      });
    }

    await base44.entities.ProjectSolverSession.update(session.id, {
      messages: updatedMessages,
      extracted_documents: allDocs,
      generated_outputs: generatedOutputs,
      title: session.title || message?.slice(0, 60) || 'Session',
    });

    return Response.json({
      session_id: session.id,
      content: cleanedContent,
      structured_output: structuredOutput,
      extracted_docs: newDocs,
      pii_detected: hasPIIInUploads,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});