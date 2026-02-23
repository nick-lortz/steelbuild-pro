import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function requireUser(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) throw { status: 401, message: 'Unauthorized' };
  return { user, base44 };
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
    const { base44 } = await requireUser(req);

    // RLS enforced projects user can see
    const projects = await base44.entities.Project.filter({
      status: { $in: ['awarded', 'in_progress', 'on_hold'] }
    });

    const projectIds = projects.map((p) => p.id);
    if (projectIds.length === 0) {
      return ok({
        generated_at: new Date().toISOString(),
        projects: [],
        portfolio_stats: { total_projects: 0, avg_health_score: 0, critical_projects: 0, total_blockers: 0 }
      });
    }

    // Batch fetch all entities (RLS enforced)
    const [rfis, submittals, changeOrders, deliveries, tasks, drawingSets, insights] = await Promise.all([
      base44.entities.RFI.filter({ project_id: { $in: projectIds } }),
      base44.entities.Submittal.filter({ project_id: { $in: projectIds } }),
      base44.entities.ChangeOrder.filter({ project_id: { $in: projectIds } }),
      base44.entities.Delivery.filter({ project_id: { $in: projectIds } }),
      base44.entities.Task.filter({ project_id: { $in: projectIds } }),
      base44.entities.DrawingSet.filter({ project_id: { $in: projectIds } }),
      base44.entities.AIInsight.filter({
        project_id: { $in: projectIds },
        insight_type: 'project_pulse',
        is_published: true
      })
    ]);

    // Group by project_id
    const byProject = (rows) => {
      const map = new Map();
      for (const r of rows) {
        const arr = map.get(r.project_id) || [];
        arr.push(r);
        map.set(r.project_id, arr);
      }
      return map;
    };

    const rfisBy = byProject(rfis);
    const submittalsBy = byProject(submittals);
    const coBy = byProject(changeOrders);
    const deliveriesBy = byProject(deliveries);
    const tasksBy = byProject(tasks);
    const drawingSetsBy = byProject(drawingSets);

    // Latest insight per project
    const latestInsightBy = new Map();
    for (const ins of insights) {
      const existing = latestInsightBy.get(ins.project_id);
      if (!existing) {
        latestInsightBy.set(ins.project_id, ins);
        continue;
      }
      const a = new Date(existing.generated_at).getTime();
      const b = new Date(ins.generated_at).getTime();
      if (b > a) latestInsightBy.set(ins.project_id, ins);
    }

    const now = new Date();

    const portfolioPulse = projects.map((project) => {
      const pulse = computeProjectPulseFromGrouped({
        project,
        now,
        rfis: rfisBy.get(project.id) || [],
        submittals: submittalsBy.get(project.id) || [],
        changeOrders: coBy.get(project.id) || [],
        deliveries: deliveriesBy.get(project.id) || [],
        tasks: tasksBy.get(project.id) || [],
        drawingSets: drawingSetsBy.get(project.id) || []
      });

      const healthScore = calculateHealthScore(pulse.blockers);
      const latestInsight = latestInsightBy.get(project.id);

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
        latest_insight: latestInsight
          ? { summary: latestInsight.summary, generated_at: latestInsight.generated_at }
          : null
      };
    }).sort((a, b) => a.health_score - b.health_score);

    const avg = Math.round(portfolioPulse.reduce((sum, p) => sum + p.health_score, 0) / portfolioPulse.length);

    const portfolioStats = {
      total_projects: portfolioPulse.length,
      avg_health_score: avg,
      critical_projects: portfolioPulse.filter((p) => p.health_score < 50).length,
      total_blockers: portfolioPulse.reduce((sum, p) => sum + p.top_blockers.length, 0)
    };

    return ok({
      generated_at: new Date().toISOString(),
      projects: portfolioPulse,
      portfolio_stats: portfolioStats
    });
  } catch (error) {
    if (error?.status === 401) return unauthorized(error.message);
    return serverError('Failed to compute portfolio pulse', error);
  }
});

function computeProjectPulseFromGrouped({ project, now, rfis, submittals, changeOrders, deliveries, tasks, drawingSets }) {
  const SLA = { RFI_STANDARD: 7, RFI_CRITICAL: 3, SUBMITTAL: 14, CHANGE_ORDER: 10, DELIVERY: 1 };

  const counts = {
    rfi_open: rfis.filter((r) => !['answered', 'closed'].includes(r.status)).length,
    submittal_open: submittals.filter((s) => !['approved', 'closed'].includes(s.status)).length,
    co_open: changeOrders.filter((co) => !['approved', 'rejected', 'void'].includes(co.status)).length,
    deliveries_overdue: 0,
    safety_open: 0,
    tasks_overdue: 0,
    drawings_pending: drawingSets.filter((ds) => ds.status !== 'FFF').length
  };

  const blockers = [];

  // RFIs
  for (const rfi of rfis) {
    if (['answered', 'closed'].includes(rfi.status)) continue;
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
  }

  // Deliveries
  for (const delivery of deliveries) {
    if (['delivered', 'received', 'cancelled'].includes(delivery.status)) continue;
    const scheduledDate = delivery.scheduled_date || delivery.expected_date;
    if (!scheduledDate) continue;

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
  }

  // Tasks
  for (const task of tasks) {
    if (task.status === 'completed') continue;
    const endDate = task.end_date;
    if (!endDate) continue;

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
  }

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  blockers.sort((a, b) => {
    if (a.severity !== b.severity) return severityOrder[a.severity] - severityOrder[b.severity];
    return (b.days_open || 0) - (a.days_open || 0);
  });

  return { project_id: project.id, generated_at: now.toISOString(), counts, blockers };
}

function calculateHealthScore(blockers) {
  const weights = { critical: 15, high: 10, medium: 5, low: 2 };
  let score = 100;
  for (const b of blockers) score -= weights[b.severity] || 0;
  return Math.max(0, score);
}

function getHealthGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getDaysOpen(startDate, endDate) {
  if (!startDate) return 0;
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}