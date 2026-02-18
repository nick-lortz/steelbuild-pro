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
      filters = {},
      limit = 100,
      skip = 0
    } = await req.json();
    
    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    // Check access
    await requireProjectAccess(base44, user, project_id, 'view');

    // Build query
    const query = { project_id };

    if (filters.erection_area) {
      if (Array.isArray(filters.erection_area)) {
        // Multi-select not directly supported, fetch all and filter client-side
      } else {
        query.erection_area = filters.erection_area;
      }
    }

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.hold_area !== undefined) {
      query.hold_area = filters.hold_area;
    }

    if (filters.procurement_status) {
      query.procurement_status = filters.procurement_status;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.phase) {
      query.phase = filters.phase;
    }

    // Fetch tasks
    let tasks = await base44.entities.Task.filter(query);

    // Client-side filters for complex queries
    if (filters.date_window_start && filters.date_window_end) {
      const start = new Date(filters.date_window_start);
      const end = new Date(filters.date_window_end);
      tasks = tasks.filter(t => {
        const taskStart = new Date(t.start_date);
        const taskEnd = new Date(t.end_date);
        return (taskStart <= end && taskEnd >= start);
      });
    }

    if (filters.impactedByOpenRfis) {
      // Fetch open RFIs
      const rfis = await base44.entities.RFI.filter({
        project_id,
        status: { $in: ['submitted', 'under_review'] }
      });
      
      const rfiIds = new Set(rfis.map(r => r.id));
      tasks = tasks.filter(t => 
        t.linked_rfi_ids?.some(id => rfiIds.has(id))
      );
    }

    const total_count = tasks.length;

    // Pagination
    const paginatedTasks = tasks.slice(skip, skip + limit);

    return Response.json({
      tasks: paginatedTasks,
      total_count,
      skip,
      limit,
      has_more: skip + limit < total_count
    });

  } catch (error) {
    console.error('List tasks error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: error.message.includes('Forbidden') ? 403 : 500 });
  }
});