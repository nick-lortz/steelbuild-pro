/**
 * GET PROJECT PULSE
 * 
 * Single source of truth for project health, blockers, and aging analytics.
 * Returns comprehensive pulse data used by UI and alert generation.
 * 
 * SLA Thresholds (days):
 * - RFI: 7 days standard, 3 days if critical priority
 * - Submittal: 14 days
 * - Change Order: 10 days for response
 * - Delivery: 1 day past scheduled date
 * - Task: Past end_date
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Inline guard functions (Base44 doesn't support local imports)
async function parseInput(req, schema) {
  const body = await req.json().catch(() => ({}));
  for (const [key, rules] of Object.entries(schema)) {
    if (rules.required && !body[key]) {
      throw { status: 400, message: `Missing required field: ${key}` };
    }
    if (body[key] && rules.type && typeof body[key] !== rules.type) {
      throw { status: 400, message: `Invalid type for ${key}: expected ${rules.type}` };
    }
  }
  return body;
}

async function requireUser(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) throw { status: 401, message: 'Unauthorized' };
  return user;
}

async function requireProjectAccess(user, project_id, base44) {
  if (user.role === 'admin') return;
  const projects = await base44.entities.Project.filter({ id: project_id });
  if (projects.length === 0) throw { status: 403, message: 'Project access denied' };
}

function ok(data) {
  return Response.json({ success: true, data }, { status: 200 });
}

function badRequest(message) {
  return Response.json({ success: false, error: message }, { status: 400 });
}

function unauthorized(message = 'Unauthorized') {
  return Response.json({ success: false, error: message }, { status: 401 });
}

function forbidden(message = 'Forbidden') {
  return Response.json({ success: false, error: message }, { status: 403 });
}

function serverError(message = 'Internal server error', error = null) {
  console.error('[SERVER_ERROR]', message, error);
  return Response.json({ success: false, error: message }, { status: 500 });
}

// SLA thresholds in days
const SLA = {
  RFI_STANDARD: 7,
  RFI_CRITICAL: 3,
  SUBMITTAL: 14,
  CHANGE_ORDER: 10,
  DELIVERY: 1,
  SAFETY: 7
};

Deno.serve(async (req) => {
  try {
    const { project_id } = await parseInput(req, {
      project_id: { required: true, type: 'string' }
    });
    
    const user = await requireUser(req);
    const base44 = createClientFromRequest(req);
    await requireProjectAccess(user, project_id, base44);
    
    const pulse = await computeProjectPulse(base44, project_id);
    
    return ok(pulse);
    
  } catch (error) {
    if (error.status === 400) return badRequest(error.message);
    if (error.status === 401) return unauthorized(error.message);
    if (error.status === 403) return forbidden(error.message);
    return serverError('Failed to compute project pulse', error);
  }
});

async function computeProjectPulse(base44, project_id) {
  const now = new Date();
  
  // Fetch all relevant entities in parallel (user-scoped, RLS enforced)
  const [rfis, submittals, changeOrders, deliveries, tasks, safetyIncidents, drawingSets] = await Promise.all([
    base44.entities.RFI.filter({ project_id }),
    base44.entities.Submittal.filter({ project_id }),
    base44.entities.ChangeOrder.filter({ project_id }),
    base44.entities.Delivery.filter({ project_id }),
    base44.entities.Task.filter({ project_id }),
    base44.entities.SafetyIncident?.filter({ project_id }).catch(() => []),
    base44.entities.DrawingSet.filter({ project_id })
  ]);
  
  // Initialize counts
  const counts = {
    rfi_open: rfis.filter(r => !['answered', 'closed'].includes(r.status)).length,
    submittal_open: submittals.filter(s => !['approved', 'closed'].includes(s.status)).length,
    co_open: changeOrders.filter(co => !['approved', 'rejected', 'void'].includes(co.status)).length,
    deliveries_overdue: 0,
    safety_open: safetyIncidents.filter(s => s.status !== 'closed').length,
    tasks_overdue: 0,
    drawings_pending: drawingSets.filter(ds => ds.status !== 'FFF').length
  };
  
  // Initialize aging buckets
  const aging = {
    rfi: { "0-7": 0, "8-14": 0, "15+": 0 },
    submittal: { "0-7": 0, "8-14": 0, "15+": 0 },
    changeOrder: { "0-7": 0, "8-14": 0, "15+": 0 }
  };
  
  // Blockers array
  const blockers = [];
  
  // Process RFIs
  rfis.forEach(rfi => {
    if (['answered', 'closed'].includes(rfi.status)) return;
    
    const daysOpen = rfi.business_days_open || getDaysOpen(rfi.submitted_date, now);
    const sla = rfi.priority === 'critical' ? SLA.RFI_CRITICAL : SLA.RFI_STANDARD;
    
    // Aging bucket
    if (daysOpen <= 7) aging.rfi["0-7"]++;
    else if (daysOpen <= 14) aging.rfi["8-14"]++;
    else aging.rfi["15+"]++;
    
    // Blocker if overdue or blocking fabrication
    if (daysOpen > sla || rfi.fab_blocker) {
      blockers.push({
        type: 'rfi_overdue',
        entity: 'RFI',
        entity_id: rfi.id,
        title: `RFI #${rfi.rfi_number}: ${rfi.subject}`,
        severity: rfi.fab_blocker ? 'critical' : (daysOpen > sla * 2 ? 'high' : 'medium'),
        reason: rfi.fab_blocker 
          ? `Blocking fabrication for ${daysOpen} days` 
          : `Open ${daysOpen} days (SLA: ${sla}d)`,
        days_open: daysOpen,
        recommended_action: rfi.fab_blocker ? 'Escalate to GC/Engineer immediately' : 'Follow up with responder',
        ball_in_court: rfi.ball_in_court,
        priority: rfi.priority
      });
    }
  });
  
  // Process Submittals
  submittals.forEach(submittal => {
    if (['approved', 'closed'].includes(submittal.status)) return;
    
    const daysOpen = getDaysOpen(submittal.submitted_date, now);
    
    // Aging bucket
    if (daysOpen <= 7) aging.submittal["0-7"]++;
    else if (daysOpen <= 14) aging.submittal["8-14"]++;
    else aging.submittal["15+"]++;
    
    if (daysOpen > SLA.SUBMITTAL) {
      blockers.push({
        type: 'submittal_overdue',
        entity: 'Submittal',
        entity_id: submittal.id,
        title: submittal.title || `Submittal #${submittal.submittal_number}`,
        severity: daysOpen > SLA.SUBMITTAL * 2 ? 'high' : 'medium',
        reason: `Open ${daysOpen} days (SLA: ${SLA.SUBMITTAL}d)`,
        days_open: daysOpen,
        recommended_action: 'Follow up on approval status'
      });
    }
  });
  
  // Process Change Orders
  changeOrders.forEach(co => {
    if (['approved', 'rejected', 'void'].includes(co.status)) return;
    
    const daysOpen = getDaysOpen(co.submitted_date, now);
    
    // Aging bucket
    if (daysOpen <= 7) aging.changeOrder["0-7"]++;
    else if (daysOpen <= 14) aging.changeOrder["8-14"]++;
    else aging.changeOrder["15+"]++;
    
    if (daysOpen > SLA.CHANGE_ORDER) {
      blockers.push({
        type: 'co_pending',
        entity: 'ChangeOrder',
        entity_id: co.id,
        title: `CO #${co.co_number}: ${co.title}`,
        severity: co.cost_impact > 50000 ? 'high' : 'medium',
        reason: `Pending ${daysOpen} days (SLA: ${SLA.CHANGE_ORDER}d)`,
        days_open: daysOpen,
        recommended_action: 'Push for approval decision',
        cost_impact: co.cost_impact
      });
    }
  });
  
  // Process Deliveries
  deliveries.forEach(delivery => {
    if (['delivered', 'received', 'cancelled'].includes(delivery.status)) return;
    
    const scheduledDate = delivery.scheduled_date || delivery.expected_date;
    if (!scheduledDate) return;
    
    const daysLate = getDaysOpen(scheduledDate, now);
    
    if (daysLate > SLA.DELIVERY) {
      counts.deliveries_overdue++;
      blockers.push({
        type: 'delivery_overdue',
        entity: 'Delivery',
        entity_id: delivery.id,
        title: delivery.description || 'Material Delivery',
        severity: daysLate > 7 ? 'critical' : 'high',
        reason: `${daysLate} days past scheduled date`,
        days_open: daysLate,
        recommended_action: 'Contact supplier for ETA update',
        scheduled_date: scheduledDate
      });
    }
  });
  
  // Process Tasks
  tasks.forEach(task => {
    if (task.status === 'completed') return;
    
    const endDate = task.end_date;
    if (!endDate) return;
    
    const daysLate = getDaysOpen(endDate, now);
    
    if (daysLate > 0) {
      counts.tasks_overdue++;
      
      // Only add critical/high priority overdue tasks as blockers
      if (task.priority === 'critical' || task.priority === 'high' || task.is_critical) {
        blockers.push({
          type: 'task_overdue',
          entity: 'Task',
          entity_id: task.id,
          title: task.title,
          severity: task.is_critical ? 'critical' : 'high',
          reason: `${daysLate} days overdue`,
          days_open: daysLate,
          recommended_action: 'Reassign or extend deadline',
          assigned_to: task.assigned_to
        });
      }
    }
  });
  
  // Process Drawing Sets (blocking fabrication)
  drawingSets.forEach(ds => {
    if (ds.status === 'FFF') return;
    
    const daysOpen = getDaysOpen(ds.submitted_date, now);
    
    // Only flag as blocker if linked to work packages awaiting fabrication
    if (daysOpen > 14) {
      blockers.push({
        type: 'drawing_blocker',
        entity: 'DrawingSet',
        entity_id: ds.id,
        title: `Drawing ${ds.set_number}: ${ds.title}`,
        severity: daysOpen > 30 ? 'high' : 'medium',
        reason: `Pending approval ${daysOpen} days`,
        days_open: daysOpen,
        recommended_action: 'Follow up with A/E for approval'
      });
    }
  });
  
  // Sort blockers by severity then days open
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  blockers.sort((a, b) => {
    if (a.severity !== b.severity) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return b.days_open - a.days_open;
  });
  
  return {
    project_id,
    generated_at: now.toISOString(),
    counts,
    aging,
    blockers,
    trends: null, // Future: add lightweight trend data
    brief: null   // Filled by generateProjectPulseArtifacts
  };
}

function getDaysOpen(startDate, endDate) {
  if (!startDate) return 0;
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const diffMs = end - start;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}