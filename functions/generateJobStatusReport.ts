import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, as_of_date } = await req.json();

    if (!project_id) {
      return Response.json({ error: 'Missing project_id' }, { status: 400 });
    }

    const asOfDate = as_of_date ? new Date(as_of_date) : new Date();

    // Fetch all data
    const [projects, sovItems, changeOrders, expenses, invoices, tasks, rfis, scopeGaps] = await Promise.all([
      base44.asServiceRole.entities.Project.filter({ id: project_id }),
      base44.asServiceRole.entities.SOVItem.filter({ project_id }),
      base44.asServiceRole.entities.ChangeOrder.filter({ project_id }),
      base44.asServiceRole.entities.Expense.filter({ project_id }),
      base44.asServiceRole.entities.Invoice.filter({ project_id }),
      base44.asServiceRole.entities.Task.filter({ project_id }),
      base44.asServiceRole.entities.RFI.filter({ project_id }),
      base44.asServiceRole.entities.ScopeGap.filter({ project_id })
    ]);

    if (projects.length === 0) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }
    const project = projects[0];

    // SOV SUMMARY
    const contractValue = sovItems.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);
    const signedExtras = changeOrders
      .filter(co => co.status === 'approved')
      .reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    const totalContract = contractValue + signedExtras;
    const earnedToDate = sovItems.reduce((sum, s) => 
      sum + ((s.scheduled_value || 0) * ((s.percent_complete || 0) / 100)), 0);
    const billedToDate = sovItems.reduce((sum, s) => sum + (s.billed_to_date || 0), 0);

    // COST SUMMARY
    const actualCost = expenses
      .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const percentComplete = totalContract > 0 ? (earnedToDate / totalContract) * 100 : 0;
    const estimatedCostAtCompletion = percentComplete > 0 ? (actualCost / percentComplete) * 100 : actualCost;
    const projectedMargin = totalContract - estimatedCostAtCompletion;
    const projectedMarginPercent = totalContract > 0 ? (projectedMargin / totalContract) * 100 : 0;

    // SCHEDULE SUMMARY
    const overdueTasks = tasks.filter(t => 
      t.status !== 'completed' && 
      t.end_date && 
      new Date(t.end_date) < asOfDate
    ).length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;

    // RISK SUMMARY
    const openRFIs = rfis.filter(r => r.status !== 'closed' && r.status !== 'answered').length;
    const pendingCOs = changeOrders.filter(co => co.status === 'pending' || co.status === 'submitted').length;
    const openScopeGaps = scopeGaps.filter(g => g.status === 'open').length;

    // NARRATIVE GENERATION (canonical source of truth)
    const narrative = {
      executive_summary: `${project.name} is ${percentComplete.toFixed(1)}% complete. Projected margin is ${projectedMarginPercent >= 0 ? '+' : ''}${projectedMarginPercent.toFixed(1)}% (${projectedMarginPercent >= project.planned_margin ? 'on track' : 'below target'}).`,
      
      financial_status: `Contract value: $${totalContract.toLocaleString()}. Earned: $${earnedToDate.toLocaleString()} (${percentComplete.toFixed(1)}%). Actual cost: $${actualCost.toLocaleString()}. Est at completion: $${estimatedCostAtCompletion.toLocaleString()}.`,
      
      schedule_status: `${completedTasks}/${totalTasks} tasks complete. ${overdueTasks > 0 ? `${overdueTasks} tasks overdue.` : 'No overdue tasks.'}`,
      
      risk_status: `${openRFIs} open RFIs, ${pendingCOs} pending COs, ${openScopeGaps} open scope gaps.`,
      
      key_metrics: {
        contract_value: totalContract,
        earned_revenue: earnedToDate,
        billed_to_date: billedToDate,
        actual_cost: actualCost,
        estimated_cost_at_completion: estimatedCostAtCompletion,
        projected_margin_percent: projectedMarginPercent,
        percent_complete: percentComplete,
        tasks_completed: completedTasks,
        tasks_total: totalTasks,
        tasks_overdue: overdueTasks,
        open_rfis: openRFIs,
        pending_cos: pendingCOs,
        open_scope_gaps: openScopeGaps
      },
      
      generated_at: new Date().toISOString(),
      as_of_date: asOfDate.toISOString()
    };

    return Response.json({
      success: true,
      project_id,
      project_name: project.name,
      narrative
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});