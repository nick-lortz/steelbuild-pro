import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Release Gating: Prevents WP release if open RFIs or missing delivery verification.
 * Called before marking WP as "ready to release" in erection phase.
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

    const gatingIssues = [];

    // 1. Check for open RFIs linked to this WP
    if (wp.linked_rfi_ids && wp.linked_rfi_ids.length > 0) {
      const rfis = await base44.entities.RFI.filter({ id: { $in: wp.linked_rfi_ids } });
      const openRfis = rfis.filter(r => !['closed', 'answered'].includes(r.status));
      if (openRfis.length > 0) {
        gatingIssues.push({
          category: 'open_rfi',
          count: openRfis.length,
          details: openRfis.map(r => ({ rfi_number: r.rfi_number, status: r.status, subject: r.subject }))
        });
      }
    }

    // 2. Check for missing delivery verification (VIF = Verification/Inspection Fixture)
    if (wp.linked_delivery_ids && wp.linked_delivery_ids.length > 0) {
      const deliveries = await base44.entities.Delivery.filter({ id: { $in: wp.linked_delivery_ids } });
      const unshippedDeliveries = deliveries.filter(d => d.delivery_status !== 'received');
      if (unshippedDeliveries.length > 0) {
        gatingIssues.push({
          category: 'unshipped_delivery',
          count: unshippedDeliveries.length,
          details: unshippedDeliveries.map(d => ({ delivery_number: d.delivery_number, status: d.delivery_status }))
        });
      }
    }

    // Gate result
    const canRelease = gatingIssues.length === 0;

    return Response.json({
      wp_id: wpId,
      can_release: canRelease,
      blocking_issues: gatingIssues,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});