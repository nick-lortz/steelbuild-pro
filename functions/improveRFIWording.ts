import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { redactPII } from './_lib/redact.js';

/**
 * Use AI to improve RFI question clarity & reduce back-and-forth
 * Returns: improved_question, key_clarifications, suggested_details
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { project_id, original_question, rfi_type, location_area, linked_drawings } = await req.json();
    
    // Redact PII before sending to LLM
    const safeQuestion = redactPII(original_question);
    const safeLocation = location_area ? redactPII(location_area) : 'Not specified';

    const prompt = `You are a structural steel RFI expert. Improve this RFI question to be:
1. Specific and answerable (no ambiguity)
2. Include reference details (drawings, gridlines, specs)
3. Prevent follow-up questions
4. Professional & concise

Original Question: "${safeQuestion}"

RFI Type: ${rfi_type}
Location: ${safeLocation}
Related Drawings: ${linked_drawings ? linked_drawings.slice(0, 5).join(', ') : 'None'}

Provide:
1. Improved question (2-3 sentences max, ready to send)
2. Key clarifications added (bullet list)
3. Suggested attachments/references`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          improved_question: { type: 'string' },
          clarifications: { type: 'array', items: { type: 'string' } },
          suggested_details: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});