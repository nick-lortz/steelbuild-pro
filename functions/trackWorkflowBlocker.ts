import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Analytics tracking for workflow blockers
 * Captures blocked transition attempts for optimization
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { 
      work_package_id, 
      project_id,
      current_phase,
      attempted_phase,
      blocker_type,
      blocker_severity,
      blocker_message
    } = await req.json();
    
    // Track in base44 analytics
    await base44.analytics.track({
      eventName: 'workflow_blocker_encountered',
      properties: {
        work_package_id,
        project_id,
        current_phase,
        attempted_phase,
        blocker_type,
        blocker_severity,
        user_email: user.email,
        timestamp: new Date().toISOString()
      }
    });
    
    return Response.json({ 
      success: true,
      message: 'Blocker tracked'
    });
    
  } catch (error) {
    console.error('Track workflow blocker error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});