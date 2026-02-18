import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireRole } from './_lib/authz.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Drawing metadata extraction requires Detailer/PM/Admin
    requireRole(user, ['admin', 'pm', 'detailer']);

    const { file_url, drawing_set_id } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url required' }, { status: 400 });
    }

    // Use AI to extract drawing metadata from the image
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this construction drawing and extract the following information:
- Drawing number (e.g., S-101, A-201)
- Drawing title/sheet name
- Revision number (e.g., Rev 0, Rev A, Rev 1)
- Issue date (in YYYY-MM-DD format if visible)
- Referenced drawing numbers (any drawing callouts like "See S-102" or detail references)

Return ONLY valid JSON with these exact keys:
{
  "drawing_number": "string or null",
  "title": "string or null", 
  "revision": "string or null",
  "issue_date": "YYYY-MM-DD or null",
  "referenced_drawings": ["array of drawing numbers"] or []
}

If you cannot find a value, use null or empty array. Be precise with drawing numbers.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          drawing_number: { type: ["string", "null"] },
          title: { type: ["string", "null"] },
          revision: { type: ["string", "null"] },
          issue_date: { type: ["string", "null"] },
          referenced_drawings: { 
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["drawing_number", "title", "revision", "issue_date", "referenced_drawings"]
      }
    });

    // Update drawing sheet if ID provided
    if (drawing_set_id && result.drawing_number) {
      const sheets = await base44.entities.DrawingSheet.filter({ drawing_set_id });
      
      if (sheets.length > 0) {
        // Update the sheet with extracted metadata
        await base44.entities.DrawingSheet.update(sheets[0].id, {
          sheet_number: result.drawing_number,
          sheet_name: result.title || sheets[0].sheet_name,
          ai_metadata: JSON.stringify({
            extracted_at: new Date().toISOString(),
            referenced_drawings: result.referenced_drawings,
            issue_date: result.issue_date
          })
        });
      }
    }

    return Response.json({
      success: true,
      metadata: result
    });
  } catch (error) {
    console.error('Metadata extraction error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});