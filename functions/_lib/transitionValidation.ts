/**
 * WorkPackage transition validation rules
 */
export async function validateWPTransition(wp, targetStatus, base44) {
  const reasons = [];
  const blockingIds = [];
  const recommendations = [];

  // Block on install-related transitions if install_ready=false
  const installTransitions = ['shipped', 'installed'];
  if (installTransitions.includes(targetStatus?.toLowerCase())) {
    if (wp.install_ready === false) {
      reasons.push('Work Package is not install-ready');
      blockingIds.push(...(wp.blocking_entity_ids || []));
      recommendations.push('Resolve readiness blockers in the Install Readiness panel');
    }
  }

  // Block if blocking RFI open
  if (wp.has_blocking_rfi === true) {
    reasons.push('Blocking RFI(s) are open');
    blockingIds.push(...(wp.open_rfi_ids || []));
    recommendations.push('Close or disposition blocking RFIs before proceeding');
  }

  // Block ship/install if no valid delivery linked
  if (installTransitions.includes(targetStatus?.toLowerCase())) {
    if (!wp.linked_delivery_ids || wp.linked_delivery_ids.length === 0) {
      reasons.push('No delivery linked to this work package');
      recommendations.push('Assign delivery before shipping/installing');
    } else {
      // Check if any linked delivery is sequencing_valid
      const deliveries = await base44.asServiceRole.entities.Delivery.filter({
        id: { $in: wp.linked_delivery_ids }
      });
      const hasValidDelivery = deliveries.some(d => d.sequencing_valid === true);
      if (!hasValidDelivery) {
        reasons.push('No sequencing-valid delivery linked');
        blockingIds.push(...wp.linked_delivery_ids);
        recommendations.push('Fix delivery sequencing, verify load list, confirm staging');
      }
    }
  }

  return {
    canTransition: reasons.length === 0,
    reasons,
    blockingIds: [...new Set(blockingIds)],
    recommendations
  };
}

/**
 * Delivery transition validation rules
 */
export async function validateDeliveryTransition(delivery, targetStatus, base44) {
  const reasons = [];
  const blockingIds = [];
  const recommendations = [];

  // Block ship/install transitions if sequencing invalid
  const shipTransitions = ['shipped', 'in_transit'];
  const installTransitions = ['in_transit', 'arrived_on_site'];

  if (shipTransitions.includes(targetStatus?.toLowerCase())) {
    if (delivery.sequencing_valid !== true) {
      reasons.push('Delivery is out of sequence or missing verification');
      blockingIds.push(...(delivery.sequencing_blocking_entity_ids || []));
      recommendations.push('Verify load list, match install day/sequence group, resolve WP blockers');
    }
  }

  // Block if contains non-install-ready WPs
  if (installTransitions.includes(targetStatus?.toLowerCase())) {
    if (delivery.delivery_contains_non_install_ready === true) {
      reasons.push('Delivery contains non-install-ready work packages');
      blockingIds.push(...(delivery.work_package_ids || []));
      recommendations.push('Resolve work package readiness blockers before installing');
    }
  }

  // Block if staging required but not confirmed
  if (installTransitions.includes(targetStatus?.toLowerCase())) {
    const wps = delivery.work_package_ids
      ? await base44.asServiceRole.entities.WorkPackage.filter({
          id: { $in: delivery.work_package_ids }
        })
      : [];
    const stagingRequired = wps.some(wp => wp.staging_required !== false);
    if (stagingRequired && delivery.staged_confirmed !== true) {
      reasons.push('Staging not confirmed');
      recommendations.push('Confirm staging location and verify pieces on site');
    }
  }

  return {
    canTransition: reasons.length === 0,
    reasons,
    blockingIds: [...new Set(blockingIds)],
    recommendations
  };
}