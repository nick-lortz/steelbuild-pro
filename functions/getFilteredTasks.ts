import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    
    // Parse filters
    const filters = {
      project_id: searchParams.get('project_id'),
      status: searchParams.get('status'),
      phase: searchParams.get('phase'),
      assigned_resource: searchParams.get('assigned_resource'),
      start_date_from: searchParams.get('start_date_from'),
      start_date_to: searchParams.get('start_date_to'),
      end_date_from: searchParams.get('end_date_from'),
      end_date_to: searchParams.get('end_date_to'),
      is_critical: searchParams.get('is_critical'),
      search: searchParams.get('search')
    };

    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Sorting
    const sortBy = searchParams.get('sort_by') || 'end_date';
    const sortOrder = searchParams.get('sort_order') || 'asc';

    // Build query object
    const query = {};
    if (filters.project_id) query.project_id = filters.project_id;
    if (filters.status) query.status = filters.status;
    if (filters.phase) query.phase = filters.phase;
    if (filters.is_critical === 'true') query.is_critical = true;

    // Fetch all matching tasks (Base44 doesn't support server-side pagination on entities)
    let tasks = await base44.entities.Task.filter(query);

    // Apply additional filters client-side
    if (filters.assigned_resource) {
      tasks = tasks.filter(t => 
        t.assigned_resources?.includes(filters.assigned_resource)
      );
    }

    if (filters.start_date_from) {
      tasks = tasks.filter(t => t.start_date >= filters.start_date_from);
    }

    if (filters.start_date_to) {
      tasks = tasks.filter(t => t.start_date <= filters.start_date_to);
    }

    if (filters.end_date_from) {
      tasks = tasks.filter(t => t.end_date >= filters.end_date_from);
    }

    if (filters.end_date_to) {
      tasks = tasks.filter(t => t.end_date <= filters.end_date_to);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      tasks = tasks.filter(t => 
        t.name?.toLowerCase().includes(searchLower) ||
        t.wbs_code?.toLowerCase().includes(searchLower) ||
        t.notes?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    tasks.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Handle nulls
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Compare
      if (typeof aVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else if (typeof aVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      } else {
        return 0;
      }
    });

    const totalCount = tasks.length;

    // Apply pagination
    const paginatedTasks = tasks.slice(offset, offset + limit);

    return Response.json({
      tasks: paginatedTasks,
      pagination: {
        total: totalCount,
        limit,
        offset,
        has_more: offset + limit < totalCount
      },
      filters_applied: filters,
      sort: { by: sortBy, order: sortOrder }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});