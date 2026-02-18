import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { project_id, period_start, period_end } = await req.json();

  if (!project_id || !period_start || !period_end) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Verify project access
  await requireProjectAccess(base44, user, project_id);

  // Fetch all SOV items for this project
  const sovItems = await base44.entities.SOVItem.filter({ project_id });

  if (sovItems.length === 0) {
    return Response.json({ error: 'No SOV items found for this project' }, { status: 400 });
  }

  // FREEZE CHECK: Prevent invoice generation if prior period is still draft
  const priorInvoices = await base44.asServiceRole.entities.Invoice.filter({ 
    project_id 
  });
  const hasDraftInvoices = priorInvoices.some(inv => inv.status === 'draft');
  if (hasDraftInvoices) {
    return Response.json({ 
      error: 'Cannot generate new invoice while prior invoices are in draft status. Approve or delete draft invoices first.' 
    }, { status: 400 });
  }

  // Create invoice (draft status)
  const invoice = await base44.entities.Invoice.create({
    project_id,
    period_start,
    period_end,
    status: 'draft',
    total_amount: 0
  });

  const invoiceLines = [];
  let totalAmount = 0;
  const errors = [];

  for (const sov of sovItems) {
    const scheduled_value = Number(sov.scheduled_value) || 0;
    const percent_complete = Number(sov.percent_complete) || 0;
    const previous_billed = Number(sov.billed_to_date) || 0;

    // Step B: Calculate earned to date
    const earned_to_date = scheduled_value * (percent_complete / 100);

    // Step C: Determine current period bill
    const current_billed = earned_to_date - previous_billed;

    // Block if over-billing (negative billing = trying to un-earn revenue)
    if (current_billed < 0) {
      errors.push({
        sov_code: sov.sov_code,
        description: sov.description,
        earned: earned_to_date,
        already_billed: previous_billed,
        attempted: current_billed
      });
      continue;
    }

    // Include all lines (even $0) for complete audit trail
    const billed_to_date = previous_billed + current_billed;
    const remaining_value = scheduled_value - billed_to_date;

    // Step D: Freeze values in InvoiceLine (immutable snapshot)
    const line = await base44.entities.InvoiceLine.create({
      invoice_id: invoice.id,
      sov_item_id: sov.id,
      scheduled_value,
      previous_billed,
      current_percent: percent_complete,
      current_billed,
      billed_to_date,
      remaining_value
    });

    invoiceLines.push(line);
    totalAmount += current_billed;
  }

  // If any overbilling detected, delete invoice and report errors
  if (errors.length > 0) {
    await base44.asServiceRole.entities.Invoice.delete(invoice.id);
    return Response.json({ 
      error: 'Cannot generate invoice: overbilling detected',
      details: errors
    }, { status: 400 });
  }

  // Update invoice total
  await base44.asServiceRole.entities.Invoice.update(invoice.id, {
    total_amount: totalAmount
  });

  return Response.json({
    message: 'Invoice generated (draft)',
    invoice,
    lines: invoiceLines,
    total_amount: totalAmount
  });
});