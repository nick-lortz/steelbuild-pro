import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Automation trigger: Recalculate WP install readiness when RFI, Submittal, Delivery, or WP changes
 * Find all linked WPs and trigger readiness recomputation
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!event || !data) {
      return Response.json({ error: 'Missing event or data' }, { status: 400 });
    }

    const triggeredWpIds = new Set();

    // Determine which WPs to recalculate based on entity type
    if (event.entity_name === 'RFI') {
      // Find WPs linked to this RFI
      const wps = await base44.asServiceRole.entities.WorkPackage.filter({
        linked_rfi_ids: { $in: [event.entity_id] }
      });
      wps.forEach(wp => triggeredWpIds.add(wp.id));
    } else if (event.entity_name === 'Submittal') {
      // Find WPs linked to this Submittal
      const wps = await base44.asServiceRole.entities.WorkPackage.filter({
        linked_submittal_ids: { $in: [event.entity_id] }
      });
      wps.forEach(wp => triggeredWpIds.add(wp.id));
    } else if (event.entity_name === 'Delivery') {
      // Find WPs linked to this Delivery
      const wps = await base44.asServiceRole.entities.WorkPackage.filter({
        linked_delivery_ids: { $in: [event.entity_id] }
      });
      wps.forEach(wp => triggeredWpIds.add(wp.id));
    } else if (event.entity_name === 'WorkPackage') {
      // Direct WP change
      triggeredWpIds.add(event.entity_id);
    }

    // Recompute readiness for all triggered WPs
    const results = [];
    for (const wpId of triggeredWpIds) {
      const wp = await base44.asServiceRole.entities.WorkPackage.filter({ id: wpId });
      if (!wp.length) continue;

      const result = await base44.asServiceRole.functions.invoke('computeInstallReadiness', {
        wpId,
        projectId: wp[0].project_id
      });

      results.push(result.data);
    }

    return Response.json({
      triggered_wps: Array.from(triggeredWpIds),
      recalculated: results.length,
      results
    });

  } catch (error) {
    console.error('WP install readiness recalc error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});