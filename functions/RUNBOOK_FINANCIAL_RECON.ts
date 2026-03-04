# Financial Reconciliation — Ops Runbook
## SteelBuild Pro · Finance Engineering

---

## 1. Scheduled Jobs

| Job | Schedule | Function | What it checks |
|-----|----------|----------|----------------|
| Daily Reconciliation | Daily 02:00 UTC | `dailyReconciliation` | SOV vs contract, invoice header vs lines, budget formula, expenses vs actuals |
| Monthly Close | 1st of month 03:00 UTC | `monthlyReconciliation` | Full-cycle: estimate → contract → CO history → SOV → invoices → payments |

Automations are created in the dashboard under **Code → Automations**.

---

## 2. Alert Thresholds

| Severity | Trigger | Action |
|----------|---------|--------|
| **CRITICAL** | \|mismatch\| > $10,000 OR formula test failure | Immediate Slack + email to FINANCE_ALERT_EMAIL |
| **HIGH** | \|mismatch\| > $1,000 | Slack + email |
| **MEDIUM** | \|mismatch\| > $100 | Logged only — visible in dashboard |
| **LOW** | \|mismatch\| ≤ $100 | Logged only |

**To change thresholds:** Edit `THRESHOLD` constant in `dailyReconciliation.js`.

---

## 3. Environment Variables

Set these in **Dashboard → Settings → Environment Variables**:

| Variable | Purpose |
|----------|---------|
| `SLACK_WEBHOOK_URL` | Incoming webhook URL for #finance-alerts channel |
| `FINANCE_ALERT_EMAIL` | Email address for reconciliation alerts |

---

## 4. QA Sign-off Flow

Monthly close creates PMControlEntry records in the QA queue.
All three roles must sign off before a record is locked:

```
estimator → project_manager → finance → LOCKED (immutable)
```

- **Sign off:** `POST qaSignOff { action: 'sign_off', qa_item_id, role, notes }`
- **Reject:** `POST qaSignOff { action: 'reject', qa_item_id, notes }` (notes required)
- **Unlock (admin only):** `POST qaSignOff { action: 'unlock', qa_item_id, notes }`

Revert creates an AuditEvent — full history is preserved.

---

## 5. On-Demand Reconciliation

Admin can trigger a full reconciliation at any time:

**Via dashboard:** Financials → Reconciliation Dashboard → **Run Now** button.

**Via API:**
```
POST /functions/dailyReconciliation
Body: { "force": true }
Headers: Authorization: Bearer <admin_token>
```

---

## 6. Exporting Reports

From the Reconciliation Dashboard or directly:

```
POST /functions/exportReconciliationReport
Body: {
  "run_id": "RECON-DAILY-2026-03-04-...",   // optional — omit for all
  "project_id": "proj-123",                  // optional filter
  "format": "csv",                           // "csv" or "pdf"
  "severity_filter": "critical"              // optional — "critical"|"high"|"medium"|"low"
}
```

CSV: opens in Excel. Columns: run_id, project_id, severity, category, check_name, description, expected, actual, delta, status.

PDF: returns HTML — print to PDF in browser (Ctrl+P → Save as PDF). Highlights critical rows in red.

---

## 7. Reconciliation Checks Reference

| Check | Formula | Fail Condition |
|-------|---------|----------------|
| `SOV_VS_CONTRACT` | Σ SOVItem.scheduled_value == Project.contract_value | Δ > $0.01 |
| `SOV_BTF_BALANCE` | balance_to_finish == sv - total_billed | Per line |
| `INVOICE_HEADER_VS_LINES` | Invoice.total_amount == Σ InvoiceLine.current_billed | Per invoice |
| `INVOICED_VS_SOV_BILLED` | Σ Invoice.total_amount == Σ SOVItem.total_billed | Portfolio |
| `CO_IMPACT_VS_BUDGET_CHANGES` | Σ approved CO.cost_impact == Σ Financial.approved_changes | Portfolio |
| `BUDGET_CURRENT_FORMULA` | current_budget == original_budget + approved_changes | Per cost code |
| `EXPENSES_VS_ACTUALS` | Σ paid Expense.amount == Σ Financial.actual_amount | Per project |
| `FORECAST_BELOW_ACTUAL` | forecast_amount >= actual_amount | Per cost code |
| `REVISED_CONTRACT_FORMULA` | revised = original + Σ CO impacts | Monthly only |
| `SOV_VS_CLIENT_INVOICES` | Σ SOV billed == Σ ClientInvoice.amount | Monthly only |
| `STALE_PENDING_EXPENSES` | No pending expenses > 30 days old | Monthly only |

---

## 8. Incident Response

### High/Critical mismatch detected

1. Check the Reconciliation Dashboard → top mismatches for the affected project.
2. Click on the finding row to expand description and Δ amount.
3. Open the source record (Financial, SOVItem, Invoice) via the traceability slide-over.
4. Determine root cause: data entry error, import mismatch, or CO not posted.
5. Correct the source record. **Never manually patch computed fields** (current_budget, balance_to_finish, etc.) — use auto-fix or re-run after correcting inputs.
6. Re-run reconciliation via **Run Now** to confirm resolution.
7. Sign off in QA queue once all checks pass.

### Failed formula acceptance test

1. Check App → Formula Tests (FinancialTestRunner page).
2. Identify failing suite and specific test case.
3. Review recent changes to `financialFormulas.js`.
4. Fix formula and re-run tests before any further financial imports.
5. Alert: any formula test failure is CRITICAL — it may affect calculated values across all projects.

### Reconciliation job fails to run

1. Check Deno function logs in Dashboard → Code → Functions → `dailyReconciliation`.
2. Common causes: entity permission error, missing env var, SDK version mismatch.
3. Manually trigger via **Run Now** after fixing.
4. If Slack/email alerts fail separately, verify `SLACK_WEBHOOK_URL` and `FINANCE_ALERT_EMAIL` are set.

---

## 9. Sample Escalation Matrix

| Condition | Notify | SLA |
|-----------|--------|-----|
| CRITICAL mismatch > $10k | Finance Director + PM | 4 hours |
| CRITICAL mismatch > $50k | CFO + PM + Finance Director | 1 hour |
| Formula test failure | Dev lead + Finance | 2 hours |
| Monthly close QA not signed off by 5th | Finance Director | Next business day |
| Record unlock requested | Finance Director must approve | Same day |