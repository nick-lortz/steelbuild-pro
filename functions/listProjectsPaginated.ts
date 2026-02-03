/**
 * PAGINATED PROJECT LIST ENDPOINT
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAuth } from './utils/auth.js';

Deno.serve(async (req) => {
  try {
    const { user, error, base44 } = await requireAuth(req);
    if (error) return error;
    
    // Parse pagination params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    const sortBy = url.searchParams.get('sort') || '-updated_date';
    const status = url.searchParams.get('status');
    
    // Build filter
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Fetch all projects (Base44 doesn't support skip/limit in filter, so we do it manually)
    const allProjects = await base44.entities.Project.list(sortBy);
    
    // Filter by user access
    let accessibleProjects;
    if (user.role === 'admin') {
      accessibleProjects = allProjects;
    } else {
      accessibleProjects = allProjects.filter(p =>
        p.project_manager === user.email ||
        p.superintendent === user.email ||
        (p.assigned_users && p.assigned_users.includes(user.email))
      );
    }
    
    // Apply status filter
    let filteredProjects = accessibleProjects;
    if (status && status !== 'all') {
      filteredProjects = filteredProjects.filter(p => p.status === status);
    }
    
    // Paginate
    const total = filteredProjects.length;
    const projects = filteredProjects.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);
    
    return Response.json({
      success: true,
      projects,
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
    console.error('List projects error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
});