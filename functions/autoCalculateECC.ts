import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { project_id } = await req.json();

  if (!project_id) {
    return Response.json({ error: 'Missing project_id' }, { status: 400 });
  }

  // Fetch financials, SOV items, and expenses
  const financials = await base44.asServiceRole.entities.Financial.filter({ project_id });
  const sovItems = await base44.asServiceRole.entities.SOVItem.filter({ project_id });
  const expenses = await base44.asServiceRole.entities.Expense.filter({ project_id });

  // Group by category
  const categories = ['labor', 'material', 'equipment', 'subcontract', 'other'];
  const updates = [];

  for (const category of categories) {
    // Get SOV and Financial records for this category
    const catSovItems = sovItems.filter(s => s.sov_category === category);
    const catFinancials = financials.filter(f => f.category === category);
    const catExpenses = expenses.filter(e => e.category === category && (e.payment_status === 'paid' || e.payment_status === 'approved'));

    // Calculate totals
    const sovTotal = catSovItems.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);
    const sovPercentComplete = catSovItems.length > 0 
      ? catSovItems.reduce((sum, s) => sum + (s.percent_complete || 0), catSovItems.length) / catSovItems.length 
      : 0;
    const actualSpent = catExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const budgetTotal = catFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0);

    // ECC formula: EAC = (Actual Spent / % Complete) * 100
    // Only valid if actual work exists (percent > 0%)
    let estimatedCostAtCompletion = 0;
    if (sovPercentComplete > 5) { // At least 5% complete for meaningful projection
      estimatedCostAtCompletion = (actualSpent / sovPercentComplete) * 100;
    } else if (actualSpent > 0) {
      // Some spend but <5% - use conservative multiplier
      estimatedCostAtCompletion = actualSpent * 20; // Assumes 5% completion
    } else {
      // No spend yet - use budget as baseline
      estimatedCostAtCompletion = budgetTotal || sovTotal;
    }

    // Update each financial record in this category with ECC
    for (const fin of catFinancials) {
      updates.push({
        id: fin.id,
        forecast_amount: estimatedCostAtCompletion
      });
    }
  }

  // Batch update all financials
  for (const update of updates) {
    await base44.asServiceRole.entities.Financial.update(update.id, {
      forecast_amount: update.forecast_amount
    });
  }

  return Response.json({
    project_id,
    updates_count: updates.length,
    message: 'ECC calculations completed'
  });
});