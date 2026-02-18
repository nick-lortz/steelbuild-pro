import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';
import { requireProjectRole } from './_lib/authz.js';

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

  // Invoice approval requires explicit permission (PM/Finance/Admin with can_approve_invoices)
  const member = await requireProjectRole(base44, user.email, invoice.project_id, ['admin', 'pm', 'finance']);
  
  if (!member.can_approve_invoices && user.role !== 'admin') {
    return Response.json({ 
      error: 'Forbidden: Invoice approval permission required' 
    }, { status: 403 });
  }

  if (invoice.status === 'approved' || invoice.status === 'paid') {
    return Response.json({ error: 'Invoice already approved' }, { status: 400 });
  }

  // Fetch all invoice lines
  const lines = await base44.entities.InvoiceLine.filter({ invoice_id });

  // FREEZE: Once approved, invoice data becomes immutable history
  // This is the ONLY moment billed_to_date and earned_to_date are updated
  for (const line of lines) {
    const earned_to_date = (line.scheduled_value * line.current_percent) / 100;
    
    // Write-once: Approval locks these values permanently
    await base44.asServiceRole.entities.SOVItem.update(line.sov_item_id, {
      billed_to_date: line.billed_to_date,
      earned_to_date: earned_to_date,
      percent_complete: line.current_percent
    });
  }

  // Update invoice status to approved
  await base44.asServiceRole.entities.Invoice.update(invoice_id, {
    status: 'approved'
  });

  return Response.json({
    message: 'Invoice approved, SOV items updated',
    invoice_id,
    lines_updated: lines.length
  });
});