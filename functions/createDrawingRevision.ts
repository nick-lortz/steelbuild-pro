import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      project_id, 
      drawing_set_id, 
      revision_number, 
      description,
      linked_rfi_ids = [],
      linked_detail_improvement_ids = [],
      linked_fab_readiness_item_ids = []
    } = await req.json();
    
    if (!project_id || !drawing_set_id || !revision_number) {
      return Response.json({ 
        error: 'project_id, drawing_set_id, and revision_number required' 
      }, { status: 400 });
    }

    await requireProjectAccess(base44, user, project_id);

    // Mark previous current revision as not current
    const existingRevisions = await base44.asServiceRole.entities.DrawingRevision.filter({
      drawing_set_id,
      is_current: true
    });

    for (const rev of existingRevisions) {
      await base44.asServiceRole.entities.DrawingRevision.update(rev.id, {
        is_current: false,
        status: 'superseded'
      });
    }

    // Get current sheets
    const sheets = await base44.entities.DrawingSheet.filter({ drawing_set_id });
    const sheetSnapshot = sheets.map(s => ({
      sheet_number: s.sheet_number,
      file_url: s.file_url,
      revision_hash: s.revision_hash
    }));

    // Create new revision
    const newRevision = await base44.asServiceRole.entities.DrawingRevision.create({
      project_id,
      drawing_set_id,
      revision_number,
      revision_date: new Date().toISOString().split('T')[0],
      description,
      submitted_by: user.email,
      status: 'IFA',
      sheets: sheetSnapshot,
      linked_rfi_ids,
      linked_detail_improvement_ids,
      linked_fab_readiness_item_ids,
      is_current: true
    });

    // Update drawing set
    await base44.asServiceRole.entities.DrawingSet.update(drawing_set_id, {
      current_revision: revision_number
    });

    return Response.json({
      success: true,
      revision: newRevision
    });

  } catch (error) {
    console.error('Create drawing revision error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});