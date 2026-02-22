import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * RFI Impact Propagation: When connection detail flag changes or RFI is answered,
 * re-evaluate affected WPs and their sequencing/coordination risk.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rfiId, projectId, changeType } = await req.json();
    // changeType: 'connection_detail_flag' | 'status_change' | 'answer_update'

    if (!rfiId || !projectId) {
      return Response.json({ error: 'Missing rfiId or projectId' }, { status: 400 });
    }

    const rfis = await base44.entities.RFI.filter({ id: rfiId });
    if (!rfis.length) return Response.json({ error: 'RFI not found' }, { status: 404 });
    const rfi = rfis[0];

    const affectedWps = [];

    // Get all WPs linked to this RFI
    const wps = await base44.entities.WorkPackage.filter({
      project_id: projectId,
      linked_rfi_ids: { $in: [rfiId] }
    });

    for (const wp of wps) {
      const impact = {
        wp_id: wp.id,
        wpid: wp.wpid,
        affected_factors: [],
        sequencing_risk_increase: false,
        coordination_risk_increase: false,
        revalidation_required: false
      };

      // Evaluate impact
      if (rfi.rfi_type === 'connection_detail') {
        impact.affected_factors.push('fabrication_readiness');
        impact.revalidation_required = true;
      }

      if (rfi.affects_sequence) {
        impact.affected_factors.push('erection_sequence');
        impact.sequencing_risk_increase = true;
        impact.revalidation_required = true;
      }

      if (rfi.status === 'answered' && rfi.answer_metadata?.requires_drawing_revision) {
        impact.affected_factors.push('drawing_revision');
      }

      if (rfi.status === 'closed' && rfi.assumption_risk?.proceeding_with_assumption) {
        impact.affected_factors.push('assumption_risk_closure');
      }

      affectedWps.push(impact);

      // Update WP with revalidation flag if needed
      if (impact.revalidation_required && !wp.requires_revalidation) {
        await base44.entities.WorkPackage.update(wp.id, {
          requires_revalidation: true
        });
      }
    }

    return Response.json({
      rfi_id: rfiId,
      rfi_number: rfi.rfi_number,
      change_type: changeType,
      affected_wps: affectedWps,
      total_affected: affectedWps.length,
      sequence_risk_wps: affectedWps.filter(w => w.sequencing_risk_increase).length,
      coordination_risk_wps: affectedWps.filter(w => w.coordination_risk_increase).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});