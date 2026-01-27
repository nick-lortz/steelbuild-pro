import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, report_type = 'weekly' } = await req.json();

    // Calculate date range
    const today = new Date();
    const daysAgo = report_type === 'weekly' ? 7 : 30;
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - daysAgo);
    const dateFilter = startDate.toISOString().split('T')[0];

    // Fetch data
    const [project, tasks, financials, expenses, rfis, changeOrders, drawingSets, dailyLogs] = await Promise.all([
      base44.entities.Project.filter({ id: project_id }),
      base44.entities.Task.filter({ project_id }),
      base44.entities.Financial.filter({ project_id }),
      base44.entities.Expense.filter({ project_id }),
      base44.entities.RFI.filter({ project_id }),
      base44.entities.ChangeOrder.filter({ project_id }),
      base44.entities.DrawingSet.filter({ project_id }),
      base44.entities.DailyLog.filter({ project_id })
    ]);

    if (!project[0]) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const proj = project[0];

    // Calculate metrics
    const totalBudget = financials.reduce((s, f) => s + (f.current_budget || 0), 0);
    const totalActual = financials.reduce((s, f) => s + (f.actual_amount || 0), 0);
    const variance = totalBudget - totalActual;
    const variancePct = totalBudget > 0 ? ((variance / totalBudget) * 100).toFixed(1) : 0;

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const scheduleProgress = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;

    const openRFIs = rfis.filter(r => !['answered', 'closed'].includes(r.status)).length;
    const recentRFIs = rfis.filter(r => r.created_date >= dateFilter).length;

    const pendingCOs = changeOrders.filter(c => c.status === 'pending' || c.status === 'submitted').length;
    const approvedCOs = changeOrders.filter(c => c.status === 'approved');
    const coImpact = approvedCOs.reduce((s, c) => s + (c.cost_impact || 0), 0);

    const releasedDrawings = drawingSets.filter(d => d.status === 'FFF' || d.status === 'As-Built').length;
    const totalDrawings = drawingSets.length;

    const recentExpenses = expenses.filter(e => e.expense_date >= dateFilter);
    const periodSpend = recentExpenses.reduce((s, e) => s + (e.amount || 0), 0);

    const recentLogs = dailyLogs.filter(l => l.log_date >= dateFilter);
    const safetyIncidents = recentLogs.filter(l => l.safety_incidents).length;

    // Build executive summary
    const summary = {
      project: {
        number: proj.project_number,
        name: proj.name,
        client: proj.client,
        status: proj.status,
        phase: proj.phase
      },
      period: {
        type: report_type,
        start_date: dateFilter,
        end_date: today.toISOString().split('T')[0]
      },
      financial: {
        contract_value: proj.contract_value || 0,
        total_budget: totalBudget,
        actual_cost: totalActual,
        variance: variance,
        variance_percent: variancePct,
        period_spend: periodSpend,
        approved_co_value: coImpact,
        status: variancePct > 0 ? 'Under Budget' : 'Over Budget'
      },
      schedule: {
        completion_percent: scheduleProgress,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        on_track: scheduleProgress >= 75 ? 'Yes' : 'At Risk',
        target_completion: proj.target_completion
      },
      quality: {
        open_rfis: openRFIs,
        new_rfis_this_period: recentRFIs,
        pending_change_orders: pendingCOs,
        safety_incidents: safetyIncidents
      },
      drawings: {
        total_sets: totalDrawings,
        released: releasedDrawings,
        release_rate: totalDrawings > 0 ? ((releasedDrawings / totalDrawings) * 100).toFixed(1) : 0
      },
      key_items: [],
      risks: []
    };

    // Key accomplishments
    const recentCompletions = tasks.filter(t => 
      t.status === 'completed' && 
      t.updated_date && 
      t.updated_date >= dateFilter
    );
    if (recentCompletions.length > 0) {
      summary.key_items.push(`Completed ${recentCompletions.length} tasks this ${report_type === 'weekly' ? 'week' : 'month'}`);
    }

    if (periodSpend > 0) {
      summary.key_items.push(`Period spend: $${(periodSpend / 1000).toFixed(0)}k`);
    }

    if (approvedCOs.length > 0) {
      summary.key_items.push(`${approvedCOs.length} change orders approved (+$${(coImpact / 1000).toFixed(0)}k)`);
    }

    // Identify risks
    if (openRFIs > 5) {
      summary.risks.push(`High RFI count: ${openRFIs} open RFIs requiring resolution`);
    }

    if (variancePct < -10) {
      summary.risks.push(`Budget overrun: ${Math.abs(variancePct)}% over budget`);
    }

    const overdueTasks = tasks.filter(t => 
      t.status !== 'completed' && 
      t.end_date && 
      new Date(t.end_date) < today
    ).length;
    if (overdueTasks > 0) {
      summary.risks.push(`${overdueTasks} overdue tasks impacting schedule`);
    }

    if (safetyIncidents > 0) {
      summary.risks.push(`${safetyIncidents} safety incidents reported this period`);
    }

    return Response.json({
      success: true,
      summary,
      generated_at: new Date().toISOString(),
      generated_by: user.email
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});