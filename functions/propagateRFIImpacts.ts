import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Propagate RFI impacts to Work Packages and Deliveries
 * Automatically triggered when RFI changes
 * Updates WP/Delivery with open RFI rollups and install readiness flags
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rfi_id } = await req.json();
    if (!rfi_id) {
      return Response.json({ error: 'Missing rfi_id' }, { status: 400 });
    }

    // Fetch RFI
    const rfis = await base44.entities.RFI.filter({ id: rfi_id });
    if (!rfis.length) return Response.json({ error: 'RFI not found' }, { status: 404 });
    const rfi = rfis[0];

    // Verify user has access to project
    const currentProjects = user.project_ids || [];
    if (!currentProjects.includes(rfi.project_id)) {
      return Response.json({ error: 'Access denied to project' }, { status: 403 });
    }

    // FIND IMPACTED WPs
    const impactedWpIds = new Set();

    // A) Direct WP links
    if (rfi.affects_work_package_ids && rfi.affects_work_package_ids.length > 0) {
      rfi.affects_work_package_ids.forEach(id => impactedWpIds.add(id));
    }

    // B) Drawing/Detail links
    if (rfi.linked_drawing_set_ids && rfi.linked_drawing_set_ids.length > 0) {
      const wps = await base44.asServiceRole.entities.WorkPackage.filter({
        project_id: rfi.project_id,
        linked_drawing_set_ids: { $in: rfi.linked_drawing_set_ids }
      });
      wps.forEach(wp => impactedWpIds.add(wp.id));
    }

    // C) Release group links
    if (rfi.affects_release_group_id) {
      // Find WPs referencing this release group (if WP has fab_release_group_id field)
      // For now, use direct tagging approach
    }

    // UPDATE IMPACTED WPs
    const updatedWps = [];
    for (const wpId of impactedWpIds) {
      const wps = await base44.asServiceRole.entities.WorkPackage.filter({ id: wpId });
      if (!wps.length) continue;
      const wp = wps[0];

      // Find all open RFIs affecting this WP
      const allRfis = await base44.asServiceRole.entities.RFI.filter({
        project_id: rfi.project_id,
        status: { $ne: 'closed' },
        $or: [
          { affects_work_package_ids: { $in: [wp.id] } },
          { linked_drawing_set_ids: { $in: wp.linked_drawing_set_ids || [] } }
        ]
      });

      const openRfis = allRfis.filter(r => r.status !== 'closed');
      const blockingRfis = openRfis.filter(r => r.is_install_blocker || r.impact_severity === 'blocking');

      // Compute severity rollup
      const severityMap = { low: 1, medium: 2, high: 3, blocking: 4 };
      const maxSeverity = openRfis.length > 0
        ? Object.keys(severityMap).find(
            sev => severityMap[sev] === Math.max(...openRfis.map(r => severityMap[r.impact_severity] || 0))
          ) || 'none'
        : 'none';

      // Build impact summary
      const impactSummary = openRfis
        .map(r => `RFI-${r.rfi_number} (${r.impact_severity}): ${r.impact_tags?.join(', ') || r.subject}`)
        .join('; ');

      // Collect impact tags
      const impactedAreas = [...new Set(openRfis.flatMap(r => r.impact_tags || []))];

      // Update WP
      await base44.asServiceRole.entities.WorkPackage.update(wpId, {
        open_rfi_ids: openRfis.map(r => r.id),
        has_blocking_rfi: blockingRfis.length > 0,
        rfi_impact_summary: impactSummary,
        impacted_by_rfi_ids: openRfis.map(r => r.id),
        impacted_by_rfi_severity: maxSeverity,
        impacted_areas: impactedAreas
      });

      updatedWps.push({
        wp_id: wpId,
        wpid: wp.wpid,
        open_rfi_count: openRfis.length,
        has_blocking: blockingRfis.length > 0,
        severity: maxSeverity
      });
    }

    // FIND IMPACTED DELIVERIES
    const impactedDeliveryIds = new Set();

    // Direct delivery links in RFI
    if (rfi.affects_delivery_ids && rfi.affects_delivery_ids.length > 0) {
      rfi.affects_delivery_ids.forEach(id => impactedDeliveryIds.add(id));
    }

    // Find deliveries containing impacted WPs
    if (impactedWpIds.size > 0) {
      const deliveries = await base44.asServiceRole.entities.Delivery.filter({
        project_id: rfi.project_id,
        linked_work_package_ids: { $in: Array.from(impactedWpIds) }
      });
      deliveries.forEach(d => impactedDeliveryIds.add(d.id));
    }

    // UPDATE IMPACTED DELIVERIES
    const updatedDeliveries = [];
    for (const deliveryId of impactedDeliveryIds) {
      const deliveries = await base44.asServiceRole.entities.Delivery.filter({ id: deliveryId });
      if (!deliveries.length) continue;
      const delivery = deliveries[0];

      // Collect all RFIs affecting any WP on this delivery
      const wpIds = delivery.linked_work_package_ids || [];
      const allAffectingRfis = await base44.asServiceRole.entities.RFI.filter({
        project_id: rfi.project_id,
        status: { $ne: 'closed' },
        $or: [
          { affects_work_package_ids: { $in: wpIds } },
          { affects_delivery_ids: { $in: [delivery.id] } }
        ]
      });

      const openRfis = allAffectingRfis.filter(r => r.status !== 'closed');
      const blockingRfis = openRfis.filter(r => r.is_release_blocker || r.impact_severity === 'blocking');

      // Severity rollup
      const severityMap = { low: 1, medium: 2, high: 3, blocking: 4 };
      const maxSeverity = openRfis.length > 0
        ? Object.keys(severityMap).find(
            sev => severityMap[sev] === Math.max(...openRfis.map(r => severityMap[r.impact_severity] || 0))
          ) || 'none'
        : 'none';

      // Safe to ship logic
      const safeToShip = !(blockingRfis.length > 0 && openRfis.some(r => r.is_release_blocker));
      const shipBlockReasons = !safeToShip
        ? blockingRfis.map(r => `Blocking RFI-${r.rfi_number} (${r.impact_severity})`)
        : [];

      // Check if any WP on delivery is not install_ready
      const wps = await base44.asServiceRole.entities.WorkPackage.filter({
        id: { $in: wpIds }
      });
      const hasNonReadyWp = wps.some(wp => wp.install_ready === false);

      // Update Delivery
      await base44.asServiceRole.entities.Delivery.update(deliveryId, {
        open_rfi_ids: openRfis.map(r => r.id),
        has_blocking_rfi: blockingRfis.length > 0,
        impacted_by_rfi_ids: openRfis.map(r => r.id),
        impacted_by_rfi_severity: maxSeverity,
        is_safe_to_ship: safeToShip,
        ship_block_reasons: shipBlockReasons,
        ship_blocking_entity_ids: blockingRfis.map(r => r.id),
        delivery_contains_non_install_ready: hasNonReadyWp
      });

      updatedDeliveries.push({
        delivery_id: deliveryId,
        delivery_number: delivery.delivery_number,
        open_rfi_count: openRfis.length,
        safe_to_ship: safeToShip,
        severity: maxSeverity
      });
    }

    return Response.json({
      rfi_id,
      rfi_number: rfi.rfi_number,
      impacted_wps: updatedWps.length,
      impacted_deliveries: updatedDeliveries.length,
      updated_wps: updatedWps,
      updated_deliveries: updatedDeliveries,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('RFI impact propagation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});