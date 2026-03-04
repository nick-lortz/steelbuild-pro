import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * ProjectSolver backend — handles:
 * 1. OCR / text extraction from uploaded files via InvokeLLM with file_urls
 * 2. Document parsing (drawing, RFI, XLSX)
 * 3. Chat completion with structured JSON output
 * 4. Persisting session messages + extracted docs
 */

const SYSTEM_PROMPT = `You are ProjectSolver, an expert AI assistant for structural steel project managers.
Domain: fabrication, erection, detailing, RFIs, change orders, delivery, sequencing, field issues, safety, cost control.

Rules:
- Direct, professional, no filler. Use steel industry terminology.
- When given files: extract critical info first, then answer.
- For site photos: identify visible issues, safety concerns, construction defects related to steel erection.
- For drawings: check member sizes, connections, missing dims, clash risks, sequence issues.
- For RFIs/PDFs: summarize, assess impact, draft structured response.
- For XLSX schedules: flag float consumption, critical path risks, milestone gaps.

ALWAYS include a JSON block at the end of your response wrapped in <structured_output>...</structured_output> tags.
Choose the most appropriate output type:

ISSUE: {"type":"issue","severity":"critical|high|medium|low","description":"...","location":"...","affected_work":[],"recommended_action":"...","estimated_cost_impact":0,"estimated_schedule_impact_days":0}

RISK: {"type":"risk","category":"schedule|cost|safety|quality|scope","description":"...","probability":"high|medium|low","impact":"high|medium|low","mitigation":"..."}

RFI_DRAFT: {"type":"rfi_draft","subject":"...","question":"...","location_area":"...","rfi_type":"connection_detail|member_size_length|embed_anchor|tolerance_fitup|coating_finish|erection_sequence|other","priority":"low|medium|high|critical","impact_severity":"low|medium|high|blocking","is_install_blocker":false,"is_release_blocker":false}

CO_DRAFT: {"type":"co_draft","title":"...","description":"...","cost_impact":0,"schedule_impact_days":0,"justification":"..."}

SOLUTION: {"type":"solution","summary":"...","steps":[],"resources_needed":[],"estimated_hours":0,"risks":[]}`;

function parseStructuredOutput(text) {
  const match = text.match(/<structured_output>([\s\S]*?)<\/structured_output>/);
  if (!match) return null;
  try { return JSON.parse(match[1].trim()); } catch { return null; }
}

function cleanContent(text) {
  return text.replace(/<structured_output>[\s\S]*?<\/structured_output>/g, '').trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { session_id, project_id, message, file_urls = [], file_names = [], annotations = [] } = body;

    if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });

    // ── 1. Load or create session ──
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

    // ── 2. OCR / extract uploaded files ──
    const newDocs = [];
    for (let i = 0; i < file_urls.length; i++) {
      const url = file_urls[i];
      const name = file_names[i] || `file-${i}`;
      const alreadyExtracted = extractedDocs.find(d => d.file_url === url);
      if (alreadyExtracted) continue;

      const ext = name.split('.').pop()?.toLowerCase();
      let extractedText = '';
      let parsedData = {};

      if (['pdf', 'png', 'jpg', 'jpeg', 'webp', 'dwg', 'xlsx', 'xls'].includes(ext)) {
        const ocrRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are a construction document parser specializing in structural steel. 
Extract ALL text, numbers, dimensions, member marks, grid lines, notes, revision marks, and data from this file.
For drawings: extract sheet number, title, revision, member sizes, connection details, grid references, notes.
For RFIs: extract RFI number, subject, question, location, dates, status.
For schedules (XLSX): extract task names, durations, start/finish dates, predecessors, float.
Return as structured JSON with keys: file_type, summary, raw_text, extracted_data (object with all parsed fields).`,
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

        if (ocrRes?.raw_text) extractedText = ocrRes.raw_text;
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
        uploaded_at: new Date().toISOString(),
      });
    }

    const allDocs = [...extractedDocs, ...newDocs];

    // ── 3. Build context for LLM ──
    const docContext = allDocs.map(d =>
      `[FILE: ${d.file_name}]\n${d.parsed_data?.summary || ''}\n${d.extracted_text?.slice(0, 2000) || ''}`
    ).join('\n\n---\n\n');

    const annotationContext = annotations.length
      ? `\n\nUSER ANNOTATIONS ON IMAGE:\n${annotations.map(a => `• ${a.label || a.text || JSON.stringify(a)}`).join('\n')}`
      : '';

    const historyMessages = messages.slice(-8).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const userPromptParts = [
      docContext ? `UPLOADED DOCUMENTS:\n${docContext}` : '',
      annotationContext,
      message || '',
    ].filter(Boolean).join('\n\n');

    // ── 4. Call LLM ──
    const llmPrompt = `${SYSTEM_PROMPT}\n\nPROJECT ID: ${project_id}\n\nCONVERSATION HISTORY:\n${
      historyMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')
    }\n\nUSER: ${userPromptParts}`;

    const rawResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: llmPrompt,
      file_urls: file_urls.length ? file_urls : undefined,
    });

    const responseText = typeof rawResponse === 'string' ? rawResponse : JSON.stringify(rawResponse);
    const structuredOutput = parseStructuredOutput(responseText);
    const cleanedContent = cleanContent(responseText);

    // ── 5. Persist messages ──
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

    // ── 6. Persist structured outputs ──
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
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});