import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id } = await req.json();

    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    // Fetch all relevant project data
    const [
      project,
      workPackages,
      deliveries,
      rfis,
      changeOrders,
      submittals,
      tasks,
      laborEntries,
      financials
    ] = await Promise.all([
      base44.entities.Project.filter({ id: project_id }).then(r => r[0]),
      base44.entities.WorkPackage.filter({ project_id }),
      base44.entities.Delivery.filter({ project_id }),
      base44.entities.RFI.filter({ project_id }),
      base44.entities.ChangeOrder.filter({ project_id }),
      base44.entities.Submittal.filter({ project_id }),
      base44.entities.Task.filter({ project_id }),
      base44.entities.LaborEntry.filter({ project_id }),
      base44.entities.Financial.filter({ project_id })
    ]);

    const now = new Date();
    const predictions = [];

    // ============= FABRICATION REWORK RISK =============
    const openRFIsOnFab = rfis.filter(rfi => 
      rfi.status !== 'closed' && 
      rfi.fabrication_hold === true
    );
    
    const fabReworkIndicators = [
      openRFIsOnFab.length > 0,
      workPackages.some(wp => wp.phase === 'shop' && wp.linked_rfi_ids?.length > 0),
      changeOrders.some(co => co.status === 'pending' && co.affects_fabrication === true),
      submittals.some(sub => sub.status === 'pending' && sub.priority === 'critical')
    ].filter(Boolean).length;

    if (fabReworkIndicators >= 2) {
      const reworkExposure = openRFIsOnFab.reduce((sum, rfi) => 
        sum + (rfi.estimated_cost_impact || 0), 0
      );

      predictions.push({
        risk_type: 'fabrication_rework',
        severity: fabReworkIndicators >= 3 ? 'critical' : 'high',
        likelihood: fabReworkIndicators >= 3 ? 85 : 70,
        impact_dollars: reworkExposure,
        impact_days: Math.ceil(reworkExposure / 5000), // $5K/day avg rework cost
        description: `${fabReworkIndicators} rework indicators detected: ${openRFIsOnFab.length} open RFIs on fabrication`,
        indicators: {
          open_rfis_on_fab: openRFIsOnFab.length,
          wps_with_rfis: workPackages.filter(wp => wp.linked_rfi_ids?.length > 0).length,
          pending_cos_affecting_fab: changeOrders.filter(co => co.affects_fabrication).length
        },
        mitigation_strategies: [
          { strategy: 'Hold fabrication on affected work packages', success_rate: 92, cost: 0, time_impact: 0 },
          { strategy: 'Expedite RFI responses (escalate to owner)', success_rate: 78, cost: 0, time_impact: 3 },
          { strategy: 'Document assumption and proceed at risk', success_rate: 65, cost: reworkExposure * 0.5, time_impact: -2 }
        ]
      });
    }

    // ============= ERECTION SEQUENCE CONFLICT RISK =============
    const sequenceConflicts = [];
    deliveries.forEach(del => {
      const outOfSequence = del.work_package_ids?.some(wpId => {
        const wp = workPackages.find(w => w.id === wpId);
        return wp && del.sequence_group !== wp.sequence_group;
      });
      if (outOfSequence) sequenceConflicts.push(del);
    });

    const sequenceIndicators = [
      sequenceConflicts.length > 0,
      workPackages.some(wp => wp.lookahead_ready === 'NOT_READY' && wp.install_day),
      tasks.some(t => t.status === 'blocked' && t.erection_area),
      deliveries.some(d => !d.is_safe_to_ship && d.scheduled_date)
    ].filter(Boolean).length;

    if (sequenceIndicators >= 3) {
      predictions.push({
        risk_type: 'erection_sequence_conflict',
        severity: sequenceIndicators >= 4 ? 'critical' : 'high',
        likelihood: sequenceIndicators >= 4 ? 80 : 65,
        impact_dollars: sequenceConflicts.length * 15000, // $15K avg per conflict
        impact_days: sequenceConflicts.length * 2,
        description: `${sequenceIndicators} sequence conflict indicators: ${sequenceConflicts.length} out-of-sequence deliveries`,
        indicators: {
          out_of_sequence_deliveries: sequenceConflicts.length,
          not_ready_wps_scheduled: workPackages.filter(wp => wp.lookahead_ready === 'NOT_READY' && wp.install_day).length,
          blocked_erection_tasks: tasks.filter(t => t.status === 'blocked' && t.erection_area).length
        },
        mitigation_strategies: [
          { strategy: 'Re-sequence deliveries to match install path', success_rate: 92, cost: 8000, time_impact: 3 },
          { strategy: 'Adjust crew assignments and install priorities', success_rate: 75, cost: 5000, time_impact: 1 },
          { strategy: 'Request GC schedule update and coordination', success_rate: 60, cost: 0, time_impact: 5 }
        ]
      });
    }

    // ============= BUDGET OVERRUN RISK =============
    const actualCosts = financials.reduce((sum, f) => sum + (f.actual || 0), 0);
    const budgetTotal = project.contract_value || 0;
    const percentComplete = workPackages.reduce((sum, wp) => sum + wp.percent_complete, 0) / (workPackages.length || 1);
    const forecastAtCompletion = percentComplete > 0 ? (actualCosts / percentComplete) * 100 : actualCosts;
    const variance = forecastAtCompletion - budgetTotal;
    const variancePercent = budgetTotal > 0 ? (variance / budgetTotal) * 100 : 0;

    const agingCOs = changeOrders.filter(co => {
      const age = (now - new Date(co.created_date)) / (1000 * 60 * 60 * 24);
      return co.status === 'pending' && age > 30 && co.total_price > 50000;
    });

    const budgetIndicators = [
      variancePercent > 5 && percentComplete < 50,
      agingCOs.length > 0,
      laborEntries.some(le => le.has_delay && le.delay_hours > 4),
      openRFIsOnFab.some(rfi => rfi.estimated_cost_impact > 100000)
    ].filter(Boolean).length;

    if (budgetIndicators >= 2) {
      const coExposure = agingCOs.reduce((sum, co) => sum + co.total_price, 0);
      
      predictions.push({
        risk_type: 'budget_overrun',
        severity: variancePercent > 10 ? 'critical' : 'high',
        likelihood: budgetIndicators >= 3 ? 75 : 60,
        impact_dollars: Math.max(variance, 0) + coExposure,
        impact_percent: variancePercent,
        description: `Forecasting ${variancePercent.toFixed(1)}% over budget (${budgetIndicators} indicators)`,
        indicators: {
          forecast_variance_pct: variancePercent.toFixed(1),
          percent_complete: percentComplete.toFixed(1),
          aging_cos: agingCOs.length,
          co_exposure: coExposure
        },
        mitigation_strategies: [
          { strategy: 'Implement earned value tracking weekly', success_rate: 85, cost: 5000, time_impact: 0 },
          { strategy: 'Value engineering on remaining work', success_rate: 70, cost: -Math.abs(variance * 0.08), time_impact: 2 },
          { strategy: 'Accelerate CO approvals (escalate)', success_rate: 65, cost: 0, time_impact: 0 }
        ]
      });
    }

    // ============= SCHEDULE DELAY RISK =============
    const criticalTasks = tasks.filter(t => t.is_critical_path && t.status !== 'completed');
    const delayedTasks = criticalTasks.filter(t => {
      if (!t.due_date) return false;
      return new Date(t.due_date) < now && t.status !== 'completed';
    });
    
    const avgRFIAge = rfis.filter(r => r.status !== 'closed').reduce((sum, r) => {
      const age = (now - new Date(r.submitted_date)) / (1000 * 60 * 60 * 24);
      return sum + age;
    }, 0) / (rfis.filter(r => r.status !== 'closed').length || 1);

    const scheduleIndicators = [
      delayedTasks.length > 0,
      avgRFIAge > 14,
      workPackages.some(wp => wp.status === 'on_hold'),
      laborEntries.filter(le => le.has_delay).length > laborEntries.length * 0.15
    ].filter(Boolean).length;

    if (scheduleIndicators >= 2) {
      const delayDays = delayedTasks.reduce((sum, t) => {
        const days = (now - new Date(t.due_date)) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);

      predictions.push({
        risk_type: 'schedule_delay',
        severity: scheduleIndicators >= 3 ? 'critical' : 'high',
        likelihood: scheduleIndicators >= 3 ? 80 : 70,
        impact_days: Math.ceil(delayDays),
        impact_dollars: delayDays * 5000, // $5K/day LD estimate
        description: `${scheduleIndicators} schedule delay indicators: ${delayedTasks.length} delayed critical tasks`,
        indicators: {
          delayed_critical_tasks: delayedTasks.length,
          avg_rfi_age_days: avgRFIAge.toFixed(1),
          work_packages_on_hold: workPackages.filter(wp => wp.status === 'on_hold').length,
          delay_frequency_pct: ((laborEntries.filter(le => le.has_delay).length / laborEntries.length) * 100).toFixed(1)
        },
        mitigation_strategies: [
          { strategy: 'Crash critical path (overtime/additional crews)', success_rate: 75, cost: 40000, time_impact: -8 },
          { strategy: 'Request time extension from GC', success_rate: 85, cost: 0, time_impact: 0 },
          { strategy: 'Re-sequence non-critical work', success_rate: 70, cost: 8000, time_impact: -3 }
        ]
      });
    }

    // ============= QUALITY ISSUE RISK =============
    const recentRework = laborEntries.filter(le => {
      const age = (now - new Date(le.work_date)) / (1000 * 60 * 60 * 24);
      return age < 14 && le.delay_reason === 'rework';
    });

    const safetyIncidents = laborEntries.filter(le => le.safety_incidents).length;
    const certGaps = laborEntries.reduce((sum, le) => sum + (le.certification_gaps?.length || 0), 0);

    const qualityIndicators = [
      recentRework.length > 3,
      certGaps > 5,
      safetyIncidents > 2,
      workPackages.some(wp => !wp.vif_confirmed && wp.status === 'in_progress')
    ].filter(Boolean).length;

    if (qualityIndicators >= 3) {
      predictions.push({
        risk_type: 'quality_issues',
        severity: qualityIndicators >= 4 ? 'critical' : 'high',
        likelihood: 65,
        impact_dollars: recentRework.length * 8000,
        impact_days: recentRework.length * 2,
        description: `${qualityIndicators} quality indicators: ${recentRework.length} rework events, ${certGaps} cert gaps`,
        indicators: {
          recent_rework_events: recentRework.length,
          certification_gaps: certGaps,
          safety_incidents: safetyIncidents,
          vif_not_confirmed: workPackages.filter(wp => !wp.vif_confirmed && wp.status === 'in_progress').length
        },
        mitigation_strategies: [
          { strategy: 'QA/QC audit and crew training', success_rate: 80, cost: 12000, time_impact: 3 },
          { strategy: 'Pre-install inspection protocol', success_rate: 85, cost: 5000, time_impact: 1 },
          { strategy: 'Slow-down for quality focus', success_rate: 90, cost: 0, time_impact: 5 }
        ]
      });
    }

    // Sort by severity and likelihood
    predictions.sort((a, b) => {
      const severityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
      const aScore = severityOrder[a.severity] * 100 + a.likelihood;
      const bScore = severityOrder[b.severity] * 100 + b.likelihood;
      return bScore - aScore;
    });

    return Response.json({
      project_id,
      analysis_date: now.toISOString(),
      predictions,
      summary: {
        total_risks: predictions.length,
        critical_risks: predictions.filter(p => p.severity === 'critical').length,
        total_exposure_dollars: predictions.reduce((sum, p) => sum + (p.impact_dollars || 0), 0),
        total_exposure_days: predictions.reduce((sum, p) => sum + (p.impact_days || 0), 0)
      }
    });

  } catch (error) {
    console.error('Risk prediction error:', error);
    return Response.json({ 
      error: 'Failed to predict risks', 
      details: error.message 
    }, { status: 500 });
  }
});