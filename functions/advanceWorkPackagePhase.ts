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

    // Import state machine (dynamic to avoid build-time issues)
    const { WorkPackageStateMachine } = await import('../components/work-packages/WorkPackageStateMachine.js');
    const stateMachine = new WorkPackageStateMachine(base44);

    // Evaluate transition
    const trace = await stateMachine.evaluateTransition(workPackage, target_state, context);

    // If gates pass, execute transition
    if (trace.overall_pass) {
      const result = await stateMachine.executeTransition(workPackage, target_state, context);
      
      return Response.json({
        success: true,
        work_package: result.work_package,
        trace,
      });
    } else {
      // Gates failed - return evaluation without executing
      return Response.json({
        success: false,
        message: 'Gate checks failed',
        trace,
        can_override: user.role === 'admin' || user.role === 'project_manager',
      }, { status: 400 });
    }
  } catch (error) {
    console.error('[advanceWorkPackagePhase] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});