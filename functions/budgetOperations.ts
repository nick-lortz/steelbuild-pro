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
        const created = await base44.asServiceRole.entities.Financial.create(data);
        return Response.json({ success: true, data: created });

      case 'update':
        // INTEGRITY: Block manual actual_amount updates (Expenses are source of truth)
        if (data.updates.actual_amount !== undefined) {
          return Response.json({ 
            error: 'Cannot manually set actual_amount. Expenses are the source of truth for costs.' 
          }, { status: 403 });
        }
        
        // INTEGRITY: Block manual forecast_amount (should be calculated: budget + ETC)
        if (data.updates.forecast_amount !== undefined) {
          return Response.json({ 
            error: 'Cannot manually set forecast_amount. It is derived from budget and ETC.' 
          }, { status: 403 });
        }
        
        await base44.asServiceRole.entities.Financial.update(data.id, data.updates);
        return Response.json({ success: true });

      case 'delete':
        await base44.asServiceRole.entities.Financial.delete(data.id);
        return Response.json({ success: true });

      default:
        return Response.json({ error: 'Invalid operation' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});