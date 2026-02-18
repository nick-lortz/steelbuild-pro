import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { operation, data } = await req.json();

    switch (operation) {
      case 'create':
        await requireProjectAccess(base44, user, data.project_id);
        const created = await base44.asServiceRole.entities.SOVItem.create(data);
        return Response.json({ success: true, data: created });

      case 'update':
        const updateItems = await base44.asServiceRole.entities.SOVItem.filter({ id: data.id });
        if (!updateItems.length) {
          return Response.json({ error: 'SOV item not found' }, { status: 404 });
        }
        await requireProjectAccess(base44, user, updateItems[0].project_id);

        // Check if item has approved invoices
        const allInvoices = await base44.asServiceRole.entities.Invoice.list();
        const approvedInvoiceIds = new Set(
          allInvoices.filter(inv => inv.status === 'approved' || inv.status === 'paid').map(inv => inv.id)
        );
        const allInvoiceLines = await base44.asServiceRole.entities.InvoiceLine.list();
        const isLocked = allInvoiceLines.some(
          line => line.sov_item_id === data.id && approvedInvoiceIds.has(line.invoice_id)
        );

        // FREEZE: scheduled_value cannot be updated if item has approved invoices
        if (data.updates.scheduled_value !== undefined && isLocked) {
          return Response.json({ 
            error: 'Contract value is locked (item has approved invoices). Use Change Orders to modify scheduled_value.' 
          }, { status: 403 });
        }

        // FREEZE: Cannot decrease billed_to_date or earned_to_date (immutable history)
        if (data.updates.billed_to_date !== undefined || data.updates.earned_to_date !== undefined) {
          return Response.json({ 
            error: 'Historical billing/earned amounts are frozen. Cannot modify retroactively.' 
          }, { status: 403 });
        }

        await base44.asServiceRole.entities.SOVItem.update(data.id, data.updates);
        return Response.json({ success: true });

      case 'delete':
        const deleteItems = await base44.asServiceRole.entities.SOVItem.filter({ id: data.id });
        if (!deleteItems.length) {
          return Response.json({ error: 'SOV item not found' }, { status: 404 });
        }
        await requireProjectAccess(base44, user, deleteItems[0].project_id);

        // FREEZE: Cannot delete SOV items if any approved invoices exist
        const invoices = await base44.asServiceRole.entities.Invoice.filter({ 
          project_id: deleteItems[0].project_id 
        });
        const hasApprovedInvoices = invoices.some(inv => 
          inv.status === 'approved' || inv.status === 'paid'
        );
        
        if (hasApprovedInvoices) {
          return Response.json({ 
            error: 'Cannot delete SOV items after invoice approval. Use Change Orders.' 
          }, { status: 403 });
        }

        await base44.asServiceRole.entities.SOVItem.delete(data.id);
        return Response.json({ success: true });

      default:
        return Response.json({ error: 'Invalid operation' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});