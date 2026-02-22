import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Compute Install Readiness Engine
 * Evaluates WP against 6 conditions to determine if field-safe to install
 * Updates WorkPackage with derived fields: install_ready, readiness_reason, readiness_cost_risk, blocking_entity_ids
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { wpId, projectId } = await req.json();
    if (!wpId || !projectId) {
      return Response.json({ error: 'Missing wpId or projectId' }, { status: 400 });
    }

    // Fetch WP
    const wps = await base44.entities.WorkPackage.filter({ id: wpId, project_id: projectId });
    if (!wps.length) return Response.json({ error: 'WP not found' }, { status: 404 });
    const wp = wps[0];

    const readinessReasons = [];
    const blockingEntityIds = [];
    const warnings = [];
    let maxWarningSeverity = 'info';
    let costAtRisk = 0;

    // CONDITION 1: OPEN RFIs
    if (wp.linked_rfi_ids && wp.linked_rfi_ids.length > 0) {
      const rfis = await base44.entities.RFI.filter({ id: { $in: wp.linked_rfi_ids } });
      const openRfis = rfis.filter(r => r.status !== 'closed');
      if (openRfis.length > 0) {
        readinessReasons.push(`Open RFI affecting install (${openRfis.length} open)`);
        blockingEntityIds.push(...openRfis.map(r => r.id));
      }
    }

    // CONDITION 2: UNAPPROVED SUBMITTALS
    if (wp.linked_submittal_ids && wp.linked_submittal_ids.length > 0) {
      const submittals = await base44.entities.Submittal.filter({ id: { $in: wp.linked_submittal_ids } });
      const unapproved = submittals.filter(s => s.status !== 'approved');
      if (unapproved.length > 0) {
        readinessReasons.push(`Unapproved submittal (${unapproved.length} pending)`);
        blockingEntityIds.push(...unapproved.map(s => s.id));
      }
    }

    // CONDITION 3: DELIVERY NOT SHIPPED
    if (wp.linked_delivery_ids && wp.linked_delivery_ids.length > 0) {
      const deliveries = await base44.entities.Delivery.filter({ id: { $in: wp.linked_delivery_ids } });
      const notShipped = deliveries.filter(d => d.delivery_status !== 'received');
      if (notShipped.length > 0) {
        readinessReasons.push(`Delivery not shipped (${notShipped.length} pending)`);
        blockingEntityIds.push(...notShipped.map(d => d.id));
      }
    }

    // CONDITION 4: LOAD LIST NOT VERIFIED
    if (!wp.load_list_verified) {
      readinessReasons.push('Load list not verified');
    }

    // CONDITION 5: EMBED OR FIELD VIF MISSING
    if (!wp.vif_confirmed) {
      readinessReasons.push('Missing embed/field VIF confirmation');
    }

    // CONDITION 6: DELIVERY SEQUENCING MISMATCH
    let sequencingMismatch = false;
    if (wp.linked_delivery_ids && wp.linked_delivery_ids.length > 0) {
      const deliveries = await base44.entities.Delivery.filter({ id: { $in: wp.linked_delivery_ids } });
      deliveries.forEach(d => {
        // Check if delivery has erection metadata
        if (d.erection_metadata) {
          if (d.erection_metadata.install_day && d.erection_metadata.install_day !== wp.install_day) {
            sequencingMismatch = true;
          }
          if (d.erection_metadata.sequence_group && d.erection_metadata.sequence_group !== wp.sequence_group) {
            sequencingMismatch = true;
          }
        }
      });
    }
    if (sequencingMismatch) {
      readinessReasons.push('Delivery sequencing mismatch (install day or sequence group)');
    }

    // CONDITION 7: OPEN PUNCH ITEMS
    if (wp.linked_punch_item_ids && wp.linked_punch_item_ids.length > 0) {
      const punchItems = await base44.entities.PunchItem.filter({ id: { $in: wp.linked_punch_item_ids } });
      const openPunch = punchItems.filter(p => p.status !== 'closed' && p.status !== 'completed');
      if (openPunch.length > 0) {
        readinessReasons.push(`Open punch items (${openPunch.length})`);
        blockingEntityIds.push(...openPunch.map(p => p.id));
      }
    }

    // WARNINGS (non-blocking checks)
    // WARNING 1: UPCOMING SCHEDULE CONFLICTS (within 3 days)
    if (wp.install_day) {
      const installDate = new Date(wp.install_day);
      const daysUntilInstall = Math.floor((installDate - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntilInstall < 3 && daysUntilInstall >= 0) {
        warnings.push(`Imminent install in ${daysUntilInstall} days - verify crew availability`);
        maxWarningSeverity = 'caution';
      }
    }

    // WARNING 2: CHECK FOR MATERIAL AVAILABILITY ISSUES (if exists in WP data)
    // This is extensible - assumes a field like material_availability_status exists
    if (wp.material_availability_status && wp.material_availability_status !== 'confirmed') {
      warnings.push('Material availability not confirmed');
      maxWarningSeverity = 'warning';
    }

    // COST RISK CALCULATION
    if (readinessReasons.length > 0) {
      // Get project for rates
      const projects = await base44.entities.Project.filter({ id: projectId });
      if (projects.length > 0) {
        const project = projects[0];
        const crewSize = wp.assigned_crew_size || 0;
        const installDays = wp.install_duration_days || 0;
        const craneRate = project.crane_day_rate || 0;
        const laborRate = project.ironworker_day_rate || 0;

        costAtRisk = (crewSize * laborRate * installDays) + (craneRate * installDays);
      }
    }

    // DETERMINE INSTALL READY
    const installReady = readinessReasons.length === 0;

    // UPDATE WP
    await base44.entities.WorkPackage.update(wpId, {
      install_ready: installReady,
      readiness_reason: readinessReasons,
      readiness_cost_risk: costAtRisk,
      blocking_entity_ids: blockingEntityIds,
      install_ready_warnings: warnings,
      install_ready_warnings_severity: maxWarningSeverity
    });

    return Response.json({
      wp_id: wpId,
      wpid: wp.wpid,
      install_ready: installReady,
      readiness_reason: readinessReasons,
      readiness_cost_risk: costAtRisk,
      blocking_entity_ids: blockingEntityIds,
      install_ready_warnings: warnings,
      install_ready_warnings_severity: maxWarningSeverity,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Install readiness computation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});