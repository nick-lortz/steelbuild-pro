/**
 * GENERATE WORKFLOW ALERTS
 * 
 * Single source of truth for alert generation.
 * Uses getWorkflowRiskState and getSlaAgingState logic.
 * Avoids duplicate alerts for unchanged conditions.
 * 
 * Alert Deduplication Strategy:
 * - Delete old auto-generated alerts before creating new ones
 * - Alert fingerprint: alert_type + entity_id
 * - Only create if condition still exists
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parseInput, requireUser, requireProjectAccess, ok, badRequest, unauthorized, forbidden, serverError, logServiceRoleAccess } from './_lib/guard.js';

Deno.serve(async (req) => {
  try {
    const { project_id } = await parseInput(req, {
      project_id: { required: true, type: 'string' }
    });
    
    const user = await requireUser(req);
    const base44 = createClientFromRequest(req);
    await requireProjectAccess(user, project_id, base44);
    
    // Get risk and SLA state
    const [riskResponse, slaResponse] = await Promise.all([
      fetch(`${req.url.replace(/\/[^/]+$/, '')}/getWorkflowRiskState`, {
        method: 'POST',
        headers: req.headers,
        body: JSON.stringify({ project_id })
      }),
      fetch(`${req.url.replace(/\/[^/]+$/, '')}/getSlaAgingState`, {
        method: 'POST',
        headers: req.headers,
        body: JSON.stringify({ project_id })
      })
    ]);
    
    if (!riskResponse.ok || !slaResponse.ok) {
      return serverError('Failed to compute workflow state');
    }
    
    const { data: riskState } = await riskResponse.json();
    const { data: slaState } = await slaResponse.json();
    
    // Service role for alert management
    logServiceRoleAccess({
      function_name: 'generateWorkflowAlerts',
      project_id,
      user_id: user.id,
      user_email: user.email,
      action: 'upsert_alerts',
      entity_name: 'Alert',
      reason: 'Auto-generate workflow alerts'
    });
    
    // Delete old auto-generated alerts for this project
    const oldAlerts = await base44.asServiceRole.entities.Alert.filter({ 
      project_id,
      auto_generated: true,
      status: 'active'
    });
    
    await Promise.all(oldAlerts.map(alert => 
      base44.asServiceRole.entities.Alert.delete(alert.id)
    ));
    
    const alertsCreated = [];
    const runId = `workflow-${project_id}-${Date.now()}`;
    
    // Create alerts from top blockers (limit 15)
    const topBlockers = riskState.top_blockers.slice(0, 15);
    
    for (const blocker of topBlockers) {
      const alert = await base44.asServiceRole.entities.Alert.create({
        project_id,
        alert_type: mapBlockerTypeToAlertType(blocker.type),
        severity: blocker.severity,
        title: blocker.title,
        message: `${blocker.reason} (${blocker.impacted_tasks_count} task${blocker.impacted_tasks_count !== 1 ? 's' : ''} impacted)`,
        entity_type: blocker.entity,
        entity_id: blocker.entity_id,
        days_open: extractDaysFromReason(blocker.reason),
        recommended_action: getRecommendedAction(blocker),
        status: 'active',
        auto_generated: true,
        pulse_run_id: runId
      });
      
      alertsCreated.push(alert.id);
    }
    
    // Create alerts from SLA breaches not already covered
    const existingEntityIds = new Set(topBlockers.map(b => b.entity_id));
    
    for (const breach of slaState.breaches) {
      if (existingEntityIds.has(breach.entity_id)) continue; // Already alerted
      if (alertsCreated.length >= 20) break; // Cap total alerts
      
      const alert = await base44.asServiceRole.entities.Alert.create({
        project_id,
        alert_type: breach.type + '_overdue',
        severity: breach.severity,
        title: breach.title,
        message: `SLA breach: ${breach.days_overdue}d past ${breach.sla_days}d threshold`,
        entity_type: capitalizeFirst(breach.type),
        entity_id: breach.entity_id,
        days_open: breach.days_open,
        recommended_action: 'Follow up on status',
        status: 'active',
        auto_generated: true,
        pulse_run_id: runId
      });
      
      alertsCreated.push(alert.id);
    }
    
    return ok({
      pulse_run_id: runId,
      alerts_created: alertsCreated.length,
      top_blockers_count: riskState.top_blockers.length,
      sla_breaches_count: slaState.breaches.length,
      at_risk_tasks_count: riskState.at_risk_tasks.length
    });
    
  } catch (error) {
    if (error.status === 400) return badRequest(error.message);
    if (error.status === 401) return unauthorized(error.message);
    if (error.status === 403) return forbidden(error.message);
    return serverError('Failed to generate workflow alerts', error);
  }
});

function mapBlockerTypeToAlertType(blockerType) {
  const mapping = {
    rfi: 'rfi_overdue',
    submittal: 'submittal_overdue',
    delivery: 'delivery_overdue',
    fabrication: 'fabrication_hold',
    schedule: 'task_overdue',
    drawing: 'drawing_blocker'
  };
  return mapping[blockerType] || 'task_overdue';
}

function getRecommendedAction(blocker) {
  const actions = {
    rfi: `Follow up with ${blocker.reason.includes('ball in court') ? 'responder' : 'GC/Engineer'}`,
    submittal: 'Push for approval decision',
    delivery: 'Contact supplier for ETA',
    fabrication: 'Review shop schedule and resource allocation',
    schedule: 'Reassign or adjust dependencies',
    drawing: 'Escalate to A/E for approval'
  };
  return actions[blocker.type] || 'Review and take action';
}

function extractDaysFromReason(reason) {
  const match = reason.match(/(\d+)d/);
  return match ? parseInt(match[1]) : 0;
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}