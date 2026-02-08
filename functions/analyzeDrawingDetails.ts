import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { drawing_file_url, drawing_sheet_id } = await req.json();

    if (!drawing_file_url) {
      return Response.json({ error: 'drawing_file_url required' }, { status: 400 });
    }

    // AI analysis prompt - steel-specific
    const analysisPrompt = `Extract and analyze steel fabrication details from this drawing:

EXTRACT THESE DETAILS:
1. Member Types: List all structural members (columns, beams, HSS, angles, plates, etc.) with designations
2. Connections: Type (welded, bolted, snug-tight), location, and specifications
3. Bolt Specs: Size (e.g., 3/4"), Grade (A325, A490), Quantity, Type (slip-critical, snug-tight)
4. Weld Specs: Type (fillet, groove), size, electrode (E70XX, E8018), edge prep requirements
5. Material Grades: A992 steel, A500 HSS, etc. for each member type
6. Critical Dimensions: Member lengths, wall thicknesses, web depths, critical clearances
7. Finish Specs: Galvanized, primer, paint system specified
8. Connection Details: Bolt holes (standard, oversized, slotted), gusset plates, splice locations

FLAG ANY MISSING OR INCONSISTENT:
- Bolt size/grade not specified
- Connection type undefined or unclear
- HSS wall thickness missing
- Finish conflicts (e.g., mixed galv and primer on same connection)
- Material grade mismatch between mating members
- Weld symbol unclear or missing edge prep
- Dimension discrepancies
- Missing bolt hole specifications
- Unclear erection sequence callouts

Return as JSON with four sections:
1. "members": array of {type, designation, quantity, grade, notes}
2. "connections": array of {location, type, bolt_spec, weld_spec, status}
3. "flags": array of {severity: "P0"|"P1", category, message, location, resolution_suggestion}
4. "flag_summary": {p0_categories: [category list], p1_categories: [category list]}`;

    const extractionResult = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      file_urls: drawing_file_url,
      response_json_schema: {
        type: 'object',
        properties: {
          members: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                designation: { type: 'string' },
                quantity: { type: 'number' },
                grade: { type: 'string' },
                notes: { type: 'string' }
              }
            }
          },
          connections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                location: { type: 'string' },
                type: { type: 'string' },
                bolt_spec: { type: 'string' },
                weld_spec: { type: 'string' },
                status: { type: 'string' }
              }
            }
          },
          flags: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                severity: { type: 'string' },
                category: { type: 'string' },
                message: { type: 'string' },
                location: { type: 'string' },
                resolution_suggestion: { type: 'string' }
              }
            }
          },
          flag_summary: {
            type: 'object',
            properties: {
              p0_categories: { type: 'array', items: { type: 'string' } },
              p1_categories: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    });

    if (!extractionResult.data) {
      throw new Error('AI extraction failed');
    }

    const extractedData = extractionResult.data;

    // Save to DrawingSheet metadata if sheet ID provided
    if (drawing_sheet_id) {
      const sheets = await base44.entities.DrawingSheet.filter({ id: drawing_sheet_id });
      if (sheets.length > 0) {
        const metadata = {
          extracted_members: extractedData.members || [],
          extracted_connections: extractedData.connections || [],
          extracted_at: new Date().toISOString(),
          extraction_status: 'complete'
        };

        // Flag extraction for AI metadata storage
        extractedData.flags.forEach(flag => {
          if (flag.category === 'BOLT_SIZE_MISSING') {
            metadata.missing_bolt_size = true;
          } else if (flag.category === 'CONNECTION_TYPE') {
            metadata.undefined_connection_type = true;
          } else if (flag.category === 'HSS_WALL_THICKNESS') {
            metadata.hss_wall_missing = true;
          } else if (flag.category === 'FINISH_CONFLICT') {
            metadata.finish_conflict = true;
          }
        });

        await base44.asServiceRole.entities.DrawingSheet.update(drawing_sheet_id, {
          ai_metadata: JSON.stringify(metadata)
        });
      }
    }

    const p0Flags = (extractedData.flags || []).filter(f => f.severity === 'P0');
    const p1Flags = (extractedData.flags || []).filter(f => f.severity === 'P1');

    // Categorize flags by type for summary
    const p0Categories = [...new Set(p0Flags.map(f => f.category))];
    const p1Categories = [...new Set(p1Flags.map(f => f.category))];

    return Response.json({
      success: true,
      members: extractedData.members || [],
      connections: extractedData.connections || [],
      flags: extractedData.flags || [],
      member_count: (extractedData.members || []).length,
      connection_count: (extractedData.connections || []).length,
      flag_count: (extractedData.flags || []).length,
      p0_count: p0Flags.length,
      p1_count: p1Flags.length,
      flag_summary: {
        p0_categories: p0Categories,
        p1_categories: p1Categories
      }
    });
  } catch (error) {
    console.error('Drawing detail analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});