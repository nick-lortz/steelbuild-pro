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
        const created = await base44.asServiceRole.entities.Financial.create(data);
        return Response.json({ success: true, data: created });

      case 'update':
        const updateRecords = await base44.asServiceRole.entities.Financial.filter({ id: data.id });
        if (!updateRecords.length) {
          return Response.json({ error: 'Budget line not found' }, { status: 404 });
        }
        await requireProjectAccess(base44, user, updateRecords[0].project_id);

        // INTEGRITY: Block manual actual_amount updates
        // Actual costs flow from Expense entity (source of truth)
        if (data.updates.actual_amount !== undefined) {
          return Response.json({ 
            error: 'Cannot manually set actual_amount. Actual costs come from Expenses only.' 
          }, { status: 403 });
        }
        
        // INTEGRITY: Block manual forecast_amount updates
        // Forecast is derived from EAC calculation, not entered manually
        if (data.updates.forecast_amount !== undefined) {
          return Response.json({ 
            error: 'Cannot manually set forecast_amount. It is calculated from EAC.' 
          }, { status: 403 });
        }
        
        // INTEGRITY: Block manual committed_amount (from expenses only)
        if (data.updates.committed_amount !== undefined) {
          return Response.json({
            error: 'Cannot manually set committed_amount. It is calculated from Expense status.'
          }, { status: 403 });
        }
        
        await base44.asServiceRole.entities.Financial.update(data.id, data.updates);
        return Response.json({ success: true });

      case 'delete':
        const deleteRecords = await base44.asServiceRole.entities.Financial.filter({ id: data.id });
        if (!deleteRecords.length) {
          return Response.json({ error: 'Budget line not found' }, { status: 404 });
        }
        await requireProjectAccess(base44, user, deleteRecords[0].project_id);
        await base44.asServiceRole.entities.Financial.delete(data.id);
        return Response.json({ success: true });

      default:
        return Response.json({ error: 'Invalid operation' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});