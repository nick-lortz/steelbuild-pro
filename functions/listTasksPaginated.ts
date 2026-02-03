/**
 * PAGINATED TASK LIST ENDPOINT
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getUserAccessibleProjects } from './utils/auth.js';

Deno.serve(async (req) => {
  try {
    const { projectIds, error, base44 } = await getUserAccessibleProjects(req);
    if (error) return error;
    
    // Parse pagination params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;
    const sortBy = url.searchParams.get('sort') || 'start_date';
    const projectId = url.searchParams.get('project_id');
    const status = url.searchParams.get('status');
    const phase = url.searchParams.get('phase');
    
    // Fetch all tasks
    const allTasks = await base44.entities.Task.list(sortBy);
    
    // Filter to accessible projects
    let filteredTasks = allTasks.filter(t => projectIds.includes(t.project_id));
    
    // Apply filters
    if (projectId && projectId !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.project_id === projectId);
    }
    if (status && status !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.status === status);
    }
    if (phase && phase !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.phase === phase);
    }
    
    // Paginate
    const total = filteredTasks.length;
    const tasks = filteredTasks.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);
    
    return Response.json({
      success: true,
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
    
  } catch (error) {
    console.error('List tasks error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
});