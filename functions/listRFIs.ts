/**
 * SECURE RFI LIST ENDPOINT
 * 
 * Filters RFIs by user's accessible projects
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getUserAccessibleProjects } from './utils/auth.js';

Deno.serve(async (req) => {
  try {
    // 1. AUTH & GET ACCESSIBLE PROJECT IDS
    const { projectIds, error, base44 } = await getUserAccessibleProjects(req);
    if (error) return error;
    
    // 2. FETCH ALL RFIs
    const allRFIs = await base44.entities.RFI.list('-created_date');
    
    // 3. FILTER TO ACCESSIBLE PROJECTS
    const rfis = allRFIs.filter(r => projectIds.includes(r.project_id));
    
    return Response.json({
      success: true,
      rfis,
      count: rfis.length
    });
    
  } catch (error) {
    console.error('List RFIs error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
});