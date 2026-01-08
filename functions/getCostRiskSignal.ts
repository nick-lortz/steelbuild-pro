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

    // Fetch project data
    const projects = await base44.asServiceRole.entities.Project.filter({ id: project_id });
    const project = projects[0];
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch all related data
    const [sovItems, expenses, changeOrders, mappings, estimatedCosts] = await Promise.all([
      base44.asServiceRole.entities.SOVItem.filter({ project_id }),
      base44.asServiceRole.entities.Expense.filter({ project_id }),
      base44.asServiceRole.entities.ChangeOrder.filter({ project_id }),
      base44.asServiceRole.entities.SOVCostCodeMap.filter({ project_id }),
      base44.asServiceRole.entities.EstimatedCostToComplete.filter({ project_id })
    ]);

    // Calculate contract value
    const baseContract = sovItems.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);
    const approvedCOs = changeOrders
      .filter(co => co.status === 'approved')
      .reduce((sum, co) => sum + (co.cost_impact || 0), 0);
    const totalContract = baseContract + approvedCOs;

    // Calculate actual cost
    const actualCost = expenses
      .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // Calculate EAC (Estimated Cost at Completion)
    const etcTotal = estimatedCosts.reduce((sum, etc) => sum + (etc.estimated_remaining_cost || 0), 0);
    const estimatedCostAtCompletion = etcTotal > 0 ? actualCost + etcTotal : (() => {
      const earnedToDate = sovItems.reduce((sum, s) => 
        sum + ((s.scheduled_value || 0) * ((s.percent_complete || 0) / 100)), 0);
      const percentComplete = totalContract > 0 ? (earnedToDate / totalContract) * 100 : 0;
      return percentComplete > 5 ? (actualCost / percentComplete) * 100 : actualCost;
    })();

    // Calculate margins
    const plannedMarginPercent = project.planned_margin || 15;
    const projectedMargin = totalContract - estimatedCostAtCompletion;
    const projectedMarginPercent = totalContract > 0 ? (projectedMargin / totalContract) * 100 : 0;
    const marginVariance = projectedMarginPercent - plannedMarginPercent;

    // DRIVER DETECTION
    const drivers = [];

    // 1. Cost Overrun Driver (SOV variance exceeds threshold)
    sovItems.forEach(sov => {
      const earnedToDate = (sov.scheduled_value || 0) * ((sov.percent_complete || 0) / 100);
      if (earnedToDate === 0) return;

      const sovMappings = mappings.filter(m => m.sov_item_id === sov.id);
      
      const costCodeBreakdown = sovMappings.map(mapping => {
        const ccExpenses = expenses.filter(e => 
          e.cost_code_id === mapping.cost_code_id &&
          (e.payment_status === 'paid' || e.payment_status === 'approved')
        );
        const actualCost = ccExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        return actualCost * (mapping.allocation_percent / 100);
      });

      const unmappedExpenses = expenses.filter(e => 
        e.sov_code === sov.sov_code &&
        (e.payment_status === 'paid' || e.payment_status === 'approved') &&
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
          affected_cost_code: null,
          variance_amount: variance,
          severity: variance < -10000 ? 'high' : 'medium',
          trend: 'deteriorating'
        });
      }
    });

    // 2. Burn Rate Driver
    sovItems.forEach(sov => {
      const earnedToDate = (sov.scheduled_value || 0) * ((sov.percent_complete || 0) / 100);
      if (earnedToDate === 0) return;

      const sovMappings = mappings.filter(m => m.sov_item_id === sov.id);
      const costCodeBreakdown = sovMappings.map(mapping => {
        const ccExpenses = expenses.filter(e => 
          e.cost_code_id === mapping.cost_code_id &&
          (e.payment_status === 'paid' || e.payment_status === 'approved')
        );
        const actualCost = ccExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        return actualCost * (mapping.allocation_percent / 100);
      });
      const unmappedExpenses = expenses.filter(e => 
        e.sov_code === sov.sov_code &&
        (e.payment_status === 'paid' || e.payment_status === 'approved') &&
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
          affected_cost_code: null,
          variance_amount: actualCost - earnedToDate,
          severity: burnRate > 1.3 ? 'high' : 'medium',
          trend: 'deteriorating'
        });
      }
    });

    // 3. Change Order Risk
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
            affected_cost_code: null,
            variance_amount: netMarginImpact,
            severity: netMarginImpact < -5000 ? 'high' : 'medium',
            trend: 'stable'
          });
        }
      });

    // 4. Unmapped Costs
    const unmappedExpenses = expenses.filter(e => 
      (e.payment_status === 'paid' || e.payment_status === 'approved') &&
      (!e.cost_code_id || !mappings.find(m => m.cost_code_id === e.cost_code_id))
    );
    const totalUnmapped = unmappedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    if (totalUnmapped > 5000) {
      drivers.push({
        driver_type: 'unmapped_costs',
        description: `$${totalUnmapped.toLocaleString()} in expenses not mapped to SOV`,
        affected_sov: null,
        affected_cost_code: null,
        variance_amount: totalUnmapped,
        severity: totalUnmapped > 10000 ? 'high' : 'medium',
        trend: 'stable'
      });
    }

    // 5. ETC Change Driver
    const significantETCChanges = estimatedCosts.filter(etc => 
      Math.abs(etc.change_amount || 0) > 5000
    );
    if (significantETCChanges.length > 0) {
      const totalETCIncrease = significantETCChanges.reduce((sum, etc) => sum + (etc.change_amount || 0), 0);
      if (totalETCIncrease > 5000) {
        drivers.push({
          driver_type: 'etc_change',
          description: `ETC increased by $${totalETCIncrease.toLocaleString()} across ${significantETCChanges.length} categories`,
          affected_sov: null,
          affected_cost_code: null,
          variance_amount: totalETCIncrease,
          severity: totalETCIncrease > 15000 ? 'high' : 'medium',
          trend: 'deteriorating'
        });
      }
    }

    // Sort drivers by severity and variance amount
    drivers.sort((a, b) => {
      if (a.severity === 'high' && b.severity !== 'high') return -1;
      if (a.severity !== 'high' && b.severity === 'high') return 1;
      return Math.abs(b.variance_amount) - Math.abs(a.variance_amount);
    });

    // Take top 3 drivers
    const primaryDrivers = drivers.slice(0, 3);

    // Risk tier determination
    let risk_level, status_label, message;
    
    if (marginVariance >= -2) {
      risk_level = 'green';
      status_label = 'On Track';
      message = primaryDrivers.length > 0 ? 'Monitoring emerging risks' : 'Cost performance on track';
    } else if (marginVariance >= -5) {
      risk_level = 'yellow';
      status_label = 'Watch Closely';
      message = primaryDrivers.length > 0 ? `${primaryDrivers.length} cost drivers detected` : 'Cost risk emerging';
    } else {
      risk_level = 'red';
      status_label = 'Overrun Likely';
      message = primaryDrivers.length > 0 ? `${primaryDrivers.length} critical drivers` : 'Overrun projected';
    }

    return Response.json({
      risk_level,
      status_label,
      message,
      total_contract: totalContract,
      actual_cost: actualCost,
      estimated_cost_at_completion: estimatedCostAtCompletion,
      projected_margin: projectedMargin,
      projected_margin_percent: projectedMarginPercent,
      planned_margin_percent: plannedMarginPercent,
      margin_variance: marginVariance,
      drivers: primaryDrivers
    });

  } catch (error) {
    console.error('getCostRiskSignal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});