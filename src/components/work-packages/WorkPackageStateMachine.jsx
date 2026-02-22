/**
 * Work Package State Machine
 * Defines states, transitions, and gate logic for work package lifecycle
 */

// States
export const WP_STATES = {
  PLANNING: 'planning',
  DETAILING: 'detailing',
  FABRICATION: 'fabrication',
  DELIVERY: 'delivery',
  ERECTION: 'erection',
  CLOSEOUT: 'closeout',
  COMPLETED: 'completed',
};

// Valid transitions
const TRANSITIONS = {
  [WP_STATES.PLANNING]: [WP_STATES.DETAILING],
  [WP_STATES.DETAILING]: [WP_STATES.FABRICATION],
  [WP_STATES.FABRICATION]: [WP_STATES.DELIVERY],
  [WP_STATES.DELIVERY]: [WP_STATES.ERECTION],
  [WP_STATES.ERECTION]: [WP_STATES.CLOSEOUT],
  [WP_STATES.CLOSEOUT]: [WP_STATES.COMPLETED],
};

/**
 * Gate checks for each transition
 * Returns: { pass: boolean, reasons: string[], required_actions: string[] }
 */
export class WorkPackageStateMachine {
  constructor(base44) {
    this.base44 = base44;
  }

  /**
   * Check if transition is valid
   */
  canTransition(currentState, targetState) {
    const allowed = TRANSITIONS[currentState] || [];
    return allowed.includes(targetState);
  }

  /**
   * Evaluate all gates for a transition
   */
  async evaluateTransition(workPackage, targetState, context = {}) {
    const trace = {
      work_package_id: workPackage.id,
      from_state: workPackage.phase,
      to_state: targetState,
      timestamp: new Date().toISOString(),
      gate_results: [],
      overall_pass: false,
      blocking_reasons: [],
      required_actions: [],
    };

    // Check valid transition
    if (!this.canTransition(workPackage.phase, targetState)) {
      trace.blocking_reasons.push(`Invalid transition: ${workPackage.phase} → ${targetState}`);
      return trace;
    }

    // Run gate checks based on transition
    const gateMethod = `check_${workPackage.phase}_to_${targetState}`;
    if (this[gateMethod]) {
      const gateResult = await this[gateMethod](workPackage, context);
      trace.gate_results.push(gateResult);
      
      if (!gateResult.pass) {
        trace.blocking_reasons.push(...gateResult.reasons);
        trace.required_actions.push(...gateResult.required_actions);
      }
    }

    trace.overall_pass = trace.blocking_reasons.length === 0;
    return trace;
  }

  /**
   * Execute transition (assumes gates passed)
   */
  async executeTransition(workPackage, targetState, context = {}) {
    const trace = await this.evaluateTransition(workPackage, targetState, context);
    
    if (!trace.overall_pass) {
      return {
        success: false,
        trace,
        error: 'Gate checks failed',
      };
    }

    // Update work package
    const updated = await this.base44.asServiceRole.entities.WorkPackage.update(
      workPackage.id,
      { phase: targetState }
    );

    return {
      success: true,
      trace,
      work_package: updated,
    };
  }

  // ========================================
  // GATE CHECKS
  // ========================================

  async check_planning_to_detailing(wp, context) {
    const reasons = [];
    const required_actions = [];

    // Gate: Scope defined
    if (!wp.scope_description || wp.scope_description.trim() === '') {
      reasons.push('Scope description required');
      required_actions.push('Define work package scope');
    }

    // Gate: Project approved
    const project = await this.base44.asServiceRole.entities.Project.filter({ id: wp.project_id });
    if (!project.length || project[0].status === 'on_hold') {
      reasons.push('Project not approved or on hold');
      required_actions.push('Activate project');
    }

    return {
      gate: 'planning_to_detailing',
      pass: reasons.length === 0,
      reasons,
      required_actions,
    };
  }

