/**
 * Erection Installability Index (EII)
 * Evaluates install risk across 6 field-critical dimensions.
 * Returns: eii_score (0-100), install_risk (LOW/MED/HIGH), schedule_compression_risk_%
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Weight config
const EII_CHECKS = [
  { key: 'rfi_install_clear',   label: 'No RFIs Affecting Install',    weight: 25, blocker: true  },
  { key: 'embeds_confirmed',    label: 'Embeds Set & Surveyed',         weight: 20, blocker: true  },
  { key: 'survey_tolerance',    label: 'Survey Tolerance Within Spec',  weight: 15, blocker: false },
  { key: 'crane_access',        label: 'Crane Access Window Confirmed', weight: 15, blocker: false },
  { key: 'deck_available',      label: 'Deck / Working Surface Ready',  weight: 15, blocker: false },
  { key: 'predecessor_trades',  label: 'Predecessor Trades Complete',   weight: 10, blocker: false },
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
    const riskFactors = [];

    // --- CHECK 1: RFIs affecting install ---
    let rfiInstallClear = true;
    if (wp.linked_rfi_ids && wp.linked_rfi_ids.length > 0) {
      const rfis = await base44.asServiceRole.entities.RFI.filter({ project_id });
      const linked = rfis.filter(r => wp.linked_rfi_ids.includes(r.id));
      const installBlockers = linked.filter(r =>
        (r.is_install_blocker || r.affects_sequence) &&
        r.status !== 'closed' && r.status !== 'answered'
      );
      if (installBlockers.length > 0) {
        rfiInstallClear = false;
        riskFactors.push({ factor: 'rfi_install_clear', detail: `${installBlockers.length} install-blocking RFI(s) open`, severity: 'HIGH' });
      }
    }
    checkResults.push({ key: 'rfi_install_clear', passed: rfiInstallClear });

    // --- CHECK 2: Embeds confirmed ---
    const embedsConfirmed = wp.embeds_confirmed === true;
    if (!embedsConfirmed) riskFactors.push({ factor: 'embeds_confirmed', detail: 'Embeds not confirmed set/surveyed', severity: 'HIGH' });
    checkResults.push({ key: 'embeds_confirmed', passed: embedsConfirmed });

    // --- CHECK 3: Survey tolerance ---
    const surveyOk = wp.survey_tolerance_ok !== false; // null = assumed ok, false = explicit fail
    if (!surveyOk) riskFactors.push({ factor: 'survey_tolerance', detail: 'Survey tolerance out of spec', severity: 'MED' });
    checkResults.push({ key: 'survey_tolerance', passed: surveyOk });

    // --- CHECK 4: Crane access window ---
    const craneConfirmed = wp.crane_access_confirmed === true;
    if (!craneConfirmed) riskFactors.push({ factor: 'crane_access', detail: 'Crane access window not confirmed', severity: 'MED' });
    checkResults.push({ key: 'crane_access', passed: craneConfirmed });

    // --- CHECK 5: Deck / working surface ---
    const deckAvailable = wp.deck_available !== false;
    if (!deckAvailable) riskFactors.push({ factor: 'deck_available', detail: 'Deck or working surface not confirmed ready', severity: 'MED' });
    checkResults.push({ key: 'deck_available', passed: deckAvailable });

    // --- CHECK 6: Predecessor trades ---
    const predecessorsDone = wp.predecessor_trades_complete !== false;
    if (!predecessorsDone) riskFactors.push({ factor: 'predecessor_trades', detail: 'Predecessor trades not confirmed complete', severity: 'LOW' });
    checkResults.push({ key: 'predecessor_trades', passed: predecessorsDone });

    // --- SCORE CALCULATION ---
    const checkMap = {};
    for (const r of checkResults) checkMap[r.key] = r.passed;

    for (const check of EII_CHECKS) {
      totalWeight += check.weight;
      if (checkMap[check.key]) {
        earnedWeight += check.weight;
      } else if (check.blocker) {
        blockerFailed = true;
      }
    }

    let eiiScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
    if (blockerFailed) eiiScore = Math.min(eiiScore, 49);

    // Install Risk classification
    let installRisk;
    if (eiiScore >= 80 && !blockerFailed) {
      installRisk = 'LOW';
    } else if (eiiScore >= 55) {
      installRisk = 'MED';
    } else {
      installRisk = 'HIGH';
    }

    // Schedule compression risk %
    // Based on failed check weight ratio + remaining install days
    const failedWeightRatio = totalWeight > 0 ? (totalWeight - earnedWeight) / totalWeight : 0;
    const daysUntilInstall = wp.install_day
      ? Math.max(0, Math.floor((new Date(wp.install_day) - new Date()) / 86400000))
      : null;

    let scheduleCompressionRisk = Math.round(failedWeightRatio * 100);
    if (daysUntilInstall !== null && daysUntilInstall <= 7 && installRisk !== 'LOW') {
      scheduleCompressionRisk = Math.min(100, scheduleCompressionRisk + 20);
    }

    // Persist to WP
    await base44.asServiceRole.entities.WorkPackage.update(work_package_id, {
      eii_score: eiiScore,
      install_risk: installRisk,
      schedule_compression_risk_pct: scheduleCompressionRisk,
      eii_computed_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      work_package_id,
      eii_score: eiiScore,
      install_risk: installRisk,
      schedule_compression_risk_pct: scheduleCompressionRisk,
      checks: checkResults.map(r => ({
        ...r,
        ...EII_CHECKS.find(c => c.key === r.key)
      })),
      risk_factors: riskFactors,
      blocker_failed: blockerFailed,
      days_until_install: daysUntilInstall,
    });

  } catch (error) {
    console.error('EII computation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});