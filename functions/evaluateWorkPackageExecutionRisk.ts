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

    // Get work package and verify project access
    const workPackages = await base44.asServiceRole.entities.WorkPackage.filter({ id: work_package_id });
    const workPackage = workPackages[0];
    
    if (!workPackage) {
      return Response.json({ error: 'Work package not found' }, { status: 404 });
    }
    
    await requireProjectAccess(base44, user, workPackage.project_id);
    const projectId = workPackage.project_id;

    // Collect risk factors in parallel
    const [rfis, drawingRevisions, fieldIssues, deliveries, tasks, detailImprovements, drawingSets] = await Promise.all([
      base44.asServiceRole.entities.RFI.filter({ 
        project_id: projectId,
        status: { $in: ['draft', 'submitted', 'under_review'] }
      }),
      base44.asServiceRole.entities.DrawingRevision.filter({
        project_id: projectId,
        drawing_set_id: { $in: workPackage.linked_drawing_set_ids || [] },
        is_current: false
      }),
      base44.asServiceRole.entities.FieldIssue.filter({
        project_id: projectId,
        status: { $in: ['open', 'documented'] }
      }),
      base44.asServiceRole.entities.Delivery.filter({
        project_id: projectId,
        delivery_status: { $in: ['delayed', 'exception'] }
      }),
      base44.asServiceRole.entities.Task.filter({
        work_package_id,
        status: { $in: ['not_started', 'in_progress'] }
      }),
      base44.asServiceRole.entities.DetailImprovement.filter({
        project_id: projectId,
        design_intent_change: true,
        status: { $in: ['draft', 'pending_approval'] }
      }),
      base44.asServiceRole.entities.DrawingSet.filter({
        id: { $in: workPackage.linked_drawing_set_ids || [] }
      })
    ]);

    // Filter linked RFIs
    const linkedRFIs = rfis.filter(rfi => 
      (rfi.linked_drawing_set_ids || []).some(dsId => 
        (workPackage.linked_drawing_set_ids || []).includes(dsId)
      )
    );

    // Filter linked field issues
    const linkedFieldIssues = fieldIssues.filter(fi =>
      fi.erection_zone === workPackage.erection_zone ||
      (fi.affected_piece_marks || []).some(pm => 
        workPackage.piece_marks?.includes(pm)
      )
    );

    // Check for pending drawing revisions
    const drawingRevisionPending = drawingRevisions.length > 0 || 
      drawingSets.some(ds => ds.status !== 'FFF');

    // Check schedule dependencies
    const prerequisiteTasks = tasks.filter(t => 
      (t.predecessor_ids || []).length > 0
    );
    const scheduleDependencyUnmet = prerequisiteTasks.some(t => {
      const predecessors = t.predecessor_ids || [];
      return predecessors.some(predId => {
        const predTask = tasks.find(task => task.id === predId);
        return predTask && predTask.status !== 'completed';
      });
    });

    // Check delivery risks
    const lateDeliveryRisk = deliveries.length > 0 || 
      (workPackage.linked_delivery_ids || []).some(delId =>
        deliveries.find(d => d.id === delId)
      );

    // Check design intent changes
    const designIntentChangeFlag = detailImprovements.length > 0;

    // Check sequence
    const outOfSequenceFlag = workPackage.out_of_sequence || false;

    // Check execution status
    const fabricationStarted = workPackage.fabrication_complete || 
      workPackage.current_phase === 'fabrication' ||
      workPackage.current_phase === 'delivery' ||
      workPackage.current_phase === 'erection';
    
    const erectionStarted = workPackage.erection_complete || 
      workPackage.current_phase === 'erection';

    // Calculate risk score
    const riskScore = 
      (linkedRFIs.length * 5) +
      (drawingRevisionPending ? 10 : 0) +
      (linkedFieldIssues.length * 4) +
      (outOfSequenceFlag ? 15 : 0) +
      (designIntentChangeFlag ? 25 : 0) +
      (scheduleDependencyUnmet ? 12 : 0) +
      (lateDeliveryRisk ? 8 : 0);

    // Determine risk level and recommended action
    let riskLevel, recommendedAction;
    if (riskScore <= 20) {
      riskLevel = 'LOW';
      recommendedAction = 'RELEASE';
    } else if (riskScore <= 40) {
      riskLevel = 'MODERATE';
      recommendedAction = 'RELEASE_WITH_CAUTION';
    } else if (riskScore <= 70) {
      riskLevel = 'HIGH';
      recommendedAction = 'PM_REVIEW';
    } else {
      riskLevel = 'CRITICAL';
      recommendedAction = 'HOLD';
    }

    // Build drivers array
    const drivers = [];
    if (linkedRFIs.length > 0) drivers.push(`${linkedRFIs.length} open RFIs`);
    if (drawingRevisionPending) drivers.push('Drawing revisions pending');
    if (linkedFieldIssues.length > 0) drivers.push(`${linkedFieldIssues.length} field issues`);
    if (outOfSequenceFlag) drivers.push('Out of sequence');
    if (designIntentChangeFlag) drivers.push('Design intent changes pending');
    if (scheduleDependencyUnmet) drivers.push('Schedule dependencies unmet');
    if (lateDeliveryRisk) drivers.push('Late delivery risk');

    // Estimate margin at risk (placeholder formula)
    const eccImpactEstimate = riskScore * 100; // $100 per risk point
    const marginAtRisk = eccImpactEstimate * 0.15; // 15% margin assumption

    // Create or update MarginRiskAssessment
    const existingAssessments = await base44.asServiceRole.entities.MarginRiskAssessment.filter({
      work_package_id
    });

    let assessment;
    if (existingAssessments.length > 0) {
      assessment = await base44.asServiceRole.entities.MarginRiskAssessment.update(
        existingAssessments[0].id,
        {
          risk_score: riskScore,
          risk_level: riskLevel,
          drivers,
          rfi_open_count: linkedRFIs.length,
          drawing_revision_pending: drawingRevisionPending,
          field_issue_linked_count: linkedFieldIssues.length,
          design_intent_change_flag: designIntentChangeFlag,
          schedule_dependency_unmet: scheduleDependencyUnmet,
          out_of_sequence_flag: outOfSequenceFlag,
          late_delivery_risk: lateDeliveryRisk,
          fabrication_started: fabricationStarted,
          erection_started: erectionStarted,
          ecc_impact_estimate: eccImpactEstimate,
          margin_at_risk: marginAtRisk,
          recommended_action: recommendedAction,
          assessment_timestamp: new Date().toISOString()
        }
      );
    } else {
      assessment = await base44.asServiceRole.entities.MarginRiskAssessment.create({
        project_id: projectId,
        work_package_id,
        risk_score: riskScore,
        risk_level: riskLevel,
        drivers,
        rfi_open_count: linkedRFIs.length,
        drawing_revision_pending: drawingRevisionPending,
        field_issue_linked_count: linkedFieldIssues.length,
        design_intent_change_flag: designIntentChangeFlag,
        schedule_dependency_unmet: scheduleDependencyUnmet,
        out_of_sequence_flag: outOfSequenceFlag,
        late_delivery_risk: lateDeliveryRisk,
        fabrication_started: fabricationStarted,
        erection_started: erectionStarted,
        ecc_impact_estimate: eccImpactEstimate,
        margin_at_risk: marginAtRisk,
        recommended_action: recommendedAction,
        assessment_timestamp: new Date().toISOString()
      });
    }

    return Response.json({
      success: true,
      assessment_id: assessment.id,
      risk_score: riskScore,
      risk_level: riskLevel,
      recommended_action: recommendedAction,
      drivers,
      ecc_impact_estimate: eccImpactEstimate,
      margin_at_risk: marginAtRisk
    });

  } catch (error) {
    console.error('Risk evaluation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});