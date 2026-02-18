import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';

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

  // Verify project access
  await requireProjectAccess(base44, user, invoice.project_id);

  // Guard: only allow deletion if status is draft
  if (invoice.status !== 'draft') {
    return Response.json({ 
      error: `Cannot delete invoice with status: ${invoice.status}. Only draft invoices can be deleted.` 
    }, { status: 400 });
  }

  // Delete invoice lines first
  const lines = await base44.entities.InvoiceLine.filter({ invoice_id });
  for (const line of lines) {
    await base44.asServiceRole.entities.InvoiceLine.delete(line.id);
  }

  // Delete invoice (does not alter SOV financials since status was draft)
  await base44.asServiceRole.entities.Invoice.delete(invoice_id);

  return Response.json({
    message: 'Draft invoice deleted',
    invoice_id,
    lines_deleted: lines.length
  });
});