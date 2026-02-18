import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { work_package_id } = await req.json();
    
    if (!work_package_id) {
      return Response.json({ error: 'work_package_id required' }, { status: 400 });
    }

    // Get work package
    const workPackages = await base44.asServiceRole.entities.WorkPackage.filter({ id: work_package_id });
    const workPackage = workPackages[0];
    
    if (!workPackage) {
      return Response.json({ error: 'Work package not found' }, { status: 404 });
    }
    
    await requireProjectAccess(base44, user, workPackage.project_id);

    // Get latest margin risk assessment
    const assessments = await base44.asServiceRole.entities.MarginRiskAssessment.filter(
      { work_package_id },
      '-assessment_timestamp',
      1
    );
    
    if (assessments.length === 0) {
      return Response.json({ 
        error: 'No risk assessment found. Run evaluateWorkPackageExecutionRisk first.' 
      }, { status: 400 });
    }

    const assessment = assessments[0];

    // Determine permission status based on risk assessment
    let permissionStatus, blockingReason;

    if (assessment.risk_level === 'CRITICAL') {
      permissionStatus = 'BLOCKED';
      blockingReason = `Critical risk score ${assessment.risk_score}. Drivers: ${assessment.drivers.join(', ')}`;
    } else if (assessment.design_intent_change_flag) {
      permissionStatus = 'ENGINEER_REVIEW_REQUIRED';
      blockingReason = 'Design intent changes pending approval';
    } else if (assessment.risk_level === 'HIGH') {
      permissionStatus = 'PM_APPROVAL_REQUIRED';
      blockingReason = `High risk score ${assessment.risk_score}. Drivers: ${assessment.drivers.join(', ')}`;
    } else {
      permissionStatus = 'RELEASED';
      blockingReason = null;
    }

    // Create or update ExecutionPermission
    const existingPermissions = await base44.asServiceRole.entities.ExecutionPermission.filter({
      work_package_id
    });

    let permission;
    if (existingPermissions.length > 0) {
      permission = await base44.asServiceRole.entities.ExecutionPermission.update(
        existingPermissions[0].id,
        {
          permission_status: permissionStatus,
          blocking_reason: blockingReason,
          linked_margin_risk_assessment_id: assessment.id
        }
      );
    } else {
      permission = await base44.asServiceRole.entities.ExecutionPermission.create({
        project_id: workPackage.project_id,
        work_package_id,
        permission_status: permissionStatus,
        blocking_reason: blockingReason,
        linked_margin_risk_assessment_id: assessment.id
      });
    }

    return Response.json({
      success: true,
      permission_id: permission.id,
      permission_status: permissionStatus,
      blocking_reason: blockingReason,
      risk_score: assessment.risk_score,
      risk_level: assessment.risk_level,
      recommended_action: assessment.recommended_action
    });

  } catch (error) {
    console.error('Set execution permission error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});