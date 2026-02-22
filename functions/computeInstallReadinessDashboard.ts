import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Install Readiness Dashboard: Computes "Field Safe to Install?" for all WPs/install areas
 * Returns Yes/No + reason for each area.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { projectId } = await req.json();
    if (!projectId) {
      return Response.json({ error: 'Missing projectId' }, { status: 400 });
    }

    // Fetch all WPs in erection phase
    const wps = await base44.entities.WorkPackage.filter({
      project_id: projectId,
      phase: 'erection'
    });

    const readinessSummary = [];

    for (const wp of wps) {
      const wpReadiness = {
        wp_id: wp.id,
        wpid: wp.wpid,
        title: wp.title,
        safe_to_install: null,
        reasons: [],
        blockers: []
      };

      // Check 1: Open RFIs
      let openRfis = 0;
      if (wp.linked_rfi_ids && wp.linked_rfi_ids.length > 0) {
        const rfis = await base44.entities.RFI.filter({ id: { $in: wp.linked_rfi_ids } });
        openRfis = rfis.filter(r => !['closed', 'answered'].includes(r.status)).length;
      }
      if (openRfis > 0) {
        wpReadiness.blockers.push({ type: 'open_rfi', count: openRfis });
      }

      // Check 2: Deliveries shipped & staged
      let unshipped = 0;
      let unstaged = 0;
      if (wp.linked_delivery_ids && wp.linked_delivery_ids.length > 0) {
        const deliveries = await base44.entities.Delivery.filter({ id: { $in: wp.linked_delivery_ids } });
        unshipped = deliveries.filter(d => d.delivery_status !== 'received').length;
        unstaged = deliveries.filter(d => !d.receiving_report?.received_timestamp).length;
      }
      if (unshipped > 0) wpReadiness.blockers.push({ type: 'unshipped_delivery', count: unshipped });
      if (unstaged > 0) wpReadiness.blockers.push({ type: 'unstaged_delivery', count: unstaged });

      // Check 3: Lookahead constraints
      if (wp.lookahead_ready !== 'READY') {
        wpReadiness.blockers.push({ type: 'lookahead_blocker', count: wp.lookahead_blockers || 0 });
      }

      // Compute safe_to_install
      wpReadiness.safe_to_install = wpReadiness.blockers.length === 0;

      if (wpReadiness.safe_to_install) {
        wpReadiness.reasons.push('All prerequisites met: RFIs closed, deliveries staged, constraints clear');
      } else {
        wpReadiness.reasons = wpReadiness.blockers.map(b => {
          switch (b.type) {
            case 'open_rfi': return `${b.count} open RFI(s) blocking`;
            case 'unshipped_delivery': return `${b.count} delivery(s) not shipped`;
            case 'unstaged_delivery': return `${b.count} delivery(s) not staged`;
            case 'lookahead_blocker': return `${b.count} constraint blocker(s)`;
            default: return 'Unknown blocker';
          }
        });
      }

      readinessSummary.push(wpReadiness);
    }

    const summary = {
      project_id: projectId,
      total_wps: wps.length,
      safe_to_install: readinessSummary.filter(w => w.safe_to_install).length,
      blocked: readinessSummary.filter(w => !w.safe_to_install).length,
      readiness_detail: readinessSummary,
      timestamp: new Date().toISOString()
    };

    return Response.json(summary);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});