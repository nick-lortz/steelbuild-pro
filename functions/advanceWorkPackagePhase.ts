import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { work_package_id, target_state, context = {} } = await req.json();

    if (!work_package_id || !target_state) {
      return Response.json({ 
        error: 'work_package_id and target_state required' 
      }, { status: 400 });
    }

    // Get work package
    const workPackages = await base44.entities.WorkPackage.filter({ id: work_package_id });
    if (!workPackages.length) {
      return Response.json({ error: 'Work package not found' }, { status: 404 });
    }

    const workPackage = workPackages[0];

    // Verify user has access to this work package's project
    const userProjects = user.project_ids || [];
    if (!userProjects.includes(workPackage.project_id) && user.role !== 'admin') {
      return Response.json({ error: 'Access denied to this work package' }, { status: 403 });
    }

    // Import state machine from backend-safe module
    const { validatePhaseTransition, getWorkflowGuidance } = await import('./_lib/stateMachine.js');

    // Evaluate transition
    const trace = await validatePhaseTransition(workPackage, target_state, base44);

    // If no critical blockers, execute transition
    if (trace.canAdvance) {
      const result = await base44.entities.WorkPackage.update(workPackage.id, {
        phase: target_state,
        updated_date: new Date().toISOString()
      });
      
      return Response.json({
        success: true,
        work_package: result,
        trace,
      });
    } else {
      // Blockers exist - return evaluation without executing
      return Response.json({
        success: false,
        message: 'Prerequisites not met',
        trace,
        can_override: user.role === 'admin' || user.role === 'project_manager',
      }, { status: 400 });
    }
  } catch (error) {
    console.error('[advanceWorkPackagePhase] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});