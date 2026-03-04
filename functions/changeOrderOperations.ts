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
      case 'approve':
        // Fetch change order
        const changeOrder = await base44.asServiceRole.entities.ChangeOrder.filter({ 
          id: data.changeOrderId 
        });
        if (!changeOrder || changeOrder.length === 0) {
          return Response.json({ error: 'Change order not found' }, { status: 404 });
        }

        const co = changeOrder[0];
        
        // Verify project access (FIX CRIT-001: Check result, don't just call)
        const projects = await base44.asServiceRole.entities.Project.filter({ 
          id: co.project_id 
        });
        if (!projects || projects.length === 0) {
          return Response.json({ error: 'Project not found' }, { status: 404 });
        }

        const project = projects[0];
        const userHasAccess = 
          user.role === 'admin' ||
          project.project_manager === user.email ||
          project.superintendent === user.email ||
          (project.assigned_users && project.assigned_users.includes(user.email));

        if (!userHasAccess) {
          return Response.json({ 
            error: 'Forbidden: No access to this project' 
          }, { status: 403 });
        }

        // FIX HIGH-005: Check if already approved (idempotency)
        if (co.status === 'approved') {
          return Response.json({ 
            success: true, 
            message: 'Change order already approved',
            is_retry: true
          });
        }

        if (co.status !== 'submitted') {
          return Response.json({ 
            error: 'Change order must be in submitted status to approve' 
          }, { status: 400 });
        }

        // FIX HIGH-001: Validate SOV allocations before applying
        const allocation_errors = [];
        if (co.sov_allocations && Array.isArray(co.sov_allocations)) {
          for (const allocation of co.sov_allocations) {
            if (!allocation.sov_item_id) {
              allocation_errors.push('sov_item_id missing');
              continue;
            }
            if (!Number.isFinite(allocation.amount) || allocation.amount === 0) {
              allocation_errors.push(`Invalid amount for ${allocation.sov_item_id}: ${allocation.amount}`);
              continue;
            }
            if (allocation.amount < 0) {
              allocation_errors.push(`Negative amount not allowed: ${allocation.amount}. Use CO type=deduction.`);
            }
          }
        }

        if (allocation_errors.length > 0) {
          return Response.json({ 
            error: 'SOV allocation validation failed',
            details: allocation_errors
          }, { status: 400 });
        }

        // Update CO status
        await base44.asServiceRole.entities.ChangeOrder.update(co.id, {
          status: 'approved',
          approved_date: new Date().toISOString().split('T')[0],
          approved_by: user.email,
        });

        // Apply SOV allocations with error tracking
        const applied = [];
        if (co.sov_allocations && co.sov_allocations.length > 0) {
          for (const allocation of co.sov_allocations) {
            try {
              const sovItems = await base44.asServiceRole.entities.SOVItem.filter({ 
                id: allocation.sov_item_id 
              });
              if (!sovItems || sovItems.length === 0) {
                console.warn(`SOV item ${allocation.sov_item_id} not found, skipping`);
                continue;
              }

              const currentScheduledValue = sovItems[0].scheduled_value || 0;
              const newScheduledValue = currentScheduledValue + allocation.amount;

              await base44.asServiceRole.entities.SOVItem.update(allocation.sov_item_id, {
                scheduled_value: newScheduledValue,
              });
              applied.push(allocation.sov_item_id);
            } catch (error) {
              console.error(`Failed to update SOV item ${allocation.sov_item_id}:`, error.message);
            }
          }
        }

        return Response.json({ 
          success: true, 
          message: 'Change order approved and contract value updated',
          sov_items_updated: applied.length,
          is_retry: false
        });

      default:
        return Response.json({ error: 'Invalid operation' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});