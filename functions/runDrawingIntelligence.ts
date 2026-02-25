import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * DRAWING INTELLIGENCE ENGINE
 * Loads thresholds and erection risk categories from QAConfig (project > global > hardcoded defaults).
 */

const DEFAULT_THRESHOLDS = {
  dimensional_delta_inches: 0.25,
  elevation_delta_inches: 0.125,
  slope_any_mismatch: true,
  member_type_always: true,
  material_revision_always: true,
  connection_hole_type_always: true,
  bolt_spec_any_mismatch: true,
};

const DEFAULT_ERECTION_CATEGORIES = [
  { key: 'fit_up',    label: 'Fit-Up Risk',    enabled: true, prompt: 'Slotted holes (SSH) — check orientation relative to expected thermal expansion or erection movement direction. Flag if slot orientation is not aligned or not specified.' },
  { key: 'tolerance', label: 'Tolerance Risk', enabled: true, prompt: 'Elevation breaks, camber, or bearing conditions without shim allowance or tolerance note.' },
  { key: 'stability', label: 'Stability Risk', enabled: true, prompt: 'Cantilever framing, moment frames, or heavy cantilevered elements where deck diaphragm must be installed before column can be released or where temporary support/bracing is not noted.' },
  { key: 'sequence',  label: 'Sequence Risk',  enabled: true, prompt: 'Erection aid angles, temporary connections, or bracing shown in details that are not explicitly called out in erection sequence or phasing notes.' },
  { key: 'interface', label: 'Interface Risk', enabled: true, prompt: 'Beam bearing conditions at stud walls, CMU piers, masonry, or concrete — flag if anchor/embed pattern is TBD or not confirmed on structural drawings.' },
  { key: 'envelope',  label: 'Envelope Risk',  enabled: true, prompt: 'Penetrations through roof/wall with connection details where waterproofing is not noted or is deferred.' },
];

async function loadIntelligenceConfig(base44, projectId) {
  try {
    const [projectConfigs, globalConfigs] = await Promise.all([
      projectId ? base44.asServiceRole.entities.QAConfig.filter({ scope: 'project', project_id: projectId, is_active: true }) : Promise.resolve([]),
      base44.asServiceRole.entities.QAConfig.filter({ scope: 'global', is_active: true }),
    ]);
    const cfg = projectConfigs[0] || globalConfigs[0];
    if (cfg) {
      return {
        thresholds: { ...DEFAULT_THRESHOLDS, ...(cfg.mismatch_thresholds || {}) },
        erectionCategories: cfg.erection_risk_categories?.filter(c => c.enabled !== false) || DEFAULT_ERECTION_CATEGORIES,
        rfiMinSeverity: cfg.rfi_auto_create_min_severity ?? 3,
        erectionRfiMinSeverity: cfg.erection_risk_rfi_min_severity ?? 4,
      };
    }
  } catch (e) {
    console.warn('[runDrawingIntelligence] Could not load QAConfig:', e.message);
  }
  return {
    thresholds: DEFAULT_THRESHOLDS,
    erectionCategories: DEFAULT_ERECTION_CATEGORIES,
    rfiMinSeverity: 3,
    erectionRfiMinSeverity: 4,
  };
}

const SEVERITY_RUBRIC = `
SEVERITY SCORING RUBRIC (use these exact scores):
5 = Prevents installation → IMMEDIATE RFI required
4 = Requires field modification → RFI within 48h
3 = Impacts sequence or tolerance → PM review required
2 = Coordination required → Track only
1 = Informational → Log only

EXAMPLES:
- PL→BP revision not reflected in shop details = 4
- SSH mis-oriented for expected erection movement = 3 or 4
- Cantilever frame without temp support note = 5
- Pier embed pattern TBD = 2
`;

