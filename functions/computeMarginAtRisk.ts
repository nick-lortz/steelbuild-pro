import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Margin at Risk: Evaluates coordination + sequencing risk exposure against WP budget.
 * Surfaces cost/schedule risk tied to RFI, delivery, and constraint delays.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { projectId, wpId } = await req.json();
    if (!projectId) {
      return Response.json({ error: 'Missing projectId' }, { status: 400 });
    }

    let wps = [];
    if (wpId) {
      wps = await base44.entities.WorkPackage.filter({ id: wpId, project_id: projectId });
    } else {
      wps = await base44.entities.WorkPackage.filter({ project_id: projectId });
    }

    const marginAnalysis = [];

    for (const wp of wps) {
      const riskFactors = {
        coordination_risk: 0,
        sequencing_risk: 0,
        rfi_delay_risk: 0,
        delivery_delay_risk: 0,
        lookahead_constraint_risk: 0
      };

      let costAtRisk = 0;
      let scheduleAtRiskDays = 0;
      const riskReasons = [];

      // 1. RFI Risk
      let openRfiCount = 0;
      let criticalRfiCount = 0;
      if (wp.linked_rfi_ids && wp.linked_rfi_ids.length > 0) {
        const rfis = await base44.entities.RFI.filter({ id: { $in: wp.linked_rfi_ids } });
        openRfiCount = rfis.filter(r => !['closed', 'answered'].includes(r.status)).length;
        criticalRfiCount = rfis.filter(r => r.priority === 'critical' && !['closed'].includes(r.status)).length;

        if (openRfiCount > 0) {
          riskFactors.rfi_delay_risk = Math.min(100, openRfiCount * 20);
          costAtRisk += (wp.budget_at_award || 0) * 0.05; // 5% cost buffer per open RFI
          scheduleAtRiskDays += openRfiCount * 2; // ~2 days per RFI
          riskReasons.push(`${openRfiCount} open RFI(s), ${criticalRfiCount} critical`);
        }
      }

      // 2. Delivery Risk
      let delayedDeliveries = 0;
      if (wp.linked_delivery_ids && wp.linked_delivery_ids.length > 0) {
        const deliveries = await base44.entities.Delivery.filter({ id: { $in: wp.linked_delivery_ids } });
        delayedDeliveries = deliveries.filter(d => d.on_time === false).length;
        const unreceived = deliveries.filter(d => d.delivery_status !== 'received').length;

        if (unreceived > 0 || delayedDeliveries > 0) {
          riskFactors.delivery_delay_risk = Math.min(100, (unreceived + delayedDeliveries) * 25);
          costAtRisk += (wp.budget_at_award || 0) * 0.03; // 3% cost for logistics delay
          scheduleAtRiskDays += Math.max(3, delayedDeliveries * 3);
          riskReasons.push(`${delayedDeliveries} late deliveries, ${unreceived} unreceived`);
        }
      }

      // 3. Sequencing Risk (affects erection WPs)
      if (wp.phase === 'erection') {
        const sequencingRfis = wp.linked_rfi_ids ? 
          (await base44.entities.RFI.filter({ id: { $in: wp.linked_rfi_ids } }))
          .filter(r => r.affects_sequence).length : 0;

        if (sequencingRfis > 0) {
          riskFactors.sequencing_risk = Math.min(100, sequencingRfis * 30);
          costAtRisk += (wp.budget_at_award || 0) * 0.08; // 8% cost for re-sequencing
          scheduleAtRiskDays += sequencingRfis * 5;
          riskReasons.push(`${sequencingRfis} sequence-impacting RFI(s)`);
        }
      }

      // 4. Lookahead Constraint Risk
      if (wp.lookahead_ready !== 'READY') {
        riskFactors.lookahead_constraint_risk = wp.lookahead_blockers > 0 ? 75 : 40;
        costAtRisk += (wp.budget_at_award || 0) * 0.04;
        scheduleAtRiskDays += wp.lookahead_blockers * 3;
        riskReasons.push(`${wp.lookahead_blockers || 0} constraint blocker(s)`);
      }

      // 5. Coordination Risk (composite)
      riskFactors.coordination_risk = Math.min(100, 
        (riskFactors.rfi_delay_risk * 0.3 + 
         riskFactors.delivery_delay_risk * 0.3 + 
         riskFactors.lookahead_constraint_risk * 0.4)
      );

      const riskSeverity = 
        (riskFactors.coordination_risk + riskFactors.sequencing_risk) / 2 > 70 ? 'HIGH' :
        (riskFactors.coordination_risk + riskFactors.sequencing_risk) / 2 > 40 ? 'MEDIUM' : 'LOW';

      marginAnalysis.push({
        wp_id: wp.id,
        wpid: wp.wpid,
        budget_at_award: wp.budget_at_award,
        cost_at_risk: costAtRisk.toFixed(2),
        pct_budget_at_risk: ((costAtRisk / (wp.budget_at_award || 1)) * 100).toFixed(1),
        schedule_at_risk_days: scheduleAtRiskDays,
        risk_severity: riskSeverity,
        risk_factors: riskFactors,
        risk_factors_normalized: {
          coordination: (riskFactors.coordination_risk / 100).toFixed(2),
          sequencing: (riskFactors.sequencing_risk / 100).toFixed(2),
          rfi_delay: (riskFactors.rfi_delay_risk / 100).toFixed(2),
          delivery_delay: (riskFactors.delivery_delay_risk / 100).toFixed(2),
          constraint: (riskFactors.lookahead_constraint_risk / 100).toFixed(2)
        },
        risk_reasons: riskReasons.length > 0 ? riskReasons : ['No active risks'],
        timestamp: new Date().toISOString()
      });
    }

    return Response.json({
      project_id: projectId,
      total_wps_analyzed: marginAnalysis.length,
      high_risk_count: marginAnalysis.filter(m => m.risk_severity === 'HIGH').length,
      medium_risk_count: marginAnalysis.filter(m => m.risk_severity === 'MEDIUM').length,
      total_cost_at_risk: marginAnalysis.reduce((sum, m) => sum + parseFloat(m.cost_at_risk), 0).toFixed(2),
      margin_analysis: marginAnalysis
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});