import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  try {
    const projects = await base44.asServiceRole.entities.Project.list('-updated_date');
    return Response.json({ success: true, projects });
  } catch(e) {
    return Response.json({ success: false, error: e.message, status: e.status });
  }
});