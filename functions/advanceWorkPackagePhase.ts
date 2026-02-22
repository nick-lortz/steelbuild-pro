/**
 * ADVANCE WORK PACKAGE PHASE
 * 
 * Canonical API for advancing work package through workflow gates.
 * Enforces all requirements server-side before allowing phase transition.
 * UI must not directly mutate phase/status - only call this function.
 * 
 * Actions:
 * - 'start_detailing' - planning → detailing
 * - 'release_fabrication' - detailing → fabrication
 * - 'start_erection' - fabrication → erection
 * - 'complete' - erection → closeout
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parseInput, requireUser, requireProjectAccess, ok, badRequest, forbidden, serverError, logServiceRoleAccess } from './_lib/guard.js';

Deno.serve(async (req) => {
  try {
    // 1. Parse input
    const { project_id, work_package_id, action, override_reason } = await parseInput(req, {
      project_id: { required: true, type: 'string' },
      work_package_id: { required: true, type: 'string' },
      action: { required: true, type: 'string' }
    });
    
    // 2. Authenticate user
    const user = await requireUser(req);
    const base44 = createClientFromRequest(req);
    
    // 3. Authorize project access
    await requireProjectAccess(user, project_id, base44);
    
    // 4. Fetch work package
    const workPackages = await base44.entities.WorkPackage.filter({ 
      id: work_package_id,
      project_id 
    });
    
    if (!workPackages.length) {
      return notFound('Work package not found');
    }
    
    const workPackage = workPackages[0];
    
    // 5. Get current execution state
    const stateCheck = await fetch(`${req.url.replace(/\/[^/]+$/, '')}/getWorkPackageExecutionState`, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify({ project_id, work_package_id })
    });
    
    if (!stateCheck.ok) {
      return serverError('Failed to check execution state');
    }
    
    const state = await stateCheck.json();
    
    // 6. Validate action is allowed
    const transition = validateTransition(workPackage, action, state.data, user, override_reason);
    
    if (!transition.allowed) {
      return badRequest(transition.reason, { blockers: transition.blockers });
    }
    
    // 7. Apply transition (service role for controlled state change)
    logServiceRoleAccess({
      function_name: 'advanceWorkPackagePhase',
      project_id,
      user_id: user.id,
      user_email: user.email,
      action,
      entity_name: 'WorkPackage',
      reason: `Phase transition: ${action}`
    });
    
    await base44.asServiceRole.entities.WorkPackage.update(work_package_id, {
      phase: transition.new_phase,
      status: transition.new_status,
      phase_advanced_at: new Date().toISOString(),
      phase_advanced_by: user.email
    });
    
    // 8. Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'WorkPackage',
      entity_id: work_package_id,
      action: `phase_advance_${action}`,
      user_email: user.email,
      changes: {
        from_phase: workPackage.phase,
        to_phase: transition.new_phase,
        from_status: workPackage.status,
        to_status: transition.new_status,
        override_reason
      },
      timestamp: new Date().toISOString()
    });
    
    return ok({
      work_package_id,
      previous_phase: workPackage.phase,
      new_phase: transition.new_phase,
      new_status: transition.new_status,
      message: transition.message
    });
    
  } catch (error) {
    if (error.status === 400) return badRequest(error.message);
    if (error.status === 401) return unauthorized(error.message);
    if (error.status === 403) return forbidden(error.message);
    if (error.status === 404) return notFound(error.message);
    return serverError('Failed to advance phase', error);
  }
});

function validateTransition(workPackage, action, executionState, user, override_reason) {
  const currentPhase = workPackage.phase;
  
  // Define valid transitions
  const transitions = {
    start_detailing: {
      from: 'planning',
      to: 'detailing',
      status: 'in_progress',
      gates: [],
      message: 'Detailing phase started'
    },
    release_fabrication: {
      from: 'detailing',
      to: 'fabrication',
      status: 'in_progress',
      gates: ['drawings_approved', 'no_blocking_rfis', 'detailing_complete'],
      message: 'Released to fabrication'
    },
    start_erection: {
      from: 'fabrication',
      to: 'erection',
      status: 'in_progress',
      gates: ['material_available'],
      message: 'Erection started'
    },
    complete: {
      from: 'erection',
      to: 'closeout',
      status: 'completed',
      gates: [],
      message: 'Work package completed'
    }
  };
  
  const transition = transitions[action];
  
  if (!transition) {
    return { allowed: false, reason: `Unknown action: ${action}` };
  }
  
  if (currentPhase !== transition.from) {
    return { 
      allowed: false, 
      reason: `Invalid transition: cannot ${action} from ${currentPhase} phase (must be ${transition.from})` 
    };
  }
  
  // Check gates
  const failedGates = [];
  for (const gate of transition.gates) {
    if (!executionState.gate_status[gate]) {
      failedGates.push(gate);
    }
  }
  
  // Allow admin override with reason
  if (failedGates.length > 0) {
    if (user.role === 'admin' && override_reason) {
      console.log('[PHASE_ADVANCE_OVERRIDE]', {
        user: user.email,
        work_package_id: workPackage.id,
        action,
        failed_gates: failedGates,
        override_reason
      });
    } else {
      return { 
        allowed: false, 
        reason: `Gates not satisfied: ${failedGates.join(', ')}`,
        blockers: executionState.blockers,
        failed_gates: failedGates
      };
    }
  }
  
  return {
    allowed: true,
    new_phase: transition.to,
    new_status: transition.status,
    message: transition.message
  };
}