import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function validatePhaseTransition(workPackage, nextPhase, base44) {
  const blockers = [];
  
  const [drawingSets, openRFIs] = await Promise.all([
    workPackage.linked_drawing_set_ids?.length 
      ? base44.entities.DrawingSet.filter({
          id: { $in: workPackage.linked_drawing_set_ids }
        })
      : Promise.resolve([]),
    
    workPackage.linked_rfi_ids?.length
      ? base44.entities.RFI.filter({
          id: { $in: workPackage.linked_rfi_ids },
          status: { $in: ['draft', 'submitted', 'under_review', 'reopened'] }
        })
      : Promise.resolve([])
  ]);
  
  const hasApprovedDrawings = drawingSets.some(ds => ds.status === 'FFF');
  if (!hasApprovedDrawings && drawingSets.length > 0) {
    blockers.push({
      type: 'DRAWING_APPROVAL',
      severity: 'CRITICAL',
      message: 'No drawings approved for fabrication (FFF status)',
      responsible: 'Detailing Lead',
      action: 'Approve drawings to FFF status',
      entity_type: 'DrawingSet',
      entity_ids: drawingSets.map(ds => ds.id)
    });
  }
  
  if (openRFIs.length > 0) {
    blockers.push({
      type: 'OPEN_RFI',
      severity: 'HIGH',
      message: `${openRFIs.length} open RFI(s) linked to this work package`,
      responsible: 'RFI Owner',
      action: 'Resolve open RFIs',
      entity_type: 'RFI',
      entity_ids: openRFIs.map(rfi => rfi.id)
    });
  }
  
  if (nextPhase === 'erection') {
    const deliveries = workPackage.linked_delivery_ids?.length
      ? await base44.entities.Delivery.filter({
          id: { $in: workPackage.linked_delivery_ids },
          delivery_status: { $ne: 'received' }
        })
      : [];
    
    if (deliveries.length > 0) {
      blockers.push({
        type: 'DELIVERY_INCOMPLETE',
        severity: 'CRITICAL',
        message: `${deliveries.length} delivery(ies) not received`,
        responsible: 'Logistics Coordinator',
        action: 'Confirm material delivery',
        entity_type: 'Delivery',
        entity_ids: deliveries.map(d => d.id)
      });
    }
  }
  
  return {
    canAdvance: blockers.filter(b => b.severity === 'CRITICAL').length === 0,
    blockers,
    criticalCount: blockers.filter(b => b.severity === 'CRITICAL').length,
    warningCount: blockers.filter(b => b.severity === 'HIGH').length
  };
}

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

    // Use inline validation instead of import (Deno Deploy compatibility)
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