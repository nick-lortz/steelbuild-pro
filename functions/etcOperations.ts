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
        const created = await base44.asServiceRole.entities.EstimatedCostToComplete.create(data);
        return Response.json({ success: true, data: created });

      case 'update':
        const etcRecords = await base44.asServiceRole.entities.EstimatedCostToComplete.filter({ id: data.id });
        if (!etcRecords.length) {
          return Response.json({ error: 'ETC record not found' }, { status: 404 });
        }
        await requireProjectAccess(base44, user, etcRecords[0].project_id);
        await base44.asServiceRole.entities.EstimatedCostToComplete.update(data.id, data.updates);
        return Response.json({ success: true });

      case 'delete':
        const deleteRecords = await base44.asServiceRole.entities.EstimatedCostToComplete.filter({ id: data.id });
        if (!deleteRecords.length) {
          return Response.json({ error: 'ETC record not found' }, { status: 404 });
        }
        await requireProjectAccess(base44, user, deleteRecords[0].project_id);
        await base44.asServiceRole.entities.EstimatedCostToComplete.delete(data.id);
        return Response.json({ success: true });

      default:
        return Response.json({ error: 'Invalid operation' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});