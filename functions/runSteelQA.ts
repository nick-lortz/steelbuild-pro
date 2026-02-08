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

    // Fetch drawing set and its sheets
    const drawingSets = await base44.asServiceRole.entities.DrawingSet.filter(
      { id: drawing_set_id }
    );
    if (!drawingSets.length) {
      return Response.json({ error: 'Drawing set not found' }, { status: 404 });
    }

    const drawingSet = drawingSets[0];

    // Fetch all sheets in this set
    const sheets = await base44.asServiceRole.entities.DrawingSheet.filter(
      { drawing_set_id }
    );

    // Fetch all open RFIs linked to this drawing set
    const openRFIs = await base44.asServiceRole.entities.RFI.filter(
      {
        linked_drawing_set_ids: { $in: [drawing_set_id] },
        status: { $nin: ['closed'] }
      }
    );

    const qa_blockers = [];

    // STEEL QA RULE 1: Missing bolt size/grade
    sheets.forEach((sheet) => {
      if (sheet.ai_metadata) {
        try {
          const metadata = typeof sheet.ai_metadata === 'string' 
            ? JSON.parse(sheet.ai_metadata) 
            : sheet.ai_metadata;

          if (metadata.connections) {
            metadata.connections.forEach((conn) => {
              if ((conn.type === 'bolted' || conn.type === 'snug-tight') && !conn.bolt_spec) {
                qa_blockers.push({
                  severity: 'P0',
                  rule: 'missing_bolt_spec',
                  message: 'Bolt size/grade not specified',
                  sheet_number: sheet.sheet_number,
                  detail_number: conn.location
                });
              }
            });
          }
        } catch (e) {
          console.log('Error parsing sheet metadata:', e);
        }
      }
    });

    // STEEL QA RULE 2: Connection type undefined
    sheets.forEach((sheet) => {
      if (sheet.ai_metadata) {
        try {
          const metadata = typeof sheet.ai_metadata === 'string' 
            ? JSON.parse(sheet.ai_metadata) 
            : sheet.ai_metadata;

          if (metadata.connections) {
            metadata.connections.forEach((conn) => {
              if (!conn.type || conn.type === 'undefined' || conn.type === '') {
                qa_blockers.push({
                  severity: 'P0',
                  rule: 'undefined_connection',
                  message: 'Connection type not specified',
                  sheet_number: sheet.sheet_number,
                  detail_number: conn.location
                });
              }
            });
          }
        } catch (e) {
          console.log('Error parsing sheet metadata:', e);
        }
      }
    });

    // STEEL QA RULE 3: HSS wall thickness missing
    sheets.forEach((sheet) => {
      if (sheet.ai_metadata) {
        try {
          const metadata = typeof sheet.ai_metadata === 'string' 
            ? JSON.parse(sheet.ai_metadata) 
            : sheet.ai_metadata;

          if (metadata.members) {
            metadata.members.forEach((member) => {
              if ((member.type === 'HSS' || member.type?.includes('Tube')) && !member.wall_thickness) {
                qa_blockers.push({
                  severity: 'P0',
                  rule: 'missing_hss_wall_thickness',
                  message: 'HSS wall thickness not specified',
                  sheet_number: sheet.sheet_number,
                  detail_number: member.designation
                });
              }
            });
          }
        } catch (e) {
          console.log('Error parsing sheet metadata:', e);
        }
      }
    });

    // STEEL QA RULE 4: Finish conflicts
    sheets.forEach((sheet) => {
      if (sheet.ai_metadata) {
        try {
          const metadata = typeof sheet.ai_metadata === 'string' 
            ? JSON.parse(sheet.ai_metadata) 
            : sheet.ai_metadata;

          if (metadata.finish_specs) {
            const finishes = new Set(
              (metadata.finish_specs || []).map(f => f.type || 'unknown')
            );
            if (finishes.size > 1 && finishes.has('galvanized') && finishes.has('primer')) {
              qa_blockers.push({
                severity: 'P0',
                rule: 'finish_conflict',
                message: 'Finish conflict: mixing galvanized and primer on same connection',
                sheet_number: sheet.sheet_number,
                detail_number: null
              });
            }
          }
        } catch (e) {
          console.log('Error parsing sheet metadata:', e);
        }
      }
    });

    // STEEL QA RULE 5: Open RFIs tied to drawing
    if (openRFIs.length > 0) {
      openRFIs.forEach((rfi) => {
        qa_blockers.push({
          severity: 'P1',
          rule: 'open_rfi',
          message: `Open RFI #${rfi.rfi_number}: ${rfi.subject}`,
          sheet_number: null,
          detail_number: rfi.id
        });
      });
    }

    // Determine pass/fail
    const p0Count = qa_blockers.filter(b => b.severity === 'P0').length;
    const qa_status = p0Count > 0 ? 'fail' : 'pass';

    // Update drawing set
    await base44.asServiceRole.entities.DrawingSet.update(drawing_set_id, {
      qa_status,
      qa_blockers
    });

    return Response.json({
      success: true,
      qa_status,
      qa_blockers,
      p0_count: qa_blockers.filter(b => b.severity === 'P0').length,
      p1_count: qa_blockers.filter(b => b.severity === 'P1').length
    });
  } catch (error) {
    console.error('Steel QA error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});