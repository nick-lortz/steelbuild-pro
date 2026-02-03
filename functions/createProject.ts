/**
 * SECURE PROJECT CREATION ENDPOINT
 * 
 * Demonstrates proper implementation of:
 * - Authentication & authorization
 * - Input validation
 * - Unique constraint checking
 * - Error handling
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin } from './utils/auth.js';
import { validateProject } from './utils/validation.js';
import { checkProjectNumberUnique } from './utils/uniqueness.js';

Deno.serve(async (req) => {
  try {
    // 1. AUTHENTICATION & AUTHORIZATION
    const { user, error, base44 } = await requireAdmin(req);
    if (error) return error;
    
    // 2. PARSE REQUEST
    const data = await req.json();
    
    // 3. INPUT VALIDATION
    const validation = validateProject(data, false);
    if (!validation.valid) {
      return Response.json({
        error: 'Validation failed',
        details: validation.errors
      }, { status: 400 });
    }
    
    // 4. UNIQUE CONSTRAINT CHECK
    const uniqueCheck = await checkProjectNumberUnique(
      base44.asServiceRole,
      data.project_number
    );
    
    if (!uniqueCheck.unique) {
      return Response.json({
        error: uniqueCheck.error
      }, { status: 409 });
    }
    
    // 5. CREATE PROJECT
    const project = await base44.asServiceRole.entities.Project.create({
      ...data,
      created_by: user.email
    });
    
    // 6. RETURN SUCCESS
    return Response.json({
      success: true,
      project
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create project error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
});