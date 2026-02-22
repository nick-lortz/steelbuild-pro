/**
 * GET WORK PACKAGE EXECUTION STATE
 * 
 * Canonical API for checking work package readiness and blockers.
 * UI must call this to determine what's blocking progress and what's next.
 * 
 * Returns:
 * - current_phase
 * - blockers (array of blocking issues)
 * - next_actions (what needs to happen to advance)
 * - gate_status (which gates are passed/failed)
 * - readiness_score (0-100)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parseInput, requireUser, requireProjectAccess, ok, badRequest, forbidden, serverError } from './_lib/guard.js';

Deno.serve(async (req) => {
  try {
    // 1. Parse input
    const { project_id, work_package_id } = await parseInput(req, {
      project_id: { required: true, type: 'string' },
      work_package_id: { required: true, type: 'string' }
    });
    
    // 2. Authenticate user
    const user = await requireUser(req);
    const base44 = createClientFromRequest(req);
    
    // 3. Authorize project access
    await requireProjectAccess(user, project_id, base44);
    
    // 4. Fetch work package (user-scoped, RLS enforced)
    const workPackages = await base44.entities.WorkPackage.filter({ 
      id: work_package_id,
      project_id 
    });
    
    if (!workPackages.length) {
      return notFound('Work package not found');
    }
    
    const workPackage = workPackages[0];
    
    // 5. Evaluate execution state
    const state = await evaluateExecutionState(base44, project_id, work_package);
    
    return ok(state);
    
  } catch (error) {
    if (error.status === 400) return badRequest(error.message);
    if (error.status === 401) return unauthorized(error.message);
    if (error.status === 403) return forbidden(error.message);
    if (error.status === 404) return notFound(error.message);
    return serverError('Failed to get execution state', error);
  }
});

async function evaluateExecutionState(base44, project_id, workPackage) {
  const blockers = [];
  const next_actions = [];
  const gate_status = {};
  
  // Gate 1: Drawings approved (FFF status)
  const drawingSets = await base44.entities.DrawingSet.filter({
    project_id,
    id: { $in: workPackage.linked_drawing_set_ids || [] }
  });
  
  const drawingsApproved = drawingSets.every(ds => ds.status === 'FFF');
  gate_status.drawings_approved = drawingsApproved;
  
  if (!drawingsApproved) {
    blockers.push({
      type: 'drawings',
      severity: 'high',
      message: 'Drawings not approved (FFF required)',
      count: drawingSets.filter(ds => ds.status !== 'FFF').length
    });
    next_actions.push('Get remaining drawings to FFF status');
  }
  
  // Gate 2: No blocking RFIs
  const openRFIs = await base44.entities.RFI.filter({
    project_id,
    linked_work_package_ids: { $contains: workPackage.id },
    status: { $in: ['draft', 'submitted', 'under_review'] }
  });
  
  const blockingRFIs = openRFIs.filter(rfi => 
    rfi.blocker_info?.is_blocker && 
    rfi.blocker_info?.blocked_work === 'fabrication'
  );
  
  gate_status.no_blocking_rfis = blockingRFIs.length === 0;
  
  if (blockingRFIs.length > 0) {
    blockers.push({
      type: 'rfis',
      severity: 'critical',
      message: `${blockingRFIs.length} blocking RFI(s) open`,
      rfi_ids: blockingRFIs.map(r => r.id)
    });
    next_actions.push('Resolve blocking RFIs');
  }
  
  // Gate 3: Detailing complete
  const detailingComplete = workPackage.detailing_status === 'complete';
  gate_status.detailing_complete = detailingComplete;
  
  if (!detailingComplete) {
    blockers.push({
      type: 'detailing',
      severity: 'high',
      message: 'Detailing not complete'
    });
    next_actions.push('Complete detailing work');
  }
  
  // Gate 4: Material available (for erection phase)
  if (workPackage.phase === 'erection') {
    const deliveries = await base44.entities.Delivery.filter({
      project_id,
      linked_work_package_ids: { $contains: workPackage.id },
      status: { $in: ['delivered', 'received'] }
    });
    
    const materialAvailable = deliveries.length > 0;
    gate_status.material_available = materialAvailable;
    
    if (!materialAvailable) {
      blockers.push({
        type: 'material',
        severity: 'critical',
        message: 'No material deliveries received'
      });
      next_actions.push('Wait for material delivery');
    }
  }
  
  // Calculate readiness score
  const gates = Object.values(gate_status);
  const passedGates = gates.filter(Boolean).length;
  const readiness_score = gates.length > 0 
    ? Math.round((passedGates / gates.length) * 100) 
    : 0;
  
  // Determine what's next based on phase
  const phase_guidance = getPhaseGuidance(workPackage.phase, gate_status);
  
  return {
    work_package_id: workPackage.id,
    current_phase: workPackage.phase,
    current_status: workPackage.status,
    blockers,
    next_actions: next_actions.length > 0 ? next_actions : phase_guidance.actions,
    gate_status,
    readiness_score,
    can_advance: blockers.length === 0,
    phase_guidance
  };
}

function getPhaseGuidance(phase, gate_status) {
  const guidance = {
    planning: {
      description: 'Initial planning and setup',
      actions: ['Upload scope letter', 'Create initial task list', 'Assign project team']
    },
    detailing: {
      description: 'Detailing and engineering',
      actions: ['Complete shop drawings', 'Submit for approval', 'Address RFIs']
    },
    fabrication: {
      description: 'Fabrication and manufacturing',
      actions: ['Release to fabrication', 'Track shop progress', 'Schedule QC']
    },
    erection: {
      description: 'Field erection and installation',
      actions: ['Coordinate delivery', 'Execute erection sequence', 'Daily progress tracking']
    },
    closeout: {
      description: 'Project closeout',
      actions: ['Final inspection', 'Close punch list', 'Submit as-builts']
    }
  };
  
  return guidance[phase] || { description: 'Unknown phase', actions: [] };
}