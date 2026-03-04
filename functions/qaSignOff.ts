/**
 * qaSignOff — QA Review Sign-off Endpoint
 * =========================================
 * Manages the sign-off flow for financial QA review items.
 * Roles: estimator → project_manager → finance (all three required to lock).
 * Locking is irreversible via this endpoint; only admin can unlock.
 *
 * POST { action, qa_item_id, role, notes?, admin_unlock? }
 *   action: 'sign_off' | 'reject' | 'unlock'
 *   role:   'estimator' | 'project_manager' | 'finance'
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const REQUIRED_ROLES = ['estimator', 'project_manager', 'finance'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, qa_item_id, role, notes = '' } = await req.json();
    if (!qa_item_id || !action) return Response.json({ error: 'qa_item_id and action required' }, { status: 400 });

    const items = await base44.asServiceRole.entities.PMControlEntry.filter({ id: qa_item_id });
    const item  = items[0];
    if (!item) return Response.json({ error: 'QA item not found' }, { status: 404 });

    // ── Unlock (admin only) ────────────────────────────────────────────────
    if (action === 'unlock') {
      if (user.role !== 'admin') return Response.json({ error: 'Only admin can unlock a signed-off record.' }, { status: 403 });
      await base44.asServiceRole.entities.PMControlEntry.update(qa_item_id, {
        locked: false,
        unlocked_by: user.email,
        unlocked_at: new Date().toISOString(),
        status: 'in_review',
      });
      await base44.asServiceRole.entities.AuditEvent.create({
        entity_type: 'PMControlEntry', entity_id: qa_item_id,
        action: 'unlocked', performed_by: user.email, performed_at: new Date().toISOString(),
        notes: notes || 'Admin unlocked for revision.',
      });
      return Response.json({ success: true, message: 'Record unlocked for revision.' });
    }

    // ── Reject ─────────────────────────────────────────────────────────────
    if (action === 'reject') {
      if (!notes) return Response.json({ error: 'Rejection reason (notes) required.' }, { status: 400 });
      const existing = (item.signoffs || []).filter(s => s.role !== role);
      await base44.asServiceRole.entities.PMControlEntry.update(qa_item_id, {
        status: 'rejected',
        signoffs: existing,
        rejection_reason: notes,
        rejected_by: user.email,
        rejected_at: new Date().toISOString(),
      });
      await base44.asServiceRole.entities.AuditEvent.create({
        entity_type: 'PMControlEntry', entity_id: qa_item_id,
        action: 'rejected', performed_by: user.email, performed_at: new Date().toISOString(), notes,
      });
      return Response.json({ success: true, message: 'QA item rejected. Review required.' });
    }

    // ── Sign-off ────────────────────────────────────────────────────────────
    if (action === 'sign_off') {
      if (!role || !REQUIRED_ROLES.includes(role)) {
        return Response.json({ error: `role must be one of: ${REQUIRED_ROLES.join(', ')}` }, { status: 400 });
      }
      if (item.locked) return Response.json({ error: 'Record is locked. Contact admin to unlock.' }, { status: 409 });

      const signoffs = item.signoffs || [];
      // Remove any prior sign-off for this role, then add new
      const updated = signoffs.filter(s => s.role !== role).concat([{
        role, signed_by: user.email, signed_at: new Date().toISOString(), notes,
      }]);

      const completedRoles = updated.map(s => s.role);
      const allSigned = REQUIRED_ROLES.every(r => completedRoles.includes(r));
      const newStatus = allSigned ? 'approved' : 'in_review';

      await base44.asServiceRole.entities.PMControlEntry.update(qa_item_id, {
        signoffs: updated,
        status: newStatus,
        locked: allSigned,
        locked_at: allSigned ? new Date().toISOString() : null,
        locked_by: allSigned ? user.email : null,
      });

      await base44.asServiceRole.entities.AuditEvent.create({
        entity_type: 'PMControlEntry', entity_id: qa_item_id,
        action: `signed_off_as_${role}`,
        performed_by: user.email, performed_at: new Date().toISOString(), notes,
      });

      if (allSigned) {
        // Lock associated AuditFindings
        const findings = await base44.asServiceRole.entities.AuditFinding.filter({ audit_run_id: item.audit_run_id });
        await Promise.all(findings.map(f => base44.asServiceRole.entities.AuditFinding.update(f.id, { status: 'resolved', resolved_by: user.email, resolved_at: new Date().toISOString() })));
      }

      return Response.json({
        success: true,
        locked: allSigned,
        completed_roles: completedRoles,
        remaining_roles: REQUIRED_ROLES.filter(r => !completedRoles.includes(r)),
        message: allSigned
          ? '✓ All roles signed off. Record is now locked and audit-complete.'
          : `Sign-off recorded for ${role}. Awaiting: ${REQUIRED_ROLES.filter(r => !completedRoles.includes(r)).join(', ')}.`,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    console.error('qaSignOff error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});