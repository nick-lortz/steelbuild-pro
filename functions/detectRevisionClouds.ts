import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sheet_id, file_url } = await req.json();

    if (!sheet_id || !file_url) {
      return Response.json({ error: 'Missing sheet_id or file_url' }, { status: 400 });
    }

    // Fetch the sheet
    const sheets = await base44.entities.DrawingSheet.filter({ id: sheet_id });
    const sheet = sheets[0];

    if (!sheet) {
      return Response.json({ error: 'Sheet not found' }, { status: 404 });
    }

    // Use AI to detect revision clouds from the drawing
    const prompt = `Analyze this construction drawing PDF and detect revision clouds. 
    Revision clouds are typically irregular, cloud-like shapes used to highlight changes or revisions on drawings.
    
    For each revision cloud detected, provide:
    1. Location (x, y coordinates as percentage of page)
    2. Size (width and height as percentage of page)
    3. Confidence level (0-1)
    4. Any nearby text or annotations that explain the change
    5. Description of what was likely changed
    
    Return the results as a JSON array of objects with this structure:
    [
      {
        "x": 0.25,
        "y": 0.40,
        "width": 0.15,
        "height": 0.10,
        "confidence": 0.92,
        "nearby_text": "Rev A - Member size changed",
        "linked_changes": "W14x48 changed to W16x57"
      }
    ]`;

    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: false,
      file_urls: file_url,
      response_json_schema: {
        type: "object",
        properties: {
          clouds: {
            type: "array",
            items: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" },
                width: { type: "number" },
                height: { type: "number" },
                confidence: { type: "number" },
                nearby_text: { type: "string" },
                linked_changes: { type: "string" }
              }
            }
          }
        }
      }
    });

    const detectedClouds = aiResult.clouds || [];

    // Update sheet with detected revision clouds
    await base44.entities.DrawingSheet.update(sheet_id, {
      revision_clouds: JSON.stringify(detectedClouds),
      ai_reviewed: true,
      ai_findings: `Detected ${detectedClouds.length} revision clouds. ${
        detectedClouds.length > 0 
          ? `High confidence detections: ${detectedClouds.filter(c => c.confidence > 0.8).length}`
          : 'No significant revisions found.'
      }`
    });

    return Response.json({
      success: true,
      clouds_detected: detectedClouds.length,
      high_confidence: detectedClouds.filter(c => c.confidence > 0.8).length,
      clouds: detectedClouds
    });

  } catch (error) {
    console.error('Error detecting revision clouds:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});