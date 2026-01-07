import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { work_package_id } = await req.json();

    if (!work_package_id) {
      return Response.json({ error: 'work_package_id required' }, { status: 400 });
    }

    // Get work package
    const workPackages = await base44.asServiceRole.entities.WorkPackage.filter({ id: work_package_id });
    if (!workPackages.length) {
      return Response.json({ error: 'Work Package not found' }, { status: 404 });
    }

    const wp = workPackages[0];

    // Determine editability
    const isEditable = wp.status === 'active' && wp.phase !== 'complete';
    const canAdvancePhase = wp.phase !== 'complete' && wp.status !== 'complete';
    const canDelete = wp.phase === 'fabrication' || wp.phase === 'delivery';
    
    let lockedReason = null;
    if (!isEditable) {
      if (wp.status === 'complete') {
        lockedReason = 'Work Package is complete';
      } else if (wp.status === 'on_hold') {
        lockedReason = 'Work Package is on hold';
      } else if (wp.phase === 'complete') {
        lockedReason = 'Work Package phase is complete';
      }
    }

    return Response.json({
      phase: wp.phase,
      status: wp.status,
      is_editable: isEditable,
      can_advance_phase: canAdvancePhase,
      can_delete: canDelete,
      locked_reason: lockedReason
    });

  } catch (error) {
    console.error('Error getting work package execution state:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});