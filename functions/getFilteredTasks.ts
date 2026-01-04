import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    
    // Parse all filters
    const filters = {
      project_id: searchParams.get('project_id'),
      status: searchParams.get('status'),
      phase: searchParams.get('phase'),
      assigned_to: searchParams.get('assigned_to'),
      start_date_from: searchParams.get('start_date_from'),
      start_date_to: searchParams.get('start_date_to'),
      end_date_from: searchParams.get('end_date_from'),
      end_date_to: searchParams.get('end_date_to'),
      is_critical: searchParams.get('is_critical') === 'true',
      is_overdue: searchParams.get('is_overdue') === 'true',
      search: searchParams.get('search')
    };

    // Pagination with max limit enforcement
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Sorting with validation
    const allowedSortFields = ['name', 'start_date', 'end_date', 'status', 'phase', 'priority', 'progress_percent'];
    const sortBy = allowedSortFields.includes(searchParams.get('sort_by')) 
      ? searchParams.get('sort_by') 
      : 'start_date';
    const sortOrder = searchParams.get('sort_order') === 'desc' ? 'desc' : 'asc';

    // Fetch base data + enrichment data in parallel
    const baseQuery = {};
    if (filters.project_id) baseQuery.project_id = filters.project_id;
    if (filters.status) baseQuery.status = filters.status;
    if (filters.phase) baseQuery.phase = filters.phase;
    if (filters.is_critical) baseQuery.is_critical = true;

    const [tasks, projects, resources, drawingSets] = await Promise.all([
      base44.entities.Task.filter(baseQuery),
      base44.entities.Project.list(),
      base44.entities.Resource.list(),
      filters.project_id ? base44.entities.DrawingSet.filter({ project_id: filters.project_id }) : Promise.resolve([])
    ]);

    // Build lookup maps for enrichment
    const projectMap = new Map(projects.map(p => [p.id, p.name]));
    const resourceMap = new Map(resources.map(r => [r.id, r.name]));
    const drawingMap = new Map(drawingSets.map(d => [d.id, d.status]));

    // Apply additional filters
    const today = new Date().toISOString().split('T')[0];
    let filteredTasks = tasks.filter(t => {
      // Assigned to filter
      if (filters.assigned_to && !t.assigned_resources?.includes(filters.assigned_to)) {
        return false;
      }

      // Date range filters
      if (filters.start_date_from && t.start_date < filters.start_date_from) return false;
      if (filters.start_date_to && t.start_date > filters.start_date_to) return false;
      if (filters.end_date_from && t.end_date < filters.end_date_from) return false;
      if (filters.end_date_to && t.end_date > filters.end_date_to) return false;

      // Overdue filter
      if (filters.is_overdue) {
        if (t.status === 'completed' || !t.end_date || t.end_date >= today) {
          return false;
        }
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesName = t.name?.toLowerCase().includes(searchLower);
        const matchesWBS = t.wbs_code?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesWBS) return false;
      }

      return true;
    });

    // Sort
    filteredTasks.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

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

    const totalCount = filteredTasks.length;
    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    // Apply pagination
    const paginatedTasks = filteredTasks.slice(offset, offset + limit);

    // Enrich results
    const enrichedTasks = paginatedTasks.map(t => {
      // Get assigned resource names
      const assignedNames = (t.assigned_resources || [])
        .map(rid => resourceMap.get(rid))
        .filter(Boolean);

      // Check for blockers (linked drawings not FFF)
      const hasBlockers = (t.linked_drawing_set_ids || []).some(did => {
        const status = drawingMap.get(did);
        return status && status !== 'FFF' && status !== 'As-Built';
      });

      return {
        id: t.id,
        name: t.name,
        wbs_code: t.wbs_code,
        status: t.status,
        phase: t.phase,
        priority: t.priority,
        start_date: t.start_date,
        end_date: t.end_date,
        duration_days: t.duration_days,
        progress_percent: t.progress_percent,
        project_id: t.project_id,
        project_name: projectMap.get(t.project_id),
        assigned_resource_ids: t.assigned_resources || [],
        assigned_names: assignedNames,
        is_milestone: t.is_milestone,
        is_critical: t.is_critical,
        has_blockers: hasBlockers,
        linked_rfi_ids: t.linked_rfi_ids || [],
        linked_co_ids: t.linked_co_ids || [],
        created_date: t.created_date,
        updated_date: t.updated_date
      };
    });

    return Response.json({
      tasks: enrichedTasks,
      pagination: {
        total: totalCount,
        limit,
        offset,
        has_more: offset + limit < totalCount,
        total_pages: totalPages,
        current_page: currentPage
      },
      filters_applied: {
        project_id: filters.project_id || null,
        status: filters.status || null,
        phase: filters.phase || null,
        assigned_to: filters.assigned_to || null,
        is_critical: filters.is_critical || null,
        is_overdue: filters.is_overdue || null,
        search: filters.search || null
      },
      sort: { by: sortBy, order: sortOrder }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});