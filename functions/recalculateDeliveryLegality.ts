import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Recalculate delivery legality against sequencing rules
 * Called from propagateRFIImpacts, install readiness engine, and entity automation on Delivery update.
 */

function evaluateDeliverySequencing(delivery, workPackages, project) {
  const reasons = [];
  const blockingIds = [];
  const installableReasons = [];
  const installableBlockingIds = [];

  if (!delivery || !workPackages || !workPackages.length) {
    return {
      sequencing_valid: false,
      sequencing_block_reasons: ['No work packages on delivery'],
      sequencing_blocking_entity_ids: [],
      is_installable_delivery: false,
      installable_reasons: ['No work packages on delivery'],
      installable_blocking_entity_ids: [],
      delivery_contains_non_install_ready: false
    };
  }

  // Rule 1: Install day mismatch
  const allowOutOfSeq = project?.settings?.delivery_sequencing?.allow_ship_out_of_sequence === true;
  if (!allowOutOfSeq && delivery.install_day) {
    for (const wp of workPackages) {
      if (!wp.install_day || wp.install_day !== delivery.install_day) {
        reasons.push(`Install day mismatch: Delivery ${delivery.install_day} vs ${wp.wpid} ${wp.install_day || 'null'}`);
        blockingIds.push(wp.id);
      }
    }
  }

  // Rule 2: Sequence group mismatch
  if (delivery.sequence_group) {
    for (const wp of workPackages) {
      if (!wp.sequence_group || wp.sequence_group !== delivery.sequence_group) {
        reasons.push(`Sequence group mismatch: Delivery ${delivery.sequence_group} vs ${wp.wpid} ${wp.sequence_group || 'null'}`);
        blockingIds.push(wp.id);
      }
    }
  }

  // Rule 3: Missing required pieces
  for (const wp of workPackages) {
    if (wp.required_piece_ids && wp.required_piece_ids.length > 0) {
      const deliveryPieces = delivery.piece_ids || [];
      const missingPieces = wp.required_piece_ids.filter(pid => !deliveryPieces.includes(pid));
      if (missingPieces.length > 0) {
        reasons.push(`Missing pieces for ${wp.wpid}: ${missingPieces.join(', ')}`);
        blockingIds.push(wp.id);
      }
    } else if (wp.required_pieces_count > 0) {
      if ((delivery.piece_ids?.length || 0) < wp.required_pieces_count) {
        reasons.push(`Missing pieces for ${wp.wpid}: Have ${delivery.piece_ids?.length || 0}, need ${wp.required_pieces_count}`);
        blockingIds.push(wp.id);
      }
    }
  }

  // Rule 4: Load list not verified
  if (!delivery.load_list_verified) {
    reasons.push('Load list not verified');
  }

  // Rule 5: Install readiness
  const nonReadyWps = workPackages.filter(wp => wp.install_ready === false);
  if (nonReadyWps.length > 0) {
    reasons.push(`Contains non-install-ready WP(s): ${nonReadyWps.map(w => w.wpid).join(', ')}`);
    blockingIds.push(...nonReadyWps.map(w => w.id));
  }

  const sequencingValid = reasons.length === 0;

  // Compute is_installable_delivery
  let installable = false;
  if (sequencingValid) {
    const stagingRequired = workPackages.some(wp => wp.staging_required !== false);
    if (stagingRequired && !delivery.staged_confirmed) {
      installableReasons.push('Staging not confirmed');
      installableBlockingIds.push(delivery.id);
    } else if (
      ['staged', 'shipped', 'in_transit', 'arrived_on_site'].includes(delivery.delivery_status) &&
      nonReadyWps.length === 0
    ) {
      installable = true;
    } else if (delivery.delivery_status === 'draft' || delivery.delivery_status === 'requested') {
      installableReasons.push(`Delivery status "${delivery.delivery_status}" not ready for install`);
      installableBlockingIds.push(delivery.id);
    }
  } else {
    installableReasons.push(...reasons);
    installableBlockingIds.push(...blockingIds);
  }

  return {
    sequencing_valid: sequencingValid,
    sequencing_block_reasons: reasons,
    sequencing_blocking_entity_ids: blockingIds,
    is_installable_delivery: installable,
    installable_reasons: installableReasons,
    installable_blocking_entity_ids: installableBlockingIds,
    delivery_contains_non_install_ready: nonReadyWps.length > 0
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Support both direct calls and entity automation payload
    let body = {};
    try { body = await req.json(); } catch (_) {}

    const delivery_id = body.delivery_id || body.data?.id || body.event?.entity_id;
    if (!delivery_id) {
      return Response.json({ error: 'Missing delivery_id' }, { status: 400 });
    }

    // Fetch delivery as service role (automation has no user context)
    const deliveries = await base44.asServiceRole.entities.Delivery.filter({ id: delivery_id });
    if (!deliveries.length) return Response.json({ error: 'Delivery not found' }, { status: 404 });
    const delivery = deliveries[0];

    // Fetch WPs and project in parallel
    const wpIds = delivery.work_package_ids || [];
    const [workPackages, projects] = await Promise.all([
      wpIds.length > 0
        ? base44.asServiceRole.entities.WorkPackage.filter({ id: { $in: wpIds } })
        : Promise.resolve([]),
      base44.asServiceRole.entities.Project.filter({ id: delivery.project_id })
    ]);
    const project = projects[0] || {};

    const computed = evaluateDeliverySequencing(delivery, workPackages, project);

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