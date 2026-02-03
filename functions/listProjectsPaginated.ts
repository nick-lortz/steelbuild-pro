import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { page = 1, page_size = 25, search = '', status = 'all', risk_level = 'all', sort_by = 'name' } = await req.json();

    const skip = Math.max(0, (page - 1) * page_size);
    const limit = Math.min(page_size, 100); // Cap at 100 per page

    // Build filter: user sees only assigned projects unless admin
    let filter = {};
    if (user.role !== 'admin') {
      filter = {
        '$or': [
          { 'project_manager': user.email },
          { 'superintendent': user.email },
          { 'assigned_users': { '$contains': user.email } }
        ]
      };
    }

    // Apply status filter
    if (status !== 'all') {
      filter.status = status;
    }

    // Get total matching projects (for pagination)
    const allMatching = await base44.asServiceRole.entities.Project.filter(filter);
    const total = allMatching.length;

    // Fetch page of projects
    let projects = allMatching.slice(skip, skip + limit);

    // Apply search filter (client-side on this page only, not entire result set)
    if (search && search.length > 0) {
      const searchLower = search.toLowerCase();
      projects = projects.filter(p => 
        p.name?.toLowerCase().includes(searchLower) || 
        p.project_number?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sort
    if (sort_by === 'name') {
      projects.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sort_by === 'date') {
      projects.sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0));
    }

    return Response.json({
      data: projects,
      total: total,
      page: page,
      page_size: limit,
      has_more: skip + limit < total
    });
  } catch (error) {
    console.error('[listProjectsPaginated]', error.message);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
});