/**
 * Enhanced Drawing Intelligence Engine — Phases 3 & 4
 * Extends runDrawingIntelligence with:
 *   Phase 3: Installability Risk per member/connection
 *   Phase 4: Scope / Design-Intent Drift Detection
 * 
 * Call this AFTER runDrawingIntelligence, or standalone for drift-only scans.
 * Input: project_id, drawing_set_id OR sheet_ids, drawing_set_label
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id, drawing_set_id, sheet_ids, drawing_set_label } = await req.json();
    if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });

    // Fetch sheets
    let sheets = [];
    if (sheet_ids && sheet_ids.length > 0) {
      const all = await base44.entities.DrawingSheet.filter({ project_id });
      sheets = all.filter(s => sheet_ids.includes(s.id));
    } else if (drawing_set_id) {
      sheets = await base44.entities.DrawingSheet.filter({ drawing_set_id });
    } else {
      return Response.json({ error: 'drawing_set_id or sheet_ids required' }, { status: 400 });
    }

    const sheetsWithFiles = sheets.filter(s => s.file_url);
    if (!sheetsWithFiles.length) return Response.json({ error: 'No uploaded sheet files found' }, { status: 404 });

    const sheet_urls = sheetsWithFiles.map(s => s.file_url);
    const sheetIndex = sheetsWithFiles.map(s => s.sheet_number).join(', ');
    const setLabel = drawing_set_label || 'Drawing Package';
    const now = new Date().toISOString();

    const sheetByNumber = (ref) => {
      const s = sheetsWithFiles.find(sh => sh.sheet_number?.includes(ref) || ref?.includes(sh.sheet_number));
      return s?.id || sheetsWithFiles[0]?.id;
    };

    // ===== PHASE 3: INSTALLABILITY RISK PER MEMBER/CONNECTION =====
    const installabilityPrompt = `You are a senior erection engineer reviewing structural steel drawings for member-level installability risk.

Drawing Package: ${setLabel}
Sheets: ${sheetIndex}

For EACH distinct connection, member, or embed detail visible in the drawings, evaluate field installability risk.

Focus on:
1. BEARING LENGTH: Is adequate bearing length noted? Flag if TBD, short, or at minimum AISC tolerance.
2. SHIM REQUIREMENT: Is shimming required at beam bearing, base plate, or embed elevation? Flag if unspecified.
3. SLOTTED HOLE ORIENTATION: Are SSH holes oriented for correct erection movement direction? Flag if not noted.
4. FIELD WELD LIKELIHOOD: Does the connection detail suggest field welding will be required? (tight cope, no bolt erection aid, moment end plate without field splice shown)
5. ERECTION TOLERANCE CONFLICT: Does the member tolerance interact with another system (anchor rods, CMU, cast-in embeds)?

For EACH finding return:
- member_mark: affected mark or detail reference
- connection_reference: detail or sheet callout
- location_reference: grid line or area
- sheet_reference: sheet number
- risk_type: one of [bearing_length, shim_requirement, slotted_hole, field_weld, tolerance_conflict]
- description: specific, field-actionable description
- severity: integer 1-5
- recommendation: next step to mitigate
- co_exposure: boolean (true if this creates commercial change exposure)
- confidence: integer 0-100

Return ONLY JSON: { "installability_risks": [ ...] }`;

    // ===== PHASE 4: SCOPE / DESIGN-INTENT DRIFT =====
    const driftPrompt = `You are a senior structural steel PM reviewing drawings for scope changes and design-intent drift that create change order exposure.

Drawing Package: ${setLabel}
Sheets: ${sheetIndex}

Identify EVERY case where a design element has changed in a way that implies rework, added scope, or a departure from original contract intent. Steel-specific drift categories to check:

1. ANCHOR SYSTEM CHANGE: J-bolt → headed stud, cast-in anchor → post-installed, anchor rod grade change
2. EMBED PLATE REVISION: Size change, thickness change, added stiffeners, weld pattern change
3. WALL THICKNESS SHIFT: CMU or concrete wall thickness that changes embed positioning, projection, or cover
4. CAMBER REVISION: Specified camber changed or removed — affects erection bearing and fit
5. CONNECTION SWAP: Shear tab → moment connection, bolted → welded, added gusset, end plate added
6. MATERIAL CHANGE: A36 → A572, A307 → A325, plate → built-up section
7. MEMBER GEOMETRY: Added cope, cope depth increased, flange notch, reduced web
8. SCOPE ADD/DELETE: Steel shown in plan but not in section, member added/removed between revisions

For EACH drift item found:
- change_category: one of [anchor_system, embedment, member_size, connection_type, material_change, scope_add, scope_delete, load_path]
- original_intent: what the original/contract drawings showed (or implied)
- new_intent: what the current drawing shows
- member_mark: affected mark or area
- location_reference: grid/detail
- sheet_reference: sheet number
- description: clear description of the change
- fabrication_impact: boolean
- erection_impact: boolean
- co_exposure: boolean (true = likely change order exposure)
- co_exposure_reason: why this is a commercial change if co_exposure=true
- estimated_labor_delta: Low / Med / High
- severity: integer 1-5
- confidence: integer 0-100

Return ONLY JSON: { "drift_findings": [ ...] }`;

    // Run phases 3 & 4 in parallel
    const [installResult, driftResult] = await Promise.all([
      base44.integrations.Core.InvokeLLM({
        prompt: installabilityPrompt,
        file_urls: sheet_urls,
        response_json_schema: {
          type: 'object',
          properties: {
            installability_risks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  member_mark: { type: 'string' }, connection_reference: { type: 'string' },
                  location_reference: { type: 'string' }, sheet_reference: { type: 'string' },
                  risk_type: { type: 'string' }, description: { type: 'string' },
                  severity: { type: 'number' }, recommendation: { type: 'string' },
                  co_exposure: { type: 'boolean' }, confidence: { type: 'number' }
                }
              }
            }
          }
        }
      }),
      base44.integrations.Core.InvokeLLM({
        prompt: driftPrompt,
        file_urls: sheet_urls,
        response_json_schema: {
          type: 'object',
          properties: {
            drift_findings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  change_category: { type: 'string' }, original_intent: { type: 'string' },
                  new_intent: { type: 'string' }, member_mark: { type: 'string' },
                  location_reference: { type: 'string' }, sheet_reference: { type: 'string' },
                  description: { type: 'string' }, fabrication_impact: { type: 'boolean' },
                  erection_impact: { type: 'boolean' }, co_exposure: { type: 'boolean' },
                  co_exposure_reason: { type: 'string' }, estimated_labor_delta: { type: 'string' },
                  severity: { type: 'number' }, confidence: { type: 'number' }
                }
              }
            }
          }
        }
      })
    ]);

    const installRisks = installResult?.installability_risks || [];
    const driftFindings = driftResult?.drift_findings || [];

    console.log(`[DI Enhanced] Phase 3: ${installRisks.length} installability risks | Phase 4: ${driftFindings.length} drift findings`);

    // Build a lookup map: sheetId → fabrication_status
    const sheetFabStatusMap = {};
    for (const s of sheetsWithFiles) {
      sheetFabStatusMap[s.id] = s.fabrication_status || 'issued_for_approval';
    }

    // ===== SAVE INSTALLABILITY RISKS → ErectionIssue =====
    const fallbackSheetId = sheetsWithFiles[0]?.id;
    const installIssueIds = [];
    for (const r of installRisks) {
      const sev = r.severity || 3;
      const riskMap = { 5: 'high', 4: 'high', 3: 'medium', 2: 'low', 1: 'low' };
      const resolvedSheetId = sheetByNumber(r.sheet_reference) || fallbackSheetId;
      const issue = await base44.asServiceRole.entities.ErectionIssue.create({
        project_id,
        sheet_id: resolvedSheetId,
        sheet_fab_status_at_detection: sheetFabStatusMap[resolvedSheetId] || 'issued_for_approval',
        issue_type: 'installability',
        description: r.description,
        related_connection: r.connection_reference || r.member_mark,
        location_reference: r.location_reference,
        install_risk: riskMap[sev] || 'medium',
        field_delay_risk: sev >= 4 ? 'high' : 'medium',
        inspection_risk: sev >= 4 ? 'high' : 'low',
        confidence_score: r.confidence || 80,
        status: 'open',
        mitigation_plan: r.recommendation || null,
        detected_at: now
      });
      installIssueIds.push(issue.id);

      // Generate RFI suggestion for high-severity install risks with CO exposure
      if (sev >= 4 && r.co_exposure) {
        await base44.asServiceRole.entities.RFISuggestion.create({
          project_id,
          trigger_source: 'erection_risk',
          rfi_title: `Installability Risk — ${r.risk_type?.replace('_', ' ').toUpperCase()} — ${r.member_mark || r.location_reference}`,
          contract_reference: setLabel,
          proposed_question: r.description,
          member_mark: r.member_mark,
          observed_conditions: [{ label: r.sheet_reference, value: r.description }],
          proposed_options: [r.recommendation || 'Clarify with EOR prior to fabrication'],
          impacts_statement: `Field risk: ${r.risk_type}. CO exposure potential.`,
          severity_score: sev,
          referenced_sheets: [sheetByNumber(r.sheet_reference)].filter(Boolean),
          location_reference: r.location_reference,
          fabrication_hold: sev >= 5,
          schedule_risk: sev >= 4 ? 'high' : 'medium',
          scope_change: true,
          linked_erection_issue_id: issue.id,
          confidence_score: r.confidence || 80,
          status: 'pending_review',
          approved_for_export: false
        });
      }
    }

    // ===== SAVE DRIFT FINDINGS → DesignIntentFlag =====
    const driftFlagIds = [];
    const coExposureItems = [];
    for (const d of driftFindings) {
      const sev = d.severity || 3;
      const resolvedDriftSheetId = sheetByNumber(d.sheet_reference) || fallbackSheetId;
      const flag = await base44.asServiceRole.entities.DesignIntentFlag.create({
        project_id,
        sheet_id: resolvedDriftSheetId,
        change_category: d.change_category || 'connection_type',
        description: d.description,
        location_reference: d.location_reference,
        original_intent: d.original_intent,
        new_intent: d.new_intent,
        requires_PM_approval: sev >= 3,
        requires_engineer_review: sev >= 4,
        fabrication_impact: !!d.fabrication_impact,
        erection_impact: !!d.erection_impact,
        confidence_score: d.confidence || 80,
        status: 'flagged'
      });
      driftFlagIds.push(flag.id);

      // Track CO exposure items
      if (d.co_exposure) {
        coExposureItems.push({
          description: d.description,
          original: d.original_intent,
          new: d.new_intent,
          member: d.member_mark,
          location: d.location_reference,
          labor_delta: d.estimated_labor_delta,
          reason: d.co_exposure_reason,
          severity: sev,
          flag_id: flag.id
        });

        // Auto-RFI suggestion for scope drift with CO exposure
        if (sev >= 3) {
          await base44.asServiceRole.entities.RFISuggestion.create({
            project_id,
            trigger_source: 'scope_change',
            rfi_title: `Design-Intent Drift — ${d.change_category?.replace('_', ' ').toUpperCase()} — ${d.member_mark || d.location_reference}`,
            contract_reference: setLabel,
            proposed_question: `${d.description}\n\nOriginal: ${d.original_intent}\nCurrent: ${d.new_intent}`,
            member_mark: d.member_mark,
            observed_conditions: [
              { label: 'Original Contract Intent', value: d.original_intent },
              { label: 'Current Drawing Shows', value: d.new_intent },
              { label: 'Sheet Reference', value: d.sheet_reference }
            ],
            proposed_options: [
              'Option A: Confirm change is within original contract scope — no COR required.',
              'Option B: Acknowledge scope change — issue Change Order Request for additional labor/material.',
              'Option C: Revert to original design intent — EOR to issue revised detail.'
            ],
            impacts_statement: `Labor delta risk: ${d.estimated_labor_delta || 'TBD'}. ${d.co_exposure_reason || 'Potential change order exposure.'}`,
            severity_score: sev,
            referenced_sheets: [sheetByNumber(d.sheet_reference)].filter(Boolean),
            location_reference: d.location_reference,
            fabrication_hold: !!d.fabrication_impact && sev >= 4,
            schedule_risk: sev >= 4 ? 'high' : 'medium',
            scope_change: true,
            labor_delta_risk: d.estimated_labor_delta === 'High' ? 'High' : d.estimated_labor_delta === 'Med' ? 'Med' : 'Low',
            linked_erection_issue_id: null,
            confidence_score: d.confidence || 80,
            status: 'pending_review',
            approved_for_export: false
          });
        }
      }
    }

    return Response.json({
      success: true,
      analyzed_at: now,
      sheets_analyzed: sheetsWithFiles.length,
      installability_risks_found: installRisks.length,
      drift_findings_found: driftFindings.length,
      co_exposure_count: coExposureItems.length,
      co_exposure_items: coExposureItems,
      install_issue_ids: installIssueIds,
      drift_flag_ids: driftFlagIds,
    });

  } catch (error) {
    console.error('[DI Enhanced] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});