/**
 * EXECUTION GATE EVALUATION LIBRARY
 * 
 * Evaluates fabrication, shipment, and install gates with enterprise-grade rigor.
 * Returns gate status, blockers, and required actions.
 */

export function evaluateFabricationGate(workPackage, rfis, submittals) {
  const blockers = [];
  const requiredActions = [];
  
  // Blocking RFI check
  if (workPackage.has_blocking_rfi) {
    const blockingRFIs = rfis.filter(r => 
      r.is_release_blocker && 
      workPackage.impacted_by_rfi_ids?.includes(r.id) &&
      !['answered', 'closed'].includes(r.status)
    );
    
    for (const rfi of blockingRFIs) {
      blockers.push({
        type: 'rfi',
        entity: 'RFI',
        entity_id: rfi.id,
        severity: 'blocking',
        reason: `RFI #${rfi.rfi_number}: ${rfi.subject}`
      });
    }
    
    if (blockingRFIs.length > 0) {
      requiredActions.push('Close blocking RFI(s)');
    }
  }
  
  // Submittal approval check
  const pendingSubmittals = submittals.filter(s => 
    workPackage.linked_submittal_ids?.includes(s.id) &&
    !['approved', 'approved_as_noted', 'closed'].includes(s.status)
  );
  
  if (pendingSubmittals.length > 0) {
    for (const sub of pendingSubmittals) {
      blockers.push({
        type: 'submittal',
        entity: 'Submittal',
        entity_id: sub.id,
        severity: 'high',
        reason: `Submittal pending: ${sub.title || sub.submittal_number}`
      });
    }
    requiredActions.push('Approve submittals');
  }
  
  // VIF check
  if (!workPackage.vif_confirmed) {
    blockers.push({
      type: 'vif',
      entity: 'WorkPackage',
      entity_id: workPackage.id,
      severity: 'high',
      reason: 'VIF not confirmed'
    });
    requiredActions.push('Confirm VIF');
  }
  
  // Install readiness score
  const readinessScore = workPackage.install_readiness_score || 0;
  if (readinessScore < 85) {
    blockers.push({
      type: 'readiness',
      entity: 'WorkPackage',
      entity_id: workPackage.id,
      severity: readinessScore < 70 ? 'blocking' : 'high',
      reason: `Install readiness: ${readinessScore}% (requires 85%)`
    });
    requiredActions.push('Resolve install readiness blockers');
  }
  
  // Determine gate status
  const hasCritical = blockers.some(b => b.severity === 'critical' || b.severity === 'blocking');
  const gateStatus = hasCritical ? 'blocked' : (blockers.length > 0 ? 'conditional' : 'open');
  
  return {
    gate_type: 'fabricate',
    gate_status: gateStatus,
    blockers,
    required_actions: requiredActions
  };
}

