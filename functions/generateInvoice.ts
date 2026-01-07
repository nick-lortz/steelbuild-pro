import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

  // Fetch all SOV items for this project
  const sovItems = await base44.entities.SOVItem.filter({ project_id });

  if (sovItems.length === 0) {
    return Response.json({ error: 'No SOV items found for this project' }, { status: 400 });
  }

  // Create invoice
  const invoice = await base44.entities.Invoice.create({
    project_id,
    period_start,
    period_end,
    status: 'draft',
    total_amount: 0
  });

  // Generate invoice lines with frozen math
  const invoiceLines = [];
  let totalAmount = 0;

  for (const sov of sovItems) {
    const scheduled_value = Number(sov.scheduled_value) || 0;
    const percent_complete = Number(sov.percent_complete) || 0;
    const previous_billed = Number(sov.billed_to_date) || 0;

    // Step B: Calculate earned to date
    const earned_to_date = scheduled_value * (percent_complete / 100);

    // Step C: Determine current period bill
    const current_billed = earned_to_date - previous_billed;

    // Rule: Block if over-billing (negative billing not allowed)
    if (current_billed < 0) {
      await base44.asServiceRole.entities.Invoice.delete(invoice.id);
      return Response.json({ 
        error: `Cannot over-bill SOV line ${sov.sov_code}. Earned: $${earned_to_date.toFixed(2)}, Already billed: $${previous_billed.toFixed(2)}. You cannot un-earn revenue.` 
      }, { status: 400 });
    }

    // Edge case: Allow 100% complete but not fully billed
    // No special handling needed - math naturally allows this

    // Only include lines with billable progress
    if (current_billed > 0) {
      const billed_to_date = previous_billed + current_billed;
      const remaining_value = scheduled_value - billed_to_date;

      // Step D: Freeze values in InvoiceLine
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
  }

  // Update invoice total
  await base44.asServiceRole.entities.Invoice.update(invoice.id, {
    total_amount: totalAmount
  });

  return Response.json({
    message: 'Invoice generated',
    invoice,
    lines: invoiceLines,
    total_amount: totalAmount
  });
});