function buildMismatchThresholds(t) {
  return `
MISMATCH DETECTION THRESHOLDS:
- Dimensional: flag if delta >= ${t.dimensional_delta_inches}" between any two views
- Elevation (B.O. deck, top of steel, etc.): flag if delta >= ${t.elevation_delta_inches}"
- Slope (roof, canopy): ${t.slope_any_mismatch ? 'flag ANY mismatch across views' : 'flag only if slope difference > 1%'}
- Member type/size (HSS vs W-shape, size change): ${t.member_type_always ? 'flag ALWAYS' : 'flag only if size delta > 2 sizes'}
- Material spec revision (e.g. PL changed to BP): ${t.material_revision_always ? 'flag ALWAYS — also check all dependent member marks, detail callouts, and connection schedules' : 'flag only if strength grade changes'}
- Connection hole type (SSH vs STD): ${t.connection_hole_type_always ? 'flag ALWAYS' : 'flag only if it impacts erection direction'}
- Bolt spec (quantity, diameter, grade): ${t.bolt_spec_any_mismatch ? 'flag ANY mismatch' : 'flag only if strength or diameter differs'}
`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, drawing_set_id, sheet_ids, drawing_set_label } = await req.json();

    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    // Fetch sheets
    let sheets = [];
    if (sheet_ids && sheet_ids.length > 0) {
      const allSheets = await base44.entities.DrawingSheet.filter({ project_id });
      sheets = allSheets.filter(s => sheet_ids.includes(s.id));
    } else if (drawing_set_id) {
      sheets = await base44.entities.DrawingSheet.filter({ drawing_set_id });
    } else {
      return Response.json({ error: 'drawing_set_id or sheet_ids required' }, { status: 400 });
    }

    if (sheets.length === 0) {
      return Response.json({ error: 'No sheets found with uploaded files' }, { status: 404 });
    }

    const sheetsWithFiles = sheets.filter(s => s.file_url);
    if (sheetsWithFiles.length === 0) {
      return Response.json({ error: 'No sheets have uploaded drawing files' }, { status: 404 });
    }

    const sheet_urls = sheetsWithFiles.map(s => s.file_url);
    const sheetIndex = sheetsWithFiles.map(s => s.sheet_number).join(', ');
    const setLabel = drawing_set_label || 'Drawing Package';
    const now = new Date().toISOString();

    console.log(`[Drawing Intelligence] Analyzing ${sheetsWithFiles.length} sheets: ${sheetIndex}`);

    // ===== PHASE 1: CROSS-SHEET MISMATCH DETECTION =====
    const mismatchPrompt = `You are a senior steel fabrication QA engineer performing cross-sheet coordination review.

Drawing Package: ${setLabel}
Sheets provided: ${sheetIndex}

${MISMATCH_THRESHOLDS}
${SEVERITY_RUBRIC}

TASK: Compare ALL provided drawing sheets against each other. Identify every coordination mismatch between views, plans, sections, and details.

Pay special attention to:
1. Plan vs section/detail dimensional consistency
2. Elevation callouts (B.O. deck, T.O. steel, beam bearing elevations)
3. Roof/canopy slope shown consistently across all views
4. Member marks — if a revision changes member type (e.g. PL to BP), check it is propagated to ALL: member marks, detail callouts, connection schedules, BOM references
5. SSH (slotted standard hole) vs STD hole callouts across matching connection views
6. Bolt grades, diameters, and quantities in matching details

For EACH mismatch found, return a JSON object with these EXACT fields:
- type: one of [dimension, elevation, slope, member_mark, material_revision, connection_hole_type, bolt_spec, material_spec, member_size]
- severity: integer 1-5
- description: clear description of the specific conflict
- sheet_1_ref: sheet number (e.g. "404E101")
- sheet_1_value: the value shown on that sheet
- sheet_2_ref: sheet number (e.g. "404E103")
- sheet_2_value: the conflicting value
- member_mark: affected member mark if identifiable (e.g. "404M018"), else null
- location_reference: grid line, detail number, or area (e.g. "Detail 3 / Grid C")
- install_phase_impact: one of [Fabrication, Lift, Temporary Stability, Final Fit, Multiple]
- fabrication_impact: boolean
- design_intent_change: boolean (true if this looks like a revision that wasn't fully propagated)
- scope_change_flag: boolean (true if this has commercial/labor cost implications)
- labor_delta_risk: Low, Med, or High (only if scope_change_flag is true)
- trade_coordination_impact: description of other trade impacts if any
- rfi_title: concise RFI title (e.g. "Canopy Area C – Connection Hole Type Conflict – Member 404M018")
- rfi_issue_statement: 1-2 sentence issue description for RFI body
- rfi_observed_conditions: array of {label, value} pairs (e.g. [{label: "Detail A (404E103)", value: "SSH noted"}, {label: "Detail B (404E101)", value: "STD Ø13/16 shown"}])
- rfi_proposed_options: array of strings (2-3 resolution options)
- rfi_impacts: string describing fabrication/schedule/field impacts
- rfi_response_required_by: string (e.g. "Prior to fabrication of 404M018")
- confidence: integer 0-100

Return ONLY a JSON object with key "mismatches" containing the array. Return empty array if none found.`;

    // ===== PHASE 2: ERECTION RISK IDENTIFICATION =====
    const erectionRiskPrompt = `You are a senior erection engineer reviewing structural steel drawings for field execution risks.

Drawing Package: ${setLabel}
Sheets provided: ${sheetIndex}

${SEVERITY_RUBRIC}

TASK: Identify erection and stability risks even where NO mismatch exists between views. Evaluate each of these risk categories:

1. FIT-UP RISK: Slotted holes (SSH) — check orientation relative to expected thermal expansion or erection movement direction. Flag if slot orientation is not aligned or not specified.
2. TOLERANCE RISK: Elevation breaks, camber, or bearing conditions without shim allowance or tolerance note.
3. STABILITY RISK: Cantilever framing, moment frames, or heavy cantilevered elements where deck diaphragm must be installed before column can be released or where temporary support/bracing is not noted.
4. SEQUENCE RISK: Erection aid angles, temporary connections, or bracing shown in details that are not explicitly called out in erection sequence or phasing notes.
5. INTERFACE RISK: Beam bearing conditions at stud walls, CMU piers, masonry, or concrete — flag if anchor/embed pattern is TBD or not confirmed on structural drawings.
6. ENVELOPE RISK: Penetrations through roof/wall with connection details where waterproofing is not noted or is deferred.

For EACH risk found:
- risk_type: one of [fit_up, tolerance, stability, sequence, interface, envelope]
- severity: integer 1-5
- description: specific risk description (field-actionable, not generic)
- member_mark: affected member mark if identifiable
- sheet_reference: sheet number where risk is visible
- location_reference: grid/detail reference
- install_phase_impact: one of [Lift, Temporary Stability, Final Fit, Multiple]
- recommended_action: specific next step (e.g. "Issue RFI for slot orientation", "Add temp brace note to erection sequence", "Confirm embed pattern with EOR before fab")
- rfi_required: boolean (true if severity >= 4)
- rfi_title: short RFI title if rfi_required
- confidence: integer 0-100

Return ONLY a JSON object with key "erection_risks" containing the array. Return empty array if none found.`;

    // Run both phases in parallel
    const [mismatchResult, erectionResult] = await Promise.all([
      base44.integrations.Core.InvokeLLM({
        prompt: mismatchPrompt,
        file_urls: sheet_urls,
        response_json_schema: {
          type: 'object',
          properties: {
            mismatches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  severity: { type: 'number' },
                  description: { type: 'string' },
                  sheet_1_ref: { type: 'string' },
                  sheet_1_value: { type: 'string' },
                  sheet_2_ref: { type: 'string' },
                  sheet_2_value: { type: 'string' },
                  member_mark: { type: 'string' },
                  location_reference: { type: 'string' },
                  install_phase_impact: { type: 'string' },
                  fabrication_impact: { type: 'boolean' },
                  design_intent_change: { type: 'boolean' },
                  scope_change_flag: { type: 'boolean' },
                  labor_delta_risk: { type: 'string' },
                  trade_coordination_impact: { type: 'string' },
                  rfi_title: { type: 'string' },
                  rfi_issue_statement: { type: 'string' },
                  rfi_observed_conditions: { type: 'array', items: { type: 'object' } },
                  rfi_proposed_options: { type: 'array', items: { type: 'string' } },
                  rfi_impacts: { type: 'string' },
                  rfi_response_required_by: { type: 'string' },
                  confidence: { type: 'number' }
                }
              }
            }
          }
        }
      }),
      base44.integrations.Core.InvokeLLM({
        prompt: erectionRiskPrompt,
        file_urls: sheet_urls,
        response_json_schema: {
          type: 'object',
          properties: {
            erection_risks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  risk_type: { type: 'string' },
                  severity: { type: 'number' },
                  description: { type: 'string' },
                  member_mark: { type: 'string' },
                  sheet_reference: { type: 'string' },
                  location_reference: { type: 'string' },
                  install_phase_impact: { type: 'string' },
                  recommended_action: { type: 'string' },
                  rfi_required: { type: 'boolean' },
                  rfi_title: { type: 'string' },
                  confidence: { type: 'number' }
                }
              }
            }
          }
        }
      })
    ]);

    const mismatches = mismatchResult?.mismatches || [];
    const erectionRisks = erectionResult?.erection_risks || [];

    console.log(`[Drawing Intelligence] Phase 1: ${mismatches.length} mismatches | Phase 2: ${erectionRisks.length} erection risks`);

    // Helper: map sheet_number to sheet ID
    const sheetByNumber = (ref) => {
      const s = sheetsWithFiles.find(sh => sh.sheet_number?.includes(ref) || ref?.includes(sh.sheet_number));
      return s?.id || sheetsWithFiles[0]?.id;
    };

    // Helper: severity → risk_level
    const severityToRiskLevel = (s) => {
      if (s >= 5) return 'critical';
      if (s >= 4) return 'high';
      if (s >= 3) return 'medium';
      return 'low';
    };

    // ===== SAVE MISMATCH CONFLICTS =====
    const conflictIds = [];
    for (const m of mismatches) {
      const conflict = await base44.asServiceRole.entities.DrawingConflict.create({
        project_id,
        sheet_1_id: sheetByNumber(m.sheet_1_ref),
        sheet_2_id: sheetByNumber(m.sheet_2_ref),
        conflict_type: m.type || 'dimension',
        description: m.description,
        location_reference: m.location_reference,
        sheet_1_value: `${m.sheet_1_ref}: ${m.sheet_1_value}`,
        sheet_2_value: `${m.sheet_2_ref}: ${m.sheet_2_value}`,
        risk_level: severityToRiskLevel(m.severity),
        severity_score: m.severity,
        member_mark: m.member_mark,
        install_phase_impact: m.install_phase_impact,
        fabrication_impact: !!m.fabrication_impact,
        erection_impact: true,
        design_intent_change: !!m.design_intent_change,
        scope_change_flag: !!m.scope_change_flag,
        labor_delta_risk: m.labor_delta_risk,
        trade_coordination_impact: m.trade_coordination_impact,
        requires_PM_review: m.severity >= 3,
        requires_EOR_review: m.severity >= 4,
        rfi_title: m.rfi_title,
        rfi_contract_reference: setLabel,
        rfi_observed_conditions: m.rfi_observed_conditions || [],
        rfi_proposed_options: m.rfi_proposed_options || [],
        rfi_impacts_statement: m.rfi_impacts,
        rfi_response_required_by: m.rfi_response_required_by,
        approved_for_rfi_export: false,
        confidence_score: m.confidence || 85,
        detected_at: now,
        status: 'open'
      });
      conflictIds.push(conflict.id);

      // Auto-create RFI suggestion for severity 3-5
      if (m.severity >= 3) {
        await base44.asServiceRole.entities.RFISuggestion.create({
          project_id,
          trigger_source: m.scope_change_flag ? 'scope_change' : 'conflict',
          rfi_title: m.rfi_title,
          contract_reference: setLabel,
          proposed_question: m.rfi_issue_statement || m.description,
          member_mark: m.member_mark,
          observed_conditions: m.rfi_observed_conditions || [],
          proposed_options: m.rfi_proposed_options || [],
          impacts_statement: m.rfi_impacts,
          response_required_by: m.rfi_response_required_by,
          severity_score: m.severity,
          referenced_sheets: [sheetByNumber(m.sheet_1_ref), sheetByNumber(m.sheet_2_ref)].filter(Boolean),
          location_reference: m.location_reference,
          fabrication_hold: m.severity >= 4 && !!m.fabrication_impact,
          schedule_risk: m.severity >= 4 ? 'high' : m.severity >= 3 ? 'medium' : 'low',
          scope_change: !!m.scope_change_flag,
          labor_delta_risk: m.labor_delta_risk,
          linked_conflict_id: conflict.id,
          confidence_score: m.confidence || 85,
          status: 'pending_review',
          approved_for_export: false
        });
      }
    }

    // ===== SAVE ERECTION RISKS =====
    const erectionIssueIds = [];
    for (const r of erectionRisks) {
      const issue = await base44.asServiceRole.entities.ErectionIssue.create({
        project_id,
        issue_type: r.risk_type,
        description: r.description,
        location_reference: r.location_reference,
        sheet_id: sheetByNumber(r.sheet_reference),
        related_connection: r.member_mark,
        install_risk: severityToRiskLevel(r.severity),
        field_delay_risk: r.severity >= 4 ? 'high' : r.severity >= 3 ? 'medium' : 'low',
        inspection_risk: r.severity >= 4 ? 'high' : 'medium',
        status: 'open',
        resolution_recommendation: r.recommended_action
      });
      erectionIssueIds.push(issue.id);

      // Auto-create RFI suggestion for severity 4-5 erection risks
      if (r.rfi_required && r.severity >= 4) {
        await base44.asServiceRole.entities.RFISuggestion.create({
          project_id,
          trigger_source: 'erection_risk',
          rfi_title: r.rfi_title || `Erection Risk: ${r.risk_type} – ${r.member_mark || r.location_reference}`,
          contract_reference: setLabel,
          proposed_question: r.description,
          member_mark: r.member_mark,
          observed_conditions: [{ label: r.sheet_reference, value: r.description }],
          proposed_options: [r.recommended_action],
          impacts_statement: `Install phase: ${r.install_phase_impact}`,
          severity_score: r.severity,
          referenced_sheets: [sheetByNumber(r.sheet_reference)].filter(Boolean),
          location_reference: r.location_reference,
          fabrication_hold: false,
          schedule_risk: 'high',
          linked_erection_issue_id: issue.id,
          confidence_score: r.confidence || 80,
          status: 'pending_review',
          approved_for_export: false
        });
      }
    }

    // Summary
    const severityCounts = [5, 4, 3, 2, 1].reduce((acc, s) => {
      acc[s] = [
        ...mismatches.filter(m => m.severity === s),
        ...erectionRisks.filter(r => r.severity === s)
      ].length;
      return acc;
    }, {});

    return Response.json({
      success: true,
      analyzed_at: now,
      sheets_analyzed: sheetsWithFiles.length,
      sheet_numbers: sheetIndex,
      mismatches_found: mismatches.length,
      erection_risks_found: erectionRisks.length,
      rfi_suggestions_created: mismatches.filter(m => m.severity >= 3).length + erectionRisks.filter(r => r.rfi_required && r.severity >= 4).length,
      severity_breakdown: severityCounts,
      conflict_ids: conflictIds,
      erection_issue_ids: erectionIssueIds
    });

  } catch (error) {
    console.error('[Drawing Intelligence] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});