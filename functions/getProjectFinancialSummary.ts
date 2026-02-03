import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { validateInput, ProjectIdSchema } from './utils/validation.js';
import { handleFunctionError } from './utils/errorHandler.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const validation = validateInput(ProjectIdSchema, payload);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const { project_id } = validation.data;

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

  // Earned Value: sum of (scheduled value * percent complete)
  const earnedToDate = sovItems.reduce((sum, s) => 
    sum + ((s.scheduled_value || 0) * ((s.percent_complete || 0) / 100)), 0);

  // Billed to Date (cumulative billable invoices per SOV items)
  const billedToDate = sovItems.reduce((sum, s) => sum + (s.billed_to_date || 0), 0);

  // Remaining to Bill = Total Contract - Billed
  const remainingToBill = Math.max(0, totalContract - billedToDate);

  // Over / Under Billed: positive = ahead of schedule, negative = behind
  const overUnderBilled = billedToDate - earnedToDate;

  // Actual Cost to Date (paid/approved expenses)
  const actualCostToDate = expenses
    .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // Percent Complete based on earned value
  const percentComplete = totalContract > 0 ? (earnedToDate / totalContract) * 100 : 0;

  // Estimated Cost at Completion: EAC = Actual / % Complete
  // Only applies if we have actual spend and progress
  const estimatedCostAtCompletion = percentComplete > 0 
    ? actualCostToDate / (percentComplete / 100)
    : totalContract; // Default to contract value if no progress yet

  // Committed costs: sum all expenses (pending, approved, paid)
  // This represents cash obligation whether paid or not
  const committedCosts = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Cost Risk: difference between committed and actual paid
  // Shows cash exposure for unpaid/pending expenses
  const costRisk = committedCosts - actualCostToDate;

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
      committed_costs: committedCosts,
      cost_risk: costRisk,
      estimated_cost_at_completion: estimatedCostAtCompletion,
      projected_profit: projectedProfit,
      projected_margin: projectedMargin,
      percent_complete: percentComplete
    });
  } catch (error) {
    const { status, body } = handleFunctionError(error, 'getProjectFinancialSummary');
    return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
  }
});