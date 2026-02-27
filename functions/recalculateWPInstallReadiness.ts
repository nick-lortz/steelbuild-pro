import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Automation trigger: Recalculate WP install readiness when RFI, Submittal, Delivery, or WP changes.
 * Inlines the readiness logic (no chained function call) so it works without a user session.
 */

async function computeReadinessForWP(base44, wpId) {
  const wps = await base44.asServiceRole.entities.WorkPackage.filter({ id: wpId });
  if (!wps.length) return null;
  const wp = wps[0];

  const readinessReasons = [];
  const blockingEntityIds = [];
  const warnings = [];
  let maxWarningSeverity = 'info';
  let costAtRisk = 0;

  // Batch fetch all linked entities in parallel
  const [rfis, submittals, deliveries1, punchItems] = await Promise.all([
    wp.linked_rfi_ids?.length
      ? base44.asServiceRole.entities.RFI.filter({ id: { $in: wp.linked_rfi_ids } })
      : Promise.resolve([]),
    wp.linked_submittal_ids?.length
      ? base44.asServiceRole.entities.Submittal.filter({ id: { $in: wp.linked_submittal_ids } })
      : Promise.resolve([]),
    wp.linked_delivery_ids?.length
      ? base44.asServiceRole.entities.Delivery.filter({ id: { $in: wp.linked_delivery_ids } })
      : Promise.resolve([]),
    wp.linked_punch_item_ids?.length
      ? base44.asServiceRole.entities.PunchItem.filter({ id: { $in: wp.linked_punch_item_ids } })
      : Promise.resolve([])
  ]);

  // CONDITION 1: Open RFIs
  const openRfis = rfis.filter(r => r.status !== 'closed');
  if (openRfis.length > 0) {
    readinessReasons.push(`Open RFI affecting install (${openRfis.length} open)`);
    blockingEntityIds.push(...openRfis.map(r => r.id));
  }

  // CONDITION 2: Unapproved submittals
  const unapproved = submittals.filter(s => s.status !== 'approved');
  if (unapproved.length > 0) {
    readinessReasons.push(`Unapproved submittal (${unapproved.length} pending)`);
    blockingEntityIds.push(...unapproved.map(s => s.id));
  }

  // CONDITION 3: Delivery not shipped
  const notShipped = deliveries1.filter(d => d.delivery_status !== 'received');
  if (notShipped.length > 0) {
    readinessReasons.push(`Delivery not shipped (${notShipped.length} pending)`);
    blockingEntityIds.push(...notShipped.map(d => d.id));
  }

  // CONDITION 4: Load list not verified
  if (!wp.load_list_verified) {
    readinessReasons.push('Load list not verified');
  }

  // CONDITION 5: Embed/VIF missing
  if (!wp.vif_confirmed) {
    readinessReasons.push('Missing embed/field VIF confirmation');
  }

  // CONDITION 6: Delivery sequencing mismatch
  const sequencingMismatch = deliveries1.some(d => {
    if (!d.erection_metadata) return false;
    return (d.erection_metadata.install_day && d.erection_metadata.install_day !== wp.install_day) ||
           (d.erection_metadata.sequence_group && d.erection_metadata.sequence_group !== wp.sequence_group);
  });
  if (sequencingMismatch) {
    readinessReasons.push('Delivery sequencing mismatch (install day or sequence group)');
  }

  // CONDITION 7: Open punch items
  const openPunch = punchItems.filter(p => !['closed', 'completed'].includes(p.status));
  if (openPunch.length > 0) {
    readinessReasons.push(`Open punch items (${openPunch.length})`);
    blockingEntityIds.push(...openPunch.map(p => p.id));
  }

  // WARNINGS
  if (wp.install_day) {
    const daysUntilInstall = Math.floor((new Date(wp.install_day) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilInstall >= 0 && daysUntilInstall < 3) {
      warnings.push(`Imminent install in ${daysUntilInstall} days - verify crew availability`);
      maxWarningSeverity = 'caution';
    }
  }
  if (wp.material_availability_status && wp.material_availability_status !== 'confirmed') {
    warnings.push('Material availability not confirmed');
    maxWarningSeverity = 'warning';
  }

  // COST RISK
  if (readinessReasons.length > 0) {
    const projects = await base44.asServiceRole.entities.Project.filter({ id: wp.project_id });
    if (projects.length > 0) {
      const project = projects[0];
      const crewSize = wp.assigned_crew_size || 0;
      const installDays = wp.install_duration_days || 0;
      costAtRisk = (crewSize * (project.ironworker_day_rate || 0) * installDays) +
                   ((project.crane_day_rate || 0) * installDays);
    }
  }

  const installReady = readinessReasons.length === 0;

  await base44.asServiceRole.entities.WorkPackage.update(wpId, {
    install_ready: installReady,
    readiness_reason: readinessReasons,
    readiness_cost_risk: costAtRisk,
    blocking_entity_ids: blockingEntityIds,
    install_ready_warnings: warnings,
    install_ready_warnings_severity: maxWarningSeverity
  });

  return {
    wp_id: wpId,
    wpid: wp.wpid,
    install_ready: installReady,
    readiness_reason: readinessReasons,
    readiness_cost_risk: costAtRisk,
    blocking_count: blockingEntityIds.length
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch (_) {}

    const event = body.event || {};
    const data = body.data || {};
    const entity_name = event.entity_name;
    const entity_id = event.entity_id || data.id;

    const triggeredWpIds = new Set();

    if (entity_name === 'WorkPackage' && entity_id) {
      triggeredWpIds.add(entity_id);
    } else if (entity_name === 'RFI' && entity_id) {
      const wps = await base44.asServiceRole.entities.WorkPackage.filter({ linked_rfi_ids: { $in: [entity_id] } });
      wps.forEach(wp => triggeredWpIds.add(wp.id));
    } else if (entity_name === 'Submittal' && entity_id) {
      const wps = await base44.asServiceRole.entities.WorkPackage.filter({ linked_submittal_ids: { $in: [entity_id] } });
      wps.forEach(wp => triggeredWpIds.add(wp.id));
    } else if (entity_name === 'Delivery' && entity_id) {
      const wps = await base44.asServiceRole.entities.WorkPackage.filter({ linked_delivery_ids: { $in: [entity_id] } });
      wps.forEach(wp => triggeredWpIds.add(wp.id));
    } else if (entity_name === 'PunchItem' && entity_id) {
      const wps = await base44.asServiceRole.entities.WorkPackage.filter({ linked_punch_item_ids: { $in: [entity_id] } });
      wps.forEach(wp => triggeredWpIds.add(wp.id));
    } else if (body.wp_id) {
      triggeredWpIds.add(body.wp_id);
    }

    if (triggeredWpIds.size === 0) {
      return Response.json({ message: 'No WPs to recalculate', entity_name, entity_id }, { status: 200 });
    }

    const results = await Promise.all(
      Array.from(triggeredWpIds).map(wpId => computeReadinessForWP(base44, wpId))
    );

    const valid = results.filter(Boolean);

    return Response.json({
      triggered_wps: Array.from(triggeredWpIds),
      recalculated: valid.length,
      results: valid
    });

  } catch (error) {
    console.error('WP install readiness recalc error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});