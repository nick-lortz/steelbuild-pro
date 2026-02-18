import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';
import { requireRole } from './_lib/authz.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { work_package_id, approval_notes } = await req.json();
    
    if (!work_package_id || !approval_notes) {
      return Response.json({ error: 'work_package_id and approval_notes required' }, { status: 400 });
    }

    // Get work package
    const workPackages = await base44.asServiceRole.entities.WorkPackage.filter({ id: work_package_id });
    const workPackage = workPackages[0];
    
    if (!workPackage) {
      return Response.json({ error: 'Work package not found' }, { status: 404 });
    }
    
    // PM override requires PM or Admin role
    requireRole(user, ['admin', 'pm']);
    await requireProjectAccess(base44, user, workPackage.project_id, 'edit');

    // Get current permission
    const permissions = await base44.asServiceRole.entities.ExecutionPermission.filter({
      work_package_id
    });
    
    if (permissions.length === 0) {
      return Response.json({ 
        error: 'No execution permission found. Run setExecutionPermission first.' 
      }, { status: 400 });
    }

    const permission = permissions[0];
    
    // Get linked risk assessment
    const assessments = await base44.asServiceRole.entities.MarginRiskAssessment.filter({
      id: permission.linked_margin_risk_assessment_id
    });
    const assessment = assessments[0];

    // Build override log entry
    const overrideEntry = {
      user_id: user.email,
      timestamp: new Date().toISOString(),
      overridden_risk_score: assessment?.risk_score || 0,
      notes: approval_notes,
      previous_status: permission.permission_status,
      new_status: 'RELEASED'
    };

    // Append to override log
    const updatedLog = [...(permission.override_log || []), overrideEntry];

    // Update permission to RELEASED
    await base44.asServiceRole.entities.ExecutionPermission.update(permission.id, {
      permission_status: 'RELEASED',
      approved_by_user_id: user.email,
      approval_timestamp: new Date().toISOString(),
      approval_notes,
      override_log: updatedLog
    });

    // Create notification for risk override
    await base44.asServiceRole.entities.Notification.create({
      user_email: user.email,
      type: 'approval',
      title: `Execution Permission Override: ${workPackage.package_number}`,
      message: `PM ${user.full_name || user.email} overrode ${permission.permission_status} (Risk Score: ${assessment?.risk_score || 0}). Reason: ${approval_notes}`,
      priority: 'high',
      project_id: workPackage.project_id,
      related_entity_type: 'WorkPackage',
      related_entity_id: work_package_id,
      is_read: false
    });

    return Response.json({
      success: true,
      permission_id: permission.id,
      permission_status: 'RELEASED',
      overridden_by: user.email,
      override_timestamp: overrideEntry.timestamp,
      previous_risk_score: assessment?.risk_score || 0
    });

  } catch (error) {
    console.error('Override permission error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});