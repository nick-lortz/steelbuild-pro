import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, code, description, category } = await req.json();

    if (!project_id || !code || !description || !category) {
      return Response.json({ error: 'project_id, code, description, and category required' }, { status: 400 });
    }

    // Validate uniqueness per project
    const existing = await base44.entities.CostCode.filter({ project_id, code });
    if (existing.length > 0) {
      return Response.json({ error: 'Cost code already exists for this project' }, { status: 409 });
    }

    const costCode = await base44.entities.CostCode.create({
      project_id,
      code,
      description,
      category,
      is_active: true
    });

    return Response.json({ costCode });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});