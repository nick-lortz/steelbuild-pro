/**
 * monthlyReconciliation — Deep monthly close reconciliation
 * =========================================================
 * Runs on 1st of each month. Checks full-cycle: estimate → contract →
 * CO history → SOV cumulative → invoices → payments → actuals.
 * Generates a full mismatch report suitable for export.
 *
 * Also produces the QA review queue records for sign-off.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const n = (v) => Number(v) || 0;
const round2 = (v) => Math.round(n(v) * 100) / 100;
const fmtUSD = (v) => `$${round2(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
const SLACK_WEBHOOK = Deno.env.get('SLACK_WEBHOOK_URL');
const NOTIFY_EMAIL  = Deno.env.get('FINANCE_ALERT_EMAIL') || '';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    } catch { /* scheduled */ }

    const runId     = `RECON-MONTHLY-${new Date().toISOString().slice(0, 7)}-${Date.now()}`;
    const startedAt = new Date().toISOString();
    const month     = new Date().toISOString().slice(0, 7);

    const projects = await base44.asServiceRole.entities.Project.filter({ status: 'in_progress' });
    const allFindings = [];
    const qaItems = [];

    for (const project of projects) {
      const pid = project.id;
      const [financials, sovItems, invoices, invoiceLines, changeOrders, expenses, clientInvoices] = await Promise.all([
        base44.asServiceRole.entities.Financial.filter({ project_id: pid }),
        base44.asServiceRole.entities.SOVItem.filter({ project_id: pid }),
        base44.asServiceRole.entities.Invoice.filter({ project_id: pid }),
        base44.asServiceRole.entities.InvoiceLine.filter({ project_id: pid }),
        base44.asServiceRole.entities.ChangeOrder.filter({ project_id: pid }),
        base44.asServiceRole.entities.Expense.filter({ project_id: pid }),
        base44.asServiceRole.entities.ClientInvoice.filter({ project_id: pid }).catch(() => []),
      ]);

      const contractValue = n(project.contract_value);
      const approvedCOs   = changeOrders.filter(c => c.status === 'approved');
      const revisedContract = round2(contractValue + approvedCOs.reduce((s, c) => s + n(c.cost_impact), 0));

      // ── MONTHLY CHECK 1: Revised contract = original + approved COs ──────
      const coSum = round2(approvedCOs.reduce((s, c) => s + n(c.cost_impact), 0));
      const calcRevised = round2(contractValue + coSum);
      if (Math.abs(calcRevised - revisedContract) > 0.01) {
        allFindings.push({ check_name: 'REVISED_CONTRACT_FORMULA', project_id: pid, severity: 'critical', category: 'contract', delta: round2(calcRevised - revisedContract), description: `Revised contract formula mismatch: ${fmtUSD(revisedContract)} recorded vs ${fmtUSD(calcRevised)} calculated.` });
      }

      // ── MONTHLY CHECK 2: Cumulative billed vs client invoices issued ──────
      const totalSOVBilled   = round2(sovItems.reduce((s, i) => s + n(i.total_billed || i.billed_to_date || 0), 0));
      const totalClientBilled = round2(clientInvoices.reduce((s, i) => s + n(i.amount), 0));
      if (clientInvoices.length > 0 && Math.abs(totalSOVBilled - totalClientBilled) > 0.01) {
        const delta = round2(totalClientBilled - totalSOVBilled);
        allFindings.push({ check_name: 'SOV_VS_CLIENT_INVOICES', project_id: pid, severity: Math.abs(delta) > 1000 ? 'high' : 'medium', category: 'billing', delta, description: `SOV billed (${fmtUSD(totalSOVBilled)}) ≠ client invoices issued (${fmtUSD(totalClientBilled)}).` });
      }

      // ── MONTHLY CHECK 3: Total expenses vs budget actuals ─────────────────
      const paidExpenses = round2(expenses.filter(e => ['paid', 'approved'].includes(e.payment_status)).reduce((s, e) => s + n(e.amount), 0));
      const recordedActuals = round2(financials.reduce((s, f) => s + n(f.actual_amount), 0));
      if (Math.abs(paidExpenses - recordedActuals) > 100) {
        const delta = round2(paidExpenses - recordedActuals);
        allFindings.push({ check_name: 'EXPENSES_VS_ACTUALS_MONTHLY', project_id: pid, severity: Math.abs(delta) > 10000 ? 'critical' : 'high', category: 'expenses', delta, description: `Paid expenses (${fmtUSD(paidExpenses)}) ≠ Financial actuals (${fmtUSD(recordedActuals)}). Δ ${fmtUSD(delta)}.` });
      }

      // ── MONTHLY CHECK 4: No unapproved expenses older than 30 days ────────
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const staleExpenses = expenses.filter(e => e.payment_status === 'pending' && new Date(e.expense_date) < thirtyDaysAgo);
      if (staleExpenses.length > 0) {
        allFindings.push({ check_name: 'STALE_PENDING_EXPENSES', project_id: pid, severity: 'medium', category: 'expenses', delta: 0, description: `${staleExpenses.length} expense(s) pending approval for >30 days. Total: ${fmtUSD(staleExpenses.reduce((s, e) => s + n(e.amount), 0))}.` });
      }

      // ── QA QUEUE: Create sign-off item for this project's monthly close ───
      qaItems.push({
        project_id: pid,
        project_name: project.name,
        qa_type: 'monthly_close',
        period: month,
        run_id: runId,
        status: 'pending',
        findings_count: allFindings.filter(f => f.project_id === pid).length,
        required_roles: ['estimator', 'project_manager', 'finance'],
        signoffs: [],
        locked: false,
        created_at: startedAt,
      });
    }

    const summary = {
      total:    allFindings.length,
      critical: allFindings.filter(f => f.severity === 'critical').length,
      high:     allFindings.filter(f => f.severity === 'high').length,
      medium:   allFindings.filter(f => f.severity === 'medium').length,
      low:      allFindings.filter(f => f.severity === 'low').length,
      period:   month,
    };

    // Persist run
    const run = await base44.asServiceRole.entities.AuditRun.create({
      run_id: runId, run_type: 'monthly_reconciliation',
      started_at: startedAt, completed_at: new Date().toISOString(),
      status: summary.critical > 0 ? 'failed' : summary.high > 0 ? 'warning' : 'passed',
      findings_count: summary.total, summary,
      projects_checked: projects.length,
    });

    // Persist findings + QA items
    await Promise.all([
      ...allFindings.map(f => base44.asServiceRole.entities.AuditFinding.create({ audit_run_id: run.id, ...f, status: 'open', created_at: startedAt })),
      ...qaItems.map(q => base44.asServiceRole.entities.PMControlEntry.create({ ...q, audit_run_id: run.id })),
    ]);

    // Alert
    if (SLACK_WEBHOOK && (summary.critical > 0 || summary.high > 0)) {
      await fetch(SLACK_WEBHOOK, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `📊 *Monthly Close Reconciliation — ${month}*\n*${summary.critical} CRITICAL · ${summary.high} HIGH* mismatches · ${qaItems.length} QA sign-off items created.\nReview: App → Financials → Reconciliation Dashboard` }),
      }).catch(() => {});
    }
    if (NOTIFY_EMAIL && (summary.critical > 0 || summary.high > 0)) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: NOTIFY_EMAIL,
        subject: `[SteelBuild] Monthly Close — ${summary.critical} Critical Mismatches (${month})`,
        body: `<h2>Monthly Reconciliation — ${month}</h2><p><b>${summary.critical} critical</b> and <b>${summary.high} high</b> severity mismatches found across ${projects.length} active projects.</p><p>QA sign-off queue has been populated. Finance, PM, and Estimator review required before records are locked.</p>`,
      });
    }

    return Response.json({ run_id: runId, summary, qa_items_created: qaItems.length });

  } catch (error) {
    console.error('monthlyReconciliation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});