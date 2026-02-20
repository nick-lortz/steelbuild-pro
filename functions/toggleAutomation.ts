import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const { automation_id, automation_name } = await req.json();
    
    // Placeholder - would toggle actual automation state
    return Response.json({ 
      success: true,
      message: `Toggled automation: ${automation_name}`
    });
    
  } catch (error) {
    console.error('Toggle automation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});