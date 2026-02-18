import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';

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
        await requireProjectAccess(base44, user, data.project_id);
        const created = await base44.asServiceRole.entities.Expense.create({
          ...data,
          amount: parseFloat(data.amount) || 0
        });

        // Update financial actuals
        if (data.cost_code_id) {
          const financials = await base44.asServiceRole.entities.Financial.filter({
            project_id: data.project_id,
            cost_code_id: data.cost_code_id
          });

          if (financials.length > 0) {
            const financial = financials[0];
            const newActual = (financial.actual_amount || 0) + (parseFloat(data.amount) || 0);
            await base44.asServiceRole.entities.Financial.update(financial.id, {
              actual_amount: newActual
            });
          }
        }

        return Response.json({ success: true, data: created });

      case 'update':
        const oldExpenses = await base44.asServiceRole.entities.Expense.filter({ id: data.id });
        if (oldExpenses.length === 0) {
          return Response.json({ error: 'Expense not found' }, { status: 404 });
        }
        const oldExpense = oldExpenses[0];
        await requireProjectAccess(base44, user, oldExpense.project_id);

        // FREEZE: Cannot modify paid expenses
        if (oldExpense.payment_status === 'paid' && data.updates.amount !== undefined) {
          return Response.json({ 
            error: 'Cannot modify amount of paid expense. Create adjustment entry instead.' 
          }, { status: 403 });
        }

        // Update expense
        await base44.asServiceRole.entities.Expense.update(data.id, data.updates);

        // Update financials if amount changed
        if (data.updates.amount !== undefined && oldExpense.cost_code_id) {
          const financials = await base44.asServiceRole.entities.Financial.filter({
            project_id: oldExpense.project_id,
            cost_code_id: oldExpense.cost_code_id
          });

          if (financials.length > 0) {
            const financial = financials[0];
            const delta = (parseFloat(data.updates.amount) || 0) - (oldExpense.amount || 0);
            const newActual = (financial.actual_amount || 0) + delta;
            await base44.asServiceRole.entities.Financial.update(financial.id, {
              actual_amount: newActual
            });
          }
        }

        return Response.json({ success: true });

      case 'delete':
        const expenseToDelete = await base44.asServiceRole.entities.Expense.filter({ id: data.id });
        if (expenseToDelete.length === 0) {
          return Response.json({ error: 'Expense not found' }, { status: 404 });
        }
        const expense = expenseToDelete[0];
        await requireProjectAccess(base44, user, expense.project_id);

        // FREEZE: Cannot delete paid expenses
        if (expense.payment_status === 'paid') {
          return Response.json({ 
            error: 'Cannot delete paid expense. Create reversal entry instead.' 
          }, { status: 403 });
        }

        // Update financials before deletion
        if (expense.cost_code_id) {
          const financials = await base44.asServiceRole.entities.Financial.filter({
            project_id: expense.project_id,
            cost_code_id: expense.cost_code_id
          });

          if (financials.length > 0) {
            const financial = financials[0];
            const newActual = (financial.actual_amount || 0) - (expense.amount || 0);
            await base44.asServiceRole.entities.Financial.update(financial.id, {
              actual_amount: Math.max(0, newActual)
            });
          }
        }

        await base44.asServiceRole.entities.Expense.delete(data.id);
        return Response.json({ success: true });

      default:
        return Response.json({ error: 'Invalid operation' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});