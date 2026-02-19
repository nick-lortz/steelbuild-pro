import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Creates a new revision record when a DrawingSheet is updated
 * Call this function whenever a drawing file is re-uploaded or metadata changes
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { drawing_sheet_id, revision_notes, changed_fields, file_url, revision_hash } = await req.json();

    if (!drawing_sheet_id) {
      return Response.json({ error: 'drawing_sheet_id required' }, { status: 400 });
    }

    // Fetch current DrawingSheet data
    const sheetData = await base44.entities.DrawingSheet.filter({ id: drawing_sheet_id });
    if (!sheetData || sheetData.length === 0) {
      return Response.json({ error: 'DrawingSheet not found' }, { status: 404 });
    }

    const sheet = sheetData[0];

    // Generate next revision number
    const existingRevisions = await base44.entities.DrawingSheetRevision.filter(
      { drawing_sheet_id },
      '-revision_date',
      1
    );

    let nextRevisionNumber;
    if (existingRevisions.length === 0) {
      nextRevisionNumber = 'Rev 1';
    } else {
      const lastRevision = existingRevisions[0].revision_number;
      const match = lastRevision.match(/Rev (\d+)/);
      if (match) {
        const num = parseInt(match[1]) + 1;
        nextRevisionNumber = `Rev ${num}`;
      } else {
        nextRevisionNumber = 'Rev 1';
      }
    }

    // Determine revision type
    const revisionType = file_url ? 'file_upload' : 'update';

    // Create revision snapshot
    const snapshot = {
      ...sheet,
      snapshot_timestamp: new Date().toISOString()
    };

    // Create revision record
    const revision = await base44.entities.DrawingSheetRevision.create({
      drawing_sheet_id,
      project_id: sheet.project_id,
      revision_number: nextRevisionNumber,
      revision_date: new Date().toISOString(),
      revision_notes: revision_notes || 'Updated drawing sheet',
      previous_revision_id: existingRevisions.length > 0 ? existingRevisions[0].id : null,
      snapshot_data: JSON.stringify(snapshot),
      file_url: file_url || sheet.file_url,
      revision_hash: revision_hash || sheet.revision_hash,
      changed_fields: changed_fields || [],
      revision_type: revisionType
    });

    // Update parent DrawingSheet record
    await base44.entities.DrawingSheet.update(drawing_sheet_id, {
      revision_number: nextRevisionNumber,
      current_revision_id: revision.id,
      ...(file_url && { file_url }),
      ...(revision_hash && { revision_hash })
    });

    return Response.json({ 
      success: true, 
      revision,
      revision_number: nextRevisionNumber
    });

  } catch (error) {
    console.error('Error creating drawing sheet revision:', error);
    return Response.json({ 
      error: error.message || 'Failed to create revision' 
    }, { status: 500 });
  }
});