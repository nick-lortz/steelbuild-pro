/**
 * Helper: Evaluate delivery sequencing legality against WPs
 * Returns computed fields for Delivery entity
 */
export async function evaluateDeliverySequencing(delivery, workPackages, project) {
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
      installable_blocking_entity_ids: []
    };
  }

  // Rule 1: Install day mismatch
  const allowOutOfSeq = project?.settings?.delivery_sequencing?.allow_ship_out_of_sequence === true;
  if (!allowOutOfSeq && delivery.install_day) {
    for (const wp of workPackages) {
      if (!wp.install_day || wp.install_day !== delivery.install_day) {
        const mismatch = `Install day mismatch: Delivery ${delivery.install_day} vs ${wp.wpid} ${wp.install_day || 'null'}`;
        reasons.push(mismatch);
        blockingIds.push(wp.id);
      }
    }
  }

  // Rule 2: Sequence group mismatch
  if (delivery.sequence_group) {
    for (const wp of workPackages) {
      if (!wp.sequence_group || wp.sequence_group !== delivery.sequence_group) {
        const mismatch = `Sequence group mismatch: Delivery ${delivery.sequence_group} vs ${wp.wpid} ${wp.sequence_group || 'null'}`;
        reasons.push(mismatch);
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

  // Rule 5: Install readiness fails
  const nonReadyWps = workPackages.filter(wp => wp.install_ready === false);
  if (nonReadyWps.length > 0) {
    const ids = nonReadyWps.map(w => w.wpid).join(', ');
    reasons.push(`Contains non-install-ready WP(s): ${ids}`);
    blockingIds.push(...nonReadyWps.map(w => w.id));
  }

  const sequencingValid = reasons.length === 0;

  // Compute is_installable_delivery
  let installable = false;
  if (sequencingValid) {
    // Check staging confirmation if required
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