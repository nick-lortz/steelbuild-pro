/**
 * SECURE COST CODE CREATION ENDPOINT
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin } from './utils/auth.js';
import { checkCostCodeUnique } from './utils/uniqueness.js';

Deno.serve(async (req) => {
  try {
    // 1. AUTH - Only admins can create cost codes
    const { user, error, base44 } = await requireAdmin(req);
    if (error) return error;
    
    // 2. PARSE & VALIDATE
    const data = await req.json();
    
    if (!data.code || !data.name) {
      return Response.json({
        error: 'Code and name are required'
      }, { status: 400 });
    }
    
    // 3. UNIQUE CONSTRAINT
    const uniqueCheck = await checkCostCodeUnique(base44.asServiceRole, data.code);
    if (!uniqueCheck.unique) {
      return Response.json({
        error: uniqueCheck.error
      }, { status: 409 });
    }
    
    // 4. CREATE
    const costCode = await base44.asServiceRole.entities.CostCode.create(data);
    
    return Response.json({
      success: true,
      costCode
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create cost code error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
});