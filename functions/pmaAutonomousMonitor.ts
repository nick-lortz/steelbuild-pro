import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PMA Autonomous Monitoring Engine v2
 * Enhanced alert logic: schedule float, fab→erection chain gaps, install blocker RFIs,
 * submittal aging, delivery conflicts, budget burn, and threshold-aware deduplication.
 * Triggered via automation every 30 minutes.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { project_id } = body;

    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    console.log(`[PMA Monitor v2] Starting for project: ${project_id}`);

    const now = new Date();
    const alerts = [];
    const actions = [];

    // ── Fetch all project data in parallel ──────────────────────────────────
    const [
      project,
      tasks,
      rfis,
      submittals,
      deliveries,
      workPackages,
      changeOrders,
      financials,
      gates,
      existingAlerts
    ] = await Promise.all([
      base44.entities.Project.filter({ id: project_id }).then(d => d[0]),
      base44.entities.Task.filter({ project_id }),
      base44.entities.RFI.filter({ project_id }),
      base44.entities.Submittal.filter({ project_id }),
      base44.entities.Delivery.filter({ project_id }),
      base44.entities.WorkPackage.filter({ project_id }),
      base44.entities.ChangeOrder.filter({ project_id }),
      base44.entities.Financial.filter({ project_id }),
      base44.entities.ExecutionGate.filter({ project_id }),
      base44.asServiceRole.entities.Alert.filter({ project_id, status: 'active' })
    ]);

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Helper: check if a similar alert already exists (deduplication)
    const alertExists = (alert_type, entity_id) => {
      return existingAlerts.some(a =>
        a.alert_type === alert_type &&
        (entity_id ? a.entity_id === entity_id : true) &&
        a.status === 'active'
      );
    };

    const daysBetween = (a, b) => Math.floor((b - a) / (1000 * 60 * 60 * 24));

    // ── 1. AGING RFIs ────────────────────────────────────────────────────────
    const openRFIs = rfis.filter(r => !['closed', 'answered', 'resolved'].includes(r.status));
    for (const rfi of openRFIs) {
      const daysOpen = daysBetween(new Date(rfi.created_date), now);
      const isInstallBlocker = rfi.is_install_blocker || rfi.is_release_blocker || rfi.fabrication_hold;

      if (daysOpen >= 21 && !alertExists('rfi_overdue', rfi.id)) {
        alerts.push({
          project_id, alert_type: 'rfi_overdue', severity: 'critical',
          title: `RFI-${rfi.rfi_number} CRITICAL: ${daysOpen}d open`,
          message: `RFI-${rfi.rfi_number} "${rfi.subject}" open ${daysOpen} days. Ball in court: ${rfi.ball_in_court || 'unknown'}. Immediate escalation required.`,
          entity_type: 'RFI', entity_id: rfi.id,
          recommended_action: 'Escalate to owner rep / EOR directly. Document assumption risk if proceeding.',
          metadata: { days_open: daysOpen, ball_in_court: rfi.ball_in_court, is_blocker: isInstallBlocker },
          status: 'active'
        });
        // Auto-create escalation task
        actions.push({
          type: 'create_task',
          data: {
            project_id,
            name: `ESCALATE: RFI-${rfi.rfi_number} – ${daysOpen}d open`,
            description: `RFI-${rfi.rfi_number} "${rfi.subject}" has been open ${daysOpen} days with no response. Escalate to ${rfi.response_owner || 'owner representative'} immediately.`,
            status: 'not_started', phase: 'erection',
            start_date: now.toISOString().split('T')[0],
            end_date: new Date(now.getTime() + 86400000).toISOString().split('T')[0]
          }
        });
      } else if (daysOpen >= 14 && !alertExists('rfi_overdue', rfi.id)) {
        alerts.push({
          project_id, alert_type: 'rfi_overdue', severity: isInstallBlocker ? 'critical' : 'high',
          title: `RFI-${rfi.rfi_number} aging: ${daysOpen}d${isInstallBlocker ? ' [INSTALL BLOCKER]' : ''}`,
          message: `RFI-${rfi.rfi_number} "${rfi.subject}" approaching critical threshold. ${isInstallBlocker ? 'This RFI is blocking install/fabrication.' : ''}`,
          entity_type: 'RFI', entity_id: rfi.id,
          recommended_action: 'Send formal written follow-up. Escalate if no response in 3 days.',
          metadata: { days_open: daysOpen, is_blocker: isInstallBlocker },
          status: 'active'
        });
      } else if (daysOpen >= 7 && isInstallBlocker && !alertExists('rfi_install_blocker', rfi.id)) {
        // Install blocker RFIs get alerted sooner
        alerts.push({
          project_id, alert_type: 'rfi_install_blocker', severity: 'high',
          title: `Install Blocker RFI-${rfi.rfi_number}: ${daysOpen}d open`,
          message: `RFI-${rfi.rfi_number} is flagged as install/fabrication blocker and has been open ${daysOpen} days.`,
          entity_type: 'RFI', entity_id: rfi.id,
          recommended_action: 'Expedite response. Consider documenting assumption risk to keep work moving.',
          metadata: { days_open: daysOpen },
          status: 'active'
        });
      }
    }

    // ── 2. SCHEDULE FLOAT CONSUMPTION ────────────────────────────────────────
    const activeTasks = tasks.filter(t => !['completed', 'cancelled'].includes(t.status));
    const criticalTasks = activeTasks.filter(t => t.is_critical || (t.float_days !== undefined && t.float_days <= 2));

    for (const task of criticalTasks) {
      if (!alertExists('schedule_float', task.id)) {
        const floatDays = task.float_days ?? 0;
        alerts.push({
          project_id, alert_type: 'schedule_float', severity: floatDays <= 0 ? 'critical' : 'high',
          title: `Critical path task: "${task.name}" (${floatDays}d float)`,
          message: `Task "${task.name}" is on or near critical path with ${floatDays} day(s) of float. Any delay directly impacts project completion.`,
          entity_type: 'Task', entity_id: task.id,
          recommended_action: floatDays <= 0
            ? 'Zero float — any delay cascades. Prioritize resources immediately.'
            : 'Monitor daily. Assign additional resources if needed.',
          metadata: { float_days: floatDays, phase: task.phase },
          status: 'active'
        });
      }
    }

    // ── 3. FAB → DELIVERY → ERECTION CHAIN GAPS ──────────────────────────────
    const fabTasks = tasks.filter(t => t.phase === 'fabrication' && t.status !== 'completed');
    for (const fab of fabTasks) {
      if (!fab.end_date) continue;
      const fabEnd = new Date(fab.end_date);
      // Find linked delivery
      const linkedDelivery = deliveries.find(d =>
        d.work_package_id === fab.work_package_id && d.status !== 'delivered'
      );
      if (linkedDelivery?.scheduled_date) {
        const delivDate = new Date(linkedDelivery.scheduled_date);
        const gap = daysBetween(fabEnd, delivDate);
        if (gap < 3 && !alertExists('fab_chain_gap', fab.id)) {
          alerts.push({
            project_id, alert_type: 'fab_chain_gap', severity: gap < 0 ? 'critical' : 'high',
            title: `Fab→Delivery gap: "${fab.name}" (${gap}d buffer)`,
            message: `Fabrication task ends ${fab.end_date}, delivery scheduled ${linkedDelivery.scheduled_date}. Only ${gap} day(s) buffer — no time for QC or transport delays.`,
            entity_type: 'Task', entity_id: fab.id,
            recommended_action: gap < 0
              ? 'Delivery scheduled BEFORE fab complete. Reschedule immediately.'
              : 'Increase buffer or expedite fabrication to reduce risk.',
            metadata: { fab_end: fab.end_date, delivery_date: linkedDelivery.scheduled_date, gap },
            status: 'active'
          });
        }
      }
    }

    // ── 4. SUBMITTAL AGING ────────────────────────────────────────────────────
    const openSubmittals = submittals.filter(s => !['approved', 'void', 'closed'].includes(s.status));
    for (const sub of openSubmittals) {
      if (!sub.submitted_date) continue;
      const daysOut = daysBetween(new Date(sub.submitted_date), now);
      const isOverdue = sub.due_date && new Date(sub.due_date) < now;

      if ((daysOut >= 21 || isOverdue) && !alertExists('submittal_aging', sub.id)) {
        alerts.push({
          project_id, alert_type: 'submittal_aging', severity: isOverdue ? 'critical' : 'high',
          title: `Submittal aging: "${sub.title}" (${daysOut}d)`,
          message: `Submittal "${sub.title}" submitted ${daysOut} days ago with no approval. ${isOverdue ? 'OVERDUE.' : ''} Status: ${sub.status}.`,
          entity_type: 'Submittal', entity_id: sub.id,
          recommended_action: 'Follow up with reviewer. Document delay impact if blocking fabrication.',
          metadata: { days_out: daysOut, is_overdue: isOverdue },
          status: 'active'
        });
      }
    }

    // ── 5. DELIVERY CONFLICTS & SEQUENCE ─────────────────────────────────────
    const upcomingDeliveries = deliveries.filter(d => {
      if (!d.scheduled_date || ['delivered', 'cancelled'].includes(d.status)) return false;
      const days = daysBetween(now, new Date(d.scheduled_date));
      return days >= 0 && days <= 10;
    });

    const sequenceConflicts = upcomingDeliveries.filter(d => d.sequencing_valid === false);
    for (const d of sequenceConflicts) {
      if (!alertExists('delivery_sequence', d.id)) {
        alerts.push({
          project_id, alert_type: 'delivery_sequence', severity: 'high',
          title: `Delivery sequence conflict: Load ${d.load_number || d.id.slice(-6)}`,
          message: `Upcoming delivery on ${d.scheduled_date} has a sequencing conflict. Delivering out-of-sequence will cause field staging issues.`,
          entity_type: 'Delivery', entity_id: d.id,
          recommended_action: 'Re-sequence load or confirm field team can accept and stage out-of-sequence.',
          metadata: { scheduled_date: d.scheduled_date },
          status: 'active'
        });
      }
    }

    // ── 6. WORK PACKAGES STUCK IN PHASE ──────────────────────────────────────
    const stuckThresholds = { detailing: 21, fabrication: 30, delivery: 14 };
    for (const wp of workPackages) {
      if (!wp.phase || !wp.updated_date) continue;
      const threshold = stuckThresholds[wp.phase];
      if (!threshold) continue;
      const daysInPhase = daysBetween(new Date(wp.updated_date), now);
      if (daysInPhase >= threshold && !['completed', 'cancelled', 'erection'].includes(wp.phase)) {
        if (!alertExists('wp_stuck', wp.id)) {
          alerts.push({
            project_id, alert_type: 'wp_stuck', severity: daysInPhase >= threshold * 1.5 ? 'high' : 'medium',
            title: `WP "${wp.name}" stuck in ${wp.phase} (${daysInPhase}d)`,
            message: `Work package "${wp.name}" has been in ${wp.phase} phase for ${daysInPhase} days without status change.`,
            entity_type: 'WorkPackage', entity_id: wp.id,
            recommended_action: `Review ${wp.phase} blockers. Update status or escalate if held by external dependency.`,
            metadata: { phase: wp.phase, days_in_phase: daysInPhase },
            status: 'active'
          });
        }
      }
    }

    // ── 7. BLOCKED EXECUTION GATES ───────────────────────────────────────────
    const blockedGates = gates.filter(g => g.gate_status === 'blocked');
    for (const gate of blockedGates) {
      if (!alertExists('gate_blocked', gate.id)) {
        alerts.push({
          project_id, alert_type: 'gate_blocked', severity: 'high',
          title: `Gate blocked: ${gate.gate_type || 'Execution Gate'}`,
          message: `${gate.entity_type || 'Item'} execution gate is blocked. ${gate.blockers?.length || 0} unresolved blocker(s).`,
          entity_type: gate.entity_type || 'ExecutionGate', entity_id: gate.entity_id || gate.id,
          recommended_action: gate.required_actions?.join(' | ') || 'Review gate requirements and resolve blockers.',
          metadata: { gate_type: gate.gate_type, blocker_count: gate.blockers?.length || 0 },
          status: 'active'
        });
      }
    }

    // ── 8. BUDGET BURN RATE ───────────────────────────────────────────────────
    if (financials.length > 0) {
      const totalActual = financials.reduce((s, f) => s + (f.actual_amount || 0), 0);
      const totalBudget = financials.reduce((s, f) => s + (f.current_budget || f.original_budget || 0), 0);
      if (totalBudget > 0) {
        const variance = ((totalActual - totalBudget) / totalBudget) * 100;
        if (variance > 10 && !alertExists('budget_variance', null)) {
          alerts.push({
            project_id, alert_type: 'budget_variance', severity: variance > 20 ? 'critical' : 'high',
            title: `Budget overrun: ${variance.toFixed(1)}%`,
            message: `Project is $${(totalActual - totalBudget).toLocaleString()} over budget (${variance.toFixed(1)}%). Actual: $${totalActual.toLocaleString()} vs Budget: $${totalBudget.toLocaleString()}.`,
            recommended_action: 'Identify variance drivers. Accelerate pending COs. Implement cost controls.',
            metadata: { variance_pct: variance, total_actual: totalActual, total_budget: totalBudget },
            status: 'active'
          });
        }
      }
    }

    // ── 9. PENDING CHANGE ORDERS (AGING) ─────────────────────────────────────
    const pendingCOs = changeOrders.filter(co => ['submitted', 'under_review'].includes(co.status));
    for (const co of pendingCOs) {
      if (!co.submitted_date) continue;
      const daysOut = daysBetween(new Date(co.submitted_date), now);
      if (daysOut >= 21 && !alertExists('co_pending', co.id)) {
        const totalValue = pendingCOs.reduce((s, c) => s + (c.cost_impact || 0), 0);
        alerts.push({
          project_id, alert_type: 'co_pending', severity: daysOut >= 30 ? 'high' : 'medium',
          title: `CO-${co.co_number} pending ${daysOut}d – $${(co.cost_impact || 0).toLocaleString()}`,
          message: `Change Order CO-${co.co_number} "${co.title}" has been pending ${daysOut} days. Total pending CO exposure: $${totalValue.toLocaleString()}.`,
          entity_type: 'ChangeOrder', entity_id: co.id,
          recommended_action: 'Follow up with GC/owner for approval. Review contractual response time requirements.',
          metadata: { days_pending: daysOut, value: co.cost_impact },
          status: 'active'
        });
      }
    }

    // ── 10. OVERDUE TASKS (SCHEDULE SLIPPAGE) ────────────────────────────────
    const overdueTasks = activeTasks.filter(t => {
      if (!t.end_date) return false;
      return new Date(t.end_date) < now && t.status !== 'completed';
    });

    if (overdueTasks.length >= 3 && !alertExists('schedule_slippage', null)) {
      const criticalOverdue = overdueTasks.filter(t => t.is_critical);
      alerts.push({
        project_id, alert_type: 'schedule_slippage',
        severity: criticalOverdue.length > 0 ? 'critical' : 'high',
        title: `${overdueTasks.length} tasks overdue (${criticalOverdue.length} critical path)`,
        message: `${overdueTasks.length} tasks past end date. ${criticalOverdue.length} are on critical path. Schedule acceleration may be required.`,
        recommended_action: 'Conduct schedule recovery analysis. Identify fast-track or compression opportunities.',
        metadata: { total_overdue: overdueTasks.length, critical_overdue: criticalOverdue.length },
        status: 'active'
      });
    }

    // ── AUTO-EXECUTE ACTIONS ──────────────────────────────────────────────────
    for (const action of actions) {
      try {
        if (action.type === 'create_task') {
          await base44.asServiceRole.entities.Task.create(action.data);
          console.log(`[PMA] Auto-created task: ${action.data.name}`);
        }
      } catch (err) {
        console.error(`[PMA] Action failed:`, err.message);
      }
    }

    // ── PERSIST ALERTS (deduplicated) ─────────────────────────────────────────
    let alertsCreated = 0;
    for (const alertData of alerts) {
      try {
        await base44.asServiceRole.entities.Alert.create({
          ...alertData,
          created_by_pma: true,
          detected_at: now.toISOString()
        });
        alertsCreated++;
        console.log(`[PMA] Alert: ${alertData.title}`);
      } catch (err) {
        console.error(`[PMA] Alert creation failed:`, err.message);
      }
    }

    // ── SUMMARY ───────────────────────────────────────────────────────────────
    const summary = {
      project_id,
      project_name: project.name,
      timestamp: now.toISOString(),
      alerts_generated: alertsCreated,
      actions_executed: actions.length,
      risk_summary: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length
      },
      categories: {
        rfi_issues: alerts.filter(a => a.alert_type.startsWith('rfi')).length,
        schedule_issues: alerts.filter(a => ['schedule_float', 'schedule_slippage', 'fab_chain_gap'].includes(a.alert_type)).length,
        delivery_issues: alerts.filter(a => a.alert_type === 'delivery_sequence').length,
        budget_issues: alerts.filter(a => ['budget_variance', 'co_pending'].includes(a.alert_type)).length,
        gate_issues: alerts.filter(a => a.alert_type === 'gate_blocked').length,
        wp_issues: alerts.filter(a => a.alert_type === 'wp_stuck').length,
        submittal_issues: alerts.filter(a => a.alert_type === 'submittal_aging').length
      }
    };

    console.log(`[PMA Monitor v2] Complete:`, JSON.stringify(summary));

    return Response.json({ success: true, summary, alerts, actions });

  } catch (error) {
    console.error('[PMA Monitor v2] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});