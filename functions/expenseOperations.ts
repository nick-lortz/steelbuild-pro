import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { operation, data } = await req.json();

    switch (operation) {
      case 'create':
        const created = await base44.asServiceRole.entities.Expense.create(data);
        
        // INTEGRITY: Update Financial actual_amount (Expenses are source of truth)
        if (data.cost_code_id && (data.payment_status === 'paid' || data.payment_status === 'approved')) {
          const allExpenses = await base44.asServiceRole.entities.Expense.filter({
            project_id: data.project_id,
            cost_code_id: data.cost_code_id
          });
          const actualTotal = allExpenses
            .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
            .reduce((sum, e) => sum + (e.amount || 0), 0);
          
          const financials = await base44.asServiceRole.entities.Financial.filter({
            project_id: data.project_id,
            cost_code_id: data.cost_code_id
          });
          
          if (financials.length > 0) {
            await base44.asServiceRole.entities.Financial.update(financials[0].id, {
              actual_amount: actualTotal
            });
          }
        }
        
        return Response.json({ success: true, data: created });

      case 'update':
        await base44.asServiceRole.entities.Expense.update(data.id, data.updates);
        
        // INTEGRITY: Recalculate Financial actual_amount if status changed
        const updatedExpense = await base44.asServiceRole.entities.Expense.filter({ id: data.id });
        if (updatedExpense.length > 0 && updatedExpense[0].cost_code_id) {
          const allExpenses = await base44.asServiceRole.entities.Expense.filter({
            project_id: updatedExpense[0].project_id,
            cost_code_id: updatedExpense[0].cost_code_id
          });
          const actualTotal = allExpenses
            .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
            .reduce((sum, e) => sum + (e.amount || 0), 0);
          
          const financials = await base44.asServiceRole.entities.Financial.filter({
            project_id: updatedExpense[0].project_id,
            cost_code_id: updatedExpense[0].cost_code_id
          });
          
          if (financials.length > 0) {
            await base44.asServiceRole.entities.Financial.update(financials[0].id, {
              actual_amount: actualTotal
            });
          }
        }
        
        return Response.json({ success: true });

      case 'delete':
        const expenseToDelete = await base44.asServiceRole.entities.Expense.filter({ id: data.id });
        await base44.asServiceRole.entities.Expense.delete(data.id);
        
        // INTEGRITY: Recalculate Financial actual_amount after deletion
        if (expenseToDelete.length > 0 && expenseToDelete[0].cost_code_id) {
          const allExpenses = await base44.asServiceRole.entities.Expense.filter({
            project_id: expenseToDelete[0].project_id,
            cost_code_id: expenseToDelete[0].cost_code_id
          });
          const actualTotal = allExpenses
            .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
            .reduce((sum, e) => sum + (e.amount || 0), 0);
          
          const financials = await base44.asServiceRole.entities.Financial.filter({
            project_id: expenseToDelete[0].project_id,
            cost_code_id: expenseToDelete[0].cost_code_id
          });
          
          if (financials.length > 0) {
            await base44.asServiceRole.entities.Financial.update(financials[0].id, {
              actual_amount: actualTotal
            });
          }
        }
        
        return Response.json({ success: true });

      default:
        return Response.json({ error: 'Invalid operation' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});