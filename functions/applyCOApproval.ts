import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { change_order_id } = await req.json();

    // Get change order
    const changeOrders = await base44.entities.ChangeOrder.filter({ id: change_order_id });
    if (changeOrders.length === 0) {
      return Response.json({ error: 'Change order not found' }, { status: 404 });
    }

    const co = changeOrders[0];
    
    if (co.status !== 'approved') {
      return Response.json({ error: 'Change order must be approved first' }, { status: 400 });
    }

    const updates = {
      sov_items: [],
      financials: [],
      tasks: []
    };

    // 1. Update SOV item values (if allocations exist)
    if (co.sov_allocations && co.sov_allocations.length > 0) {
      for (const allocation of co.sov_allocations) {
        const sovItems = await base44.entities.SOVItem.filter({ id: allocation.sov_item_id });
        
        if (sovItems.length > 0) {
          const sovItem = sovItems[0];
          const newValue = sovItem.scheduled_value + allocation.amount;
          
          await base44.entities.SOVItem.update(sovItem.id, {
            scheduled_value: newValue
          });
          
          updates.sov_items.push({
            id: sovItem.id,
            code: sovItem.code,
            old_value: sovItem.scheduled_value,
            new_value: newValue,
            adjustment: allocation.amount
          });
        }
      }
    }

    // 2. Update Financial current_budget
    // Get all financials for this project
    const financials = await base44.entities.Financial.filter({
      project_id: co.project_id
    });

    for (const financial of financials) {
      const newBudget = financial.current_budget + (co.cost_impact || 0) / financials.length; // Split evenly
      
      await base44.entities.Financial.update(financial.id, {
        approved_changes: (financial.approved_changes || 0) + (co.cost_impact || 0) / financials.length,
        current_budget: newBudget
      });
      
      updates.financials.push({
        id: financial.id,
        cost_code_id: financial.cost_code_id,
        budget_increase: (co.cost_impact || 0) / financials.length
      });
    }

    // 3. Adjust task end_dates if schedule impact > 0
    if (co.schedule_impact_days > 0) {
      // Get linked tasks (if any) or all project tasks
      let tasksToAdjust = [];
      
      if (co.linked_rfi_ids && co.linked_rfi_ids.length > 0) {
        // Find tasks linked to same RFIs
        const allTasks = await base44.entities.Task.list();
        tasksToAdjust = allTasks.filter(t => 
          t.project_id === co.project_id &&
          t.linked_rfi_ids &&
          t.linked_rfi_ids.some(rfi => co.linked_rfi_ids.includes(rfi))
        );
      }

      // If no specific tasks, adjust all in-progress tasks
      if (tasksToAdjust.length === 0) {
        tasksToAdjust = await base44.entities.Task.filter({
          project_id: co.project_id,
          status: { $in: ['not_started', 'in_progress'] }
        });
      }

      for (const task of tasksToAdjust) {
        if (!task.end_date) continue;
        
        const currentEnd = new Date(task.end_date);
        const newEnd = new Date(currentEnd.getTime() + co.schedule_impact_days * 24 * 60 * 60 * 1000);
        
        await base44.entities.Task.update(task.id, {
          end_date: newEnd.toISOString().split('T')[0]
        });
        
        updates.tasks.push({
          id: task.id,
          name: task.name,
          old_end: task.end_date,
          new_end: newEnd.toISOString().split('T')[0],
          days_added: co.schedule_impact_days
        });
      }
    }

    // 4. Add to change order approval chain
    await base44.entities.ChangeOrder.update(co.id, {
      approval_chain: [
        ...(co.approval_chain || []),
        {
          approver: user.email,
          action: 'applied',
          timestamp: new Date().toISOString(),
          comments: 'Cascade updates applied via applyCOApproval'
        }
      ]
    });

    return Response.json({
      success: true,
      change_order_id: co.id,
      co_number: co.co_number,
      cost_impact: co.cost_impact,
      schedule_impact_days: co.schedule_impact_days,
      updates
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});