  async check_detailing_to_fabrication(wp, context) {
    const reasons = [];
    const required_actions = [];

    // Gate: Drawings approved (FFF)
    const drawings = await this.base44.asServiceRole.entities.DrawingSet.filter({
      project_id: wp.project_id,
    });
    const linkedDrawings = drawings.filter(d => 
      wp.linked_drawing_set_ids?.includes(d.id)
    );

    const allFFF = linkedDrawings.every(d => d.status === 'FFF');
    if (linkedDrawings.length === 0) {
      reasons.push('No drawings linked to work package');
      required_actions.push('Link drawing sets');
    } else if (!allFFF) {
      const pending = linkedDrawings.filter(d => d.status !== 'FFF');
      reasons.push(`${pending.length} drawings not FFF: ${pending.map(d => d.set_number).join(', ')}`);
      required_actions.push('Approve drawings to FFF status');
    }

    // Gate: No blocking RFIs
    const rfis = await this.base44.asServiceRole.entities.RFI.filter({
      project_id: wp.project_id,
      fab_blocker: true,
      status: { $in: ['submitted', 'under_review'] },
    });
    const wpRFIs = rfis.filter(r => 
      r.affects_release_group_id === wp.fab_release_group_id
    );
    if (wpRFIs.length > 0) {
      reasons.push(`${wpRFIs.length} blocking RFIs open: ${wpRFIs.map(r => `RFI-${r.rfi_number}`).join(', ')}`);
      required_actions.push('Resolve fabrication blocking RFIs');
    }

    // Gate: Material availability (optional check)
    if (context.check_materials && !wp.materials_available) {
      reasons.push('Materials not available');
      required_actions.push('Confirm material delivery');
    }

    return {
      gate: 'detailing_to_fabrication',
      pass: reasons.length === 0,
      reasons,
      required_actions,
    };
  }

  async check_fabrication_to_delivery(wp, context) {
    const reasons = [];
    const required_actions = [];

    // Gate: Fabrication complete
    const fabPackages = await this.base44.asServiceRole.entities.FabricationPackage.filter({
      work_package_id: wp.id,
    });
    const allComplete = fabPackages.every(f => f.status === 'completed');
    if (fabPackages.length === 0) {
      reasons.push('No fabrication packages created');
      required_actions.push('Create fabrication packages');
    } else if (!allComplete) {
      const incomplete = fabPackages.filter(f => f.status !== 'completed');
      reasons.push(`${incomplete.length} fabrication packages incomplete`);
      required_actions.push('Complete fabrication');
    }

    // Gate: QC inspection passed
    const qcChecklists = await this.base44.asServiceRole.entities.QCChecklist.filter({
      work_package_id: wp.id,
    });
    const qcPassed = qcChecklists.every(q => q.status === 'approved');
    if (qcChecklists.length > 0 && !qcPassed) {
      const failed = qcChecklists.filter(q => q.status !== 'approved');
      reasons.push(`${failed.length} QC checklists not approved`);
      required_actions.push('Complete QC inspections');
    }

    return {
      gate: 'fabrication_to_delivery',
      pass: reasons.length === 0,
      reasons,
      required_actions,
    };
  }

