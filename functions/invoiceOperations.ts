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
        const created = await base44.asServiceRole.entities.ClientInvoice.create(data);
        return Response.json({ success: true, data: created });

      case 'update':
        await base44.asServiceRole.entities.ClientInvoice.update(data.id, data.updates);
        return Response.json({ success: true });

      case 'delete':
        await base44.asServiceRole.entities.ClientInvoice.delete(data.id);
        return Response.json({ success: true });

      default:
        return Response.json({ error: 'Invalid operation' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});