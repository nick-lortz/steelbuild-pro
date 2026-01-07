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

  // Fetch SOV items
  const sovItems = await base44.entities.SOVItem.filter({ project_id });

  // Fetch expenses
  const expenses = await base44.entities.Expense.filter({ project_id });

  // Fetch change orders
  const changeOrders = await base44.entities.ChangeOrder.filter({ project_id });

  // Calculate Contract Value (original SOV)
  const contractValue = sovItems.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);

  // Signed Extras (approved change orders)
  const signedExtras = changeOrders
    .filter(co => co.status === 'approved')
    .reduce((sum, co) => sum + (co.cost_impact || 0), 0);

  // Total Contract = Original + Approved COs
  const totalContract = contractValue + signedExtras;

  // Earned to Date (from SOV percent complete)
  const earnedToDate = sovItems.reduce((sum, s) => 
    sum + ((s.scheduled_value || 0) * ((s.percent_complete || 0) / 100)), 0);

  // Billed to Date (from approved invoices stored in SOV)
  const billedToDate = sovItems.reduce((sum, s) => sum + (s.billed_to_date || 0), 0);

  // Remaining to Bill
  const remainingToBill = totalContract - billedToDate;

  // Over / Under Billed
  const overUnderBilled = billedToDate - earnedToDate;

  // Actual Cost to Date (paid/approved expenses)
  const actualCostToDate = expenses
    .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // Estimated Cost at Completion (scale cost by earned %)
  const percentComplete = totalContract > 0 ? (earnedToDate / totalContract) * 100 : 0;
  const estimatedCostAtCompletion = percentComplete > 0 
    ? (actualCostToDate / percentComplete) * 100 
    : actualCostToDate;

  // Profit metrics
  const projectedProfit = totalContract - estimatedCostAtCompletion;
  const projectedMargin = totalContract > 0 ? (projectedProfit / totalContract) * 100 : 0;

  return Response.json({
    project_id,
    contract_value: contractValue,
    signed_extras: signedExtras,
    total_contract: totalContract,
    earned_to_date: earnedToDate,
    billed_to_date: billedToDate,
    remaining_to_bill: remainingToBill,
    over_under_billed: overUnderBilled,
    actual_cost_to_date: actualCostToDate,
    estimated_cost_at_completion: estimatedCostAtCompletion,
    projected_profit: projectedProfit,
    projected_margin: projectedMargin,
    percent_complete: percentComplete
  });
});