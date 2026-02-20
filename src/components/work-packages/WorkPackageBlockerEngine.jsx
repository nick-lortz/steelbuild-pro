/**
 * WorkPackage Progression Validation Engine
 * 
 * Validates prerequisites before allowing status transitions.
 * Returns blocking conditions with responsible parties and next steps.
 */

export const PHASE_TRANSITIONS = {
  'pre_fab': 'shop',
  'shop': 'delivery',
  'delivery': 'erection',
  'erection': 'punch'
};

export const STATUS_TRANSITIONS = {
  'not_started': 'in_progress',
  'in_progress': 'on_hold',
  'on_hold': 'in_progress',
  'completed': 'closed'
};

/**
 * Validates if WorkPackage can advance to next phase
 */
export async function validatePhaseTransition(workPackage, nextPhase, base44) {
  const blockers = [];
  
  // Check drawing status
  const drawingSets = await base44.entities.DrawingSet.filter({
    id: { $in: workPackage.linked_drawing_set_ids || [] }
  });
  
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
  
  if (drawingSets.length === 0) {
    blockers.push({
      type: 'MISSING_DRAWINGS',
      severity: 'CRITICAL',
      message: 'No drawings linked to this work package',
      responsible: 'Project Manager',
      action: 'Link required drawings',
      entity_type: 'DrawingSet',
      entity_ids: []
    });
  }
  
  // Check open RFIs
  const openRFIs = await base44.entities.RFI.filter({
    id: { $in: workPackage.linked_rfi_ids || [] },
    status: { $in: ['draft', 'submitted', 'under_review', 'reopened'] }
  });
  
  if (openRFIs.length > 0) {
    blockers.push({
      type: 'OPEN_RFI',
      severity: 'HIGH',
      message: `${openRFIs.length} open RFI(s) linked to this work package`,
      responsible: 'RFI Owner',
      action: 'Resolve open RFIs',
      entity_type: 'RFI',
      entity_ids: openRFIs.map(rfi => rfi.id),
      details: openRFIs.map(rfi => `RFI #${rfi.rfi_number}: ${rfi.subject}`)
    });
  }
  
  // Check design intent flags
  const designFlags = await base44.entities.DesignIntentFlag.filter({
    project_id: workPackage.project_id,
    status: { $in: ['flagged', 'pm_review', 'engineer_review'] }
  });
  
  const criticalFlags = designFlags.filter(f => 
    f.requires_PM_approval || f.requires_engineer_review
  );
  
  if (criticalFlags.length > 0) {
    blockers.push({
      type: 'DESIGN_INTENT_CHANGE',
      severity: 'CRITICAL',
      message: `${criticalFlags.length} design change(s) require approval`,
      responsible: criticalFlags[0].requires_engineer_review ? 'Engineer of Record' : 'Project Manager',
      action: 'Review and approve design changes',
      entity_type: 'DesignIntentFlag',
      entity_ids: criticalFlags.map(f => f.id)
    });
  }
  
  // Check fabrication readiness
  if (nextPhase === 'shop') {
    const fabItems = await base44.entities.FabReadinessItem.filter({
      work_package_id: workPackage.id,
      status: 'OPEN',
      severity: 'BLOCKER'
    });
    
    if (fabItems.length > 0) {
      blockers.push({
        type: 'FAB_READINESS',
        severity: 'CRITICAL',
        message: `${fabItems.length} fabrication blocker(s) unresolved`,
        responsible: 'Fabrication Manager',
        action: 'Resolve fabrication readiness items',
        entity_type: 'FabReadinessItem',
        entity_ids: fabItems.map(f => f.id)
      });
    }
  }
  
  // Check delivery prerequisites
  if (nextPhase === 'delivery') {
    const fabRecords = await base44.entities.Fabrication.filter({
      work_package_id: workPackage.id,
      status: { $ne: 'completed' }
    });
    
    if (fabRecords.length > 0) {
      blockers.push({
        type: 'FAB_INCOMPLETE',
        severity: 'CRITICAL',
        message: 'Fabrication not complete',
        responsible: 'Shop Superintendent',
        action: 'Complete fabrication',
        entity_type: 'Fabrication',
        entity_ids: fabRecords.map(f => f.id)
      });
    }
  }
  
  // Check erection prerequisites
  if (nextPhase === 'erection') {
    const deliveries = await base44.entities.Delivery.filter({
      id: { $in: workPackage.linked_delivery_ids || [] },
      delivery_status: { $ne: 'received' }
    });
    
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

/**
 * Get workflow guidance based on current state
 */
export function getWorkflowGuidance(workPackage, validationResult) {
  if (validationResult.canAdvance) {
    return {
      message: 'All prerequisites met - ready to advance',
      type: 'success',
      nextStep: `Advance to ${PHASE_TRANSITIONS[workPackage.phase] || 'next phase'}`
    };
  }
  
  const criticalBlockers = validationResult.blockers.filter(b => b.severity === 'CRITICAL');
  
  if (criticalBlockers.length === 1) {
    const blocker = criticalBlockers[0];
    return {
      message: blocker.message,
      type: 'error',
      nextStep: blocker.action,
      responsible: blocker.responsible,
      entityType: blocker.entity_type,
      entityIds: blocker.entity_ids
    };
  }
  
  return {
    message: `${criticalBlockers.length} critical blockers prevent advancement`,
    type: 'error',
    nextStep: 'Resolve blocking conditions',
    blockers: criticalBlockers
  };
}