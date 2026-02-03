/**
 * PAGINATED FINANCIAL RECORDS ENDPOINT
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getUserAccessibleProjects } from './utils/auth.js';

Deno.serve(async (req) => {
  try {
    const { projectIds, error, base44 } = await getUserAccessibleProjects(req);
    if (error) return error;
    
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;
    const projectId = url.searchParams.get('project_id');
    const category = url.searchParams.get('category');
    
    // Fetch financials
    const allFinancials = await base44.entities.Financial.list();
    
    // Filter to accessible projects
    let filtered = allFinancials.filter(f => projectIds.includes(f.project_id));
    
    if (projectId && projectId !== 'all') {
      filtered = filtered.filter(f => f.project_id === projectId);
    }
    if (category && category !== 'all') {
      filtered = filtered.filter(f => f.category === category);
    }
    
    const total = filtered.length;
    const financials = filtered.slice(skip, skip + limit);
    
    return Response.json({
      success: true,
      financials,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });
    
  } catch (error) {
    console.error('List financials error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
});