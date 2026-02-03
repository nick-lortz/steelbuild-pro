/**
 * SECURE PROJECT UPDATE ENDPOINT
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin } from './utils/auth.js';
import { validateProject } from './utils/validation.js';
import { checkProjectNumberUnique } from './utils/uniqueness.js';

Deno.serve(async (req) => {
  try {
    // 1. AUTH
    const { user, error, base44 } = await requireAdmin(req);
    if (error) return error;
    
    // 2. PARSE
    const { id, data } = await req.json();
    
    if (!id) {
      return Response.json({
        error: 'Project ID is required'
      }, { status: 400 });
    }
    
    // 3. VALIDATION
    const validation = validateProject(data, true);
    if (!validation.valid) {
      return Response.json({
        error: 'Validation failed',
        details: validation.errors
      }, { status: 400 });
    }
    
    // 4. UNIQUE CONSTRAINT (if changing project number)
    if (data.project_number) {
      const uniqueCheck = await checkProjectNumberUnique(
        base44.asServiceRole,
        data.project_number,
        id
      );
      
      if (!uniqueCheck.unique) {
        return Response.json({
          error: uniqueCheck.error
        }, { status: 409 });
      }
    }
    
    // 5. UPDATE
    const project = await base44.asServiceRole.entities.Project.update(id, data);
    
    return Response.json({
      success: true,
      project
    });
    
  } catch (error) {
    console.error('Update project error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
});