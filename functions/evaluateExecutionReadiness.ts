import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * EXECUTION INTELLIGENCE ENGINE
 * Autonomous evaluation of fabrication, shipment, and install readiness
 * Gates execution based on approval status, VIF, coordination, and sequencing
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      project_id, 
      source_entity_type, 
      source_entity_id,
      execution_gate 
    } = await req.json();

    if (!project_id || !source_entity_type || !source_entity_id) {
      return Response.json({ 
        error: 'project_id, source_entity_type, source_entity_id required' 
      }, { status: 400 });
    }

    // Fetch source entity
    const entities = await base44.asServiceRole.entities[source_entity_type].filter({ id: source_entity_id });
    if (!entities.length) {
      return Response.json({ error: 'Source entity not found' }, { status: 404 });
    }
    const sourceEntity = entities[0];

    // Fetch execution context
    const [rfis, submittals, deliveries, tasks] = await Promise.all([
      base44.asServiceRole.entities.RFI.filter({ 
        project_id, 
        status: { $in: ['draft', 'internal_review', 'submitted', 'under_review'] }
      }),
      base44.asServiceRole.entities.Submittal.filter({ 
        project_id, 
        status: { $in: ['draft', 'submitted', 'under_review'] }
      }),
      base44.asServiceRole.entities.Delivery.filter({ project_id }),
      base44.asServiceRole.entities.Task.filter({ project_id })
    ]);

    // EVALUATION LOGIC
    const evaluation = await evaluateGate(
      execution_gate || inferGate(sourceEntity),
      sourceEntity,
      { rfis, submittals, deliveries, tasks }
    );

    // Create or update ExecutionTask
    const existingTasks = await base44.asServiceRole.entities.ExecutionTask.filter({
      project_id,
      source_entity_type,
      source_entity_id
    });

    const taskData = {
      project_id,
      source_entity_type,
      source_entity_id,
      execution_gate: evaluation.gate,
      readiness_status: evaluation.readiness_status,
      blocking_dependencies: evaluation.blocking_dependencies,
      downstream_impact: evaluation.downstream_impact,
      risk_score: evaluation.risk_score,
      recommended_action: evaluation.recommended_action,
      ai_reasoning: evaluation.ai_reasoning,
      execution_date: evaluation.execution_date,
      days_until_execution: evaluation.days_until_execution,
      lookahead_window: evaluation.days_until_execution <= 14 && evaluation.days_until_execution >= 0,
      install_readiness_score: evaluation.install_readiness_score,
      approval_status: evaluation.approval_status,
      vif_status: evaluation.vif_status,
      coordination_status: evaluation.coordination_status,
      sequence_alignment: evaluation.sequence_alignment,
      field_constraints_resolved: evaluation.field_constraints_resolved,
      shop_labor_risk: evaluation.shop_labor_risk,
      field_productivity_risk: evaluation.field_productivity_risk,
      schedule_float_impact: evaluation.schedule_float_impact,
      margin_impact_dollars: evaluation.margin_impact_dollars,
      required_gc_actions: evaluation.required_gc_actions,
      last_evaluated_at: new Date().toISOString()
    };

    let executionTask;
    if (existingTasks.length > 0) {
      const stateChanged = existingTasks[0].readiness_status !== evaluation.readiness_status;
      if (stateChanged) {
        taskData.state_history = [
          ...(existingTasks[0].state_history || []),
          {
            from_state: existingTasks[0].readiness_status,
            to_state: evaluation.readiness_status,
            timestamp: new Date().toISOString(),
            reason: evaluation.ai_reasoning
          }
        ];
      }
      executionTask = await base44.asServiceRole.entities.ExecutionTask.update(existingTasks[0].id, taskData);
    } else {
      executionTask = await base44.asServiceRole.entities.ExecutionTask.create(taskData);
    }

    // Update source entity with execution recommendation
    if (source_entity_type === 'WorkPackage') {
      await base44.asServiceRole.entities.WorkPackage.update(source_entity_id, {
        install_readiness_score: evaluation.install_readiness_score,
        execution_recommendation: evaluation.recommended_action,
        execution_reasoning: evaluation.ai_reasoning
      });
    }

    return Response.json({
      success: true,
      execution_task: executionTask,
      evaluation
    });

  } catch (error) {
    console.error('[evaluateExecutionReadiness] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function inferGate(entity) {
  if (entity.phase === 'shop') return 'Fabricate';
  if (entity.phase === 'delivery') return 'Ship';
  if (entity.phase === 'erection') return 'Install';
  return 'Approve';
}

async function evaluateGate(gate, entity, context) {
  const now = new Date();
  const executionDate = entity.install_day || entity.scheduled_date || entity.target_date;
  const daysUntil = executionDate 
    ? Math.ceil((new Date(executionDate) - now) / (1000 * 60 * 60 * 24))
    : 999;

  switch (gate) {
    case 'Fabricate':
      return evaluateFabricateGate(entity, context, daysUntil);
    case 'Ship':
      return evaluateShipGate(entity, context, daysUntil);
    case 'Install':
      return evaluateInstallGate(entity, context, daysUntil);
    default:
      return evaluateApproveGate(entity, context, daysUntil);
  }
}

function evaluateFabricateGate(entity, context, daysUntil) {
  const blockers = [];
  let score = 100;
  let approvalStatus = 'complete';
  let vifStatus = 'confirmed';
  let coordinationStatus = 'complete';
  const requiredGCActions = [];

  // Check VIF
  if (!entity.vif_confirmed) {
    blockers.push({
      entity_type: 'WorkPackage',
      entity_id: entity.id,
      blocker_type: 'VIF_INCOMPLETE',
      description: 'VIF not confirmed - field verification required before fabrication'
    });
    vifStatus = 'missing';
    score -= 30;
    requiredGCActions.push('Complete VIF for embed locations and panel orientations');
  }

  // Check open blocking RFIs
  const blockingRFIs = context.rfis.filter(rfi => 
    rfi.is_release_blocker && 
    (rfi.affects_release_group_id === entity.id || rfi.impacted_by_rfi_ids?.includes(entity.id))
  );

  if (blockingRFIs.length > 0) {
    blockingRFIs.forEach(rfi => {
      blockers.push({
        entity_type: 'RFI',
        entity_id: rfi.id,
        blocker_type: 'RELEASE_BLOCKER',
        description: `RFI ${rfi.rfi_number}: ${rfi.subject} blocks fabrication release`
      });
    });
    coordinationStatus = 'incomplete';
    approvalStatus = 'pending';
    score -= blockingRFIs.length * 25;
    requiredGCActions.push(`Resolve ${blockingRFIs.length} blocking RFIs before fabrication`);
  }

  // Check connection geometry
  if (entity.open_rfi_ids?.length > 0) {
    const coordRFIs = context.rfis.filter(rfi => 
      entity.open_rfi_ids.includes(rfi.id) && 
      ['connection_detail', 'member_size_length'].includes(rfi.rfi_type)
    );
    if (coordRFIs.length > 0) {
      coordinationStatus = 'partial';
      score -= 15;
    }
  }

  const readinessStatus = score >= 90 ? 'Ready' : score >= 70 ? 'Conditional' : 'Blocked';
  const recommendedAction = score >= 90 ? 'Release' : score >= 70 ? 'Verify' : 'Hold';

  return {
    gate: 'Fabricate',
    readiness_status: readinessStatus,
    blocking_dependencies: blockers,
    downstream_impact: blockers.length > 0 ? ['Fabrication', 'Schedule', 'Margin'] : [],
    risk_score: 100 - score,
    recommended_action: recommendedAction,
    ai_reasoning: generateReasoning('Fabricate', blockers, score, daysUntil),
    execution_date: entity.target_date,
    days_until_execution: daysUntil,
    install_readiness_score: score,
    approval_status: approvalStatus,
    vif_status: vifStatus,
    coordination_status: coordinationStatus,
    sequence_alignment: true,
    field_constraints_resolved: entity.vif_confirmed || false,
    shop_labor_risk: blockers.length > 2 ? 'high' : blockers.length > 0 ? 'medium' : 'none',
    field_productivity_risk: 'none',
    schedule_float_impact: blockers.length * 3,
    margin_impact_dollars: blockers.length * 5000,
    required_gc_actions: requiredGCActions
  };
}

function evaluateShipGate(entity, context, daysUntil) {
  const blockers = [];
  let score = 100;

  // Check load sequencing
  if (!entity.load_list_verified) {
    blockers.push({
      entity_type: 'Delivery',
      entity_id: entity.id,
      blocker_type: 'LOAD_SEQUENCE',
      description: 'Load list not verified against install sequence'
    });
    score -= 25;
  }

  // Check staging confirmation
  if (!entity.staged_confirmed) {
    blockers.push({
      entity_type: 'Delivery',
      entity_id: entity.id,
      blocker_type: 'STAGING',
      description: 'Staging location not confirmed'
    });
    score -= 20;
  }

  // Check sequencing validity
  if (!entity.sequencing_valid) {
    blockers.push({
      entity_type: 'Delivery',
      entity_id: entity.id,
      blocker_type: 'SEQUENCE_INVALID',
      description: 'Delivery sequencing conflicts with erection sequence'
    });
    score -= 30;
  }

  // Check field crane/rigging
  if (!entity.field_constraints_resolved) {
    blockers.push({
      entity_type: 'Delivery',
      entity_id: entity.id,
      blocker_type: 'FIELD_ACCESS',
      description: 'Crane placement or rigging path not verified'
    });
    score -= 25;
  }

  const readinessStatus = score >= 90 ? 'Ready' : score >= 70 ? 'Conditional' : 'Blocked';
  const recommendedAction = score >= 90 ? 'Release' : score >= 70 ? 'Verify' : 'Hold';

  return {
    gate: 'Ship',
    readiness_status: readinessStatus,
    blocking_dependencies: blockers,
    downstream_impact: blockers.length > 0 ? ['Shipment', 'Install', 'Schedule'] : [],
    risk_score: 100 - score,
    recommended_action: recommendedAction,
    ai_reasoning: generateReasoning('Ship', blockers, score, daysUntil),
    execution_date: entity.scheduled_date || entity.install_day,
    days_until_execution: daysUntil,
    install_readiness_score: score,
    approval_status: 'complete',
    vif_status: 'confirmed',
    coordination_status: entity.sequencing_valid ? 'complete' : 'partial',
    sequence_alignment: entity.sequencing_valid || false,
    field_constraints_resolved: entity.field_constraints_resolved || false,
    shop_labor_risk: 'none',
    field_productivity_risk: blockers.length > 0 ? 'high' : 'none',
    schedule_float_impact: blockers.length * 2,
    margin_impact_dollars: blockers.length * 8000,
    required_gc_actions: []
  };
}

function evaluateInstallGate(entity, context, daysUntil) {
  const blockers = [];
  let score = 100;
  let approvalStatus = 'complete';
  let vifStatus = 'confirmed';
  const requiredGCActions = [];

  // Check delivery alignment
  const wpDeliveries = context.deliveries.filter(d => 
    d.work_package_ids?.includes(entity.id)
  );
  const deliveryMisaligned = wpDeliveries.some(d => 
    !d.staged_confirmed || !d.sequencing_valid
  );
  
  if (deliveryMisaligned) {
    blockers.push({
      entity_type: 'Delivery',
      entity_id: wpDeliveries[0]?.id,
      blocker_type: 'DELIVERY_NOT_READY',
      description: 'Material not staged or sequencing invalid'
    });
    score -= 30;
  }

  // Check install-blocking RFIs
  const installRFIs = context.rfis.filter(rfi => 
    rfi.is_install_blocker && rfi.affects_work_package_ids?.includes(entity.id)
  );

  if (installRFIs.length > 0) {
    installRFIs.forEach(rfi => {
      blockers.push({
        entity_type: 'RFI',
        entity_id: rfi.id,
        blocker_type: 'INSTALL_BLOCKER',
        description: `RFI ${rfi.rfi_number}: ${rfi.subject} blocks field install`
      });
    });
    approvalStatus = 'pending';
    score -= installRFIs.length * 25;
    requiredGCActions.push(`Resolve ${installRFIs.length} install-blocking RFIs`);
  }

  // Check VIF
  if (!entity.vif_confirmed) {
    blockers.push({
      entity_type: 'WorkPackage',
      entity_id: entity.id,
      blocker_type: 'VIF_INCOMPLETE',
      description: 'Field VIF not confirmed'
    });
    vifStatus = 'missing';
    score -= 20;
    requiredGCActions.push('Complete field VIF before erection');
  }

  const readinessStatus = score >= 90 ? 'Ready' : score >= 70 ? 'Conditional' : 'Blocked';
  const recommendedAction = score >= 90 ? 'Release' : score >= 70 ? 'Verify' : 'Hold';

  return {
    gate: 'Install',
    readiness_status: readinessStatus,
    blocking_dependencies: blockers,
    downstream_impact: blockers.length > 0 ? ['Install', 'Schedule', 'Labor', 'Margin'] : [],
    risk_score: 100 - score,
    recommended_action: recommendedAction,
    ai_reasoning: generateReasoning('Install', blockers, score, daysUntil),
    execution_date: entity.install_day || entity.target_date,
    days_until_execution: daysUntil,
    install_readiness_score: score,
    approval_status: approvalStatus,
    vif_status: vifStatus,
    coordination_status: blockers.length === 0 ? 'complete' : 'partial',
    sequence_alignment: !deliveryMisaligned,
    field_constraints_resolved: entity.vif_confirmed && !deliveryMisaligned,
    shop_labor_risk: 'none',
    field_productivity_risk: blockers.length > 1 ? 'high' : blockers.length > 0 ? 'medium' : 'none',
    schedule_float_impact: blockers.length * 4,
    margin_impact_dollars: blockers.length * 12000,
    required_gc_actions: requiredGCActions
  };
}

function evaluateApproveGate(entity, context, daysUntil) {
  return {
    gate: 'Approve',
    readiness_status: 'Evaluating',
    blocking_dependencies: [],
    downstream_impact: [],
    risk_score: 0,
    recommended_action: 'Monitor',
    ai_reasoning: 'Approval gate evaluation not yet implemented',
    execution_date: null,
    days_until_execution: daysUntil,
    install_readiness_score: 0,
    approval_status: 'pending',
    vif_status: 'pending',
    coordination_status: 'incomplete',
    sequence_alignment: false,
    field_constraints_resolved: false,
    shop_labor_risk: 'none',
    field_productivity_risk: 'none',
    schedule_float_impact: 0,
    margin_impact_dollars: 0,
    required_gc_actions: []
  };
}

function generateReasoning(gate, blockers, score, daysUntil) {
  if (blockers.length === 0) {
    return `${gate} gate ready. All prerequisites met. Safe to proceed.`;
  }

  const blockerSummary = blockers.map(b => b.blocker_type).join(', ');
  const urgency = daysUntil <= 7 ? 'URGENT: ' : daysUntil <= 14 ? 'Critical: ' : '';
  
  if (score < 70) {
    return `${urgency}${gate} gate BLOCKED. ${blockers.length} critical issues: ${blockerSummary}. Do not proceed. Resolve blockers immediately.`;
  }
  
  return `${urgency}${gate} gate CONDITIONAL. ${blockers.length} issues require verification: ${blockerSummary}. Verify resolution before proceeding.`;
}