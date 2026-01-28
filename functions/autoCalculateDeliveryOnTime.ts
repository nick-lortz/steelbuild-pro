import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { deliveryId, actualDate, plannedDate } = await req.json();

    if (!deliveryId) {
      return Response.json({ error: 'deliveryId required' }, { status: 400 });
    }

    const delivery = (await base44.entities.Delivery.filter({ id: deliveryId }))[0];
    if (!delivery) {
      return Response.json({ error: 'Delivery not found' }, { status: 404 });
    }

    const actual = actualDate ? new Date(actualDate) : delivery.actual_arrival_date ? new Date(delivery.actual_arrival_date) : null;
    const planned = plannedDate ? new Date(plannedDate) : delivery.scheduled_date ? new Date(delivery.scheduled_date) : null;

    let onTime = null;
    let daysVariance = null;

    if (actual && planned) {
      const diffMs = actual - planned;
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      daysVariance = diffDays;
      onTime = diffDays <= 0;
    }

    await base44.entities.Delivery.update(deliveryId, {
      on_time: onTime,
      days_variance: daysVariance
    });

    return Response.json({ 
      success: true, 
      on_time: onTime, 
      days_variance: daysVariance 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});