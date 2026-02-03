import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
/**
 * Server-side Project Health Calculation
 * 
 * Computes health scores, risk levels, and derived metrics
 * Reduces client-side computation and ensures consistency
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
  progress_behind_warning: -10,
  progress_behind_critical: -20
};

function getBusinessDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  let current = new Date(start);
  
  while (current <= end) {
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

function getRFIEscalationLevel(submittedDate, status) {
  if (status === 'closed' || status === 'answered') return 'normal';
  
  const businessDaysOpen = getBusinessDaysBetween(new Date(submittedDate), new Date());
  
  if (businessDaysOpen >= RISK_THRESHOLDS.rfi_aging_overdue) return 'overdue';
  if (businessDaysOpen >= RISK_THRESHOLDS.rfi_aging_urgent) return 'urgent';
  if (businessDaysOpen >= RISK_THRESHOLDS.rfi_aging_warning) return 'warning';
  return 'normal';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, include_details = false } = await req.json();

    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    // Fetch project data
    const [project] = await base44.entities.Project.filter({ id: project_id });
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch related data
    const [tasks, financials, rfis, changeOrders] = await Promise.all([
      base44.entities.Task.filter({ project_id }),
      base44.entities.Financial.filter({ project_id }),
      base44.entities.RFI.filter({ project_id }),
      base44.entities.ChangeOrder.filter({ project_id })
    ]);

    const today = new Date().toISOString().split('T')[0];

    // Task Metrics
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const overdueTasks = tasks.filter(t => 
      t.status !== 'completed' && t.end_date && t.end_date < today
    ).length;
    const progress = tasks.length > 0 ? (completedTasks / tasks.length * 100) : 0;

    // Cost Health
    const budget = financials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
    const actual = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
    const costHealth = budget > 0 ? ((budget - actual) / budget * 100) : (actual > 0 ? -100 : 0);
    const budgetVsActual = budget > 0 ? ((actual / budget) * 100) : (actual > 0 ? 100 : 0);

    // Schedule Health (business days)
    let daysSlip = 0;
    if (project.target_completion) {
      const targetDate = new Date(project.target_completion + 'T00:00:00');
      const latestTaskEnd = tasks
        .filter(t => t.end_date)
        .map(t => new Date(t.end_date + 'T00:00:00'))
        .sort((a, b) => b - a)[0];

      if (latestTaskEnd && latestTaskEnd > targetDate) {
        daysSlip = getBusinessDaysBetween(targetDate, latestTaskEnd);
      }
    }

    // RFI Health with Escalation
    const rfisByEscalation = {
      normal: 0,
      warning: 0,
      urgent: 0,
      overdue: 0
    };

    const openRFIs = rfis.filter(r => r.status !== 'answered' && r.status !== 'closed');
    openRFIs.forEach(rfi => {
      if (rfi.submitted_date) {
        const level = getRFIEscalationLevel(rfi.submitted_date, rfi.status);
        rfisByEscalation[level]++;
      }
    });

    // Change Order Impact
    const pendingCOs = changeOrders.filter(c => 
      c.status === 'pending' || c.status === 'submitted'
    ).length;
    const totalCOImpact = changeOrders
      .filter(c => c.status === 'approved')
      .reduce((sum, c) => sum + (c.cost_impact || 0), 0);

    // Risk Score Calculation
    let riskScore = 0;
    const riskFactors = [];

    // Cost risk (0-30 points)
    if (costHealth < RISK_THRESHOLDS.cost_critical) {
      riskScore += 30;
      riskFactors.push('Critical cost overrun');
    } else if (costHealth < RISK_THRESHOLDS.cost_warning) {
      riskScore += 15;
      riskFactors.push('Cost overrun');
    }

    // Schedule risk (0-30 points)
    if (overdueTasks >= RISK_THRESHOLDS.tasks_overdue_critical) {
      riskScore += 30;
      riskFactors.push('Critical task delays');
    } else if (overdueTasks >= RISK_THRESHOLDS.tasks_overdue_warning) {
      riskScore += 15;
      riskFactors.push('Task delays');
    }

    // RFI risk (0-25 points)
    if (rfisByEscalation.overdue > 0) {
      riskScore += 25;
      riskFactors.push(`${rfisByEscalation.overdue} overdue RFIs`);
    } else if (rfisByEscalation.urgent > 0) {
      riskScore += 12;
      riskFactors.push(`${rfisByEscalation.urgent} urgent RFIs`);
    }

    // Schedule slip risk (0-15 points)
    if (daysSlip >= RISK_THRESHOLDS.schedule_critical) {
      riskScore += 15;
      riskFactors.push(`${daysSlip} business days behind`);
    } else if (daysSlip >= RISK_THRESHOLDS.schedule_warning) {
      riskScore += 8;
      riskFactors.push('Schedule slip detected');
    }

    const riskLevel = riskScore >= 70 ? 'critical' : riskScore >= 40 ? 'warning' : 'healthy';

    const healthMetrics = {
      project_id,
      computed_at: new Date().toISOString(),
      
      // Summary
      risk_score: Math.min(riskScore, 100),
      risk_level: riskLevel,
      risk_factors: riskFactors,
      
      // Task Metrics
      total_tasks: tasks.length,
      completed_tasks: completedTasks,
      overdue_tasks: overdueTasks,
      progress_percent: Math.round(progress),
      
      // Cost Metrics
      budget_total: budget,
      actual_total: actual,
      cost_health_percent: Math.round(costHealth * 10) / 10,
      budget_vs_actual_percent: Math.round(budgetVsActual),
      
      // Schedule Metrics
      days_slip_business: daysSlip,
      
      // RFI Metrics
      total_rfis: rfis.length,
      open_rfis: openRFIs.length,
      rfis_by_escalation: rfisByEscalation,
      
      // Change Order Metrics
      pending_change_orders: pendingCOs,
      approved_co_impact: totalCOImpact
    };

    if (include_details) {
      return Response.json({
        health_metrics: healthMetrics,
        details: {
          overdue_task_ids: tasks.filter(t => t.status !== 'completed' && t.end_date && t.end_date < today).map(t => t.id),
          overdue_rfi_ids: openRFIs.filter(r => getRFIEscalationLevel(r.submitted_date, r.status) === 'overdue').map(r => r.id),
          urgent_rfi_ids: openRFIs.filter(r => getRFIEscalationLevel(r.submitted_date, r.status) === 'urgent').map(r => r.id)
        }
      });
    }

    return Response.json(healthMetrics);

  } catch (error) {
    console.error('Calculate project health error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});