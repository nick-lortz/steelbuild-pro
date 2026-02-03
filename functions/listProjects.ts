/**
 * SECURE PROJECT LIST ENDPOINT
 * 
 * Filters projects by user access
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAuth } from './utils/auth.js';

Deno.serve(async (req) => {
  try {
    // 1. AUTH
    const { user, error, base44 } = await requireAuth(req);
    if (error) return error;
    
    // 2. FETCH ALL PROJECTS
    const allProjects = await base44.entities.Project.list('name');
    
    // 3. FILTER BY USER ACCESS
    let projects;
    
    if (user.role === 'admin') {
      // Admin sees all
      projects = allProjects;
    } else {
      // Filter to assigned projects only
      projects = allProjects.filter(p =>
        p.project_manager === user.email ||
        p.superintendent === user.email ||
        (p.assigned_users && p.assigned_users.includes(user.email))
      );
    }
    
    return Response.json({
      success: true,
      projects,
      count: projects.length
    });
    
  } catch (error) {
    console.error('List projects error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
});