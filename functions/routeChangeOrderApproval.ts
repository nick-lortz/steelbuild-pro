import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { changeOrderId, action, comments } = await req.json();

    // Fetch CO and project data
    const [changeOrder, allUsers] = await Promise.all([
      base44.entities.ChangeOrder.filter({ id: changeOrderId }).then(r => r[0]),
      base44.entities.User.list()
    ]);

    if (!changeOrder) {
      return Response.json({ error: 'Change order not found' }, { status: 404 });
    }

    const project = await base44.entities.Project.filter({ id: changeOrder.project_id }).then(r => r[0]);

    // Define approval workflow based on cost impact
    const costImpact = Math.abs(changeOrder.cost_impact || 0);
    let approvalChain = [];
    
    if (costImpact < 5000) {
      // Under $5K: PM approval only
      approvalChain = [project.project_manager];
    } else if (costImpact < 25000) {
      // $5K-$25K: PM + Superintendent
      approvalChain = [project.project_manager, project.superintendent];
    } else {
      // Over $25K: PM + Superintendent + Admin
      const admins = allUsers.filter(u => u.role === 'admin');
      approvalChain = [
        project.project_manager, 
        project.superintendent,
        ...(admins.length > 0 ? [admins[0].email] : [])
      ].filter(Boolean);
    }

    // Initialize or update approval tracking
    const currentApprovals = changeOrder.approval_chain || [];
    const currentStep = currentApprovals.length;

    if (action === 'approve') {
      const updatedApprovals = [
        ...currentApprovals,
        {
          approver: user.email,
          action: 'approved',
          timestamp: new Date().toISOString(),
          comments: comments || ''
        }
      ];

      const isFullyApproved = updatedApprovals.length >= approvalChain.length;
      
      await base44.asServiceRole.entities.ChangeOrder.update(changeOrderId, {
        approval_chain: updatedApprovals,
        status: isFullyApproved ? 'approved' : 'submitted',
        approved_date: isFullyApproved ? new Date().toISOString() : null,
        approved_by: isFullyApproved ? user.email : null
      });

      // Notify next approver or requester
      if (isFullyApproved) {
        await base44.integrations.Core.SendEmail({
          to: changeOrder.created_by,
          subject: `Change Order ${changeOrder.co_number} Approved`,
          body: `Your change order "${changeOrder.title}" for project ${project.project_number} has been fully approved.\n\nCost Impact: $${changeOrder.cost_impact?.toLocaleString()}\nSchedule Impact: ${changeOrder.schedule_impact_days} days\n\nFinal Approver: ${user.full_name || user.email}\nComments: ${comments || 'None'}`
        });

        // Update project budget if CO allocations exist
        if (changeOrder.sov_allocations?.length > 0) {
          for (const allocation of changeOrder.sov_allocations) {
            const sovItem = await base44.asServiceRole.entities.SOVItem.filter({ id: allocation.sov_item_id }).then(r => r[0]);
            if (sovItem) {
              await base44.asServiceRole.entities.SOVItem.update(sovItem.id, {
                scheduled_value: (sovItem.scheduled_value || 0) + allocation.amount
              });
            }
          }
        }
      } else {
        const nextApprover = approvalChain[currentStep + 1];
        if (nextApprover) {
          await base44.integrations.Core.SendEmail({
            to: nextApprover,
            subject: `Change Order ${changeOrder.co_number} Awaiting Your Approval`,
            body: `A change order requires your approval.\n\nProject: ${project.project_number} - ${project.name}\nTitle: ${changeOrder.title}\nCost Impact: $${changeOrder.cost_impact?.toLocaleString()}\nSchedule Impact: ${changeOrder.schedule_impact_days} days\n\nPrevious Approver: ${user.full_name || user.email}\nComments: ${comments || 'None'}\n\nPlease review in the Change Orders module.`
          });
        }
      }

      return Response.json({
        success: true,
        message: isFullyApproved ? 'Change order fully approved' : 'Approval recorded, routing to next approver',
        isFullyApproved,
        nextApprover: isFullyApproved ? null : approvalChain[currentStep + 1]
      });

    } else if (action === 'reject') {
      await base44.asServiceRole.entities.ChangeOrder.update(changeOrderId, {
        approval_chain: [
          ...currentApprovals,
          {
            approver: user.email,
            action: 'rejected',
            timestamp: new Date().toISOString(),
            comments: comments || ''
          }
        ],
        status: 'rejected'
      });

      await base44.integrations.Core.SendEmail({
        to: changeOrder.created_by,
        subject: `Change Order ${changeOrder.co_number} Rejected`,
        body: `Your change order "${changeOrder.title}" for project ${project.project_number} has been rejected.\n\nRejected by: ${user.full_name || user.email}\nReason: ${comments || 'No reason provided'}\n\nPlease revise and resubmit if necessary.`
      });

      return Response.json({
        success: true,
        message: 'Change order rejected'
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Approval routing error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});