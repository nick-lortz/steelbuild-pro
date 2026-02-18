import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireProjectAccess } from './utils/requireProjectAccess.js';

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
    
    await requireProjectAccess(base44, user, project_id);

    const created = [];
    const cleared = [];

    // 1. RFI_RESPONSE_REQUIRED: Open RFIs linked to drawing sets/work packages
    const openRFIs = await base44.asServiceRole.entities.RFI.filter({
      project_id,
      status: { $in: ['draft', 'submitted', 'under_review'] }
    });

    for (const rfi of openRFIs) {
      const drawingSetIds = rfi.linked_drawing_set_ids || [];
      
      // Find work packages using these drawing sets
      const affectedWPs = await base44.asServiceRole.entities.WorkPackage.filter({
        project_id,
        linked_drawing_set_ids: { $in: drawingSetIds }
      });

      for (const wp of affectedWPs) {
        // Upsert constraint
        const existing = await base44.asServiceRole.entities.Constraint.filter({
          project_id,
          work_package_id: wp.id,
          constraint_type: 'RFI_RESPONSE_REQUIRED',
          evidence_links: rfi.id
        });

        if (existing.length === 0) {
          const constraint = await base44.asServiceRole.entities.Constraint.create({
            project_id,
            scope_type: 'WORK_PACKAGE',
            work_package_id: wp.id,
            constraint_type: 'RFI_RESPONSE_REQUIRED',
            status: 'OPEN',
            severity: 'BLOCKER',
            owner_role: 'PM',
            due_date: rfi.due_date,
            notes: `RFI #${rfi.rfi_number}: ${rfi.subject}`,
            evidence_links: [rfi.id],
            created_by_user_id: user.email
          });
          created.push(constraint.id);
        }
      }
    }

    // Clear RFI constraints if RFI is answered/closed
    const answeredRFIs = await base44.asServiceRole.entities.RFI.filter({
      project_id,
      status: { $in: ['answered', 'closed'] }
    });

    for (const rfi of answeredRFIs) {
      const constraintsToClose = await base44.asServiceRole.entities.Constraint.filter({
        project_id,
        constraint_type: 'RFI_RESPONSE_REQUIRED',
        status: 'OPEN',
        evidence_links: rfi.id
      });

      for (const c of constraintsToClose) {
        await base44.asServiceRole.entities.Constraint.update(c.id, {
          status: 'CLEARED',
          cleared_by_user_id: user.email,
          cleared_at: new Date().toISOString()
        });
        cleared.push(c.id);
      }
    }

    // 2. DRAWING_REVISION_REQUIRED: Pending revisions
    const drawingSets = await base44.asServiceRole.entities.DrawingSet.filter({
      project_id,
      status: { $ne: 'FFF' }
    });

    for (const ds of drawingSets) {
      const affectedWPs = await base44.asServiceRole.entities.WorkPackage.filter({
        project_id,
        linked_drawing_set_ids: ds.id
      });

      for (const wp of affectedWPs) {
        const existing = await base44.asServiceRole.entities.Constraint.filter({
          project_id,
          work_package_id: wp.id,
          constraint_type: 'DRAWING_REVISION_REQUIRED',
          evidence_links: ds.id
        });

        if (existing.length === 0) {
          const constraint = await base44.asServiceRole.entities.Constraint.create({
            project_id,
            scope_type: 'WORK_PACKAGE',
            work_package_id: wp.id,
            constraint_type: 'DRAWING_REVISION_REQUIRED',
            status: 'OPEN',
            severity: 'BLOCKER',
            owner_role: 'DETAILING',
            notes: `Drawing set ${ds.set_number} not FFF (${ds.status})`,
            evidence_links: [ds.id],
            created_by_user_id: user.email
          });
          created.push(constraint.id);
        }
      }
    }

    // Clear drawing constraints if set is FFF
    const fffDrawingSets = await base44.asServiceRole.entities.DrawingSet.filter({
      project_id,
      status: 'FFF'
    });

    for (const ds of fffDrawingSets) {
      const constraintsToClose = await base44.asServiceRole.entities.Constraint.filter({
        project_id,
        constraint_type: 'DRAWING_REVISION_REQUIRED',
        status: 'OPEN',
        evidence_links: ds.id
      });

      for (const c of constraintsToClose) {
        await base44.asServiceRole.entities.Constraint.update(c.id, {
          status: 'CLEARED',
          cleared_by_user_id: user.email,
          cleared_at: new Date().toISOString()
        });
        cleared.push(c.id);
      }
    }

    // 3. MATERIAL_ON_SITE_REQUIRED: Deliveries not received
    const pendingDeliveries = await base44.asServiceRole.entities.Delivery.filter({
      project_id,
      delivery_status: { $nin: ['received', 'closed'] }
    });

    for (const delivery of pendingDeliveries) {
      const linkedWPIds = delivery.linked_work_package_ids || [];
      
      for (const wpId of linkedWPIds) {
        const existing = await base44.asServiceRole.entities.Constraint.filter({
          project_id,
          work_package_id: wpId,
          constraint_type: 'MATERIAL_ON_SITE_REQUIRED',
          evidence_links: delivery.id
        });

        if (existing.length === 0) {
          const constraint = await base44.asServiceRole.entities.Constraint.create({
            project_id,
            scope_type: 'WORK_PACKAGE',
            work_package_id: wpId,
            constraint_type: 'MATERIAL_ON_SITE_REQUIRED',
            status: 'OPEN',
            severity: 'BLOCKER',
            owner_role: 'FAB',
            due_date: delivery.scheduled_date,
            notes: `Delivery ${delivery.delivery_number} - ${delivery.package_name}`,
            evidence_links: [delivery.id],
            created_by_user_id: user.email
          });
          created.push(constraint.id);
        }
      }
    }

    // Clear material constraints if delivery received
    const receivedDeliveries = await base44.asServiceRole.entities.Delivery.filter({
      project_id,
      delivery_status: { $in: ['received', 'closed'] }
    });

    for (const delivery of receivedDeliveries) {
      const constraintsToClose = await base44.asServiceRole.entities.Constraint.filter({
        project_id,
        constraint_type: 'MATERIAL_ON_SITE_REQUIRED',
        status: 'OPEN',
        evidence_links: delivery.id
      });

      for (const c of constraintsToClose) {
        await base44.asServiceRole.entities.Constraint.update(c.id, {
          status: 'CLEARED',
          cleared_by_user_id: user.email,
          cleared_at: new Date().toISOString()
        });
        cleared.push(c.id);
      }
    }

    // 4. FABRICATION_COMPLETE_REQUIRED: Fab not complete
    const incompleteFab = await base44.asServiceRole.entities.Fabrication.filter({
      project_id,
      status: { $nin: ['ready_to_ship', 'shipped', 'installed', 'closed'] }
    });

    for (const fab of incompleteFab) {
      // Find tasks/WPs linked to this fabrication
      const linkedWPIds = fab.linked_work_package_ids || [];
      
      for (const wpId of linkedWPIds) {
        const existing = await base44.asServiceRole.entities.Constraint.filter({
          project_id,
          work_package_id: wpId,
          constraint_type: 'FABRICATION_COMPLETE_REQUIRED',
          evidence_links: fab.id
        });

        if (existing.length === 0) {
          const constraint = await base44.asServiceRole.entities.Constraint.create({
            project_id,
            scope_type: 'WORK_PACKAGE',
            work_package_id: wpId,
            constraint_type: 'FABRICATION_COMPLETE_REQUIRED',
            status: 'OPEN',
            severity: 'BLOCKER',
            owner_role: 'FAB',
            notes: `Fabrication ${fab.piece_mark} - ${fab.status}`,
            evidence_links: [fab.id],
            created_by_user_id: user.email
          });
          created.push(constraint.id);
        }
      }
    }

    return Response.json({
      success: true,
      project_id,
      constraints_created: created.length,
      constraints_cleared: cleared.length,
      created_ids: created,
      cleared_ids: cleared
    });

  } catch (error) {
    console.error('Sync constraints error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});