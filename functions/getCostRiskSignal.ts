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

    // Fetch project
    const projects = await base44.entities.Project.filter({ id: project_id });
    if (projects.length === 0) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }
    const project = projects[0];

    // Fetch SOV items
    const sovItems = await base44.entities.SOVItem.filter({ project_id });

    // Fetch change orders
    const changeOrders = await base44.entities.ChangeOrder.filter({ 
      project_id,
      status: 'approved'
    });

    // Fetch expenses
    const expenses = await base44.entities.Expense.filter({ 
      project_id,
      payment_status: { $in: ['paid', 'approved'] }
    });

    // Fetch ETC
    const etcRecords = await base44.entities.EstimatedCostToComplete.filter({ project_id });

    // Fetch mappings
    const mappings = await base44.entities.SOVCostCodeMap.filter({ project_id });

    // Calculate totals
    const contractValue = sovItems.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);
    const signedExtras = changeOrders.reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    const totalContract = contractValue + signedExtras;

    const actualCost = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalETC = etcRecords.reduce((sum, etc) => sum + (etc.estimated_remaining_cost || 0), 0);
    const estimatedCostAtCompletion = actualCost + totalETC;

    const projectedMargin = totalContract - estimatedCostAtCompletion;
    const projectedMarginPercent = totalContract > 0 ? (projectedMargin / totalContract) * 100 : 0;
    const plannedMarginPercent = project.planned_margin || 15;
    const marginVariance = projectedMarginPercent - plannedMarginPercent;

    // Determine risk level
    let risk_level;
    if (marginVariance >= -2) {
      risk_level = 'green';
    } else if (marginVariance >= -5) {
      risk_level = 'yellow';
    } else {
      risk_level = 'red';
    }

    // Calculate primary drivers (variance by SOV line)
    const drivers = sovItems.map(sov => {
      const sovMappings = mappings.filter(m => m.sov_item_id === sov.id);
      
      let actual_cost = 0;
      sovMappings.forEach(mapping => {
        const costCodeExpenses = expenses.filter(e => e.cost_code_id === mapping.cost_code_id);
        const totalCost = costCodeExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        actual_cost += totalCost * (mapping.allocation_percent / 100);
      });

      const billed = sov.billed_to_date || 0;
      const variance = actual_cost - billed;

      return {
        sov_code: sov.sov_code,
        cost_codes: sovMappings.map(m => m.cost_code_id),
        variance_amount: variance,
        actual_cost,
        billed
      };
    })
    .filter(d => Math.abs(d.variance_amount) > 1000)
    .sort((a, b) => Math.abs(b.variance_amount) - Math.abs(a.variance_amount))
    .slice(0, 5);

    return Response.json({
      risk_level,
      projected_margin: projectedMargin,
      projected_margin_percent: projectedMarginPercent,
      planned_margin_percent: plannedMarginPercent,
      margin_variance: marginVariance,
      total_contract: totalContract,
      actual_cost: actualCost,
      estimated_cost_at_completion: estimatedCostAtCompletion,
      primary_drivers: drivers
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});