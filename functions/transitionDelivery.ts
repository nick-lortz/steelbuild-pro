import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { validateDeliveryTransition } from './_lib/transitionValidation.js';

/**
 * Enforce legality checks for Delivery status transitions
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { delivery_id, target_status } = await req.json();
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

    // Validate transition
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
        timestamp: now
      }, { status: 400 });
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