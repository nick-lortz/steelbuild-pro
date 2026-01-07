import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sov_item_id, percent_complete } = await req.json();

  if (!sov_item_id || percent_complete === undefined) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const numPercent = Number(percent_complete);

  // Validate range 0-100
  if (numPercent < 0 || numPercent > 100) {
    return Response.json({ 
      error: 'Percent complete must be between 0 and 100' 
    }, { status: 400 });
  }

  // Fetch SOV item
  const sovItems = await base44.entities.SOVItem.filter({ id: sov_item_id });
  if (sovItems.length === 0) {
    return Response.json({ error: 'SOV item not found' }, { status: 404 });
  }

  const sovItem = sovItems[0];

  // Block percent decrease if any approved/paid invoices exist
  if (numPercent < (sovItem.percent_complete || 0)) {
    const invoices = await base44.entities.Invoice.filter({ 
      project_id: sovItem.project_id 
    });
    
    const hasApprovedInvoices = invoices.some(inv => 
      inv.status === 'approved' || inv.status === 'paid'
    );

    if (hasApprovedInvoices) {
      return Response.json({ 
        error: 'Cannot decrease percent complete after invoice approval. Use change order to adjust billing.' 
      }, { status: 400 });
    }
  }

  // Update percent complete only (do not touch billed_to_date or earned_to_date)
  await base44.asServiceRole.entities.SOVItem.update(sov_item_id, {
    percent_complete: numPercent
  });

  return Response.json({
    message: 'Percent complete updated',
    sov_item_id,
    percent_complete: numPercent
  });
});