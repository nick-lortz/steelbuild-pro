import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Creates a new revision record when a Detailing item is updated
 * Call this function whenever a significant change is made to a Detailing item
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { detailing_id, revision_notes, changed_fields } = await req.json();

    if (!detailing_id) {
      return Response.json({ error: 'detailing_id required' }, { status: 400 });
    }

    // Fetch current Detailing data
    const detailingData = await base44.entities.Detailing.filter({ id: detailing_id });
    if (!detailingData || detailingData.length === 0) {
      return Response.json({ error: 'Detailing item not found' }, { status: 404 });
    }

    const detailing = detailingData[0];

    // Generate next revision number
    const existingRevisions = await base44.entities.DetailingRevision.filter(
      { detailing_id },
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

    // Create revision snapshot
    const snapshot = {
      ...detailing,
      snapshot_timestamp: new Date().toISOString()
    };

    // Create revision record
    const revision = await base44.entities.DetailingRevision.create({
      detailing_id,
      project_id: detailing.project_id,
      revision_number: nextRevisionNumber,
      revision_date: new Date().toISOString(),
      revision_notes: revision_notes || 'Updated detailing item',
      previous_revision_id: existingRevisions.length > 0 ? existingRevisions[0].id : null,
      snapshot_data: JSON.stringify(snapshot),
      changed_fields: changed_fields || [],
      revision_type: 'update'
    });

    // Update parent Detailing record
    await base44.entities.Detailing.update(detailing_id, {
      revision_number: nextRevisionNumber,
      current_revision_id: revision.id,
      revision_notes: revision_notes || detailing.revision_notes
    });

    return Response.json({ 
      success: true, 
      revision,
      revision_number: nextRevisionNumber
    });

  } catch (error) {
    console.error('Error creating detailing revision:', error);
    return Response.json({ 
      error: error.message || 'Failed to create revision' 
    }, { status: 500 });
  }
});