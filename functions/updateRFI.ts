/**
 * SECURE RFI UPDATE ENDPOINT
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAuth } from './utils/auth.js';
import { validateRFI } from './utils/validation.js';
import { checkRFINumberUnique } from './utils/uniqueness.js';

Deno.serve(async (req) => {
  try {
    const { id, data } = await req.json();
    
    if (!id) {
      return Response.json({
        error: 'RFI ID is required'
      }, { status: 400 });
    }
    
    // 1. AUTH
    const authResult = await requireAuth(req);
    if (authResult.error) return authResult.error;
    const { user, base44 } = authResult;
    
    // 2. FETCH EXISTING RFI
    const existingRFIs = await base44.entities.RFI.filter({ id });
    const existingRFI = existingRFIs[0];
    
    if (!existingRFI) {
      return Response.json({
        error: 'RFI not found'
      }, { status: 404 });
    }
    
    // 3. VERIFY PROJECT ACCESS
    const projects = await base44.entities.Project.filter({ id: existingRFI.project_id });
    const project = projects[0];
    
    if (!project) {
      return Response.json({
        error: 'Project not found'
      }, { status: 404 });
    }
    
    // Check access for non-admin users
    if (user.role !== 'admin') {
      const hasAccess = 
        project.project_manager === user.email ||
        project.superintendent === user.email ||
        (project.assigned_users && project.assigned_users.includes(user.email));
      
      if (!hasAccess) {
        return Response.json({
          error: 'Forbidden: No access to this project'
        }, { status: 403 });
      }
    }
    
    // 4. VALIDATION
    const validation = validateRFI(data, true);
    if (!validation.valid) {
      return Response.json({
        error: 'Validation failed',
        details: validation.errors
      }, { status: 400 });
    }
    
    // 5. UNIQUE CONSTRAINT (if changing RFI number)
    if (data.rfi_number && data.rfi_number !== existingRFI.rfi_number) {
      const uniqueCheck = await checkRFINumberUnique(
        base44,
        existingRFI.project_id,
        data.rfi_number,
        id
      );
      
      if (!uniqueCheck.unique) {
        return Response.json({
          error: uniqueCheck.error
        }, { status: 409 });
      }
    }
    
    // 6. AUTO-SET DATES BASED ON STATUS
    const updates = { ...data };
    
    if (data.status === 'submitted' && !updates.submitted_date) {
      updates.submitted_date = new Date().toISOString().split('T')[0];
    }
    
    if (data.status === 'answered' && !updates.response_date) {
      updates.response_date = new Date().toISOString().split('T')[0];
    }
    
    if (data.status === 'closed' && !updates.closed_date) {
      updates.closed_date = new Date().toISOString().split('T')[0];
    }
    
    // 7. UPDATE RFI
    const rfi = await base44.entities.RFI.update(id, updates);
    
    return Response.json({
      success: true,
      rfi
    });
    
  } catch (error) {
    console.error('Update RFI error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
});