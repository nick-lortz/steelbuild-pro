/**
 * VALIDATE FINANCIAL CALCULATIONS ENDPOINT
 * 
 * Runs comprehensive financial validation checks
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAuth } from './utils/auth.js';
import { 
  validateSOVItem, 
  validateSOVTotals, 
  validateBudgetActuals,
  validateETC,
  autoCorrectFinancials,
  autoCorrectSOVItem
} from './utils/financialValidation.js';

Deno.serve(async (req) => {
  try {
    const { user, base44, error } = await requireAuth(req);
    if (error) return error;
    
    // Admin only
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { project_id, auto_fix = false } = await req.json();
    
    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }
    
    const results = {
      project_id,
      timestamp: new Date().toISOString(),
      sov_errors: [],
      budget_errors: [],
      invoice_errors: [],
      summary: {
        total_errors: 0,
        auto_fixed: 0
      }
    };
    
    // Validate SOV items
    const sovItems = await base44.entities.SOVItem.filter({ project_id });
    
    for (const item of sovItems) {
      const validation = validateSOVItem(item);
      
      if (!validation.valid) {
        results.sov_errors.push({
          sov_item_id: item.id,
          description: item.description,
          errors: validation.errors
        });
        results.summary.total_errors += validation.errors.length;
        
        // Auto-fix if requested
        if (auto_fix) {
          const corrected = autoCorrectSOVItem(item);
          await base44.asServiceRole.entities.SOVItem.update(item.id, corrected);
          results.summary.auto_fixed++;
        }
      }
    }
    
    // Validate SOV totals
    const sovTotals = validateSOVTotals(sovItems);
    if (!sovTotals.valid) {
      results.sov_errors.push({
        type: 'sov_totals',
        errors: sovTotals.errors,
        totals: sovTotals.totals
      });
      results.summary.total_errors += sovTotals.errors.length;
    }
    
    // Validate budget/actuals
    const financials = await base44.entities.Financial.filter({ project_id });
    
    for (const financial of financials) {
      const validation = validateBudgetActuals(financial);
      
      if (!validation.valid) {
        results.budget_errors.push({
          financial_id: financial.id,
          cost_code_id: financial.cost_code_id,
          errors: validation.errors
        });
        results.summary.total_errors += validation.errors.length;
        
        if (auto_fix) {
          const corrected = autoCorrectFinancials(financial);
          await base44.asServiceRole.entities.Financial.update(financial.id, corrected);
          results.summary.auto_fixed++;
        }
      }
    }
    
    results.summary.has_errors = results.summary.total_errors > 0;
    
    return Response.json(results);
    
  } catch (error) {
    console.error('Validate financials error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
});