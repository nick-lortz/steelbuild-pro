/**
 * EVALUATE PROJECT EXECUTION READINESS
 * 
 * Background evaluator that continuously monitors fabrication, shipment, and install readiness
 * across all active projects. Creates ExecutionTask records and ExecutionRiskAlert records
 * when risks are detected or readiness degrades.
 * 
 * Runs on schedule (every 6-12 hours)
 * Admin-only function (called by automation)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function requireAdmin(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: 'Forbidden: Admin access required' };
  }
  return { user, base44 };
}

function ok(data) {
  return Response.json({ success: true, data }, { status: 200 });
}

function forbidden(message = 'Forbidden') {
  return Response.json({ success: false, error: message }, { status: 403 });
}

function serverError(message = 'Internal server error', error = null) {
  console.error('[SERVER_ERROR]', message, error);
  return Response.json({ success: false, error: message }, { status: 500 });
}

Deno.serve(async (req) => {
  try {
    const { base44 } = await requireAdmin(req);
    const now = new Date().toISOString();
    
    // Get all active projects
    const projects = await base44.asServiceRole.entities.Project.filter({
      status: { $in: ['awarded', 'in_progress', 'on_hold'] }
    });
    
    if (projects.length === 0) {
      return ok({
        message: 'No active projects to evaluate',
        evaluated_at: now,
        projects_evaluated: 0
      });
    }
    
    const projectIds = projects.map(p => p.id);
    
    // Batch fetch all related entities
    const [workPackages, rfis, deliveries, submittals, tasks, changeOrders, existingTasks] = await Promise.all([
      base44.asServiceRole.entities.WorkPackage.filter({ project_id: { $in: projectIds } }),
      base44.asServiceRole.entities.RFI.filter({ project_id: { $in: projectIds } }),
      base44.asServiceRole.entities.Delivery.filter({ project_id: { $in: projectIds } }),
      base44.asServiceRole.entities.Submittal.filter({ project_id: { $in: projectIds } }),
      base44.asServiceRole.entities.Task.filter({ project_id: { $in: projectIds } }),
      base44.asServiceRole.entities.ChangeOrder.filter({ project_id: { $in: projectIds } }),
      base44.asServiceRole.entities.ExecutionTask.filter({ project_id: { $in: projectIds } })
    ]);
    
    // Group by project
    const byProject = (rows) => {
      const map = new Map();
      for (const r of rows) {
        const arr = map.get(r.project_id) || [];
        arr.push(r);
        map.set(r.project_id, arr);
      }
      return map;
    };
    
    const wpBy = byProject(workPackages);
    const rfisBy = byProject(rfis);
    const deliveriesBy = byProject(deliveries);
    const submittalsBy = byProject(submittals);
    const tasksBy = byProject(tasks);
    const coBy = byProject(changeOrders);
    const existingTasksBy = byProject(existingTasks);
    
    // Evaluate each project
    const results = [];
    const newTasks = [];
    const updatedTasks = [];
    const alerts = [];
    
    for (const project of projects) {
      const evaluation = await evaluateProjectExecution({
        project,
        workPackages: wpBy.get(project.id) || [],
        rfis: rfisBy.get(project.id) || [],
        deliveries: deliveriesBy.get(project.id) || [],
        submittals: submittalsBy.get(project.id) || [],
        tasks: tasksBy.get(project.id) || [],
        changeOrders: coBy.get(project.id) || [],
        existingTasks: existingTasksBy.get(project.id) || []
      });
      
      results.push(evaluation);
      newTasks.push(...evaluation.newTasks);
      updatedTasks.push(...evaluation.updatedTasks);
      alerts.push(...evaluation.alerts);
    }
    
    // Create new ExecutionTasks
    if (newTasks.length > 0) {
      await base44.asServiceRole.entities.ExecutionTask.bulkCreate(newTasks);
    }
    
    // Update existing ExecutionTasks
    for (const update of updatedTasks) {
      await base44.asServiceRole.entities.ExecutionTask.update(update.id, update.data);
    }
    
    // Create ExecutionRiskAlerts
    if (alerts.length > 0) {
      await base44.asServiceRole.entities.ExecutionRiskAlert.bulkCreate(alerts);
    }
    
    // Update last_execution_scan_at on all projects
    for (const project of projects) {
      await base44.asServiceRole.entities.Project.update(project.id, {
        last_execution_scan_at: now
      });
    }
    
    return ok({
      evaluated_at: now,
      projects_evaluated: projects.length,
      tasks_created: newTasks.length,
      tasks_updated: updatedTasks.length,
      alerts_created: alerts.length,
      summary: results.map(r => ({
        project_id: r.project_id,
        project_name: r.project_name,
        risks_detected: r.risks_detected
      }))
    });
    
  } catch (error) {
    if (error?.status === 403) return forbidden(error.message);
    return serverError('Failed to evaluate project execution readiness', error);
  }
});

function evaluateProjectExecution({ project, workPackages, rfis, deliveries, submittals, tasks, changeOrders, existingTasks }) {
  const now = new Date();
  const risks = [];
  const newTasks = [];
  const updatedTasks = [];
  const alerts = [];
  
  // FABRICATION RISK EVALUATION
  const fabricationRisks = evaluateFabricationRisks({ project, rfis, submittals, workPackages });
  risks.push(...fabricationRisks);
  
  // SHIPMENT RISK EVALUATION
  const shipmentRisks = evaluateShipmentRisks({ project, deliveries, rfis, workPackages, now });
  risks.push(...shipmentRisks);
  
  // INSTALL RISK EVALUATION
  const installRisks = evaluateInstallRisks({ project, deliveries, workPackages, rfis, tasks, now });
  risks.push(...installRisks);
  
  // Create/Update ExecutionTasks
  for (const risk of risks) {
    const existingTask = existingTasks.find(t => 
      t.source_entity_type === risk.source_entity_type &&
      t.source_entity_id === risk.source_entity_id &&
      t.execution_gate === risk.execution_gate
    );
    
    if (existingTask) {
      // Check for readiness degradation
      const previousStatus = existingTask.readiness_status;
      const newStatus = risk.readiness_status;
      
      if (previousStatus === 'Ready' && (newStatus === 'Conditional' || newStatus === 'Blocked')) {
        // Readiness degraded - create alert
        alerts.push({
          project_id: project.id,
          execution_task_id: existingTask.id,
          risk_type: risk.downstream_impact[0]?.toLowerCase() || 'coordination',
          severity: risk.readiness_status === 'Blocked' ? 'critical' : 'high',
          previous_status: previousStatus,
          current_status: newStatus,
          recommended_action: risk.recommended_action,
          alert_message: `${risk.execution_gate} readiness degraded from Ready to ${newStatus}: ${risk.ai_reasoning}`,
          blocking_entity_ids: risk.blocking_dependencies.map(d => d.entity_id)
        });
      }
      
      // Update existing task
      updatedTasks.push({
        id: existingTask.id,
        data: {
          readiness_status: risk.readiness_status,
          blocking_dependencies: risk.blocking_dependencies,
          downstream_impact: risk.downstream_impact,
          risk_score: risk.risk_score,
          recommended_action: risk.recommended_action,
          ai_reasoning: risk.ai_reasoning,
          last_evaluated_at: now.toISOString()
        }
      });
    } else {
      // Create new task
      newTasks.push({
        project_id: project.id,
        source_entity_type: risk.source_entity_type,
        source_entity_id: risk.source_entity_id,
        execution_gate: risk.execution_gate,
        readiness_status: risk.readiness_status,
        blocking_dependencies: risk.blocking_dependencies,
        downstream_impact: risk.downstream_impact,
        risk_score: risk.risk_score,
        recommended_action: risk.recommended_action,
        ai_reasoning: risk.ai_reasoning,
        execution_date: risk.execution_date,
        last_evaluated_at: now.toISOString(),
        auto_generated: true
      });
    }
  }
  
  return {
    project_id: project.id,
    project_name: project.name,
    risks_detected: risks.length,
    newTasks,
    updatedTasks,
    alerts
  };
}

function evaluateFabricationRisks({ project, rfis, submittals, workPackages }) {
  const risks = [];
  
  // Open RFI marked fab_blocker
  const fabBlockerRFIs = rfis.filter(r => r.fab_blocker && !['answered', 'closed'].includes(r.status));
  for (const rfi of fabBlockerRFIs) {
    const affectedWPs = workPackages.filter(wp => 
      rfi.affects_work_package_ids?.includes(wp.id)
    );
    
    for (const wp of affectedWPs) {
      risks.push({
        source_entity_type: 'WorkPackage',
        source_entity_id: wp.id,
        execution_gate: 'Fabricate',
        readiness_status: 'Blocked',
        blocking_dependencies: [{
          entity_type: 'RFI',
          entity_id: rfi.id,
          blocker_type: 'fabrication_hold',
          description: `RFI #${rfi.rfi_number}: ${rfi.subject}`
        }],
        downstream_impact: ['Fabrication', 'Shipment', 'Install'],
        risk_score: 95,
        recommended_action: 'Escalate',
        ai_reasoning: `Fabrication blocked by open RFI #${rfi.rfi_number}. Critical path impact.`,
        execution_date: wp.target_date
      });
    }
  }
  
  // Submittal not approved
  const pendingSubmittals = submittals.filter(s => 
    ['submitted', 'under_review'].includes(s.status)
  );
  for (const submittal of pendingSubmittals) {
    const affectedWPs = workPackages.filter(wp => 
      submittal.linked_work_package_ids?.includes(wp.id)
    );
    
    for (const wp of affectedWPs) {
      risks.push({
        source_entity_type: 'WorkPackage',
        source_entity_id: wp.id,
        execution_gate: 'Fabricate',
        readiness_status: 'Conditional',
        blocking_dependencies: [{
          entity_type: 'Submittal',
          entity_id: submittal.id,
          blocker_type: 'approval_pending',
          description: `Submittal: ${submittal.title || submittal.submittal_number}`
        }],
        downstream_impact: ['Fabrication'],
        risk_score: 65,
        recommended_action: 'Verify',
        ai_reasoning: `Fabrication conditional on submittal approval: ${submittal.title}`,
        execution_date: wp.target_date
      });
    }
  }
  
  return risks;
}

function evaluateShipmentRisks({ project, deliveries, rfis, workPackages, now }) {
  const risks = [];
  const SHIPMENT_WINDOW_DAYS = 5;
  
  for (const delivery of deliveries) {
    if (['delivered', 'received', 'cancelled'].includes(delivery.delivery_status)) continue;
    
    const scheduledDate = delivery.scheduled_date || delivery.confirmed_date;
    if (!scheduledDate) continue;
    
    const daysUntilShip = Math.ceil((new Date(scheduledDate) - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilShip <= SHIPMENT_WINDOW_DAYS && daysUntilShip >= 0) {
      const blockers = [];
      let riskScore = 0;
      let status = 'Ready';
      let reasoning = [];
      
      // Check install readiness of WPs on this delivery
      const wpsOnDelivery = workPackages.filter(wp => 
        delivery.work_package_ids?.includes(wp.id)
      );
      
      for (const wp of wpsOnDelivery) {
        if ((wp.install_readiness_score || 0) < 80) {
          blockers.push({
            entity_type: 'WorkPackage',
            entity_id: wp.id,
            blocker_type: 'install_readiness_low',
            description: `WP ${wp.wpid}: Install readiness ${wp.install_readiness_score}%`
          });
          riskScore += 30;
          status = 'Conditional';
          reasoning.push(`Install readiness below threshold (${wp.install_readiness_score}%)`);
        }
        
        // Check for open coordination RFIs
        const openCoordRFIs = rfis.filter(rfi => 
          rfi.affects_work_package_ids?.includes(wp.id) &&
          !['answered', 'closed'].includes(rfi.status) &&
          rfi.is_install_blocker
        );
        
        if (openCoordRFIs.length > 0) {
          for (const rfi of openCoordRFIs) {
            blockers.push({
              entity_type: 'RFI',
              entity_id: rfi.id,
              blocker_type: 'coordination_pending',
              description: `RFI #${rfi.rfi_number}: ${rfi.subject}`
            });
          }
          riskScore += 40;
          status = 'Blocked';
          reasoning.push(`Open install-blocking RFIs (${openCoordRFIs.length})`);
        }
      }
      
      // Check sequencing validity
      if (delivery.sequencing_valid === false) {
        blockers.push({
          entity_type: 'Delivery',
          entity_id: delivery.id,
          blocker_type: 'sequence_violation',
          description: 'Load sequencing mismatch'
        });
        riskScore += 35;
        status = 'Blocked';
        reasoning.push('Sequencing violation detected');
      }
      
      if (blockers.length > 0) {
        risks.push({
          source_entity_type: 'Delivery',
          source_entity_id: delivery.id,
          execution_gate: 'Ship',
          readiness_status: status,
          blocking_dependencies: blockers,
          downstream_impact: ['Shipment', 'Install', 'Schedule'],
          risk_score: Math.min(100, riskScore),
          recommended_action: status === 'Blocked' ? 'Hold' : 'Verify',
          ai_reasoning: `Shipment in ${daysUntilShip} days. ${reasoning.join('. ')}.`,
          execution_date: scheduledDate
        });
      }
    }
  }
  
  return risks;
}

function evaluateInstallRisks({ project, deliveries, workPackages, rfis, tasks, now }) {
  const risks = [];
  const INSTALL_WINDOW_DAYS = 7;
  
  for (const delivery of deliveries) {
    if (['cancelled'].includes(delivery.delivery_status)) continue;
    
    const installDate = delivery.install_day || delivery.scheduled_date;
    if (!installDate) continue;
    
    const daysUntilInstall = Math.ceil((new Date(installDate) - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilInstall <= INSTALL_WINDOW_DAYS && daysUntilInstall >= 0) {
      const wpsOnDelivery = workPackages.filter(wp => 
        delivery.work_package_ids?.includes(wp.id)
      );
      
      for (const wp of wpsOnDelivery) {
        const blockers = [];
        let riskScore = 0;
        let status = 'Ready';
        let reasoning = [];
        
        // Check install readiness
        if ((wp.install_readiness_score || 0) < 85) {
          blockers.push({
            entity_type: 'WorkPackage',
            entity_id: wp.id,
            blocker_type: 'install_readiness_low',
            description: `Install readiness: ${wp.install_readiness_score}%`
          });
          riskScore += 40;
          status = 'Conditional';
          reasoning.push(`Install readiness ${wp.install_readiness_score}%`);
        }
        
        // Check for embed conflicts
        const embedRFIs = rfis.filter(rfi => 
          rfi.affects_work_package_ids?.includes(wp.id) &&
          !['answered', 'closed'].includes(rfi.status) &&
          rfi.rfi_type === 'embed_anchor'
        );
        
        if (embedRFIs.length > 0) {
          for (const rfi of embedRFIs) {
            blockers.push({
              entity_type: 'RFI',
              entity_id: rfi.id,
              blocker_type: 'embed_conflict',
              description: `Embed RFI #${rfi.rfi_number}`
            });
          }
          riskScore += 50;
          status = 'Blocked';
          reasoning.push(`Embed conflicts (${embedRFIs.length} open RFIs)`);
        }
        
        // Check VIF confirmation
        if (!wp.vif_confirmed) {
          blockers.push({
            entity_type: 'WorkPackage',
            entity_id: wp.id,
            blocker_type: 'vif_pending',
            description: 'VIF not confirmed'
          });
          riskScore += 25;
          status = 'Conditional';
          reasoning.push('VIF not confirmed');
        }
        
        // Check crane/rigging coordination
        const riggingTasks = tasks.filter(t => 
          t.work_package_id === wp.id &&
          t.status !== 'completed' &&
          (t.title?.toLowerCase().includes('crane') || t.title?.toLowerCase().includes('rigging'))
        );
        
        if (riggingTasks.length > 0) {
          for (const task of riggingTasks) {
            blockers.push({
              entity_type: 'Task',
              entity_id: task.id,
              blocker_type: 'coordination_incomplete',
              description: task.title
            });
          }
          riskScore += 30;
          status = 'Conditional';
          reasoning.push('Crane/rigging coordination incomplete');
        }
        
        if (blockers.length > 0) {
          risks.push({
            source_entity_type: 'WorkPackage',
            source_entity_id: wp.id,
            execution_gate: 'Install',
            readiness_status: status,
            blocking_dependencies: blockers,
            downstream_impact: ['Install', 'Schedule', 'Margin'],
            risk_score: Math.min(100, riskScore),
            recommended_action: status === 'Blocked' ? 'Hold' : 'Verify',
            ai_reasoning: `Install in ${daysUntilInstall} days. ${reasoning.join('. ')}.`,
            execution_date: installDate
          });
        }
      }
    }
  }
  
  return risks;
}