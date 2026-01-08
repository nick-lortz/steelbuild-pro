import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { operation, data } = await req.json();

    switch (operation) {
      case 'supersede':
        // SUPERSEDE PATTERN: New drawing set replaces old, old becomes read-only
        const oldSet = await base44.asServiceRole.entities.DrawingSet.filter({ 
          id: data.oldSetId 
        });
        
        if (!oldSet || oldSet.length === 0) {
          return Response.json({ error: 'Drawing set not found' }, { status: 404 });
        }

        // Create new revision
        const newSet = await base44.asServiceRole.entities.DrawingSet.create({
          project_id: oldSet[0].project_id,
          set_name: oldSet[0].set_name,
          set_number: oldSet[0].set_number,
          current_revision: data.newRevision,
          status: data.status || 'IFA',
          discipline: oldSet[0].discipline,
          ifa_date: data.ifa_date || new Date().toISOString().split('T')[0],
          sheet_count: data.sheet_count || oldSet[0].sheet_count,
          reviewer: oldSet[0].reviewer,
          notes: `Supersedes revision ${oldSet[0].current_revision}`,
        });

        // Mark old set as superseded (read-only)
        await base44.asServiceRole.entities.DrawingSet.update(data.oldSetId, {
          status: 'superseded',
          notes: `Superseded by revision ${data.newRevision} on ${new Date().toISOString().split('T')[0]}`
        });

        return Response.json({ 
          success: true, 
          message: 'Drawing set superseded',
          new_set: newSet,
          old_set_id: data.oldSetId
        });

      case 'release_for_fab':
        // Only sets in BFS status can be released
        const setToRelease = await base44.asServiceRole.entities.DrawingSet.filter({ 
          id: data.setId 
        });
        
        if (!setToRelease || setToRelease.length === 0) {
          return Response.json({ error: 'Drawing set not found' }, { status: 404 });
        }

        if (setToRelease[0].status !== 'BFS') {
          return Response.json({ 
            error: `Cannot release from ${setToRelease[0].status} status. Must be in BFS (Back from Scrub).`,
            current_status: setToRelease[0].status
          }, { status: 400 });
        }

        await base44.asServiceRole.entities.DrawingSet.update(data.setId, {
          status: 'FFF',
          released_for_fab_date: new Date().toISOString().split('T')[0]
        });

        return Response.json({ 
          success: true, 
          message: 'Drawing set released for fabrication'
        });

      default:
        return Response.json({ error: 'Invalid operation' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});