export function evaluateShipmentGate(delivery, workPackages, rfis) {
  const blockers = [];
  const requiredActions = [];
  
  // Sequencing validity
  if (delivery.sequencing_valid === false) {
    blockers.push({
      type: 'sequencing',
      entity: 'Delivery',
      entity_id: delivery.id,
      severity: 'blocking',
      reason: 'Load sequencing mismatch - install order violation'
    });
    requiredActions.push('Align install day / sequence group');
  }
  
  // Staging confirmation
  if (!delivery.staged_confirmed) {
    blockers.push({
      type: 'staging',
      entity: 'Delivery',
      entity_id: delivery.id,
      severity: 'high',
      reason: 'Staging not confirmed'
    });
    requiredActions.push('Confirm staging');
  }
  
  // Load list verification
  if (!delivery.load_list_verified) {
    blockers.push({
      type: 'load_list',
      entity: 'Delivery',
      entity_id: delivery.id,
      severity: 'high',
      reason: 'Load list not verified'
    });
    requiredActions.push('Verify load list');
  }
  
  // Check WPs on this delivery
  const wpsOnDelivery = workPackages.filter(wp => 
    delivery.work_package_ids?.includes(wp.id)
  );
  
  for (const wp of wpsOnDelivery) {
    // Install ready check
    if (!wp.install_ready) {
      blockers.push({
        type: 'wp_not_ready',
        entity: 'WorkPackage',
        entity_id: wp.id,
        severity: 'blocking',
        reason: `WP ${wp.wpid} not install ready`
      });
      requiredActions.push('Resolve WP install readiness blockers');
    }
    
    // Blocking RFI check
    if (wp.has_blocking_rfi) {
      const blockingRFIs = rfis.filter(r => 
        r.is_install_blocker &&
        wp.impacted_by_rfi_ids?.includes(r.id) &&
        !['answered', 'closed'].includes(r.status)
      );
      
      for (const rfi of blockingRFIs) {
        blockers.push({
          type: 'rfi',
          entity: 'RFI',
          entity_id: rfi.id,
          severity: 'blocking',
          reason: `WP ${wp.wpid} blocked by RFI #${rfi.rfi_number}`
        });
      }
    }
  }
  
  if (wpsOnDelivery.some(wp => !wp.install_ready || wp.has_blocking_rfi)) {
    requiredActions.push('Resolve WP install readiness blockers');
  }
  
  const hasCritical = blockers.some(b => b.severity === 'critical' || b.severity === 'blocking');
  const gateStatus = hasCritical ? 'blocked' : (blockers.length > 0 ? 'conditional' : 'open');
  
  return {
    gate_type: 'ship',
    gate_status: gateStatus,
    blockers,
    required_actions: [...new Set(requiredActions)]
  };
}

export function evaluateInstallGate(delivery, workPackages, rfis) {
  const blockers = [];
  const requiredActions = [];
  
  // Delivery installability
  if (delivery.is_installable_delivery === false) {
    blockers.push({
      type: 'delivery_not_installable',
      entity: 'Delivery',
      entity_id: delivery.id,
      severity: 'blocking',
      reason: 'Delivery legality check failed'
    });
    requiredActions.push('Confirm delivery legality');
  }
  
  // Check each WP on delivery
  const wpsOnDelivery = workPackages.filter(wp => 
    delivery.work_package_ids?.includes(wp.id)
  );
  
  for (const wp of wpsOnDelivery) {
    // Install ready
    if (!wp.install_ready) {
      blockers.push({
        type: 'wp_not_ready',
        entity: 'WorkPackage',
        entity_id: wp.id,
        severity: 'blocking',
        reason: `WP ${wp.wpid} not install ready`
      });
    }
    
    // Critical install-blocking RFIs
    const criticalInstallRFIs = rfis.filter(r => 
      r.is_install_blocker &&
      wp.impacted_by_rfi_ids?.includes(r.id) &&
      !['answered', 'closed'].includes(r.status) &&
      r.impact_severity === 'blocking'
    );
    
    for (const rfi of criticalInstallRFIs) {
      blockers.push({
        type: 'rfi',
        entity: 'RFI',
        entity_id: rfi.id,
        severity: 'critical',
        reason: `Critical RFI #${rfi.rfi_number}: ${rfi.subject}`
      });
    }
    
    // Date mismatch check
    if (delivery.install_day && wp.install_day && delivery.install_day !== wp.install_day) {
      blockers.push({
        type: 'date_mismatch',
        entity: 'WorkPackage',
        entity_id: wp.id,
        severity: 'high',
        reason: `Date mismatch: Delivery ${delivery.install_day} vs WP ${wp.install_day}`
      });
      requiredActions.push('Align delivery and WP install dates');
    }
  }
  
  if (wpsOnDelivery.some(wp => !wp.install_ready)) {
    requiredActions.push('Resolve install blockers');
  }
  
  if (rfis.some(r => r.is_install_blocker && !['answered', 'closed'].includes(r.status))) {
    requiredActions.push('Close/install-disposition blocking RFIs');
  }
  
  const hasCritical = blockers.some(b => b.severity === 'critical' || b.severity === 'blocking');
  const gateStatus = hasCritical ? 'blocked' : (blockers.length > 0 ? 'conditional' : 'open');
  
  return {
    gate_type: 'install',
    gate_status: gateStatus,
    blockers,
    required_actions: [...new Set(requiredActions)]
  };
}