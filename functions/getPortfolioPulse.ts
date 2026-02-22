/**
 * GET PORTFOLIO PULSE
 * 
 * Multi-project health rollup for executive dashboard.
 * Returns health scores and top blockers across all accessible projects.
 * 
 * Health Score Calculation (0-100):
 * - Base: 100
 * - Deduct per blocker: critical (-15), high (-10), medium (-5), low (-2)
 * - Floor: 0 (can't go negative)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Inline guard functions (Base44 doesn't support local imports)
async function requireUser(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) throw { status: 401, message: 'Unauthorized' };
  return user;
}

function ok(data) {
  return Response.json({ success: true, data }, { status: 200 });
}

function unauthorized(message = 'Unauthorized') {
  return Response.json({ success: false, error: message }, { status: 401 });
}

function serverError(message = 'Internal server error', error = null) {
  console.error('[SERVER_ERROR]', message, error);
  return Response.json({ success: false, error: message }, { status: 500 });
}

Deno.serve(async (req) => {
  try {
    const user = await requireUser(req);
    const base44 = createClientFromRequest(req);
    
    // Get user's accessible projects (RLS enforced)
    const projects = await base44.entities.Project.filter({
      status: { $in: ['awarded', 'in_progress', 'on_hold'] }
    });
    
    // Compute pulse for each project in parallel
    const pulsePromises = projects.map(async (project) => {
      try {
        // Compute pulse inline (can't invoke other functions in preview)
        const pulse = await computeProjectPulse(base44, project.id);
        
        // Calculate health score
        const healthScore = calculateHealthScore(pulse.blockers);
        
        // Get latest AI insight
        const insights = await base44.entities.AIInsight.filter({
          project_id: project.id,
          insight_type: 'project_pulse',
          is_published: true
        });
        
        const latestInsight = insights.sort((a, b) => 
          new Date(b.generated_at) - new Date(a.generated_at)
        )[0];
        
        return {
          project_id: project.id,
          project_number: project.project_number,
          project_name: project.name,
          phase: project.phase,
          status: project.status,
          health_score: healthScore,
          health_grade: getHealthGrade(healthScore),
          top_blockers: pulse.blockers.slice(0, 3),
          key_counts: pulse.counts,
          last_generated_at: pulse.generated_at,
          latest_insight: latestInsight ? {
            summary: latestInsight.summary,
            generated_at: latestInsight.generated_at
          } : null
        };
      } catch (error) {
        console.error(`Error processing project ${project.id}:`, error);
        return null;
      }
    });
    
    const portfolioPulse = (await Promise.all(pulsePromises))
      .filter(p => p !== null)
      .sort((a, b) => a.health_score - b.health_score); // Worst health first
    
    // Portfolio-level stats
    const portfolioStats = {
      total_projects: portfolioPulse.length,
      avg_health_score: Math.round(
        portfolioPulse.reduce((sum, p) => sum + p.health_score, 0) / portfolioPulse.length
      ),
      critical_projects: portfolioPulse.filter(p => p.health_score < 50).length,
      total_blockers: portfolioPulse.reduce((sum, p) => sum + p.top_blockers.length, 0)
    };
    
    return ok({
      generated_at: new Date().toISOString(),
      projects: portfolioPulse,
      portfolio_stats: portfolioStats
    });
    
  } catch (error) {
    if (error.status === 401) return unauthorized(error.message);
    return serverError('Failed to compute portfolio pulse', error);
  }
});

function calculateHealthScore(blockers) {
  // Health score weights (deductions from 100)
  const weights = {
    critical: 15,
    high: 10,
    medium: 5,
    low: 2
  };
  
  let score = 100;
  
  for (const blocker of blockers) {
    score -= weights[blocker.severity] || 0;
  }
  
  return Math.max(0, score); // Floor at 0
}

function getHealthGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// Inline pulse computation (from getProjectPulse)
async function computeProjectPulse(base44, project_id) {
  const now = new Date();
  const SLA = { RFI_STANDARD: 7, RFI_CRITICAL: 3, SUBMITTAL: 14, CHANGE_ORDER: 10, DELIVERY: 1 };
  
  const [rfis, submittals, changeOrders, deliveries, tasks, drawingSets] = await Promise.all([
    base44.asServiceRole.entities.RFI.filter({ project_id }),
    base44.asServiceRole.entities.Submittal.filter({ project_id }),
    base44.asServiceRole.entities.ChangeOrder.filter({ project_id }),
    base44.asServiceRole.entities.Delivery.filter({ project_id }),
    base44.asServiceRole.entities.Task.filter({ project_id }),
    base44.asServiceRole.entities.DrawingSet.filter({ project_id })
  ]);
  
  const counts = {
    rfi_open: rfis.filter(r => !['answered', 'closed'].includes(r.status)).length,
    submittal_open: submittals.filter(s => !['approved', 'closed'].includes(s.status)).length,
    co_open: changeOrders.filter(co => !['approved', 'rejected', 'void'].includes(co.status)).length,
    deliveries_overdue: 0,
    safety_open: 0,
    tasks_overdue: 0,
    drawings_pending: drawingSets.filter(ds => ds.status !== 'FFF').length
  };
  
  const blockers = [];
  
  // Process RFIs
  rfis.forEach(rfi => {
    if (['answered', 'closed'].includes(rfi.status)) return;
    const daysOpen = rfi.business_days_open || getDaysOpen(rfi.submitted_date, now);
    const sla = rfi.priority === 'critical' ? SLA.RFI_CRITICAL : SLA.RFI_STANDARD;
    
    if (daysOpen > sla || rfi.fab_blocker) {
      blockers.push({
        type: 'rfi_overdue',
        entity: 'RFI',
        entity_id: rfi.id,
        title: `RFI #${rfi.rfi_number}: ${rfi.subject}`,
        severity: rfi.fab_blocker ? 'critical' : (daysOpen > sla * 2 ? 'high' : 'medium'),
        reason: rfi.fab_blocker ? `Blocking fabrication for ${daysOpen} days` : `Open ${daysOpen} days (SLA: ${sla}d)`,
        days_open: daysOpen,
        recommended_action: rfi.fab_blocker ? 'Escalate to GC/Engineer immediately' : 'Follow up with responder'
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
        recommended_action: 'Contact supplier for ETA update'
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
      if (task.priority === 'critical' || task.priority === 'high' || task.is_critical) {
        blockers.push({
          type: 'task_overdue',
          entity: 'Task',
          entity_id: task.id,
          title: task.title,
          severity: task.is_critical ? 'critical' : 'high',
          reason: `${daysLate} days overdue`,
          days_open: daysLate,
          recommended_action: 'Reassign or extend deadline'
        });
      }
    }
  });
  
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  blockers.sort((a, b) => {
    if (a.severity !== b.severity) return severityOrder[a.severity] - severityOrder[b.severity];
    return b.days_open - a.days_open;
  });
  
  return { project_id, generated_at: now.toISOString(), counts, blockers };
}

function getDaysOpen(startDate, endDate) {
  if (!startDate) return 0;
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const diffMs = end - start;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}