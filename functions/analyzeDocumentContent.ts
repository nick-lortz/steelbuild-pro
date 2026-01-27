import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { document_id, file_url, title, current_category } = await req.json();

    // Use AI to analyze document and suggest categorization
    const analysisResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are analyzing a construction document for a structural steel project management system.

Document title: "${title}"
Current category: "${current_category || 'not set'}"

Based on the title and optionally the file content (if image/PDF), suggest:
1. The most appropriate category from: drawing, specification, rfi, submittal, contract, report, photo, correspondence, receipt, invoice, other
2. Relevant tags (2-5 tags) that would help with searching and filtering. Examples: structural, connections, approval_required, level_1, beam_schedule, shop_ticket, QC, revision_A, etc.
3. Suggested phase (if applicable): detailing, fabrication, delivery, erection, closeout
4. Brief reasoning for your categorization

Be concise and practical. Think like a construction project manager organizing files.`,
      file_urls: file_url ? [file_url] : undefined,
      response_json_schema: {
        type: "object",
        properties: {
          suggested_category: {
            type: "string",
            enum: ["drawing", "specification", "rfi", "submittal", "contract", "report", "photo", "correspondence", "receipt", "invoice", "other"]
          },
          suggested_tags: {
            type: "array",
            items: { type: "string" }
          },
          suggested_phase: {
            type: "string",
            enum: ["detailing", "fabrication", "delivery", "erection", "closeout", ""]
          },
          reasoning: {
            type: "string"
          },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"]
          }
        }
      }
    });

    // Optionally auto-update document if confidence is high
    if (analysisResult.confidence === 'high' && document_id) {
      const updateData = {
        category: analysisResult.suggested_category,
        tags: analysisResult.suggested_tags
      };

      if (analysisResult.suggested_phase) {
        updateData.phase = analysisResult.suggested_phase;
      }

      await base44.entities.Document.update(document_id, updateData);
    }

    return Response.json({
      success: true,
      analysis: analysisResult,
      auto_applied: analysisResult.confidence === 'high' && !!document_id
    });

  } catch (error) {
    console.error('Document analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});