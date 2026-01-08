import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
        const created = await base44.asServiceRole.entities.SOVItem.create(data);
        return Response.json({ success: true, data: created });

      case 'update':
        // FREEZE: scheduled_value cannot be updated after creation
        if (data.updates.scheduled_value !== undefined) {
          return Response.json({ 
            error: 'Contract value is locked. Use Change Orders to modify scheduled_value.' 
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
        // FREEZE: Cannot delete SOV items if any approved invoices exist
        const invoices = await base44.asServiceRole.entities.Invoice.filter({ 
          project_id: data.project_id 
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