/**
 * DATA INTEGRITY CHECK ENDPOINT
 * 
 * Admin-only function to check database consistency
 * Returns report of orphaned records, date violations, and numeric violations
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin } from './utils/auth.js';
import { runIntegrityCheck } from './utils/dataIntegrity.js';

Deno.serve(async (req) => {
  try {
    // AUTH - Admin only
    const { user, error, base44 } = await requireAdmin(req);
    if (error) return error;
    
    // Run full integrity check
    const results = await runIntegrityCheck(base44.asServiceRole);
    
    return Response.json({
      success: true,
      results,
      summary: {
        total_issues: results.total_issues,
        orphaned_records: results.orphaned_records.length,
        date_violations: results.date_violations.length,
        numeric_violations: results.numeric_violations.length
      }
    });
    
  } catch (error) {
    console.error('Data integrity check error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
});