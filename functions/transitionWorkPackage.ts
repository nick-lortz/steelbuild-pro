import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { validateWPTransition } from './_lib/transitionValidation.js';

/**
 * Enforce legality checks for WorkPackage status transitions
 * Single source of truth for transition enforcement
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { work_package_id, target_status } = await req.json();
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

    // Validate transition
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
        timestamp: now
      }, { status: 400 });
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