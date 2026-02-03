import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';

/**
 * Fetch paginated child entities (Task, RFI, Financial, ChangeOrder) for a project.
 * Enforces project access control via requireProjectAccess.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id, entity_type, page = 1, page_size = 50, filters = {} } = await req.json();

    if (!project_id || !entity_type) {
      return Response.json({ error: 'Missing project_id or entity_type' }, { status: 400 });
    }

    // Enforce project access
    try {
      await requireProjectAccess(base44, user, project_id);
    } catch (err) {
      return Response.json({ error: err.message }, { status: err.status });
    }

    const skip = Math.max(0, (page - 1) * page_size);
    const limit = Math.min(page_size, 100);

    // Build filter: always scoped to project_id
    const filter = { project_id, ...filters };

    // Fetch all matching records (for total count) then slice
    const allMatching = await base44.asServiceRole.entities[entity_type].filter(filter);
    const total = allMatching.length;

    const data = allMatching.slice(skip, skip + limit);

    return Response.json({
      data: data,
      total: total,
      page: page,
      page_size: limit,
      has_more: skip + limit < total
    });
  } catch (error) {
    console.error('[listProjectChildrenPaginated]', error.message);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});