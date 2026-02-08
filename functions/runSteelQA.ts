import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { drawing_set_id } = await req.json();

    if (!drawing_set_id) {
      return Response.json({ error: 'drawing_set_id required' }, { status: 400 });
    }

    const [drawingSet] = await base44.entities.DrawingSet.filter({ id: drawing_set_id });
    if (!drawingSet) {
      return Response.json({ error: 'Drawing set not found' }, { status: 404 });
    }

    const sheets = await base44.entities.DrawingSheet.filter({ drawing_set_id });
    const rfis = await base44.entities.RFI.filter({
      project_id: drawingSet.project_id,
      linked_drawing_set_ids: drawing_set_id,
      status: { $in: ['submitted', 'under_review', 'internal_review'] }
    });

    const blockers = [];
    const aiAnalysisResults = [];

    // QA Rule: Open RFIs tied to drawing
    if (rfis.length > 0) {
      blockers.push({
        severity: 'P0',
        rule: 'OPEN_RFI',
        message: `${rfis.length} open RFI(s) tied to this drawing set`,
        sheet_number: 'N/A'
      });
    }

    // AI-driven analysis of sheets
    for (const sheet of sheets) {
      try {
        // Build prompt for AI analysis
        const analysisPrompt = `Analyze this structural steel drawing for fabrication readiness. Check for:
- Missing bolt sizes or grades (A325, A490, etc.)
- Undefined connection types (welded, bolted, combination)
- HSS member wall thicknesses not specified
- Finish/coating specification conflicts (galvanized vs prime vs paint)
- Member size/grade callouts that are unclear
- Missing edge prep requirements for welds

Sheet: ${sheet.sheet_number}
File: ${sheet.file_name}
${sheet.ai_metadata ? `Metadata: ${sheet.ai_metadata}` : ''}

Return findings as JSON with severity (P0=must fix, P1=warning) and location.`;

        const aiResult = await base44.integrations.Core.InvokeLLM({
          prompt: analysisPrompt,
          file_urls: sheet.file_url,
          response_json_schema: {
            type: 'object',
            properties: {
              issues: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    severity: { type: 'string', enum: ['P0', 'P1'] },
                    rule: { type: 'string' },
                    message: { type: 'string' },
                    location: { type: 'string' }
                  }
                }
              },
              summary: { type: 'string' }
            }
          }
        });

        if (aiResult?.data?.issues) {
          aiResult.data.issues.forEach(issue => {
            blockers.push({
              ...issue,
              sheet_number: sheet.sheet_number,
              detail_number: issue.location
            });
          });
          aiAnalysisResults.push({
            sheet: sheet.sheet_number,
            summary: aiResult.data.summary,
            issueCount: aiResult.data.issues.length
          });
        }
      } catch (err) {
        console.error(`AI analysis failed for sheet ${sheet.sheet_number}:`, err);
        blockers.push({
          severity: 'P1',
          rule: 'AI_ANALYSIS_FAILED',
          message: 'Could not complete AI analysis',
          sheet_number: sheet.sheet_number
        });
      }
    }

    // Parse existing metadata for legacy checks
    for (const sheet of sheets) {
      if (!sheet.ai_metadata) continue;
      try {
        const metadata = JSON.parse(sheet.ai_metadata);
        
        if (metadata.missing_bolt_size) {
          blockers.push({
            severity: 'P0',
            rule: 'BOLT_SIZE_MISSING',
            message: 'Bolt size/grade not specified',
            sheet_number: sheet.sheet_number
          });
        }
        if (metadata.undefined_connection_type) {
          blockers.push({
            severity: 'P0',
            rule: 'CONNECTION_TYPE',
            message: 'Connection type undefined',
            sheet_number: sheet.sheet_number
          });
        }
        if (metadata.hss_wall_missing) {
          blockers.push({
            severity: 'P0',
            rule: 'HSS_WALL_THICKNESS',
            message: 'HSS wall thickness missing',
            sheet_number: sheet.sheet_number
          });
        }
        if (metadata.finish_conflict) {
          blockers.push({
            severity: 'P1',
            rule: 'FINISH_CONFLICT',
            message: 'Finish spec conflict (galv vs primer)',
            sheet_number: sheet.sheet_number
          });
        }
      } catch (err) {
        console.error('Failed to parse sheet metadata:', err);
      }
    }

    // Deduplicate blockers
    const uniqueBlockers = [];
    const seen = new Set();
    blockers.forEach(blocker => {
      const key = `${blocker.rule}:${blocker.sheet_number}`;
      if (!seen.has(key)) {
        uniqueBlockers.push(blocker);
        seen.add(key);
      }
    });

    const qa_status = uniqueBlockers.filter(b => b.severity === 'P0').length > 0 ? 'fail' : 'pass';
    const reportDate = new Date().toISOString();

    await base44.asServiceRole.entities.DrawingSet.update(drawing_set_id, {
      qa_status,
      qa_blockers: uniqueBlockers,
      ai_summary: `Steel QA completed ${new Date().toLocaleDateString()}. ${uniqueBlockers.length} issues found.`
    });

    return Response.json({
      qa_status,
      qa_blockers: uniqueBlockers,
      ai_analysis: aiAnalysisResults,
      p0_count: uniqueBlockers.filter(b => b.severity === 'P0').length,
      p1_count: uniqueBlockers.filter(b => b.severity === 'P1').length,
      report_date: reportDate,
      sheet_count: sheets.length
    });
  } catch (error) {
    console.error('Steel QA error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});