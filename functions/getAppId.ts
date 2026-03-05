import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  return Response.json({ 
    appId: Deno.env.get("BASE44_APP_ID")
  });
});