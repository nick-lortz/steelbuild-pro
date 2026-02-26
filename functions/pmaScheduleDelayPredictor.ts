import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PMA Schedule Delay Predictor
 * Analyzes velocity, float consumption, RFI drag, and delivery gaps
 * to produce near-term delay probability scores per phase/area.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id } = await req.json();
    if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });

    const now = new Date();
    const fourteenDaysAgo = new Date(now - 14 * 86400000);

    const [project, tasks, workPackages, rfis, deliveries, alerts, laborEntries] = await Promise.all([
      base44.entities.Project.filter({ id: project_id }).then(r => r[0]),
      base44.entities.Task.filter({ project_id }),
      base44.entities.WorkPackage.filter({ project_id }),
      base44.entities.RFI.filter({ project_id }),
      base44.entities.Delivery.filter({ project_id }),
      base44.entities.Alert.filter({ project_id, status: 'active' }),
      base44.entities.LaborEntry.filter({ project_id })
    ]);

    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    // ── Velocity: planned vs actual completion rate ──────────────────────────
    const completedRecent = tasks.filter(t => t.status === 'completed' && t.updated_date && new Date(t.updated_date) >= fourteenDaysAgo).length;
    const totalActive = tasks.filter(t => !['completed', 'cancelled'].includes(t.status)).length;
    const velocityScore = totalActive > 0 ? (completedRecent / totalActive) : 1; // higher = healthier

    // ── Overdue task depth ────────────────────────────────────────────────────
    const overdueTasks = tasks.filter(t => t.due_date && t.status !== 'completed' && new Date(t.due_date) < now);
    const overdueRatio = tasks.length > 0 ? overdueTasks.length / tasks.length : 0;

    // ── RFI drag: open blockers + aging ──────────────────────────────────────
    const openRFIs = rfis.filter(r => !['closed', 'answered'].includes(r.status));
    const installBlockers = openRFIs.filter(r => r.is_install_blocker || r.fab_blocker);
    const agingRFIs = openRFIs.filter(r => {
      const days = Math.floor((now - new Date(r.created_date)) / 86400000);
      return days >= 14;
    });
    const rfiBurden = (installBlockers.length * 3 + agingRFIs.length) / Math.max(rfis.length, 1);

    // ── Work package stall signals ────────────────────────────────────────────
    const stalledWPs = workPackages.filter(wp => {
      if (['completed', 'cancelled'].includes(wp.status)) return false;
      const lastUpdate = wp.updated_date ? new Date(wp.updated_date) : new Date(wp.created_date);
      const daysSinceUpdate = Math.floor((now - lastUpdate) / 86400000);
      return daysSinceUpdate > 7 && (wp.percent_complete || 0) < 95;
    });

    // ── Delivery risk: upcoming deliveries with no confirmation ──────────────
    const sevenDaysAhead = new Date(now.getTime() + 7 * 86400000);
    const riskDeliveries = deliveries.filter(d => {
      if (!d.scheduled_date) return false;
      const date = new Date(d.scheduled_date);
      return date >= now && date <= sevenDaysAhead && !['delivered', 'confirmed'].includes(d.status);
    });

    // ── Float consumption proxy (critical-path tasks near due date) ───────────
    const nearDueCritical = tasks.filter(t => {
      if (t.status === 'completed' || !t.due_date) return false;
      const daysLeft = Math.floor((new Date(t.due_date) - now) / 86400000);
      return daysLeft >= 0 && daysLeft <= 5;
    });

    // ── Composite delay probability ───────────────────────────────────────────
    // Weighted signal score (0–100)
    const rawScore =
      (overdueRatio * 30) +
      (rfiBurden * 25) +
      (stalledWPs.length > 0 ? Math.min(stalledWPs.length * 4, 20) : 0) +
      (riskDeliveries.length > 0 ? Math.min(riskDeliveries.length * 3, 15) : 0) +
      (nearDueCritical.length > 0 ? Math.min(nearDueCritical.length * 2, 10) : 0) +
      ((1 - Math.min(velocityScore * 2, 1)) * 10);

    const delayProbability = Math.min(Math.round(rawScore), 100);

    const riskLevel = delayProbability >= 70 ? 'critical'
      : delayProbability >= 45 ? 'high'
      : delayProbability >= 25 ? 'medium'
      : 'low';

    // ── Per-phase breakdown ───────────────────────────────────────────────────
    const phases = ['detailing', 'fabrication', 'delivery', 'erection'];
    const phaseBreakdown = phases.map(phase => {
      const phaseTasks = tasks.filter(t => t.phase === phase || t.erection_area === phase);
      const phaseOverdue = phaseTasks.filter(t => t.due_date && t.status !== 'completed' && new Date(t.due_date) < now);
      const phaseWPs = workPackages.filter(wp => wp.phase === phase);
      const phaseRFIs = rfis.filter(r => r.install_area === phase || r.discipline?.toLowerCase().includes(phase));

      const phaseScore = phaseTasks.length > 0
        ? Math.round((phaseOverdue.length / phaseTasks.length) * 60 + (phaseRFIs.filter(r => r.is_install_blocker).length * 10))
        : 0;

      return {
        phase,
        delay_probability: Math.min(phaseScore, 100),
        overdue_tasks: phaseOverdue.length,
        stalled_wps: phaseWPs.filter(wp => !['completed', 'cancelled'].includes(wp.status) && (wp.percent_complete || 0) < 95 && Math.floor((now - new Date(wp.updated_date || wp.created_date)) / 86400000) > 7).length,
        blocking_rfis: phaseRFIs.filter(r => r.is_install_blocker || r.fab_blocker).length
      };
    });

    // ── AI narrative ──────────────────────────────────────────────────────────
    const aiPrompt = `You are a structural steel PM AI. Analyze this project delay risk data and provide a concise, actionable schedule risk narrative.

PROJECT: ${project.name} | PHASE: ${project.phase}
DELAY PROBABILITY: ${delayProbability}% (${riskLevel.toUpperCase()})
OVERDUE TASKS: ${overdueTasks.length} of ${tasks.length}
INSTALL BLOCKERS: ${installBlockers.length} RFIs
STALLED WORK PACKAGES: ${stalledWPs.map(wp => wp.name || wp.id).join(', ') || 'None'}
UNCONFIRMED DELIVERIES (7d): ${riskDeliveries.length}
NEAR-DUE CRITICAL PATH ITEMS: ${nearDueCritical.length}
PHASE BREAKDOWN: ${JSON.stringify(phaseBreakdown)}

Provide:
1. 2-sentence executive risk summary
2. Top 3 delay drivers (specific, with quantified impact)
3. Recovery actions ranked by schedule impact (no fluff, steel PM language)
4. Earliest expected slip date if no action taken (best estimate)`;

    const narrative = await base44.integrations.Core.InvokeLLM({ prompt: aiPrompt });

    return Response.json({
      success: true,
      delay_probability: delayProbability,
      risk_level: riskLevel,
      signals: {
        overdue_tasks: overdueTasks.length,
        install_blockers: installBlockers.length,
        aging_rfis: agingRFIs.length,
        stalled_work_packages: stalledWPs.length,
        unconfirmed_deliveries_7d: riskDeliveries.length,
        near_due_critical: nearDueCritical.length,
        velocity_score: (velocityScore * 100).toFixed(0)
      },
      phase_breakdown: phaseBreakdown,
      narrative,
      generated_at: now.toISOString()
    });

  } catch (err) {
    console.error('[PMA] Delay predictor error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});