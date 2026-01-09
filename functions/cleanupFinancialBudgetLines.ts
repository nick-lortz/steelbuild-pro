import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id } = await req.json();

    if (!project_id) {
      return Response.json({ error: 'Missing project_id' }, { status: 400 });
    }

    // Fetch all Financial records for this project
    const budgetLines = await base44.entities.Financial.filter({ project_id });

    if (budgetLines.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No Financial budget lines found to delete',
        count: 0
      });
    }

    // Delete each record
    for (const line of budgetLines) {
      await base44.entities.Financial.delete(line.id);
    }

    return Response.json({ 
      success: true, 
      message: `Deleted ${budgetLines.length} Financial budget lines`,
      count: budgetLines.length,
      deleted_ids: budgetLines.map(b => b.id)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});