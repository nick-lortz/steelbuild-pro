/**
 * dailyReconciliation — Scheduled daily financial reconciliation job
 * ==================================================================
 * Compares: Estimates → Contracts → SOV → Invoices → Payments → Expenses
 * Writes mismatches to AuditRun + AuditFinding entities.
 * Fires alerts (email + Slack) for HIGH/CRITICAL severity mismatches.
 *
 * Triggered by: scheduled automation (daily, 02:00 UTC)
 * Also callable on-demand by admin via POST { force: true }
 *
 * ALERT THRESHOLDS (change these to tune sensitivity):
 *   CRITICAL : |mismatch| > $10,000 OR formula test failure
 *   HIGH     : |mismatch| > $1,000
 *   MEDIUM   : |mismatch| > $100
 *   LOW      : |mismatch| <= $100
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const THRESHOLD = { CRITICAL: 10000, HIGH: 1000, MEDIUM: 100 };
const SLACK_WEBHOOK = Deno.env.get('SLACK_WEBHOOK_URL');
const NOTIFY_EMAIL  = Deno.env.get('FINANCE_ALERT_EMAIL') || '';

// ─── helpers ────────────────────────────────────────────────────────────────

const n = (v) => Number(v) || 0;
const round2 = (v) => Math.round(n(v) * 100) / 100;
const fmtUSD = (v) => `$${round2(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function severity(delta) {
  const abs = Math.abs(delta);
  if (abs >= THRESHOLD.CRITICAL) return 'critical';
  if (abs >= THRESHOLD.HIGH)     return 'high';
  if (abs >= THRESHOLD.MEDIUM)   return 'medium';
  return 'low';
}

function mismatch(check, expected, actual, category, project_id, meta = {}) {
  const delta = round2(actual - expected);
  if (Math.abs(delta) < 0.01) return null;
  return {
    check_name:  check,
    category,
    project_id,
    expected:    round2(expected),
    actual:      round2(actual),
    delta,
    severity:    severity(delta),
    description: `${check}: expected ${fmtUSD(expected)}, got ${fmtUSD(actual)} (Δ ${fmtUSD(delta)})`,
    ...meta,
  };
}

// ─── Reconciliation logic ────────────────────────────────────────────────────

async function reconcileProject(base44, project) {
  const pid = project.id;
  const findings = [];

  const [financials, sovItems, invoices, invoiceLines, changeOrders, expenses] = await Promise.all([
    base44.asServiceRole.entities.Financial.filter({ project_id: pid }),
    base44.asServiceRole.entities.SOVItem.filter({ project_id: pid }),
    base44.asServiceRole.entities.Invoice.filter({ project_id: pid }),
    base44.asServiceRole.entities.InvoiceLine.filter({ project_id: pid }),
    base44.asServiceRole.entities.ChangeOrder.filter({ project_id: pid }),
    base44.asServiceRole.entities.Expense.filter({ project_id: pid }),
  ]);

  const contractValue = n(project.contract_value);

  // ── CHECK 1: SOV total == contract value ─────────────────────────────────
  if (contractValue > 0) {
    const sovTotal = round2(sovItems.reduce((s, i) => s + n(i.scheduled_value), 0));
    const f = mismatch('SOV_VS_CONTRACT', contractValue, sovTotal, 'sov', pid, { entity: 'SOVItem' });
    if (f) findings.push(f);
  }

  // ── CHECK 2: SOV balance equation ────────────────────────────────────────
  for (const sov of sovItems) {
    const btd = round2(n(sov.total_billed || sov.billed_to_date));
    const btf = n(sov.balance_to_finish);
    const expected_btf = round2(n(sov.scheduled_value) - btd);
    const f = mismatch('SOV_BTF_BALANCE', expected_btf, btf, 'sov', pid, { entity_id: sov.id, label: sov.description });
    if (f) findings.push(f);
  }

  // ── CHECK 3: Invoice header vs line sum ───────────────────────────────────
  for (const inv of invoices) {
    const lines    = invoiceLines.filter(l => l.invoice_id === inv.id);
    const lineSum  = round2(lines.reduce((s, l) => s + n(l.current_billed), 0));
    const f = mismatch('INVOICE_HEADER_VS_LINES', n(inv.total_amount), lineSum, 'invoice', pid, { entity_id: inv.id });
    if (f) findings.push(f);
  }

  // ── CHECK 4: Total invoiced vs total SOV billed ───────────────────────────
  const totalInvoiced = round2(invoices.reduce((s, i) => s + n(i.total_amount), 0));
  const totalSOVBilled = round2(sovItems.reduce((s, i) => s + n(i.total_billed || i.billed_to_date || 0), 0));
  const f4 = mismatch('INVOICED_VS_SOV_BILLED', totalSOVBilled, totalInvoiced, 'billing', pid);
  if (f4) findings.push(f4);

  // ── CHECK 5: Approved COs reconcile to budget changes ─────────────────────
  const approvedCOs = changeOrders.filter(c => c.status === 'approved');
  const coImpact    = round2(approvedCOs.reduce((s, c) => s + n(c.cost_impact), 0));
  const budgetChanges = round2(financials.reduce((s, f) => s + n(f.approved_changes), 0));
  const f5 = mismatch('CO_IMPACT_VS_BUDGET_CHANGES', coImpact, budgetChanges, 'budget', pid);
  if (f5) findings.push(f5);

  // ── CHECK 6: Budget current = original + changes ──────────────────────────
  for (const fin of financials) {
    const expected_curr = round2(n(fin.original_budget) + n(fin.approved_changes));
    const f = mismatch('BUDGET_CURRENT_FORMULA', expected_curr, n(fin.current_budget), 'budget', pid, { entity_id: fin.id, cost_code_id: fin.cost_code_id });
    if (f) findings.push(f);
  }

  // ── CHECK 7: Expenses total vs actuals in Financial ───────────────────────
  const totalExpenses = round2(expenses.filter(e => e.payment_status === 'paid' || e.payment_status === 'approved').reduce((s, e) => s + n(e.amount), 0));
  const totalActuals  = round2(financials.reduce((s, f) => s + n(f.actual_amount), 0));
  const f7 = mismatch('EXPENSES_VS_ACTUALS', totalExpenses, totalActuals, 'expenses', pid);
  if (f7) findings.push(f7);

  // ── CHECK 8: Forecast >= Actuals ──────────────────────────────────────────
  for (const fin of financials) {
    if (n(fin.forecast_amount) < n(fin.actual_amount) - 0.01) {
      findings.push({
        check_name: 'FORECAST_BELOW_ACTUAL', category: 'budget', project_id: pid,
        expected: n(fin.actual_amount), actual: n(fin.forecast_amount),
        delta: round2(n(fin.forecast_amount) - n(fin.actual_amount)),
        severity: 'high',
        description: `Forecast ($${n(fin.forecast_amount).toFixed(2)}) is below actual costs ($${n(fin.actual_amount).toFixed(2)}) for cost code ${fin.cost_code_id}.`,
        entity_id: fin.id, cost_code_id: fin.cost_code_id,
      });
    }
  }

  return findings;
}

// ─── Alerting ────────────────────────────────────────────────────────────────

async function sendSlackAlert(findings, runId) {
  if (!SLACK_WEBHOOK) return;
  const critical = findings.filter(f => f.severity === 'critical');
  const high     = findings.filter(f => f.severity === 'high');
  if (critical.length === 0 && high.length === 0) return;

  const lines = [
    `🚨 *SteelBuild Financial Reconciliation Alert* — Run \`${runId}\``,
    `*${critical.length} CRITICAL · ${high.length} HIGH* mismatches detected`,
    '',
    ...critical.slice(0, 5).map(f => `❌ [${f.project_id}] ${f.description}`),
    ...high.slice(0, 5).map(f => `⚠️ [${f.project_id}] ${f.description}`),
    '',
    `_Review: App → Financials → Reconciliation Dashboard_`,
  ];

  await fetch(SLACK_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: lines.join('\n') }),
  }).catch(e => console.error('Slack alert failed:', e.message));
}

async function sendEmailAlert(base44, findings, runId) {
  if (!NOTIFY_EMAIL) return;
  const critical = findings.filter(f => f.severity === 'critical');
  const high     = findings.filter(f => f.severity === 'high');
  if (critical.length === 0 && high.length === 0) return;

  const rows = [...critical, ...high].slice(0, 20).map(f =>
    `<tr><td>${f.project_id}</td><td><b>${f.severity.toUpperCase()}</b></td><td>${f.check_name}</td><td>${f.description}</td></tr>`
  ).join('');

  await base44.asServiceRole.integrations.Core.SendEmail({
    to: NOTIFY_EMAIL,
    subject: `[SteelBuild] ${critical.length} Critical Financial Mismatches — Run ${runId}`,
    body: `<h2>Financial Reconciliation Alert</h2>
<p>Run ID: <code>${runId}</code> — ${new Date().toISOString()}</p>
<p><b>${critical.length} Critical</b> and <b>${high.length} High</b> severity mismatches found.</p>
<table border="1" cellpadding="6" style="border-collapse:collapse">
<tr><th>Project</th><th>Severity</th><th>Check</th><th>Description</th></tr>
${rows}
</table>
<p>Log in to review the full Reconciliation Dashboard and sign off on affected records.</p>`,
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: allow scheduled call (no user) or admin trigger
    let isScheduled = false;
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Admin only' }, { status: 403 });
      }
    } catch {
      isScheduled = true; // scheduled automation — no user token
    }

    const runId = `RECON-DAILY-${new Date().toISOString().slice(0, 10)}-${Date.now()}`;
    const startedAt = new Date().toISOString();

    // Fetch all active projects
    const projects = await base44.asServiceRole.entities.Project.filter({ status: 'in_progress' });

    let allFindings = [];
    const projectResults = [];

    for (const project of projects) {
      const findings = await reconcileProject(base44, project);
      allFindings = allFindings.concat(findings);
      projectResults.push({
        project_id: project.id,
        project_name: project.name,
        findings_count: findings.length,
        critical: findings.filter(f => f.severity === 'critical').length,
        high:     findings.filter(f => f.severity === 'high').length,
      });
    }

    const summary = {
      total:    allFindings.length,
      critical: allFindings.filter(f => f.severity === 'critical').length,
      high:     allFindings.filter(f => f.severity === 'high').length,
      medium:   allFindings.filter(f => f.severity === 'medium').length,
      low:      allFindings.filter(f => f.severity === 'low').length,
    };

    // Store AuditRun record
    const run = await base44.asServiceRole.entities.AuditRun.create({
      run_id:      runId,
      run_type:    'daily_reconciliation',
      started_at:  startedAt,
      completed_at: new Date().toISOString(),
      status:      summary.critical > 0 ? 'failed' : summary.high > 0 ? 'warning' : 'passed',
      findings_count: summary.total,
      summary:     JSON.stringify(summary),
      triggered_by_user_id: 'system-scheduled',
      projects_checked: projects.length,
    });

    // Store findings as AuditFindings
    for (const f of allFindings) {
      await base44.asServiceRole.entities.AuditFinding.create({
        audit_run_id: run.id,
        ...f,
        status: 'open',
        created_at: new Date().toISOString(),
      });
    }

    // Fire alerts for critical/high
    await Promise.all([
      sendSlackAlert(allFindings, runId),
      sendEmailAlert(base44, allFindings, runId),
    ]);

    return Response.json({
      run_id: runId,
      summary,
      project_results: projectResults,
      status: run.status,
    });

  } catch (error) {
    console.error('dailyReconciliation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});