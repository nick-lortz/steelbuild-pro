import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // Validate webhook signature if provided
    const signature = req.headers.get('x-webhook-signature');
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
    
    if (webhookSecret && signature) {
      const body = await req.text();
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
      const expectedSignature = Array.from(new Uint8Array(signatureBytes))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      if (signature !== expectedSignature) {
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Handle different webhook types
    const { event_type, data } = payload;

    switch (event_type) {
      case 'delivery_notification':
        // Create delivery record
        await base44.asServiceRole.entities.Delivery.create({
          project_id: data.project_id,
          delivery_date: data.date,
          tonnage: data.tonnage,
          pieces: data.pieces,
          status: 'scheduled',
          notes: `External delivery notification: ${data.tracking_number || ''}`
        });
        break;

      case 'rfi_response':
        // Update RFI with response
        const rfis = await base44.asServiceRole.entities.RFI.filter({ rfi_number: data.rfi_number });
        if (rfis.length > 0) {
          await base44.asServiceRole.entities.RFI.update(rfis[0].id, {
            response: data.response,
            status: 'answered',
            response_date: new Date().toISOString()
          });
        }
        break;

      case 'invoice_approval':
        // Update expense payment status
        const expenses = await base44.asServiceRole.entities.Expense.filter({ invoice_number: data.invoice_number });
        if (expenses.length > 0) {
          await base44.asServiceRole.entities.Expense.update(expenses[0].id, {
            payment_status: 'approved',
            notes: `Approved via external system: ${data.approval_reference || ''}`
          });
        }
        break;

      case 'drawing_approval':
        // Update drawing status
        const drawings = await base44.asServiceRole.entities.DrawingSet.filter({ 
          project_id: data.project_id,
          set_number: data.set_number 
        });
        if (drawings.length > 0) {
          await base44.asServiceRole.entities.DrawingSet.update(drawings[0].id, {
            status: 'BFA',
            bfa_date: new Date().toISOString(),
            notes: `Approved via external system`
          });
        }
        break;

      default:
        return Response.json({ error: 'Unknown event type' }, { status: 400 });
    }

    return Response.json({ 
      success: true, 
      event_type,
      processed_at: new Date().toISOString() 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});