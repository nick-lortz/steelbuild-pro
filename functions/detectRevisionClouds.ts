import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, previous_file_url } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url required' }, { status: 400 });
    }

    let prompt = `Analyze this construction drawing and identify any revision clouds or markup areas that indicate changes or revisions.

Describe:
1. How many revision clouds are visible
2. Which areas of the drawing they highlight (use grid references if visible, or describe location like "upper left quadrant", "column line A-B")
3. The revision number associated with each cloud if labeled

Return as JSON:
{
  "clouds": [
    {
      "revision": "string (e.g., 'Rev 1', 'A')",
      "location": "string description",
      "area": "string (e.g., 'connection detail', 'beam size change')"
    }
  ],
  "total_count": number
}`;

    const file_urls = [file_url];
    if (previous_file_url) {
      file_urls.push(previous_file_url);
      prompt = `Compare these two construction drawings (current and previous revision).

Identify:
1. All revision clouds or markup areas showing changes
2. What changed between versions (new elements, size changes, detail modifications)
3. Grid locations or areas affected

Return as JSON:
{
  "clouds": [
    {
      "revision": "string",
      "location": "string",
      "area": "string",
      "change_type": "added|modified|removed"
    }
  ],
  "total_count": number,
  "major_changes": ["list of significant changes between versions"]
}`;
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls,
      response_json_schema: {
        type: "object",
        properties: {
          clouds: {
            type: "array",
            items: {
              type: "object",
              properties: {
                revision: { type: "string" },
                location: { type: "string" },
                area: { type: "string" },
                change_type: { type: "string" }
              }
            }
          },
          total_count: { type: "number" },
          major_changes: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["clouds", "total_count"]
      }
    });

    return Response.json({
      success: true,
      analysis: result
    });
  } catch (error) {
    console.error('Revision cloud detection error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});