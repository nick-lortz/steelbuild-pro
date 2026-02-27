/**
 * Material Impact Score (MIS) — Procurement Lead-Time Forecasting
 * Predicts erection start impact from material pipeline constraints.
 * Tracks: beam availability, plate burn backlog, galvanizing queue, decking delivery window
 * Returns: mis_score (0-100 risk), projected_erection_delay_days, impact_level (LOW/MED/HIGH/CRITICAL)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Risk weights per material constraint type
const MIS_FACTORS = [
  { key: 'beam_availability',    label: 'Structural Beam Availability',   weight: 30, typical_lead_days: 21 },
  { key: 'plate_burn_backlog',   label: 'Plate / Burn Table Backlog',     weight: 25, typical_lead_days: 14 },
  { key: 'galvanizing_queue',    label: 'Galvanizing Queue',               weight: 20, typical_lead_days: 28 },
  { key: 'decking_delivery',     label: 'Decking Delivery Window',         weight: 15, typical_lead_days: 21 },
  { key: 'anchor_rods_bolts',    label: 'Anchor Rods / High-Strength Bolts', weight: 10, typical_lead_days: 14 },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id, target_erection_start } = await req.json();
    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    // Fetch project
    const projects = await base44.asServiceRole.entities.Project.filter({ id: project_id });
    if (!projects.length) return Response.json({ error: 'Project not found' }, { status: 404 });
    const project = projects[0];

    // Fetch deliveries for this project to assess material pipeline
    const deliveries = await base44.asServiceRole.entities.Delivery.filter({ project_id }) || [];

    // Fetch open RFIs that affect material or erection sequence
    const rfis = await base44.asServiceRole.entities.RFI.filter({ project_id }) || [];
    const materialRFIs = rfis.filter(r =>
      r.status !== 'closed' && r.status !== 'answered' &&
      (r.rfi_type === 'member_size_length' || r.rfi_type === 'embed_anchor' || r.impact_type === 'scope')
    );

    const erectionStart = target_erection_start
      ? new Date(target_erection_start)
      : project.start_date ? new Date(project.start_date) : new Date();

    const today = new Date();
    const daysToErection = Math.max(0, Math.floor((erectionStart - today) / 86400000));

    const factorResults = [];
    let totalRiskWeight = 0;
    let maxProjectedDelay = 0;
    const impacts = [];

    for (const factor of MIS_FACTORS) {
      // Analyze each factor based on delivery data and project fields
      let riskLevel = 'LOW';
      let projectedDelay = 0;
      let detail = null;

      if (factor.key === 'beam_availability') {
        const structuralDeliveries = deliveries.filter(d =>
          d.material_type === 'structural' || d.description?.toLowerCase().includes('beam') ||
          d.description?.toLowerCase().includes('column') || d.description?.toLowerCase().includes('w-shape')
        );
        const notConfirmed = structuralDeliveries.filter(d =>
          d.delivery_status === 'pending' || d.delivery_status === 'ordered'
        );
        if (notConfirmed.length > 0) {
          const earliest = notConfirmed
            .map(d => d.scheduled_date ? new Date(d.scheduled_date) : null)
            .filter(Boolean)
            .sort((a, b) => a - b)[0];
          if (earliest) {
            projectedDelay = Math.max(0, Math.floor((earliest - erectionStart) / 86400000));
            if (projectedDelay > 0) {
              riskLevel = projectedDelay > 14 ? 'HIGH' : projectedDelay > 7 ? 'MED' : 'LOW';
              detail = `${notConfirmed.length} beam delivery/deliveries not confirmed. Earliest: ${earliest.toISOString().split('T')[0]}`;
            }
          }
        }
        if (materialRFIs.length > 0) {
          const memberRFIs = materialRFIs.filter(r => r.rfi_type === 'member_size_length');
          if (memberRFIs.length > 0) {
            riskLevel = 'HIGH';
            projectedDelay = Math.max(projectedDelay, 10);
            detail = (detail || '') + ` | ${memberRFIs.length} open member/size RFI(s)`;
          }
        }
      }

      else if (factor.key === 'plate_burn_backlog') {
        const plateDeliveries = deliveries.filter(d =>
          d.material_type === 'plate' || d.description?.toLowerCase().includes('plate') ||
          d.description?.toLowerCase().includes('burn') || d.description?.toLowerCase().includes('gusset')
        );
        const notConfirmed = plateDeliveries.filter(d => d.delivery_status === 'pending');
        if (notConfirmed.length > 0) {
          riskLevel = 'MED';
          projectedDelay = 7;
          detail = `${notConfirmed.length} plate/burn delivery not confirmed`;
        }
      }

      else if (factor.key === 'galvanizing_queue') {
        const galvDeliveries = deliveries.filter(d =>
          d.description?.toLowerCase().includes('galvan') || d.coating_type === 'galvanized'
        );
        const pending = galvDeliveries.filter(d => d.delivery_status === 'pending' || d.delivery_status === 'in_transit');
        if (pending.length > 0) {
          riskLevel = daysToErection < factor.typical_lead_days ? 'HIGH' : 'MED';
          projectedDelay = Math.max(0, factor.typical_lead_days - daysToErection);
          detail = `${pending.length} galvanized item(s) in transit/pending. Lead time: ${factor.typical_lead_days}d`;
        }
      }

      else if (factor.key === 'decking_delivery') {
        const deckDeliveries = deliveries.filter(d =>
          d.material_type === 'decking' || d.description?.toLowerCase().includes('deck')
        );
        const notConfirmed = deckDeliveries.filter(d => d.delivery_status === 'pending');
        if (notConfirmed.length > 0) {
          riskLevel = daysToErection < factor.typical_lead_days ? 'HIGH' : 'MED';
          projectedDelay = Math.max(0, factor.typical_lead_days - daysToErection);
          detail = `${notConfirmed.length} decking delivery/deliveries not confirmed`;
        }
      }

      else if (factor.key === 'anchor_rods_bolts') {
        const anchorRFIs = materialRFIs.filter(r => r.rfi_type === 'embed_anchor');
        if (anchorRFIs.length > 0) {
          riskLevel = 'HIGH';
          projectedDelay = 10;
          detail = `${anchorRFIs.length} open anchor rod/embed RFI(s) affecting procurement`;
        }
      }

      const riskScore = riskLevel === 'HIGH' ? 1.0 : riskLevel === 'MED' ? 0.5 : 0.1;
      const contribution = factor.weight * riskScore;
      totalRiskWeight += contribution;
      maxProjectedDelay = Math.max(maxProjectedDelay, projectedDelay);

      if (riskLevel !== 'LOW') {
        impacts.push({ factor: factor.key, label: factor.label, risk: riskLevel, delay_days: projectedDelay, detail });
      }

      factorResults.push({ ...factor, risk_level: riskLevel, projected_delay_days: projectedDelay, detail, contribution });
    }

    // MIS: 0 = no risk, 100 = maximum risk
    const maxPossibleWeight = MIS_FACTORS.reduce((sum, f) => sum + f.weight, 0);
    const misScore = Math.round((totalRiskWeight / maxPossibleWeight) * 100);

    let impactLevel;
    if (misScore >= 70) impactLevel = 'CRITICAL';
    else if (misScore >= 45) impactLevel = 'HIGH';
    else if (misScore >= 20) impactLevel = 'MED';
    else impactLevel = 'LOW';

    return Response.json({
      success: true,
      project_id,
      mis_score: misScore,
      impact_level: impactLevel,
      projected_erection_delay_days: maxProjectedDelay,
      days_to_erection: daysToErection,
      factors: factorResults,
      impacts,
      summary: impacts.length === 0
        ? 'No material pipeline risks detected. Erection start is on track.'
        : `${impacts.length} procurement constraint(s) detected. Max projected delay: ${maxProjectedDelay} days.`,
      computed_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('MIS computation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});