/**
 * SLA & AGING STATE
 * 
 * Evaluates time-based compliance for project entities.
 * Configurable SLA thresholds defined inline.
 * 
 * SLA Configuration (days):
 * - RFI: 7 days standard, 3 days if critical priority
 * - Submittal: 14 days review window
 * - Change Order: 10 days for response
 * - Safety Incident: 7 days to close
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parseInput, requireUser, requireProjectAccess, ok, badRequest, forbidden, serverError } from './_lib/guard.js';

// SLA thresholds configuration
const SLA_CONFIG = {
  RFI: {
    standard: 7,      // Days for standard RFI response
    critical: 3       // Days for critical RFI response
  },
  SUBMITTAL: 14,      // Days for submittal review
  CHANGE_ORDER: 10,   // Days for CO response
  SAFETY: 7           // Days to close safety incident
};

Deno.serve(async (req) => {
  try {
    const { project_id } = await parseInput(req, {
      project_id: { required: true, type: 'string' }
    });
    
    const user = await requireUser(req);
    const base44 = createClientFromRequest(req);
    await requireProjectAccess(user, project_id, base44);
    
    const agingState = await computeSlaAging(base44, project_id);
    
    return ok(agingState);
    
  } catch (error) {
    if (error.status === 400) return badRequest(error.message);
    if (error.status === 401) return unauthorized(error.message);
    if (error.status === 403) return forbidden(error.message);
    return serverError('Failed to compute SLA aging', error);
  }
});

async function computeSlaAging(base44, project_id) {
  const now = new Date();
  
  // Fetch open entities (RLS-enforced)
  const [rfis, submittals, changeOrders, safetyIncidents] = await Promise.all([
    base44.entities.RFI.filter({ 
      project_id,
      status: { $nin: ['answered', 'closed'] }
    }),
    base44.entities.Submittal.filter({ 
      project_id,
      status: { $nin: ['approved', 'closed'] }
    }),
    base44.entities.ChangeOrder.filter({ 
      project_id,
      status: { $nin: ['approved', 'rejected', 'void'] }
    }),
    base44.entities.SafetyIncident?.filter({ 
      project_id,
      status: { $ne: 'closed' }
    }).catch(() => [])
  ]);
  
  // Initialize aging buckets
  const aging = {
    rfi: { "0-7": 0, "8-14": 0, "15+": 0 },
    submittal: { "0-7": 0, "8-14": 0, "15+": 0 },
    changeOrder: { "0-7": 0, "8-14": 0, "15+": 0 },
    safety: { "0-7": 0, "8-14": 0, "15+": 0 }
  };
  
  const breaches = [];
  
  // Process RFIs
  rfis.forEach(rfi => {
    const daysOpen = rfi.business_days_open || getDaysOpen(rfi.submitted_date, now);
    const sla = rfi.priority === 'critical' ? SLA_CONFIG.RFI.critical : SLA_CONFIG.RFI.standard;
    
    // Bucket into aging groups
    if (daysOpen <= 7) aging.rfi["0-7"]++;
    else if (daysOpen <= 14) aging.rfi["8-14"]++;
    else aging.rfi["15+"]++;
    
    // Check SLA breach
    if (daysOpen > sla) {
      breaches.push({
        type: 'rfi',
        entity_id: rfi.id,
        title: `RFI #${rfi.rfi_number}: ${rfi.subject}`,
        days_open: daysOpen,
        sla_days: sla,
        days_overdue: daysOpen - sla,
        severity: daysOpen > sla * 2 ? 'critical' : 'high',
        ball_in_court: rfi.ball_in_court
      });
    }
  });
  
  // Process Submittals
  submittals.forEach(submittal => {
    const daysOpen = getDaysOpen(submittal.submitted_date, now);
    
    if (daysOpen <= 7) aging.submittal["0-7"]++;
    else if (daysOpen <= 14) aging.submittal["8-14"]++;
    else aging.submittal["15+"]++;
    
    if (daysOpen > SLA_CONFIG.SUBMITTAL) {
      breaches.push({
        type: 'submittal',
        entity_id: submittal.id,
        title: submittal.title || `Submittal #${submittal.submittal_number}`,
        days_open: daysOpen,
        sla_days: SLA_CONFIG.SUBMITTAL,
        days_overdue: daysOpen - SLA_CONFIG.SUBMITTAL,
        severity: daysOpen > SLA_CONFIG.SUBMITTAL * 1.5 ? 'high' : 'medium'
      });
    }
  });
  
  // Process Change Orders
  changeOrders.forEach(co => {
    const daysOpen = getDaysOpen(co.submitted_date, now);
    
    if (daysOpen <= 7) aging.changeOrder["0-7"]++;
    else if (daysOpen <= 14) aging.changeOrder["8-14"]++;
    else aging.changeOrder["15+"]++;
    
    if (daysOpen > SLA_CONFIG.CHANGE_ORDER) {
      breaches.push({
        type: 'change_order',
        entity_id: co.id,
        title: `CO #${co.co_number}: ${co.title}`,
        days_open: daysOpen,
        sla_days: SLA_CONFIG.CHANGE_ORDER,
        days_overdue: daysOpen - SLA_CONFIG.CHANGE_ORDER,
        severity: co.cost_impact > 50000 ? 'high' : 'medium',
        cost_impact: co.cost_impact
      });
    }
  });
  
  // Process Safety Incidents
  safetyIncidents.forEach(incident => {
    const daysOpen = getDaysOpen(incident.incident_date, now);
    
    if (daysOpen <= 7) aging.safety["0-7"]++;
    else if (daysOpen <= 14) aging.safety["8-14"]++;
    else aging.safety["15+"]++;
    
    if (daysOpen > SLA_CONFIG.SAFETY) {
      breaches.push({
        type: 'safety',
        entity_id: incident.id,
        title: incident.description || 'Safety Incident',
        days_open: daysOpen,
        sla_days: SLA_CONFIG.SAFETY,
        days_overdue: daysOpen - SLA_CONFIG.SAFETY,
        severity: 'critical' // Safety always critical when overdue
      });
    }
  });
  
  // Sort breaches by severity then days overdue
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  breaches.sort((a, b) => {
    if (a.severity !== b.severity) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return b.days_overdue - a.days_overdue;
  });
  
  return {
    project_id,
    generated_at: now.toISOString(),
    sla_config: SLA_CONFIG,
    aging,
    breaches,
    total_breaches: breaches.length,
    critical_breaches: breaches.filter(b => b.severity === 'critical').length
  };
}

function getDaysOpen(startDate, endDate) {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.floor((end - start) / (1000 * 60 * 60 * 24));
}