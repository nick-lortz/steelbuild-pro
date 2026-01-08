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

    // Fetch all data
    const [projects, sovItems, changeOrders, expenses, etcRecords, mappings, costCodes] = await Promise.all([
      base44.entities.Project.filter({ id: project_id }),
      base44.entities.SOVItem.filter({ project_id }),
      base44.entities.ChangeOrder.filter({ project_id }),
      base44.entities.Expense.filter({ 
        project_id,
        payment_status: { $in: ['paid', 'approved'] }
      }),
      base44.entities.EstimatedCostToComplete.filter({ project_id }),
      base44.entities.SOVCostCodeMap.filter({ project_id }),
      base44.asServiceRole.entities.CostCode.list()
    ]);

    if (projects.length === 0) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }
    const project = projects[0];

    // Calculate totals
    const contractValue = sovItems.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);
    const signedExtras = changeOrders
      .filter(co => co.status === 'approved')
      .reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    const totalContract = contractValue + signedExtras;

    const actualCost = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalETC = etcRecords.reduce((sum, etc) => sum + (etc.estimated_remaining_cost || 0), 0);
    const estimatedCostAtCompletion = actualCost + totalETC;

    const projectedMargin = totalContract - estimatedCostAtCompletion;
    const projectedMarginPercent = totalContract > 0 ? (projectedMargin / totalContract) * 100 : 0;
    const plannedMarginPercent = project.planned_margin || 15;
    const marginVariance = projectedMarginPercent - plannedMarginPercent;

    // DRIVER DETECTION
    const drivers = [];

    // 1. Cost Overrun Driver (SOV variance exceeds threshold)
    sovItems.forEach(sov => {
      const earnedToDate = (sov.scheduled_value || 0) * ((sov.percent_complete || 0) / 100);
      const sovMappings = mappings.filter(m => m.sov_item_id === sov.id);
      
      const costCodeBreakdown = sovMappings.map(mapping => {
        const ccExpenses = expenses.filter(e => e.cost_code_id === mapping.cost_code_id);
        const actualCost = ccExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        return actualCost * (mapping.allocation_percent / 100);
      });

      const unmappedExpenses = expenses.filter(e => 
        e.sov_code === sov.sov_code &&
        !sovMappings.find(m => m.cost_code_id === e.cost_code_id)
      );
      const unmappedCost = unmappedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const actualCost = costCodeBreakdown.reduce((sum, c) => sum + c, 0) + unmappedCost;

      const variance = earnedToDate - actualCost;
      const variancePercent = earnedToDate > 0 ? (variance / earnedToDate) * 100 : 0;

      if ((variancePercent < -5 || variance < -5000) && earnedToDate > 0) {
        drivers.push({
          driver_type: 'cost_overrun',
          description: `${sov.description} exceeding allocation by $${Math.abs(variance).toLocaleString()}`,
          affected_sov: sov.sov_code,
          variance_amount: variance,
          severity: variance < -10000 ? 'high' : 'medium'
        });
      }
    });

    // 2. Burn Rate Driver (increasing faster than earned)
    sovItems.forEach(sov => {
      const earnedToDate = (sov.scheduled_value || 0) * ((sov.percent_complete || 0) / 100);
      if (earnedToDate === 0) return;

      const sovMappings = mappings.filter(m => m.sov_item_id === sov.id);
      const costCodeBreakdown = sovMappings.map(mapping => {
        const ccExpenses = expenses.filter(e => e.cost_code_id === mapping.cost_code_id);
        const actualCost = ccExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        return actualCost * (mapping.allocation_percent / 100);
      });
      const unmappedExpenses = expenses.filter(e => 
        e.sov_code === sov.sov_code &&
        !sovMappings.find(m => m.cost_code_id === e.cost_code_id)
      );
      const unmappedCost = unmappedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const actualCost = costCodeBreakdown.reduce((sum, c) => sum + c, 0) + unmappedCost;

      const burnRate = actualCost / earnedToDate;
      if (burnRate > 1.15) {
        drivers.push({
          driver_type: 'burn_rate',
          description: `${sov.description} burn rate ${burnRate.toFixed(2)}x (${((burnRate - 1) * 100).toFixed(0)}% over)`,
          affected_sov: sov.sov_code,
          variance_amount: actualCost - earnedToDate,
          severity: burnRate > 1.3 ? 'high' : 'medium'
        });
      }
    });

    // 3. Change Order Risk (negative margin impact)
    changeOrders
      .filter(co => co.status === 'approved')
      .forEach(co => {
        const revenueValue = co.cost_impact || 0;
        let estimatedCost = 0;
        if (co.cost_breakdown && co.cost_breakdown.length > 0) {
          estimatedCost = co.cost_breakdown.reduce((sum, item) => sum + (item.amount || 0), 0);
        } else {
          estimatedCost = revenueValue * 0.7;
        }
        const netMarginImpact = revenueValue - estimatedCost;
        
        if (netMarginImpact < -1000) {
          drivers.push({
            driver_type: 'change_order_risk',
            description: `CO-${co.co_number} approved with negative margin ($${Math.abs(netMarginImpact).toLocaleString()})`,
            affected_sov: null,
            variance_amount: netMarginImpact,
            severity: netMarginImpact < -5000 ? 'high' : 'medium'
          });
        }
      });

    // 4. Unmapped Costs
    const unmappedExpenses = expenses.filter(e => 
      !e.cost_code_id || !mappings.find(m => m.cost_code_id === e.cost_code_id)
    );
    const totalUnmapped = unmappedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    if (totalUnmapped > 5000) {
      drivers.push({
        driver_type: 'unmapped_costs',
        description: `$${totalUnmapped.toLocaleString()} in expenses not mapped to SOV`,
        affected_sov: null,
        variance_amount: totalUnmapped,
        severity: totalUnmapped > 10000 ? 'high' : 'medium'
      });
    }

    // Sort drivers by severity and variance
    drivers.sort((a, b) => {
      if (a.severity === 'high' && b.severity !== 'high') return -1;
      if (a.severity !== 'high' && b.severity === 'high') return 1;
      return Math.abs(b.variance_amount) - Math.abs(a.variance_amount);
    });

    // Risk tier determination
    let risk_level, status_label, message;
    
    if (marginVariance >= -2) {
      risk_level = 'green';
      status_label = 'On Track';
      message = drivers.length > 0 ? 'Monitoring emerging risks' : 'Cost performance on track';
    } else if (marginVariance >= -5) {
      risk_level = 'yellow';
      status_label = 'Watch Closely';
      message = drivers.length > 0 ? `${drivers.length} cost drivers detected` : 'Cost risk emerging';
    } else {
      risk_level = 'red';
      status_label = 'Overrun Likely';
      message = drivers.length > 0 ? `${drivers.length} critical drivers` : 'Overrun projected';
    }

    return Response.json({
      risk_level,
      status_label,
      message,
      projected_margin: projectedMargin,
      projected_margin_percent: projectedMarginPercent,
      planned_margin_percent: plannedMarginPercent,
      margin_variance: marginVariance,
      total_contract: totalContract,
      actual_cost: actualCost,
      estimated_cost_at_completion: estimatedCostAtCompletion,
      drivers: drivers.slice(0, 3)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});