  async check_delivery_to_erection(wp, context) {
    const reasons = [];
    const required_actions = [];

    // Gate: Delivery scheduled/completed
    const deliveries = await this.base44.asServiceRole.entities.Delivery.filter({
      project_id: wp.project_id,
    });
    const wpDeliveries = deliveries.filter(d => 
      d.work_package_id === wp.id
    );
    if (wpDeliveries.length === 0) {
      reasons.push('No deliveries scheduled');
      required_actions.push('Schedule delivery');
    } else {
      const delivered = wpDeliveries.filter(d => 
        d.status === 'delivered' || d.status === 'received'
      );
      if (delivered.length === 0) {
        reasons.push('Material not delivered');
        required_actions.push('Deliver material to site');
      }
    }

    // Gate: Site ready
    const readiness = await this.base44.asServiceRole.entities.ErectionReadiness.filter({
      work_package_id: wp.id,
    });
    if (readiness.length > 0) {
      const latest = readiness[0];
      if (!latest.site_ready) {
        reasons.push('Site not ready for erection');
        required_actions.push('Complete site prep');
      }
      if (!latest.equipment_ready) {
        reasons.push('Equipment not ready');
        required_actions.push('Mobilize equipment');
      }
    }

    // Gate: No blocking constraints
    const constraints = await this.base44.asServiceRole.entities.Constraint.filter({
      work_package_id: wp.id,
      is_active: true,
    });
    const blocking = constraints.filter(c => c.blocks_execution);
    if (blocking.length > 0) {
      reasons.push(`${blocking.length} blocking constraints: ${blocking.map(c => c.description).join(', ')}`);
      required_actions.push('Resolve blocking constraints');
    }

    return {
      gate: 'delivery_to_erection',
      pass: reasons.length === 0,
      reasons,
      required_actions,
    };
  }

  async check_erection_to_closeout(wp, context) {
    const reasons = [];
    const required_actions = [];

    // Gate: Field install complete
    const fieldInstalls = await this.base44.asServiceRole.entities.FieldInstall.filter({
      work_package_id: wp.id,
    });
    const allComplete = fieldInstalls.every(f => f.status === 'completed');
    if (fieldInstalls.length === 0) {
      reasons.push('No field install records');
      required_actions.push('Create field install records');
    } else if (!allComplete) {
      const incomplete = fieldInstalls.filter(f => f.status !== 'completed');
      reasons.push(`${incomplete.length} field installs incomplete`);
      required_actions.push('Complete field erection');
    }

    // Gate: No open punch items
    const punchItems = await this.base44.asServiceRole.entities.PunchItem.filter({
      work_package_id: wp.id,
      status: { $ne: 'completed' },
    });
    if (punchItems.length > 0) {
      reasons.push(`${punchItems.length} open punch items`);
      required_actions.push('Complete punch list');
    }

    return {
      gate: 'erection_to_closeout',
      pass: reasons.length === 0,
      reasons,
      required_actions,
    };
  }

  async check_closeout_to_completed(wp, context) {
    const reasons = [];
    const required_actions = [];

    // Gate: Final documentation submitted
    const docs = await this.base44.asServiceRole.entities.Document.filter({
      project_id: wp.project_id,
    });
    const wpDocs = docs.filter(d => 
      d.tags?.includes('closeout') && d.linked_work_package_ids?.includes(wp.id)
    );
    if (wpDocs.length === 0 && context.require_closeout_docs) {
      reasons.push('No closeout documentation');
      required_actions.push('Submit closeout documents');
    }

    // Gate: Final inspection passed
    if (context.require_final_inspection && !wp.final_inspection_passed) {
      reasons.push('Final inspection not passed');
      required_actions.push('Schedule and pass final inspection');
    }

    // Gate: Client acceptance
    if (context.require_client_acceptance && !wp.client_accepted) {
      reasons.push('Client acceptance pending');
      required_actions.push('Obtain client sign-off');
    }

    return {
      gate: 'closeout_to_completed',
      pass: reasons.length === 0,
      reasons,
      required_actions,
    };
  }
}

/**
 * Helper to get next valid states
 */
export function getNextStates(currentState) {
  return TRANSITIONS[currentState] || [];
}

/**
 * Helper to get state progression path
 */
export function getStatePath(fromState, toState) {
  const path = [];
  let current = fromState;
  
  while (current !== toState) {
    const next = TRANSITIONS[current];
    if (!next || next.length === 0) return null;
    
    current = next[0];
    path.push(current);
    
    if (path.length > 10) return null; // Prevent infinite loop
  }
  
  return path;
}