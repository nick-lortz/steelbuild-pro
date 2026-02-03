/**
 * SECURE PROJECT DELETION ENDPOINT
 * 
 * With cascade deletion of all related entities
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin } from './utils/auth.js';
import { cascadeDeleteProject } from './utils/cascadeDelete.js';

Deno.serve(async (req) => {
  try {
    // 1. AUTH - Only admins can delete projects
    const { user, error, base44 } = await requireAdmin(req);
    if (error) return error;
    
    // 2. PARSE
    const { id } = await req.json();
    
    if (!id) {
      return Response.json({
        error: 'Project ID is required'
      }, { status: 400 });
    }
    
    // 3. VERIFY PROJECT EXISTS
    const projects = await base44.asServiceRole.entities.Project.filter({ id });
    if (projects.length === 0) {
      return Response.json({
        error: 'Project not found'
      }, { status: 404 });
    }
    
    // 4. CASCADE DELETE ALL RELATED ENTITIES
    await cascadeDeleteProject(base44.asServiceRole, id);
    
    return Response.json({
      success: true,
      message: 'Project and all related data deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete project error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
});