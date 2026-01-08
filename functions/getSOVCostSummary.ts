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

    // Fetch all SOV items
    const sovItems = await base44.entities.SOVItem.filter({ project_id });

    // Fetch mappings
    const mappings = await base44.entities.SOVCostCodeMap.filter({ project_id });

    // Fetch all expenses
    const expenses = await base44.entities.Expense.filter({ 
      project_id,
      payment_status: { $in: ['paid', 'approved'] }
    });

    // Build cost summary per SOV item
    const summary = sovItems.map(sov => {
      // Find mapped cost codes
      const sovMappings = mappings.filter(m => m.sov_item_id === sov.id);
      
      // Calculate actual cost
      let actual_cost_to_date = 0;
      
      sovMappings.forEach(mapping => {
        const costCodeExpenses = expenses.filter(e => e.cost_code_id === mapping.cost_code_id);
        const totalCost = costCodeExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        
        // Apply allocation percentage
        const allocatedCost = totalCost * (mapping.allocation_percent / 100);
        actual_cost_to_date += allocatedCost;
      });

      const scheduled_value = sov.scheduled_value || 0;
      const billed_to_date = sov.billed_to_date || 0;
      const earned_to_date = (scheduled_value * (sov.percent_complete || 0)) / 100;
      const remaining_budget = scheduled_value - actual_cost_to_date;
      const projected_margin = billed_to_date - actual_cost_to_date;

      return {
        sov_item_id: sov.id,
        sov_code: sov.sov_code,
        description: sov.description,
        scheduled_value,
        billed_to_date,
        earned_to_date,
        actual_cost_to_date,
        remaining_budget,
        projected_margin,
        margin_percent: billed_to_date > 0 ? (projected_margin / billed_to_date) * 100 : 0
      };
    });

    return Response.json({ summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});