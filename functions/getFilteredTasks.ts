import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);

    const {
      project_id,
      status,
      search_term,
      sort_by = 'due_date',
      sort_order = 'asc',
      page = '1',
      limit = '30'
    } = params;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 30));

    // Fetch tasks with project_id filter if provided (optimize first fetch)
    const fetchFilter = project_id ? { project_id } : {};
    const allTasks = await base44.asServiceRole.entities.Task.filter(fetchFilter);

    // Filter tasks
    let filtered = allTasks;

    // Status filter (including 'overdue' virtual status)
    if (status) {
      if (status === 'overdue') {
        const now = new Date();
        filtered = filtered.filter(t => 
          t.status !== 'completed' && 
          t.status !== 'cancelled' &&
          t.end_date && 
          new Date(t.end_date) < now
        );
      } else {
        filtered = filtered.filter(t => t.status === status);
      }
    }

    // Search filter (case-insensitive on name and wbs_code)
    if (search_term) {
      const term = search_term.toLowerCase();
      filtered = filtered.filter(t => 
        (t.name && t.name.toLowerCase().includes(term)) ||
        (t.wbs_code && t.wbs_code.toLowerCase().includes(term))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sort_by) {
        case 'due_date':
        case 'end_date':
          aVal = a.end_date ? new Date(a.end_date).getTime() : Infinity;
          bVal = b.end_date ? new Date(b.end_date).getTime() : Infinity;
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aVal = priorityOrder[a.priority] || 0;
          bVal = priorityOrder[b.priority] || 0;
          break;
        case 'name':
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
          break;
        case 'start_date':
          aVal = a.start_date ? new Date(a.start_date).getTime() : Infinity;
          bVal = b.start_date ? new Date(b.start_date).getTime() : Infinity;
          break;
        default:
          aVal = a[sort_by] || '';
          bVal = b[sort_by] || '';
      }

      if (aVal < bVal) return sort_order === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort_order === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    const total = filtered.length;
    const startIdx = (pageNum - 1) * limitNum;
    const endIdx = startIdx + limitNum;
    const paginatedTasks = filtered.slice(startIdx, endIdx);

    // Return only essential fields
    const tasks = paginatedTasks.map(t => ({
      id: t.id,
      name: t.name,
      wbs_code: t.wbs_code,
      status: t.status,
      start_date: t.start_date,
      end_date: t.end_date,
      priority: t.priority,
      phase: t.phase,
      project_id: t.project_id,
      progress_percent: t.progress_percent,
      estimated_hours: t.estimated_hours,
      is_critical: t.is_critical,
      is_milestone: t.is_milestone,
      assigned_resources: t.assigned_resources
    }));

    return Response.json({
      tasks,
      total,
      page: pageNum,
      limit: limitNum,
      hasMore: endIdx < total
    });

  } catch (error) {
    console.error('Error fetching filtered tasks:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});