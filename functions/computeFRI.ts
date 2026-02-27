/**
 * Fabrication Readiness Index (FRI)
 * Scores a work package / area against 7 weighted steel-specific checks.
 * Returns: fri_score (0-100), safe_to_fabricate (bool), hold_recommendation
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Weight config — higher = more critical to score
const FRI_CHECKS = [
  { key: 'rfi_clear',          label: 'RFI Impact Resolved',         weight: 20, blocker: true },
  { key: 'submittal_approved', label: 'Submittal Approved',           weight: 15, blocker: true },
  { key: 'vif_confirmed',      label: 'VIF / Field Dims Confirmed',   weight: 15, blocker: false },
  { key: 'embed_clear',        label: 'No Open Embed Conflicts',      weight: 15, blocker: true },
  { key: 'load_list_complete', label: 'Load List Completed',          weight: 15, blocker: false },
  { key: 'sequencing_aligned', label: 'Erection Sequencing Aligned',  weight: 10, blocker: false },
  { key: 'drawings_ifc',       label: 'Drawings IFC / FFF',           weight: 10, blocker: true },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { work_package_id, project_id } = await req.json();
    if (!work_package_id || !project_id) {
      return Response.json({ error: 'work_package_id and project_id required' }, { status: 400 });
    }

    // Fetch WP
    const wps = await base44.asServiceRole.entities.WorkPackage.filter({ id: work_package_id, project_id });
    if (!wps.length) return Response.json({ error: 'WorkPackage not found' }, { status: 404 });
    const wp = wps[0];

    const checkResults = [];
    let blockerFailed = false;
    let totalWeight = 0;
    let earnedWeight = 0;
    const holds = [];

    // --- CHECK 1: RFI impact resolved ---
    let rfiClear = true;
    let rfiDetail = null;
    if (wp.linked_rfi_ids && wp.linked_rfi_ids.length > 0) {
      const rfis = await base44.asServiceRole.entities.RFI.filter({ project_id });
      const linkedRFIs = rfis.filter(r => wp.linked_rfi_ids.includes(r.id));
      const openFabRFIs = linkedRFIs.filter(r =>
        r.status !== 'closed' && r.status !== 'answered' && r.fab_blocker === true
      );
      if (openFabRFIs.length > 0) {
        rfiClear = false;
        rfiDetail = `${openFabRFIs.length} open fab-blocking RFI(s): ${openFabRFIs.map(r => `RFI-${r.rfi_number}`).join(', ')}`;
        holds.push({ check: 'rfi_clear', reason: rfiDetail, risk: 'HIGH' });
      }
    }
    checkResults.push({ key: 'rfi_clear', passed: rfiClear, detail: rfiDetail });

    // --- CHECK 2: Submittal approved ---
    let submittalApproved = true;
    let submittalDetail = null;
    if (wp.linked_submittal_ids && wp.linked_submittal_ids.length > 0) {
      const submittals = await base44.asServiceRole.entities.Submittal.filter({ project_id });
      const linkedSubs = submittals.filter(s => wp.linked_submittal_ids.includes(s.id));
      const unapproved = linkedSubs.filter(s => s.status !== 'approved');
      if (unapproved.length > 0) {
        submittalApproved = false;
        submittalDetail = `${unapproved.length} unapproved submittal(s)`;
        holds.push({ check: 'submittal_approved', reason: submittalDetail, risk: 'HIGH' });
      }
    }
    checkResults.push({ key: 'submittal_approved', passed: submittalApproved, detail: submittalDetail });

    // --- CHECK 3: VIF / Field dims confirmed ---
    const vifConfirmed = wp.vif_confirmed === true;
    if (!vifConfirmed) holds.push({ check: 'vif_confirmed', reason: 'VIF / field dimensions not confirmed', risk: 'MED' });
    checkResults.push({ key: 'vif_confirmed', passed: vifConfirmed, detail: vifConfirmed ? null : 'VIF not confirmed' });

    // --- CHECK 4: Embed conflicts cleared ---
    const embedClear = wp.embed_conflicts_resolved !== false && !wp.embed_conflict_flag;
    if (!embedClear) {
      holds.push({ check: 'embed_clear', reason: 'Open embed conflicts detected', risk: 'HIGH' });
    }
    checkResults.push({ key: 'embed_clear', passed: embedClear, detail: embedClear ? null : 'Embed conflict flagged' });

    // --- CHECK 5: Load list complete ---
    const loadListComplete = wp.load_list_verified === true;
    if (!loadListComplete) holds.push({ check: 'load_list_complete', reason: 'Load list not completed/verified', risk: 'MED' });
    checkResults.push({ key: 'load_list_complete', passed: loadListComplete, detail: loadListComplete ? null : 'Load list not verified' });

    // --- CHECK 6: Erection sequencing aligned ---
    const sequencingAligned = wp.sequence_locked === true || wp.sequence_group != null;
    if (!sequencingAligned) holds.push({ check: 'sequencing_aligned', reason: 'Erection sequence not locked', risk: 'LOW' });
    checkResults.push({ key: 'sequencing_aligned', passed: sequencingAligned, detail: sequencingAligned ? null : 'Sequence not locked' });

    // --- CHECK 7: Drawings IFC / FFF ---
    let drawingsClear = true;
    let drawingsDetail = null;
    if (wp.drawing_set_id) {
      const drawingSets = await base44.asServiceRole.entities.DrawingSet.filter({ id: wp.drawing_set_id });
      const ds = drawingSets[0];
      if (ds && ds.status !== 'FFF' && ds.status !== 'BFS' && ds.status !== 'IFC') {
        drawingsClear = false;
        drawingsDetail = `Drawing status: ${ds.status} — not released for fabrication`;
        holds.push({ check: 'drawings_ifc', reason: drawingsDetail, risk: 'HIGH' });
      }
    } else {
      drawingsClear = false;
      drawingsDetail = 'No drawing set assigned';
      holds.push({ check: 'drawings_ifc', reason: drawingsDetail, risk: 'HIGH' });
    }
    checkResults.push({ key: 'drawings_ifc', passed: drawingsClear, detail: drawingsDetail });

    // --- SCORE CALCULATION ---
    const checkMap = {};
    for (const r of checkResults) checkMap[r.key] = r.passed;

    for (const check of FRI_CHECKS) {
      totalWeight += check.weight;
      if (checkMap[check.key]) {
        earnedWeight += check.weight;
      } else if (check.blocker) {
        blockerFailed = true;
      }
    }

    let friScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
    if (blockerFailed) friScore = Math.min(friScore, 49);

    const safeToFabricate = friScore >= 80 && !blockerFailed;

    // Risk-weighted hold recommendation
    const highRiskHolds = holds.filter(h => h.risk === 'HIGH');
    const holdRecommendation = highRiskHolds.length > 0
      ? `HOLD — ${highRiskHolds.length} high-risk issue(s) must be resolved before release: ${highRiskHolds.map(h => h.check).join(', ')}`
      : holds.length > 0
        ? `CAUTION — ${holds.length} item(s) outstanding. Proceed at PM discretion.`
        : 'CLEAR — No outstanding holds.';

    // Persist results back to WP
    await base44.asServiceRole.entities.WorkPackage.update(work_package_id, {
      fri_score: friScore,
      safe_to_fabricate: safeToFabricate,
      fri_computed_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      work_package_id,
      fri_score: friScore,
      safe_to_fabricate: safeToFabricate,
      hold_recommendation: holdRecommendation,
      checks: checkResults.map(r => ({
        ...r,
        ...FRI_CHECKS.find(c => c.key === r.key)
      })),
      holds,
      blocker_failed: blockerFailed,
    });

  } catch (error) {
    console.error('FRI computation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});