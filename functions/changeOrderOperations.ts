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
      case 'approve':
        // When CO is approved, adjust SOV scheduled_value
        const changeOrder = await base44.asServiceRole.entities.ChangeOrder.filter({ 
          id: data.changeOrderId 
        });
        if (!changeOrder || changeOrder.length === 0) {
          return Response.json({ error: 'Change order not found' }, { status: 404 });
        }

        const co = changeOrder[0];
        if (co.status !== 'submitted') {
          return Response.json({ 
            error: 'Change order must be in submitted status to approve' 
          }, { status: 400 });
        }

        // Update CO status
        await base44.asServiceRole.entities.ChangeOrder.update(co.id, {
          status: 'approved',
          approved_date: new Date().toISOString().split('T')[0],
          approved_by: user.email,
        });

        // Apply SOV allocations to SOV items (if sov_allocations exists)
        if (co.sov_allocations && co.sov_allocations.length > 0) {
          for (const allocation of co.sov_allocations) {
            if (!allocation.sov_item_id) continue;

            const sovItem = await base44.asServiceRole.entities.SOVItem.filter({ 
              id: allocation.sov_item_id 
            });
            if (sovItem && sovItem.length > 0) {
              const currentScheduledValue = sovItem[0].scheduled_value || 0;
              const newScheduledValue = currentScheduledValue + (allocation.amount || 0);

              // THIS is the ONLY place scheduled_value can change after creation
              await base44.asServiceRole.entities.SOVItem.update(allocation.sov_item_id, {
                scheduled_value: newScheduledValue,
              });
            }
          }
        }

        return Response.json({ 
          success: true, 
          message: 'Change order approved and contract value updated' 
        });

      default:
        return Response.json({ error: 'Invalid operation' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});