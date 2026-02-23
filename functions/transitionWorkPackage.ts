import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { validateWPTransition } from './_lib/transitionValidation.js';
import { evaluateFabricationGate } from './_lib/executionGates.js';

/**
 * Enforce legality checks for WorkPackage status transitions
 * Single source of truth for transition enforcement with execution gate controls
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { work_package_id, target_status, override_reason } = await req.json();
    if (!work_package_id || !target_status) {
      return Response.json({ error: 'Missing work_package_id or target_status' }, { status: 400 });
    }

    // Fetch WP
    const wps = await base44.entities.WorkPackage.filter({ id: work_package_id });
    if (!wps.length) return Response.json({ error: 'Work package not found' }, { status: 404 });
    const wp = wps[0];

    // Verify project access
    const userProjects = user.project_ids || [];
    if (!userProjects.includes(wp.project_id)) {
      return Response.json({ error: 'Access denied to project' }, { status: 403 });
    }

    // Check execution gates for fabrication transitions
    const fabricationStatuses = ['released', 'fabricated'];
    let gateEvaluation = null;
    let gateRecord = null;
    
    if (fabricationStatuses.includes(target_status.toLowerCase())) {
      // Fetch related entities for gate evaluation
      const [rfis, submittals] = await Promise.all([
        base44.asServiceRole.entities.RFI.filter({ 
          project_id: wp.project_id,
          affects_work_package_ids: { $contains: [wp.id] }
        }),
        base44.asServiceRole.entities.Submittal.filter({ 
          project_id: wp.project_id,
          linked_work_package_ids: { $contains: [wp.id] }
        })
      ]);
      
      gateEvaluation = evaluateFabricationGate(wp, rfis, submittals);
      
      // Check if override is allowed
      const canOverride = ['admin', 'project_manager'].includes(user.role);
      
      if (gateEvaluation.gate_status === 'blocked' || gateEvaluation.gate_status === 'conditional') {
        // Check for override
        if (override_reason && canOverride) {
          // Create/update gate with override
          const existingGates = await base44.asServiceRole.entities.ExecutionGate.filter({
            entity_type: 'WorkPackage',
            entity_id: work_package_id,
            gate_type: 'fabricate'
          });
          
          const gateData = {
            project_id: wp.project_id,
            gate_type: 'fabricate',
            entity_type: 'WorkPackage',
            entity_id: work_package_id,
            gate_status: 'approved_override',
            blockers: gateEvaluation.blockers,
            required_actions: gateEvaluation.required_actions,
            approved_override_by: user.email,
            approved_override_at: new Date().toISOString(),
            override_reason: override_reason,
            last_evaluated_at: new Date().toISOString()
          };
          
          if (existingGates.length > 0) {
            await base44.asServiceRole.entities.ExecutionGate.update(existingGates[0].id, gateData);
            gateRecord = existingGates[0].id;
          } else {
            const created = await base44.asServiceRole.entities.ExecutionGate.create(gateData);
            gateRecord = created.id;
          }
          
          // Create audit event for override
          await base44.asServiceRole.entities.AuditEvent.create({
            project_id: wp.project_id,
            actor_user_email: user.email,
            entity_type: 'WorkPackage',
            entity_id: work_package_id,
            entity_display_name: wp.wpid,
            action: 'GATE_OVERRIDE',
            from_status: wp.status,
            to_status: target_status,
            blocked_reasons: gateEvaluation.required_actions,
            blocking_entity_ids: gateEvaluation.blockers.map(b => b.entity_id),
            recommendations: [override_reason],
            timestamp: new Date().toISOString(),
            metadata: { gate_type: 'fabricate', override_reason }
          });
          
        } else if (gateEvaluation.gate_status === 'blocked') {
          // HARD BLOCK - cannot proceed
          return Response.json({
            ok: false,
            gate_blocked: true,
            gate_status: gateEvaluation.gate_status,
            reasons: gateEvaluation.required_actions,
            blockers: gateEvaluation.blockers,
            blocking_entity_ids: gateEvaluation.blockers.map(b => b.entity_id),
            recommendations: gateEvaluation.required_actions,
            can_override: canOverride,
            message: 'Fabrication gate is BLOCKED. Override required from admin/PM.'
          }, { status: 400 });
        } else if (gateEvaluation.gate_status === 'conditional' && !canOverride) {
          // Conditional but no override permission
          return Response.json({
            ok: false,
            gate_blocked: true,
            gate_status: gateEvaluation.gate_status,
            reasons: gateEvaluation.required_actions,
            blockers: gateEvaluation.blockers,
            blocking_entity_ids: gateEvaluation.blockers.map(b => b.entity_id),
            recommendations: gateEvaluation.required_actions,
            can_override: false,
            message: 'Fabrication gate is CONDITIONAL. Admin/PM approval required.'
          }, { status: 400 });
        }
      }
    }

    // Validate transition (existing logic)
    const validation = await validateWPTransition(wp, target_status, base44);

    // Record audit event
    const now = new Date().toISOString();
    const auditAction = validation.canTransition ? 'TRANSITION_SUCCESS' : 'TRANSITION_BLOCKED';
    await base44.asServiceRole.entities.AuditEvent.create({
      project_id: wp.project_id,
      actor_user_email: user.email,
      entity_type: 'WorkPackage',
      entity_id: work_package_id,
      entity_display_name: wp.wpid,
      action: auditAction,
      from_status: wp.status,
      to_status: target_status,
      blocked_reasons: validation.reasons,
      blocking_entity_ids: validation.blockingIds,
      recommendations: validation.recommendations,
      timestamp: now
    });

    // If blocked, persist block info and return
    if (!validation.canTransition) {
      await base44.asServiceRole.entities.WorkPackage.update(work_package_id, {
        last_transition_attempt_at: now,
        last_transition_attempt_by: user.email,
        last_transition_blocked: true,
        last_transition_block_reasons: validation.reasons,
        last_transition_blocking_entity_ids: validation.blockingIds,
        last_transition_recommendations: validation.recommendations
      });

      return Response.json({
        ok: false,
        reasons: validation.reasons,
        blocking_entity_ids: validation.blockingIds,
        recommendations: validation.recommendations,
        gate_status: gateEvaluation?.gate_status,
        gate_blockers: gateEvaluation?.blockers,
        timestamp: now
      }, { status: 400 });
    }
    
    // Update or create execution gate record if not overridden
    if (gateEvaluation && !gateRecord) {
      const existingGates = await base44.asServiceRole.entities.ExecutionGate.filter({
        entity_type: 'WorkPackage',
        entity_id: work_package_id,
        gate_type: 'fabricate'
      });
      
      const gateData = {
        project_id: wp.project_id,
        gate_type: 'fabricate',
        entity_type: 'WorkPackage',
        entity_id: work_package_id,
        gate_status: gateEvaluation.gate_status,
        blockers: gateEvaluation.blockers,
        required_actions: gateEvaluation.required_actions,
        last_evaluated_at: now
      };
      
      if (existingGates.length > 0) {
        await base44.asServiceRole.entities.ExecutionGate.update(existingGates[0].id, gateData);
      } else {
        await base44.asServiceRole.entities.ExecutionGate.create(gateData);
      }
    }

    // Transition is legal - apply it
    await base44.asServiceRole.entities.WorkPackage.update(work_package_id, {
      status: target_status,
      last_transition_attempt_at: now,
      last_transition_attempt_by: user.email,
      last_transition_blocked: false,
      last_transition_block_reasons: [],
      last_transition_blocking_entity_ids: [],
      last_transition_recommendations: []
    });

    return Response.json({
      ok: true,
      work_package_id,
      wpid: wp.wpid,
      new_status: target_status,
      timestamp: now
    });

  } catch (error) {
    console.error('WP transition error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});