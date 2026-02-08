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

    // QA Rule: Open RFIs tied to drawing
    if (rfis.length > 0) {
      blockers.push({
        severity: 'P0',
        rule: 'OPEN_RFI',
        message: `${rfis.length} open RFI(s) tied to this drawing set`,
        sheet_number: 'N/A'
      });
    }

    // QA Rule: Check for steel-specific issues in AI metadata
    for (const sheet of sheets) {
      if (!sheet.ai_metadata) continue;

      try {
        const metadata = JSON.parse(sheet.ai_metadata);
        
        // Check for missing bolt info
        if (metadata.missing_bolt_size) {
          blockers.push({
            severity: 'P0',
            rule: 'BOLT_SIZE_MISSING',
            message: 'Bolt size/grade not specified',
            sheet_number: sheet.sheet_number
          });
        }

        // Check for undefined connection types
        if (metadata.undefined_connection_type) {
          blockers.push({
            severity: 'P0',
            rule: 'CONNECTION_TYPE',
            message: 'Connection type undefined',
            sheet_number: sheet.sheet_number
          });
        }

        // Check for HSS wall thickness
        if (metadata.hss_wall_missing) {
          blockers.push({
            severity: 'P0',
            rule: 'HSS_WALL_THICKNESS',
            message: 'HSS wall thickness missing',
            sheet_number: sheet.sheet_number
          });
        }

        // Check for finish conflicts
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

    const qa_status = blockers.filter(b => b.severity === 'P0').length > 0 ? 'fail' : 'pass';

    await base44.asServiceRole.entities.DrawingSet.update(drawing_set_id, {
      qa_status,
      qa_blockers: blockers
    });

    return Response.json({
      qa_status,
      qa_blockers: blockers,
      p0_count: blockers.filter(b => b.severity === 'P0').length,
      p1_count: blockers.filter(b => b.severity === 'P1').length
    });
  } catch (error) {
    console.error('Steel QA error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});