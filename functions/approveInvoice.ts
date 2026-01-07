import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { invoice_id } = await req.json();

  if (!invoice_id) {
    return Response.json({ error: 'Missing invoice_id' }, { status: 400 });
  }

  // Fetch invoice
  const invoices = await base44.entities.Invoice.filter({ id: invoice_id });
  if (invoices.length === 0) {
    return Response.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const invoice = invoices[0];

  // Fetch all invoice lines
  const lines = await base44.entities.InvoiceLine.filter({ invoice_id });

  // Step E: Update SOVItem.billed_to_date ONLY on approval
  for (const line of lines) {
    await base44.asServiceRole.entities.SOVItem.update(line.sov_item_id, {
      billed_to_date: line.billed_to_date,
      percent_complete: line.current_percent
    });
  }

  // Update invoice status
  await base44.asServiceRole.entities.Invoice.update(invoice_id, {
    status: 'approved'
  });

  return Response.json({
    message: 'Invoice approved and SOV items updated',
    invoice_id,
    lines_updated: lines.length
  });
});