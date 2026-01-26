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
        // Validate project exists and user has access
        const projects = await base44.asServiceRole.entities.Project.filter({ id: data.project_id });
        if (projects.length === 0) {
          return Response.json({ error: 'Invalid project_id' }, { status: 400 });
        }

        const project = projects[0];
        const hasAccess = user.role === 'admin' || 
          project.project_manager === user.email || 
          project.superintendent === user.email ||
          (project.assigned_users && project.assigned_users.includes(user.email));

        if (!hasAccess) {
          return Response.json({ error: 'Access denied to this project' }, { status: 403 });
        }

        // Create expense
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

        // Verify user has access to the project
        const updateProjects = await base44.asServiceRole.entities.Project.filter({ id: oldExpense.project_id });
        if (!updateProjects.length) {
          return Response.json({ error: 'Project not found' }, { status: 404 });
        }
        
        const updateProject = updateProjects[0];
        const updateAccess = user.role === 'admin' || 
          updateProject.project_manager === user.email || 
          updateProject.superintendent === user.email ||
          (updateProject.assigned_users && updateProject.assigned_users.includes(user.email));

        if (!updateAccess) {
          return Response.json({ error: 'Access denied to this project' }, { status: 403 });
        }

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

        // Verify user has access to the project
        const deleteProjects = await base44.asServiceRole.entities.Project.filter({ id: expense.project_id });
        if (!deleteProjects.length) {
          return Response.json({ error: 'Project not found' }, { status: 404 });
        }
        
        const deleteProject = deleteProjects[0];
        const deleteAccess = user.role === 'admin' || 
          deleteProject.project_manager === user.email || 
          deleteProject.superintendent === user.email ||
          (deleteProject.assigned_users && deleteProject.assigned_users.includes(user.email));

        if (!deleteAccess) {
          return Response.json({ error: 'Access denied to this project' }, { status: 403 });
        }

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