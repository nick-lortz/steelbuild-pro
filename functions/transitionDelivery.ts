import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { validateDeliveryTransition } from './_lib/transitionValidation.js';
import { evaluateShipmentGate, evaluateInstallGate } from './_lib/executionGates.js';

/**
 * Enforce legality checks for Delivery status transitions with execution gate controls
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { delivery_id, target_status, override_reason } = await req.json();
    if (!delivery_id || !target_status) {
      return Response.json({ error: 'Missing delivery_id or target_status' }, { status: 400 });
    }

    // Fetch delivery
    const deliveries = await base44.entities.Delivery.filter({ id: delivery_id });
    if (!deliveries.length) return Response.json({ error: 'Delivery not found' }, { status: 404 });
    const delivery = deliveries[0];

    // Verify project access
    const userProjects = user.project_ids || [];
    if (!userProjects.includes(delivery.project_id)) {
      return Response.json({ error: 'Access denied to project' }, { status: 403 });
    }

    // Check execution gates
    const shipStatuses = ['shipped', 'in_transit'];
    const installStatuses = ['arrived_on_site', 'received'];
    let gateEvaluation = null;
    let gateType = null;
    let gateRecord = null;
    
    if (shipStatuses.includes(target_status.toLowerCase())) {
      // Evaluate shipment gate
      const [workPackages, rfis] = await Promise.all([
        base44.asServiceRole.entities.WorkPackage.filter({ 
          id: { $in: delivery.work_package_ids || [] }
        }),
        base44.asServiceRole.entities.RFI.filter({ 
          project_id: delivery.project_id
        })
      ]);
      
      gateEvaluation = evaluateShipmentGate(delivery, workPackages, rfis);
      gateType = 'ship';
      
    } else if (installStatuses.includes(target_status.toLowerCase())) {
      // Evaluate install gate
      const [workPackages, rfis] = await Promise.all([
        base44.asServiceRole.entities.WorkPackage.filter({ 
          id: { $in: delivery.work_package_ids || [] }
        }),
        base44.asServiceRole.entities.RFI.filter({ 
          project_id: delivery.project_id
        })
      ]);
      
      gateEvaluation = evaluateInstallGate(delivery, workPackages, rfis);
      gateType = 'install';
    }
    
    // Handle gate blocking
    if (gateEvaluation && gateType) {
      const canOverride = ['admin', 'project_manager'].includes(user.role);
      
      if (gateEvaluation.gate_status === 'blocked' || gateEvaluation.gate_status === 'conditional') {
        // Check for override
        if (override_reason && canOverride) {
          // Create/update gate with override
          const existingGates = await base44.asServiceRole.entities.ExecutionGate.filter({
            entity_type: 'Delivery',
            entity_id: delivery_id,
            gate_type: gateType
          });
          
          const gateData = {
            project_id: delivery.project_id,
            gate_type: gateType,
            entity_type: 'Delivery',
            entity_id: delivery_id,
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
            project_id: delivery.project_id,
            actor_user_email: user.email,
            entity_type: 'Delivery',
            entity_id: delivery_id,
            entity_display_name: delivery.delivery_number,
            action: 'GATE_OVERRIDE',
            from_status: delivery.delivery_status,
            to_status: target_status,
            blocked_reasons: gateEvaluation.required_actions,
            blocking_entity_ids: gateEvaluation.blockers.map(b => b.entity_id),
            recommendations: [override_reason],
            timestamp: new Date().toISOString(),
            metadata: { gate_type: gateType, override_reason }
          });
          
        } else if (gateEvaluation.gate_status === 'blocked') {
          // HARD BLOCK
          return Response.json({
            ok: false,
            gate_blocked: true,
            gate_type: gateType,
            gate_status: gateEvaluation.gate_status,
            reasons: gateEvaluation.required_actions,
            blockers: gateEvaluation.blockers,
            blocking_entity_ids: gateEvaluation.blockers.map(b => b.entity_id),
            recommendations: gateEvaluation.required_actions,
            can_override: canOverride,
            message: `${gateType.toUpperCase()} gate is BLOCKED. Override required from admin/PM.`
          }, { status: 400 });
        } else if (gateEvaluation.gate_status === 'conditional' && !canOverride) {
          // Conditional but no override permission
          return Response.json({
            ok: false,
            gate_blocked: true,
            gate_type: gateType,
            gate_status: gateEvaluation.gate_status,
            reasons: gateEvaluation.required_actions,
            blockers: gateEvaluation.blockers,
            blocking_entity_ids: gateEvaluation.blockers.map(b => b.entity_id),
            recommendations: gateEvaluation.required_actions,
            can_override: false,
            message: `${gateType.toUpperCase()} gate is CONDITIONAL. Admin/PM approval required.`
          }, { status: 400 });
        }
      }
    }

    // Validate transition (existing logic)
    const validation = await validateDeliveryTransition(delivery, target_status, base44);

    // Record audit event
    const now = new Date().toISOString();
    const auditAction = validation.canTransition ? 'TRANSITION_SUCCESS' : 'TRANSITION_BLOCKED';
    await base44.asServiceRole.entities.AuditEvent.create({
      project_id: delivery.project_id,
      actor_user_email: user.email,
      entity_type: 'Delivery',
      entity_id: delivery_id,
      entity_display_name: delivery.delivery_number,
      action: auditAction,
      from_status: delivery.delivery_status,
      to_status: target_status,
      blocked_reasons: validation.reasons,
      blocking_entity_ids: validation.blockingIds,
      recommendations: validation.recommendations,
      timestamp: now
    });

    // If blocked, persist and return
    if (!validation.canTransition) {
      await base44.asServiceRole.entities.Delivery.update(delivery_id, {
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
        gate_type: gateType,
        gate_status: gateEvaluation?.gate_status,
        gate_blockers: gateEvaluation?.blockers,
        timestamp: now
      }, { status: 400 });
    }
    
    // Update or create execution gate record if not overridden
    if (gateEvaluation && gateType && !gateRecord) {
      const existingGates = await base44.asServiceRole.entities.ExecutionGate.filter({
        entity_type: 'Delivery',
        entity_id: delivery_id,
        gate_type: gateType
      });
      
      const gateData = {
        project_id: delivery.project_id,
        gate_type: gateType,
        entity_type: 'Delivery',
        entity_id: delivery_id,
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

    // Apply transition
    await base44.asServiceRole.entities.Delivery.update(delivery_id, {
      delivery_status: target_status,
      last_transition_attempt_at: now,
      last_transition_attempt_by: user.email,
      last_transition_blocked: false,
      last_transition_block_reasons: [],
      last_transition_blocking_entity_ids: [],
      last_transition_recommendations: []
    });

    return Response.json({
      ok: true,
      delivery_id,
      delivery_number: delivery.delivery_number,
      new_status: target_status,
      timestamp: now
    });

  } catch (error) {
    console.error('Delivery transition error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});