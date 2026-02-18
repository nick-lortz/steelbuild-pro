import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { config } from './_lib/config.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Public key is safe to return to client
    const publicKey = config.VAPID_PUBLIC_KEY();

    return Response.json({ publicKey });

  } catch (error) {
    return Response.json({ error: 'VAPID public key not configured' }, { status: 500 });
  }
});