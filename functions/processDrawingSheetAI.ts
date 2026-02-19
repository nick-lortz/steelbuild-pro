import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AI-enhanced processing for Drawing Sheets:
 * - Detects and extracts revision clouds
 * - Infers discipline from sheet name using keywords
 * - Extracts issue dates and revision numbers from metadata
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { drawing_sheet_id } = await req.json();

    if (!drawing_sheet_id) {
      return Response.json({ error: 'drawing_sheet_id required' }, { status: 400 });
    }

    // Fetch DrawingSheet
    const sheets = await base44.entities.DrawingSheet.filter({ id: drawing_sheet_id });
    if (!sheets || sheets.length === 0) {
      return Response.json({ error: 'DrawingSheet not found' }, { status: 404 });
    }

    const sheet = sheets[0];

    // Infer discipline from sheet name
    const discipline = inferDiscipline(sheet.sheet_name || sheet.sheet_number || '');

    // Use AI to analyze the drawing file
    const aiPrompt = `Analyze this construction drawing sheet and extract:
1. Revision Clouds: Detect any revision clouds/bubbles on the drawing. For each cloud, provide:
   - Location description (e.g., "Grid A-B/1-2, Detail 3")
   - Size/area (small, medium, large)
   - Any text or notes inside or near the cloud
   
2. Issue Date: Look for issue date, submission date, or any date stamp on the drawing (typically in title block)

3. Revision Number: Look for the revision number/letter (typically in title block, e.g., "REV A", "REVISION 2", "Rev 0")

4. Referenced Drawings: List any other sheet numbers referenced on this drawing (e.g., "SEE SHEET S-102")

Return as JSON:
{
  "revision_clouds": [
    {
      "location": "string",
      "size": "small|medium|large",
      "notes": "string"
    }
  ],
  "issue_date": "YYYY-MM-DD or null",
  "revision": "string or null",
  "referenced_drawings": ["sheet_number", ...]
}`;

    let aiAnalysis = null;
    try {
      aiAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: aiPrompt,
        file_urls: [sheet.file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            revision_clouds: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  location: { type: 'string' },
                  size: { type: 'string' },
                  notes: { type: 'string' }
                }
              }
            },
            issue_date: { type: 'string' },
            revision: { type: 'string' },
            referenced_drawings: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      });
    } catch (error) {
      console.error('AI analysis failed:', error);
      // Continue with discipline inference even if AI fails
    }

    // Prepare update data
    const updateData = {
      ai_reviewed: true
    };

    // Update discipline if inferred
    if (discipline && discipline !== 'other') {
      updateData.discipline = discipline;
    }

    // Process AI analysis results
    if (aiAnalysis) {
      // Store revision clouds
      if (aiAnalysis.revision_clouds && aiAnalysis.revision_clouds.length > 0) {
        updateData.revision_clouds = JSON.stringify(aiAnalysis.revision_clouds);
      }

      // Store metadata
      const metadata = {
        extracted_at: new Date().toISOString(),
        issue_date: aiAnalysis.issue_date || null,
        revision: aiAnalysis.revision || null,
        referenced_drawings: aiAnalysis.referenced_drawings || []
      };
      updateData.ai_metadata = JSON.stringify(metadata);

      // Update reference counts for referenced drawings
      if (aiAnalysis.referenced_drawings && aiAnalysis.referenced_drawings.length > 0) {
        for (const refSheetNumber of aiAnalysis.referenced_drawings) {
          const referencedSheets = await base44.entities.DrawingSheet.filter({
            project_id: sheet.project_id,
            sheet_number: refSheetNumber
          });
          
          if (referencedSheets.length > 0) {
            const refSheet = referencedSheets[0];
            await base44.entities.DrawingSheet.update(refSheet.id, {
              reference_count: (refSheet.reference_count || 0) + 1
            });
          }
        }
      }

      // Store AI findings summary
      const findings = [];
      if (aiAnalysis.revision_clouds && aiAnalysis.revision_clouds.length > 0) {
        findings.push(`${aiAnalysis.revision_clouds.length} revision cloud(s) detected`);
      }
      if (aiAnalysis.revision) {
        findings.push(`Revision: ${aiAnalysis.revision}`);
      }
      if (aiAnalysis.issue_date) {
        findings.push(`Issue date: ${aiAnalysis.issue_date}`);
      }
      if (aiAnalysis.referenced_drawings && aiAnalysis.referenced_drawings.length > 0) {
        findings.push(`References ${aiAnalysis.referenced_drawings.length} other sheet(s)`);
      }
      
      updateData.ai_findings = findings.join(' | ');
    }

    // Update DrawingSheet
    await base44.entities.DrawingSheet.update(drawing_sheet_id, updateData);

    return Response.json({
      success: true,
      discipline,
      ai_analysis: aiAnalysis,
      findings: updateData.ai_findings
    });

  } catch (error) {
    console.error('Error processing drawing sheet:', error);
    return Response.json({
      error: error.message || 'Failed to process drawing sheet'
    }, { status: 500 });
  }
});

/**
 * Infers discipline from sheet name using keyword matching
 */
function inferDiscipline(sheetName) {
  const name = sheetName.toUpperCase();

  // Structural keywords
  if (name.includes('ST-') || name.includes('STR-') || name.includes('STRUCTURAL') || 
      name.match(/\bST\d/) || name.match(/\bS-\d/)) {
    return 'structural';
  }

  // Miscellaneous metals
  if (name.includes('SM-') || name.includes('MISC') || name.includes('MISCEL') || 
      name.includes('OTHR') || name.match(/\bSM\d/)) {
    return 'misc_metals';
  }

  // Stairs
  if (name.includes('STAIR') || name.includes('STRS') || name.match(/STAIR/i)) {
    return 'stairs';
  }

  // Rails/Railings
  if (name.includes('RAIL') || name.includes('HNDRAIL') || name.includes('GUARDRAIL')) {
    return 'rails';
  }

  // Default
  return 'other';
}