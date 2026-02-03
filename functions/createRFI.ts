/**
 * SECURE RFI CREATION ENDPOINT
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/auth.js';
import { validateRFI } from './utils/validation.js';
import { checkRFINumberUnique, getNextRFINumber } from './utils/uniqueness.js';

Deno.serve(async (req) => {
  try {
    const data = await req.json();
    
    // 1. AUTH - Verify project access
    const { user, project, error, base44 } = await requireProjectAccess(req, data.project_id);
    if (error) return error;
    
    // 2. VALIDATION
    const validation = validateRFI(data, false);
    if (!validation.valid) {
      return Response.json({
        error: 'Validation failed',
        details: validation.errors
      }, { status: 400 });
    }
    
    // 3. AUTO-ASSIGN RFI NUMBER (thread-safe)
    let rfiNumber = data.rfi_number;
    if (!rfiNumber) {
      rfiNumber = await getNextRFINumber(base44, data.project_id);
    }
    
    // 4. UNIQUE CONSTRAINT CHECK
    const uniqueCheck = await checkRFINumberUnique(
      base44,
      data.project_id,
      rfiNumber
    );
    
    if (!uniqueCheck.unique) {
      return Response.json({
        error: uniqueCheck.error
      }, { status: 409 });
    }
    
    // 5. CREATE RFI
    const rfi = await base44.entities.RFI.create({
      ...data,
      rfi_number: rfiNumber,
      created_by: user.email
    });
    
    return Response.json({
      success: true,
      rfi
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create RFI error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
});