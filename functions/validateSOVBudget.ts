import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sov_item_id, percent_complete, project_id } = await req.json();

    // Get SOV item
    const sovItems = await base44.entities.SOVItem.filter({ id: sov_item_id });
    if (sovItems.length === 0) {
      return Response.json({ error: 'SOV item not found' }, { status: 404 });
    }

    const sovItem = sovItems[0];
    const billedValue = (percent_complete / 100) * sovItem.scheduled_value;

    // Get mapped cost codes for this SOV item
    const mappings = await base44.entities.SOVCostCodeMap.filter({
      sov_item_id
    });

    if (mappings.length === 0) {
      // Allow billing without cost code mapping - just calculate value
      return Response.json({
        valid: true,
        billed_value: billedValue,
        note: 'No cost code mapping - billing allowed without budget validation'
      });
    }

    // Get allocated budget from mapped financials
    let totalAllocatedBudget = 0;
    for (const mapping of mappings) {
      const financials = await base44.entities.Financial.filter({
        project_id: project_id || sovItem.project_id,
        cost_code_id: mapping.cost_code_id
      });

      if (financials.length > 0) {
        const allocated = (mapping.allocation_percentage / 100) * financials[0].current_budget;
        totalAllocatedBudget += allocated;
      }
    }

    // Check if billed exceeds allocated
    const overrun = billedValue - totalAllocatedBudget;
    const overrunPercent = totalAllocatedBudget > 0 
      ? (overrun / totalAllocatedBudget) * 100 
      : 0;

    if (overrun > 0) {
      return Response.json({
        valid: false,
        error: `SOV billing ($${billedValue.toFixed(0)}) exceeds allocated budget ($${totalAllocatedBudget.toFixed(0)})`,
        overrun: overrun,
        overrun_percent: overrunPercent.toFixed(1),
        severity: overrunPercent > 10 ? 'critical' : 'warning'
      });
    }

    // Warn if approaching cap (>85%)
    const utilizationPercent = (billedValue / totalAllocatedBudget) * 100;
    if (utilizationPercent > 85) {
      return Response.json({
        valid: true,
        warning: `SOV billing at ${utilizationPercent.toFixed(0)}% of allocated budget`,
        allocated_budget: totalAllocatedBudget,
        billed_value: billedValue,
        remaining: totalAllocatedBudget - billedValue
      });
    }

    return Response.json({
      valid: true,
      allocated_budget: totalAllocatedBudget,
      billed_value: billedValue,
      utilization_percent: utilizationPercent.toFixed(1)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});