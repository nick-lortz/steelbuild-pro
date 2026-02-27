/**
 * Installability Risk Engine
 * Evaluates a member/connection against geometry, tolerance, and field constraints.
 * Outputs: installability_score (0-100), warnings array, risk_level
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Check weights — higher = more critical
const CHECKS = [
  { key: 'connection_type',       label: 'Connection Type Complexity',   weight: 20 },
  { key: 'bearing_length',        label: 'Bearing Length Adequacy',       weight: 20 },
  { key: 'tolerance_envelope',    label: 'Tolerance Envelope',            weight: 20 },
  { key: 'shim_requirement',      label: 'Shim Requirement',              weight: 15 },
  { key: 'slotted_hole',          label: 'Slotted Hole Adequacy',         weight: 10 },
  { key: 'field_weld_risk',       label: 'Field Weld Likelihood',         weight: 10 },
  { key: 'erection_tolerance',    label: 'Erection Tolerance Conflict',   weight: 5  },
];

// Prompt for LLM-based geometry analysis when sheet files are provided
const INSTALLABILITY_PROMPT = (context) => `You are a senior steel erection engineer evaluating member installability from structural drawings.

Member/Area: ${context.member_mark || context.area || 'as shown'}
Drawing package: ${context.drawing_set_label || 'provided sheets'}

Evaluate the following installability risk factors and score each 0-100 (0=no risk, 100=maximum risk):

1. CONNECTION_TYPE: Complexity of the connection. Moment connections, field-welded connections, or compound connections (shear tab + moment plate) score higher.
2. BEARING_LENGTH: Is there adequate bearing length noted? If TBD, undersized, or missing note = higher risk.
3. TOLERANCE_ENVELOPE: Can the member be installed within standard AISC erection tolerances (±1/8" for columns, ±3/8" for beams)? Note any tight conditions.
4. SHIM_REQUIREMENT: Is shimming required (elevation breaks, concrete bearing, base plate leveling)? Unspecified shim = high risk.
5. SLOTTED_HOLE: Are slotted holes (SSH) oriented correctly for the expected erection movement direction? Missing slot orientation note = risk.
6. FIELD_WELD_RISK: Likelihood of field welding requirement. Moment end plate details, cope clearances, or field-fit situations = risk.
7. ERECTION_TOLERANCE_CONFLICT: Does any tolerance condition conflict with another system (embed, anchor rod, wall, CMU)?

For each factor return:
- score: integer 0-100 (risk score)
- warning: null if score < 30, otherwise a specific field-actionable warning string
- recommendation: specific next step if score >= 50

Also return:
- summary: 1-2 sentence overall installability assessment

Return ONLY a JSON object with these exact keys: connection_type, bearing_length, tolerance_envelope, shim_requirement, slotted_hole, field_weld_risk, erection_tolerance_conflict, summary
Each key (except summary) contains: { score, warning, recommendation }`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id, work_package_id, sheet_ids, member_mark, area, drawing_set_label, use_ai } = await req.json();
    if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });

    let aiResult = null;
    let factorScores = {};

    // If sheet files provided + use_ai, run LLM analysis
    if (use_ai && sheet_ids && sheet_ids.length > 0) {
      const allSheets = await base44.asServiceRole.entities.DrawingSheet.filter({ project_id });
      const sheets = allSheets.filter(s => sheet_ids.includes(s.id) && s.file_url);
      if (sheets.length > 0) {
        const context = { member_mark, area, drawing_set_label };
        aiResult = await base44.integrations.Core.InvokeLLM({
          prompt: INSTALLABILITY_PROMPT(context),
          file_urls: sheets.map(s => s.file_url),
          response_json_schema: {
            type: 'object',
            properties: {
              connection_type: { type: 'object', properties: { score: { type: 'number' }, warning: { type: 'string' }, recommendation: { type: 'string' } } },
              bearing_length: { type: 'object', properties: { score: { type: 'number' }, warning: { type: 'string' }, recommendation: { type: 'string' } } },
              tolerance_envelope: { type: 'object', properties: { score: { type: 'number' }, warning: { type: 'string' }, recommendation: { type: 'string' } } },
              shim_requirement: { type: 'object', properties: { score: { type: 'number' }, warning: { type: 'string' }, recommendation: { type: 'string' } } },
              slotted_hole: { type: 'object', properties: { score: { type: 'number' }, warning: { type: 'string' }, recommendation: { type: 'string' } } },
              field_weld_risk: { type: 'object', properties: { score: { type: 'number' }, warning: { type: 'string' }, recommendation: { type: 'string' } } },
              erection_tolerance_conflict: { type: 'object', properties: { score: { type: 'number' }, warning: { type: 'string' }, recommendation: { type: 'string' } } },
              summary: { type: 'string' }
            }
          }
        });
        factorScores = aiResult || {};
      }
    }

    // If no AI result, fall back to WP-field-based scoring
    if (!aiResult || Object.keys(factorScores).length === 0) {
      let wp = null;
      if (work_package_id) {
        const wps = await base44.asServiceRole.entities.WorkPackage.filter({ id: work_package_id, project_id });
        wp = wps[0] || null;
      }

      factorScores = {
        connection_type: { score: wp?.connection_type_complexity || 30, warning: null },
        bearing_length: { score: wp?.bearing_length_risk || 20, warning: null },
        tolerance_envelope: { score: wp?.tolerance_risk_pct || 25, warning: null },
        shim_requirement: { score: wp?.shim_required ? 60 : 20, warning: wp?.shim_required ? 'Shimming required — confirm shim pack spec and max height' : null },
        slotted_hole: { score: wp?.slotted_hole_orientation_risk || 20, warning: null },
        field_weld_risk: { score: wp?.field_weld_risk_pct || 15, warning: null },
        erection_tolerance_conflict: { score: wp?.erection_tolerance_conflict ? 70 : 10, warning: wp?.erection_tolerance_conflict ? 'Erection tolerance conflict flagged' : null },
        summary: 'Score based on work package field data (no drawing AI analysis).'
      };
    }

    // Compute weighted installability score (higher risk score = lower installability)
    const checkKeys = ['connection_type', 'bearing_length', 'tolerance_envelope', 'shim_requirement', 'slotted_hole', 'field_weld_risk', 'erection_tolerance_conflict'];
    let totalWeight = 0;
    let weightedRisk = 0;
    const warnings = [];
    const details = [];

    for (const check of CHECKS) {
      const keyMap = {
        connection_type: 'connection_type', bearing_length: 'bearing_length', tolerance_envelope: 'tolerance_envelope',
        shim_requirement: 'shim_requirement', slotted_hole: 'slotted_hole', field_weld_risk: 'field_weld_risk',
        erection_tolerance: 'erection_tolerance_conflict'
      };
      const factorKey = keyMap[check.key] || check.key;
      const factor = factorScores[factorKey] || { score: 0 };
      const riskScore = Math.min(100, Math.max(0, factor.score || 0));

      totalWeight += check.weight;
      weightedRisk += (riskScore / 100) * check.weight;

      if (factor.warning) warnings.push(factor.warning);

      details.push({
        key: check.key,
        label: check.label,
        risk_score: riskScore,
        warning: factor.warning || null,
        recommendation: factor.recommendation || null,
        weight: check.weight
      });
    }

    // Installability score = inverse of weighted risk
    const avgRisk = totalWeight > 0 ? (weightedRisk / totalWeight) * 100 : 0;
    const installabilityScore = Math.round(100 - avgRisk);

    const riskLevel = installabilityScore >= 75 ? 'LOW' : installabilityScore >= 50 ? 'MED' : 'HIGH';

    // Persist to ErectionIssue if risk is notable
    if (riskLevel !== 'LOW' && project_id) {
      const sheetId = sheet_ids?.[0] || null;
      if (sheetId) {
        await base44.asServiceRole.entities.ErectionIssue.create({
          project_id,
          sheet_id: sheetId,
          issue_type: 'installability',
          description: factorScores.summary || `Installability score: ${installabilityScore} — ${warnings.join('; ')}`,
          related_connection: member_mark,
          location_reference: area || member_mark,
          install_risk: riskLevel.toLowerCase() === 'high' ? 'high' : riskLevel.toLowerCase() === 'med' ? 'medium' : 'low',
          field_delay_risk: riskLevel === 'HIGH' ? 'high' : 'medium',
          inspection_risk: riskLevel === 'HIGH' ? 'high' : 'low',
          confidence_score: 80,
          status: 'open',
          resolution_recommendation: details.filter(d => d.recommendation).map(d => d.recommendation).join(' | '),
          detected_at: new Date().toISOString()
        });
      }
    }

    return Response.json({
      success: true,
      installability_score: installabilityScore,
      risk_level: riskLevel,
      warnings,
      details,
      summary: factorScores.summary || null,
      computed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Installability score error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});