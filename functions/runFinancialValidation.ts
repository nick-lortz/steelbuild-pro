/**
 * runFinancialValidation — Server-Side Enforcement Endpoint
 * =========================================================
 * Runs the full financial validation suite server-side.
 * Called after data imports, major form submissions, and on-demand.
 *
 * POST body: { project_id, auto_fix?, scope? }
 *   scope: 'all' | 'sov' | 'invoices' | 'budget' | 'change_orders' | 'expenses' | 'labor'
 *
 * Returns: validation report with errors, warnings, and corrections.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  runFullValidationSuite,
  runAcceptanceTests,
  autoCorrectFinancials,
  autoCorrectSOVItem,
} from './utils/financialValidation.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'project_manager') {
      return Response.json({ error: 'Forbidden: PM or Admin required' }, { status: 403 });
    }

    const body = await req.json();
    const { project_id, auto_fix = false, scope = 'all', run_acceptance_tests = false } = body;

    if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });

    // Run acceptance tests if requested (admin only)
    if (run_acceptance_tests) {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
      const testResults = runAcceptanceTests();
      return Response.json({ acceptance_tests: testResults });
    }

    // Fetch data in parallel based on scope
    const fetchAll = scope === 'all';
    const [financials, sovItems, invoices, invoiceLines, changeOrders, coLineItems, expenses, laborEntries, project] = await Promise.all([
      (fetchAll || scope === 'budget')         ? base44.asServiceRole.entities.Financial.filter({ project_id })       : Promise.resolve([]),
      (fetchAll || scope === 'sov' || scope === 'invoices') ? base44.asServiceRole.entities.SOVItem.filter({ project_id }) : Promise.resolve([]),
      (fetchAll || scope === 'invoices')       ? base44.asServiceRole.entities.Invoice.filter({ project_id })         : Promise.resolve([]),
      (fetchAll || scope === 'invoices')       ? base44.asServiceRole.entities.InvoiceLine.filter({ project_id })     : Promise.resolve([]),
      (fetchAll || scope === 'change_orders')  ? base44.asServiceRole.entities.ChangeOrder.filter({ project_id })     : Promise.resolve([]),
      (fetchAll || scope === 'change_orders')  ? base44.asServiceRole.entities.ChangeOrderLineItem.filter({ project_id }) : Promise.resolve([]),
      (fetchAll || scope === 'expenses')       ? base44.asServiceRole.entities.Expense.filter({ project_id })         : Promise.resolve([]),
      (fetchAll || scope === 'labor')          ? base44.asServiceRole.entities.LaborHours.filter({ project_id })      : Promise.resolve([]),
      base44.asServiceRole.entities.Project.filter({ id: project_id }).then(r => r[0] || null),
    ]);

    const contractValue = project?.contract_value || 0;

    // Run validation
    const report = runFullValidationSuite({
      financials, sovItems, invoices, invoiceLines,
      changeOrders, coLineItems, expenses, laborEntries,
      contractValue
    });

    report.project_id = project_id;
    report.scope = scope;
    report.auto_fix_applied = false;

    // Auto-fix if requested (only correct computed fields, never monetary source fields)
    if (auto_fix && report.summary.errors > 0) {
      const fixLog = [];

      for (const fin of financials) {
        const corrected = autoCorrectFinancials(fin);
        if (corrected.current_budget !== fin.current_budget || corrected.forecast_amount !== fin.forecast_amount) {
          await base44.asServiceRole.entities.Financial.update(fin.id, {
            current_budget:  corrected.current_budget,
            forecast_amount: corrected.forecast_amount,
          });
          fixLog.push({ entity: 'Financial', id: fin.id, fixed: ['current_budget', 'forecast_amount'] });
        }
      }

      for (const sov of sovItems) {
        const corrected = autoCorrectSOVItem(sov);
        await base44.asServiceRole.entities.SOVItem.update(sov.id, {
          total_billed:      corrected.total_billed,
          balance_to_finish: corrected.balance_to_finish,
          percent_complete:  corrected.percent_complete,
        });
        fixLog.push({ entity: 'SOVItem', id: sov.id, fixed: ['total_billed', 'balance_to_finish', 'percent_complete'] });
      }

      report.auto_fix_applied = true;
      report.fix_log = fixLog;
    }

    return Response.json(report);

  } catch (error) {
    console.error('runFinancialValidation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});