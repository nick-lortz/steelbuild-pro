/**
 * PAGINATED RFI LIST ENDPOINT
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
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    const sortBy = url.searchParams.get('sort') || '-created_date';
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    const projectId = url.searchParams.get('project_id');
    
    // Fetch all RFIs
    const allRFIs = await base44.entities.RFI.list(sortBy);
    
    // Filter to accessible projects
    let filteredRFIs = allRFIs.filter(r => projectIds.includes(r.project_id));
    
    // Apply filters
    if (projectId && projectId !== 'all') {
      filteredRFIs = filteredRFIs.filter(r => r.project_id === projectId);
    }
    if (status && status !== 'all') {
      filteredRFIs = filteredRFIs.filter(r => r.status === status);
    }
    if (priority && priority !== 'all') {
      filteredRFIs = filteredRFIs.filter(r => r.priority === priority);
    }
    
    // Paginate
    const total = filteredRFIs.length;
    const rfis = filteredRFIs.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);
    
    return Response.json({
      success: true,
      rfis,
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
    console.error('List RFIs error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
});