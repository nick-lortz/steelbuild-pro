import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { decision_id, action, reason, override_reason } = await req.json();
    
    if (!decision_id || !action || !['approve', 'reject', 'override'].includes(action)) {
      return Response.json({ error: 'decision_id and valid action required' }, { status: 400 });
    }

    // Fetch decision
    const decisions = await base44.asServiceRole.entities.ApprovalGateDecision.filter({ id: decision_id });
    const decision = decisions[0];
    
    if (!decision) {
      return Response.json({ error: 'Decision not found' }, { status: 404 });
    }

    if (decision.status !== 'pending') {
      return Response.json({ error: 'Decision already processed' }, { status: 400 });
    }

    // Fetch rule to check permissions
    const rules = await base44.asServiceRole.entities.ApprovalGateRule.filter({ id: decision.rule_id });
    const rule = rules[0];
    
    if (!rule) {
      return Response.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Check if user has required role
    const requiredRoles = rule.required_approver_roles || [];
    const userRole = user.role;
    
    // Map user.role to approver roles
    const roleMap = {
      'admin': ['admin', 'Exec', 'PM', 'DetailingLead', 'Estimating'],
      'user': ['PM', 'DetailingLead']
    };
    
    const userApproverRoles = roleMap[userRole] || [];
    const hasPermission = requiredRoles.some(r => userApproverRoles.includes(r));

    if (!hasPermission && action !== 'override') {
      return Response.json({ 
        error: 'Insufficient permissions',
        required_roles: requiredRoles,
        user_role: userRole
      }, { status: 403 });
    }

    // Override requires Exec role
    if (action === 'override' && !userApproverRoles.includes('Exec')) {
      return Response.json({ error: 'Override requires Exec role' }, { status: 403 });
    }

    if (action === 'override' && !override_reason) {
      return Response.json({ error: 'override_reason required for override action' }, { status: 400 });
    }

    // Build audit trail entry
    const auditTrail = JSON.parse(decision.audit_trail_json || '[]');
    auditTrail.push({
      timestamp: new Date().toISOString(),
      user: user.email,
      action,
      reason: reason || override_reason,
      previous_status: decision.status
    });

    // Update decision
    const newStatus = action === 'override' ? 'overridden' : action === 'approve' ? 'approved' : 'rejected';
    
    await base44.asServiceRole.entities.ApprovalGateDecision.update(decision_id, {
      status: newStatus,
      decided_by: user.email,
      decided_at: new Date().toISOString(),
      decision_reason: reason,
      override_reason: action === 'override' ? override_reason : null,
      audit_trail_json: JSON.stringify(auditTrail)
    });

    return Response.json({
      success: true,
      decision_id,
      new_status: newStatus,
      decided_by: user.email
    });

  } catch (error) {
    console.error('Approval error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});