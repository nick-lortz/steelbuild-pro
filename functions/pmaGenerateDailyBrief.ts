import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PMA Daily Brief Generator
 * Auto-generates comprehensive daily project summary with predictive analytics
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { project_id, send_email = true } = await req.json();
    
    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    console.log(`[PMA] Generating daily brief for project: ${project_id}`);

    // Fetch comprehensive project data
    const [
      project, 
      workPackages, 
      deliveries, 
      rfis, 
      submittals, 
      changeOrders,
      tasks, 
      gates, 
      riskAlerts,
      alerts,
      financials,
      laborEntries
    ] = await Promise.all([
      base44.entities.Project.filter({ id: project_id }).then(d => d[0]),
      base44.entities.WorkPackage.filter({ project_id }),
      base44.entities.Delivery.filter({ project_id }),
      base44.entities.RFI.filter({ project_id }),
      base44.entities.Submittal.filter({ project_id }),
      base44.entities.ChangeOrder.filter({ project_id }),
      base44.entities.Task.filter({ project_id }),
      base44.entities.ExecutionGate.filter({ project_id }),
      base44.entities.ExecutionRiskAlert.filter({ project_id, resolved: false }),
      base44.entities.Alert.filter({ project_id, status: 'active' }),
      base44.entities.Financial.filter({ project_id }),
      base44.entities.LaborEntry.filter({ project_id })
    ]);

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const now = new Date();

    // === CALCULATE METRICS ===

    // RFI Metrics
    const openRFIs = rfis.filter(r => !['closed', 'answered'].includes(r.status));
    const overdueRFIs = openRFIs.filter(r => {
      if (!r.due_date) return false;
      return new Date(r.due_date) < now;
    });
    const criticalRFIs = openRFIs.filter(r => {
      const created = new Date(r.created_date);
      const daysOpen = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      return daysOpen >= 21;
    });

    // Gate Status
    const blockedGates = gates.filter(g => g.gate_status === 'blocked');
    const conditionalGates = gates.filter(g => g.gate_status === 'conditional');

    // Task Metrics
    const overdueTasks = tasks.filter(t => {
      if (!t.due_date || t.status === 'completed') return false;
      return new Date(t.due_date) < now;
    });

    // Change Order Metrics
    const pendingCOs = changeOrders.filter(co => 
      ['draft', 'submitted', 'under_review'].includes(co.status)
    );
    const agingCOs = pendingCOs.filter(co => {
      const created = new Date(co.created_date);
      const daysOpen = Math.floor((now - created) / (1000 * 60 * 60 * 24));
      return daysOpen >= 14;
    });

    // Budget Analysis
    const totalBudget = financials.reduce((sum, f) => sum + (f.budget_amount || 0), 0);
    const totalActual = financials.reduce((sum, f) => sum + (f.actual_cost || 0), 0);
    const budgetVariance = totalBudget > 0 ? ((totalActual - totalBudget) / totalBudget) * 100 : 0;

    // Productivity Analysis (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentLabor = laborEntries.filter(l => new Date(l.date) >= sevenDaysAgo);
    const totalHours = recentLabor.reduce((sum, l) => sum + (l.hours || 0), 0);
    const avgHoursPerDay = recentLabor.length > 0 ? totalHours / 7 : 0;

    // === GENERATE AI BRIEF ===

    const briefPrompt = `Generate a concise daily project brief for a structural steel PM.

PROJECT: ${project.name} (${project.project_number})
STATUS: ${project.status} | PHASE: ${project.phase}

METRICS:
- Open RFIs: ${openRFIs.length} (${criticalRFIs.length} critical, ${overdueRFIs.length} overdue)
- Active Submittals: ${submittals.filter(s => s.status !== 'approved').length}
- Pending COs: ${pendingCOs.length} (${agingCOs.length} aging >14 days)
- Blocked Gates: ${blockedGates.length}
- Conditional Gates: ${conditionalGates.length}
- Overdue Tasks: ${overdueTasks.length}
- Budget Variance: ${budgetVariance.toFixed(1)}%
- Active Risks: ${riskAlerts.length} (${riskAlerts.filter(r => r.severity === 'critical').length} critical)

GENERATE:
1. STATUS SUMMARY (3 emoji categories: 🔴 CRITICAL, 🟡 CAUTION, 🟢 ON TRACK)
2. TOP 3 RISKS (with impact and recommended action)
3. PREDICTIVE INSIGHTS (what's coming in next 7 days)
4. RECOMMENDED ACTIONS (prioritized by impact)

Keep it direct, actionable, PM-ready. Use steel industry terminology.`;

    const { data: aiBrief } = await base44.integrations.Core.InvokeLLM({
      prompt: briefPrompt
    });

    const brief = {
      project_id,
      project_name: project.name,
      date: now.toISOString().split('T')[0],
      summary: aiBrief || 'Brief generation in progress',
      metrics: {
        rfis: { open: openRFIs.length, critical: criticalRFIs.length, overdue: overdueRFIs.length },
        gates: { blocked: blockedGates.length, conditional: conditionalGates.length },
        tasks: { overdue: overdueTasks.length },
        cos: { pending: pendingCOs.length, aging: agingCOs.length },
        budget_variance: budgetVariance,
        risks: riskAlerts.length
      }
    };

    // Store as AI Insight
    await base44.asServiceRole.entities.AIInsight.create({
      project_id,
      insight_type: 'daily_brief',
      title: `Daily Brief - ${now.toISOString().split('T')[0]}`,
      summary: aiBrief?.substring(0, 500) || 'Daily project summary',
      detailed_analysis: aiBrief,
      data_snapshot: brief.metrics,
      generated_at: now.toISOString(),
      generated_by: 'PMA',
      is_published: true
    });

    // Send email if requested
    if (send_email && project.project_manager) {
      try {
        await base44.integrations.Core.SendEmail({
          to: project.project_manager,
          subject: `PMA Daily Brief - ${project.project_number} - ${now.toISOString().split('T')[0]}`,
          body: `
${aiBrief}

---
Generated by PMA Autonomous System
Project: ${project.name} (${project.project_number})
          `.trim()
        });
        console.log(`[PMA] Daily brief emailed to ${project.project_manager}`);
      } catch (err) {
        console.error(`[PMA] Email failed:`, err);
      }
    }

    return Response.json({
      success: true,
      brief
    });

  } catch (error) {
    console.error('[PMA] Daily brief error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});