import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { evaluateDeliverySequencing } from './_lib/evaluateDeliverySequencing.js';

/**
 * Recalculate delivery legality against sequencing rules
 * Called from propagateRFIImpacts and install readiness engine
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { delivery_id } = await req.json();
    if (!delivery_id) {
      return Response.json({ error: 'Missing delivery_id' }, { status: 400 });
    }

    // Fetch delivery
    const deliveries = await base44.entities.Delivery.filter({ id: delivery_id });
    if (!deliveries.length) return Response.json({ error: 'Delivery not found' }, { status: 404 });
    const delivery = deliveries[0];

    // Verify project access
    const currentProjects = user.project_ids || [];
    if (!currentProjects.includes(delivery.project_id)) {
      return Response.json({ error: 'Access denied to project' }, { status: 403 });
    }

    // Fetch WPs on this delivery
    const wpIds = delivery.work_package_ids || [];
    const workPackages = wpIds.length > 0
      ? await base44.asServiceRole.entities.WorkPackage.filter({ id: { $in: wpIds } })
      : [];

    // Fetch project
    const projects = await base44.asServiceRole.entities.Project.filter({ id: delivery.project_id });
    const project = projects.length > 0 ? projects[0] : {};

    // Evaluate sequencing
    const computed = await evaluateDeliverySequencing(delivery, workPackages, project);

    // Update delivery with computed fields
    await base44.asServiceRole.entities.Delivery.update(delivery_id, {
      sequencing_valid: computed.sequencing_valid,
      sequencing_block_reasons: computed.sequencing_block_reasons,
      sequencing_blocking_entity_ids: computed.sequencing_blocking_entity_ids,
      is_installable_delivery: computed.is_installable_delivery,
      installable_reasons: computed.installable_reasons,
      installable_blocking_entity_ids: computed.installable_blocking_entity_ids,
      delivery_contains_non_install_ready: computed.delivery_contains_non_install_ready
    });

    return Response.json({
      delivery_id,
      delivery_number: delivery.delivery_number,
      sequencing_valid: computed.sequencing_valid,
      is_installable: computed.is_installable_delivery,
      blocking_reasons: computed.sequencing_block_reasons,
      wp_count: workPackages.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delivery legality recalculation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});