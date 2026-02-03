import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import { checkRateLimit, rateLimitResponse } from './utils/rateLimit.js';

/**
 * calculateProjectHealth (TIME_LIMIT hardened)
 * - Adds caps to reduce compute on huge datasets
 * - Avoids expensive sorts
 * - Single-pass aggregation
 * - Returns partial=true if caps were hit
 */

const RISK_THRESHOLDS = {
  cost_warning: -5,
  cost_critical: -10,
  schedule_warning: 5,
  schedule_critical: 10,
  tasks_overdue_warning: 1,
  tasks_overdue_critical: 5,
  rfi_aging_warning: 10,
  rfi_aging_urgent: 15,
  rfi_aging_overdue: 16,
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function getISODate(d = new Date()) {
  return d.toISOString().split("T")[0];
}

// Inclusive business days between start/end (counts weekdays)
function businessDaysInclusive(startDate, endDate) {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (start > end) return 0;

  let count = 0;
  const cur = new Date(start);

  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }

  return count;
}

function getRFIEscalationLevel(submittedDate, status) {
  if (status === "closed" || status === "answered") return "normal";
  const daysOpen = businessDaysInclusive(submittedDate, new Date());
  if (daysOpen >= RISK_THRESHOLDS.rfi_aging_overdue) return "overdue";
  if (daysOpen >= RISK_THRESHOLDS.rfi_aging_urgent) return "urgent";
  if (daysOpen >= RISK_THRESHOLDS.rfi_aging_warning) return "warning";
  return "normal";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // AUTH
    const user = await base44.auth.me();
    if (!user) return json(401, { error: "Unauthorized" });

    // Rate limiting: 30 health calculations per minute per user (compute-heavy)
    const rateLimit = checkRateLimit(user.email, 30, 60 * 1000);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    // PARSE BODY
    let body;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    const project_id = body?.project_id;
    const include_details = body?.include_details === true;

    // Hard caps (tune if needed)
    const max_tasks = Number.isFinite(body?.max_tasks) ? body.max_tasks : 2500;
    const max_rfis = Number.isFinite(body?.max_rfis) ? body.max_rfis : 2500;
    const max_financials = Number.isFinite(body?.max_financials) ? body.max_financials : 2500;
    const max_change_orders = Number.isFinite(body?.max_change_orders) ? body.max_change_orders : 2500;

    if (!project_id) return json(400, { error: "project_id required" });

    // Fetch project
    const projectArr = await base44.entities.Project.filter({ id: project_id });
    const project = projectArr?.[0];
    if (!project) return json(404, { error: "Project not found" });

    // Fetch related datasets (may be large)
    const results = await Promise.all([
      base44.entities.Task.filter({ project_id }),
      base44.entities.Financial.filter({ project_id }),
      base44.entities.RFI.filter({ project_id }),
      base44.entities.ChangeOrder.filter({ project_id }),
    ]);

    const tasksRaw = results[0] || [];
    const financialsRaw = results[1] || [];
    const rfisRaw = results[2] || [];
    const changeOrdersRaw = results[3] || [];

    let partial = false;

    const tasks = tasksRaw.length > max_tasks ? (partial = true, tasksRaw.slice(0, max_tasks)) : tasksRaw;
    const financials =
      financialsRaw.length > max_financials
        ? (partial = true, financialsRaw.slice(0, max_financials))
        : financialsRaw;
    const rfis = rfisRaw.length > max_rfis ? (partial = true, rfisRaw.slice(0, max_rfis)) : rfisRaw;
    const changeOrders =
      changeOrdersRaw.length > max_change_orders
        ? (partial = true, changeOrdersRaw.slice(0, max_change_orders))
        : changeOrdersRaw;

    const todayISO = getISODate();

    // TASK METRICS (single pass, no sort)
    let completedTasks = 0;
    let overdueTasks = 0;
    let latestTaskEndISO = null;

    for (const t of tasks) {
      if (t?.status === "completed") completedTasks++;
      if (t?.status !== "completed" && t?.end_date && t.end_date < todayISO) overdueTasks++;

      if (t?.end_date) {
        if (!latestTaskEndISO || t.end_date > latestTaskEndISO) latestTaskEndISO = t.end_date;
      }
    }

    const totalTasks = tasks.length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // FINANCIAL METRICS (single pass)
    let budget = 0;
    let actual = 0;

    for (const f of financials) {
      budget += Number(f?.current_budget || 0);
      actual += Number(f?.actual_amount || 0);
    }

    // Division-by-zero hardened
    const costHealth = budget > 0 ? ((budget - actual) / budget) * 100 : actual > 0 ? -100 : 0;
    const budgetVsActual = budget > 0 ? (actual / budget) * 100 : actual > 0 ? 100 : 0;

    // SCHEDULE SLIP
    let daysSlip = 0;
    if (project?.target_completion && latestTaskEndISO && latestTaskEndISO > project.target_completion) {
      daysSlip = businessDaysInclusive(project.target_completion, latestTaskEndISO);
    }

    // RFI METRICS
    const rfisByEscalation = { normal: 0, warning: 0, urgent: 0, overdue: 0 };
    let openRfiCount = 0;

    for (const r of rfis) {
      const st = r?.status;
      const isOpen = st !== "answered" && st !== "closed";
      if (!isOpen) continue;

      openRfiCount++;
      if (r?.submitted_date) {
        const lvl = getRFIEscalationLevel(r.submitted_date, st);
        rfisByEscalation[lvl] = (rfisByEscalation[lvl] || 0) + 1;
      }
    }

    // CHANGE ORDERS
    let pendingCOs = 0;
    let approvedImpact = 0;

    for (const c of changeOrders) {
      const st = c?.status;
      if (st === "pending" || st === "submitted") pendingCOs++;
      if (st === "approved") approvedImpact += Number(c?.cost_impact || 0);
    }

    // RISK SCORING
    let riskScore = 0;
    const riskFactors = [];

    if (costHealth < RISK_THRESHOLDS.cost_critical) {
      riskScore += 30;
      riskFactors.push("Critical cost overrun");
    } else if (costHealth < RISK_THRESHOLDS.cost_warning) {
      riskScore += 15;
      riskFactors.push("Cost overrun");
    }

    if (overdueTasks >= RISK_THRESHOLDS.tasks_overdue_critical) {
      riskScore += 30;
      riskFactors.push("Critical task delays");
    } else if (overdueTasks >= RISK_THRESHOLDS.tasks_overdue_warning) {
      riskScore += 15;
      riskFactors.push("Task delays");
    }

    if (rfisByEscalation.overdue > 0) {
      riskScore += 25;
      riskFactors.push(`${rfisByEscalation.overdue} overdue RFIs`);
    } else if (rfisByEscalation.urgent > 0) {
      riskScore += 12;
      riskFactors.push(`${rfisByEscalation.urgent} urgent RFIs`);
    }

    if (daysSlip >= RISK_THRESHOLDS.schedule_critical) {
      riskScore += 15;
      riskFactors.push(`${daysSlip} business days behind`);
    } else if (daysSlip >= RISK_THRESHOLDS.schedule_warning) {
      riskScore += 8;
      riskFactors.push("Schedule slip detected");
    }

    const riskLevel = riskScore >= 70 ? "critical" : riskScore >= 40 ? "warning" : "healthy";

    const healthMetrics = {
      project_id,
      computed_at: new Date().toISOString(),
      partial,
      caps: {
        max_tasks,
        max_rfis,
        max_financials,
        max_change_orders,
        fetched: {
          tasks: tasksRaw.length,
          rfis: rfisRaw.length,
          financials: financialsRaw.length,
          change_orders: changeOrdersRaw.length,
        },
      },

      // Summary
      risk_score: Math.min(riskScore, 100),
      risk_level: riskLevel,
      risk_factors: riskFactors,

      // Tasks
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      overdue_tasks: overdueTasks,
      progress_percent: Math.round(progress),

      // Cost
      budget_total: budget,
      actual_total: actual,
      cost_health_percent: Math.round(costHealth * 10) / 10,
      budget_vs_actual_percent: Math.round(budgetVsActual),

      // Schedule
      days_slip_business: daysSlip,

      // RFI
      total_rfis: rfis.length,
      open_rfis: openRfiCount,
      rfis_by_escalation: rfisByEscalation,

      // CO
      pending_change_orders: pendingCOs,
      approved_co_impact: approvedImpact,
    };

    if (include_details) {
      // Only compute IDs if requested (keeps default fast)
      const overdue_task_ids = [];
      for (const t of tasks) {
        if (t?.status !== "completed" && t?.end_date && t.end_date < todayISO) overdue_task_ids.push(t.id);
      }

      const overdue_rfi_ids = [];
      const urgent_rfi_ids = [];

      for (const r of rfis) {
        const st = r?.status;
        const isOpen = st !== "answered" && st !== "closed";
        if (!isOpen || !r?.submitted_date) continue;

        const lvl = getRFIEscalationLevel(r.submitted_date, st);
        if (lvl === "overdue") overdue_rfi_ids.push(r.id);
        if (lvl === "urgent") urgent_rfi_ids.push(r.id);
      }

      return json(200, {
        health_metrics: healthMetrics,
        details: { overdue_task_ids, overdue_rfi_ids, urgent_rfi_ids },
      });
    }

    return json(200, healthMetrics);
  } catch (error) {
    console.error("calculateProjectHealth error:", error);
    return json(500, { error: "Internal server error" });
  }
});