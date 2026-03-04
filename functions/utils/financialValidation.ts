/**
 * SteelBuild-Pro — Financial Validation & Cross-Field Guards
 * ===========================================================
 * Single source of truth for ALL financial validation rules.
 * Used by: backend functions, validateFinancials endpoint, UI form hooks.
 *
 * Design principles:
 *  - Field-level rules first, then cross-field consistency checks.
 *  - Every error includes a machine-readable `code`, human message, and suggested fix.
 *  - Negative amounts are blocked unless caller passes { allow_credits: true }.
 *  - All monetary comparisons use a $0.01 tolerance (TOLERANCE constant).
 *  - Duplicate-detection helpers return { isDuplicate, matchId, reason }.
 */

const TOLERANCE = 0.01;          // $0.01 rounding tolerance for monetary comparisons
const MAX_CURRENCY = 999_999_999; // $999M hard cap — catches data-entry runaway zeros
const MAX_PCT = 100;
const MIN_PCT = 0;

// ─── Utility ──────────────────────────────────────────────────────────────────

function n(v) { return typeof v === 'number' && !isNaN(v) ? v : Number(v) || 0; }
function near(a, b, tol = TOLERANCE) { return Math.abs(n(a) - n(b)) <= tol; }
function clamp(v, lo, hi) { return Math.min(Math.max(n(v), lo), hi); }
function round2(v) { return Math.round(n(v) * 100) / 100; }

function err(code, message, field, fix) {
  return { code, message, field: field || null, fix: fix || null, severity: 'error' };
}
function warn(code, message, field, fix) {
  return { code, message, field: field || null, fix: fix || null, severity: 'warning' };
}

// ─── 1. FIELD-LEVEL RULES ─────────────────────────────────────────────────────

/**
 * Validate a single currency amount field.
 * @param {number} value
 * @param {string} fieldName
 * @param {{ required, allowNegative, allowNegativeReason, min, max }} opts
 */
export function validateCurrencyField(value, fieldName, opts = {}) {
  const issues = [];
  const v = n(value);

  if (opts.required && (value === null || value === undefined)) {
    issues.push(err('FIELD_REQUIRED', `${fieldName} is required.`, fieldName, `Enter a value for ${fieldName}.`));
    return issues;
  }

  if (isNaN(Number(value)) && value !== null && value !== undefined) {
    issues.push(err('FIELD_NOT_NUMBER', `${fieldName} must be a number.`, fieldName, `Remove any letters or symbols from ${fieldName}.`));
    return issues;
  }

  if (v < 0 && !opts.allowNegative) {
    issues.push(err(
      'NEGATIVE_NOT_ALLOWED',
      `${fieldName} cannot be negative ($${v.toFixed(2)}).`,
      fieldName,
      `Use a positive value. If this is a credit or deduction, enable "Credit Entry" and provide a reason.`
    ));
  }

  if (opts.allowNegative && v < 0 && !opts.allowNegativeReason) {
    issues.push(err(
      'NEGATIVE_REQUIRES_REASON',
      `A reason is required when entering a negative ${fieldName}.`,
      `${fieldName}_reason`,
      `Describe why this is a credit or deduction (e.g., "Owner-directed scope reduction COR-14").`
    ));
  }

  const max = opts.max !== undefined ? opts.max : MAX_CURRENCY;
  if (v > max) {
    issues.push(err(
      'FIELD_EXCEEDS_MAX',
      `${fieldName} ($${v.toLocaleString()}) exceeds maximum allowed ($${max.toLocaleString()}).`,
      fieldName,
      `Verify the value. Amounts over $${max.toLocaleString()} must be reviewed by finance.`
    ));
  }

  if (opts.min !== undefined && v < opts.min) {
    issues.push(err(
      'FIELD_BELOW_MIN',
      `${fieldName} ($${v.toFixed(2)}) is below minimum ($${opts.min.toFixed(2)}).`,
      fieldName,
      `Enter a value of at least $${opts.min.toFixed(2)}.`
    ));
  }

  // Precision guard: more than 2 decimal places
  if (String(value).includes('.') && String(value).split('.')[1].length > 2) {
    issues.push(warn(
      'PRECISION_EXCEEDS_CENTS',
      `${fieldName} has more than 2 decimal places and will be rounded to cents.`,
      fieldName,
      `Round ${fieldName} to the nearest cent before saving.`
    ));
  }

  return issues;
}

/**
 * Validate a percentage field (0–100).
 */
export function validatePercentField(value, fieldName, opts = {}) {
  const issues = [];
  const v = n(value);

  if (opts.required && (value === null || value === undefined)) {
    issues.push(err('FIELD_REQUIRED', `${fieldName} is required.`, fieldName));
    return issues;
  }

  if (v < MIN_PCT) {
    issues.push(err('PCT_BELOW_ZERO', `${fieldName} cannot be negative (got ${v}%).`, fieldName, `Enter a percentage between 0 and 100.`));
  }
  if (v > MAX_PCT) {
    issues.push(err('PCT_ABOVE_100', `${fieldName} cannot exceed 100% (got ${v}%).`, fieldName, `Enter a percentage between 0 and 100.`));
  }
  return issues;
}

/**
 * Validate cost code reference exists in the allowed set.
 * @param {string} cost_code_id
 * @param {string[]} allowedCostCodeIds
 */
export function validateCostCodeRef(cost_code_id, allowedCostCodeIds) {
  const issues = [];
  if (!cost_code_id) {
    issues.push(err('COST_CODE_REQUIRED', 'A cost code is required.', 'cost_code_id', 'Select a cost code from the dropdown.'));
    return issues;
  }
  if (allowedCostCodeIds && allowedCostCodeIds.length > 0 && !allowedCostCodeIds.includes(cost_code_id)) {
    issues.push(err('COST_CODE_INVALID', `Cost code "${cost_code_id}" is not active or does not exist.`, 'cost_code_id', 'Select a valid, active cost code from the list.'));
  }
  return issues;
}

// ─── 2. CROSS-FIELD CONSISTENCY CHECKS ────────────────────────────────────────

/**
 * RULE: SOV line — billed_to_date == previous_billed + current_billing
 *       balance_to_finish == scheduled_value - billed_to_date
 *       percent_complete  == billed_to_date / scheduled_value × 100
 */
export function validateSOVItem(item) {
  const issues = [];
  const sv   = n(item.scheduled_value);
  const pct  = n(item.percent_complete);
  const prev = n(item.previous_billed);
  const curr = n(item.current_billing);
  const btd  = n(item.total_billed || item.billed_to_date);
  const btf  = n(item.balance_to_finish);
  const ret  = n(item.retainage_percent ?? 10);

  // Field-level
  issues.push(...validateCurrencyField(sv, 'scheduled_value', { required: true, min: 0 }));
  issues.push(...validatePercentField(pct, 'percent_complete'));
  issues.push(...validatePercentField(ret, 'retainage_percent'));
  issues.push(...validateCurrencyField(curr, 'current_billing', { allowNegative: true, allowNegativeReason: item.negative_billing_reason }));

  // Cross-field: billed_to_date == prev + curr
  const expectedBTD = round2(prev + curr);
  if (!near(btd, expectedBTD)) {
    issues.push(err(
      'SOV_BTD_MISMATCH',
      `total_billed ($${btd.toFixed(2)}) ≠ previous_billed ($${prev.toFixed(2)}) + current_billing ($${curr.toFixed(2)}) = $${expectedBTD.toFixed(2)}.`,
      'total_billed',
      `Set total_billed = $${expectedBTD.toFixed(2)}.`
    ));
  }

  // Cross-field: balance_to_finish == sv - btd
  const expectedBTF = round2(sv - expectedBTD);
  if (!near(btf, expectedBTF)) {
    issues.push(err(
      'SOV_BTF_MISMATCH',
      `balance_to_finish ($${btf.toFixed(2)}) ≠ scheduled_value ($${sv.toFixed(2)}) - total_billed ($${expectedBTD.toFixed(2)}) = $${expectedBTF.toFixed(2)}.`,
      'balance_to_finish',
      `Set balance_to_finish = $${expectedBTF.toFixed(2)}.`
    ));
  }

  // Overbilling guard
  if (expectedBTD > sv + TOLERANCE) {
    issues.push(err(
      'SOV_OVERBILLED',
      `SOV line "${item.description}" is overbilled: $${expectedBTD.toFixed(2)} billed vs $${sv.toFixed(2)} scheduled.`,
      'current_billing',
      `Reduce current_billing by $${(expectedBTD - sv).toFixed(2)} to prevent overbilling.`
    ));
  }

  // Percent vs billing alignment
  if (sv > 0) {
    const impliedPct = round2((expectedBTD / sv) * 100);
    if (!near(pct, impliedPct, 0.5)) {
      issues.push(warn(
        'SOV_PCT_BILLING_DRIFT',
        `percent_complete (${pct}%) implies $${round2(sv * pct / 100).toFixed(2)} earned but total_billed is $${expectedBTD.toFixed(2)} (${impliedPct}%).`,
        'percent_complete',
        `Align percent_complete to ${impliedPct}% or adjust billing amounts.`
      ));
    }
  }

  return {
    valid: !issues.some(i => i.severity === 'error'),
    issues,
    corrections: {
      total_billed: expectedBTD,
      balance_to_finish: expectedBTF,
      percent_complete: sv > 0 ? round2((expectedBTD / sv) * 100) : pct
    }
  };
}

/**
 * RULE: SUM(SOVItem.scheduled_value) == Project.contract_value (if contract value set)
 *       SUM(SOVItem.total_billed) == Invoice.total_amount (for given pay period)
 */
export function validateSOVTotals(sovItems, contractValue = null) {
  const issues = [];
  const totals = sovItems.reduce((acc, item) => ({
    scheduled_value:  acc.scheduled_value  + n(item.scheduled_value),
    total_billed:     acc.total_billed     + n(item.total_billed || item.billed_to_date || 0),
    balance_to_finish:acc.balance_to_finish+ n(item.balance_to_finish)
  }), { scheduled_value: 0, total_billed: 0, balance_to_finish: 0 });

  // Balance equation
  const expectedBTF = round2(totals.scheduled_value - totals.total_billed);
  if (!near(totals.balance_to_finish, expectedBTF)) {
    issues.push(err(
      'SOV_TOTALS_UNBALANCED',
      `SOV totals don't balance: SV $${totals.scheduled_value.toFixed(2)} - Billed $${totals.total_billed.toFixed(2)} ≠ Balance $${totals.balance_to_finish.toFixed(2)}.`,
      null,
      `Re-run SOV calculations. Expected balance = $${expectedBTF.toFixed(2)}.`
    ));
  }

  // SOV total vs contract value
  if (contractValue !== null && !near(totals.scheduled_value, contractValue, 1.0)) {
    issues.push(warn(
      'SOV_VS_CONTRACT_DRIFT',
      `SOV total ($${totals.scheduled_value.toFixed(2)}) differs from contract value ($${contractValue.toFixed(2)}) by $${Math.abs(totals.scheduled_value - contractValue).toFixed(2)}.`,
      null,
      `Ensure SOV lines are complete. Unallocated contract value: $${(contractValue - totals.scheduled_value).toFixed(2)}.`
    ));
  }

  return { valid: !issues.some(i => i.severity === 'error'), issues, totals };
}

/**
 * RULE: Invoice.total_amount == SUM(InvoiceLine.current_billed)
 *       Each InvoiceLine.current_billed <= SOVItem.balance_to_finish
 *       Invoice must not be for $0 unless it is a retainage release
 */
export function validateInvoice(invoice, invoiceLines, sovItems) {
  const issues = [];
  const sovMap = Object.fromEntries((sovItems || []).map(s => [s.id, s]));

  const lineTotal = round2(invoiceLines.reduce((s, l) => s + n(l.current_billed), 0));
  const headerTotal = n(invoice.total_amount);

  // Header vs line sum
  if (!near(headerTotal, lineTotal)) {
    issues.push(err(
      'INVOICE_TOTAL_MISMATCH',
      `invoice.total_amount ($${headerTotal.toFixed(2)}) ≠ sum of line items ($${lineTotal.toFixed(2)}).`,
      'total_amount',
      `Set total_amount = $${lineTotal.toFixed(2)} to match line items.`
    ));
  }

  // Zero-dollar invoice guard
  if (lineTotal === 0 && !invoice.is_retainage_release) {
    issues.push(warn(
      'INVOICE_ZERO_AMOUNT',
      `Invoice total is $0. This will not be processed unless this is a retainage release.`,
      'total_amount',
      `Confirm this is a retainage release or add billing amounts to line items.`
    ));
  }

  // Per-line checks
  for (const line of invoiceLines) {
    const sov = sovMap[line.sov_item_id];
    if (!sov) {
      issues.push(err('INVOICE_LINE_ORPHAN', `Invoice line references missing SOV item "${line.sov_item_id}".`, 'sov_item_id', `Remove this line or link it to a valid SOV item.`));
      continue;
    }
    const balance = n(sov.balance_to_finish);
    const billed  = n(line.current_billed);
    if (billed > balance + TOLERANCE) {
      issues.push(err(
        'INVOICE_LINE_EXCEEDS_BALANCE',
        `Line "${sov.description}": billing $${billed.toFixed(2)} exceeds remaining balance $${balance.toFixed(2)}.`,
        'current_billed',
        `Reduce billing to $${balance.toFixed(2)} or update SOV percent complete first.`
      ));
    }
    // Retainage consistency
    const retPct  = n(line.retainage_pct ?? sov.retainage_percent ?? 10);
    const expRet  = round2(billed * retPct / 100);
    const actRet  = round2(n(line.retainage_this_period));
    if (line.retainage_this_period !== undefined && !near(actRet, expRet)) {
      issues.push(err(
        'INVOICE_RETAINAGE_MISMATCH',
        `Line "${sov.description}": retainage $${actRet.toFixed(2)} ≠ billing × ${retPct}% = $${expRet.toFixed(2)}.`,
        'retainage_this_period',
        `Set retainage_this_period = $${expRet.toFixed(2)}.`
      ));
    }
  }

  return { valid: !issues.some(i => i.severity === 'error'), issues };
}

/**
 * RULE: Financial.current_budget == original_budget + approved_changes
 *       Financial.forecast_amount >= Financial.actual_amount
 *       Financial.approved_changes == SUM(approved ChangeOrders affecting this cost code)
 */
export function validateBudgetActuals(financial) {
  const issues = [];
  const orig    = n(financial.original_budget);
  const changes = n(financial.approved_changes);
  const curr    = n(financial.current_budget);
  const actual  = n(financial.actual_amount);
  const forecast= n(financial.forecast_amount);
  const committed=n(financial.committed_amount);

  issues.push(...validateCurrencyField(orig,     'original_budget',  { required: true, min: 0 }));
  issues.push(...validateCurrencyField(actual,   'actual_amount',    { min: 0 }));
  issues.push(...validateCurrencyField(committed,'committed_amount', { min: 0 }));

  // current_budget cross-field check
  const expectedCurr = round2(orig + changes);
  if (!near(curr, expectedCurr)) {
    issues.push(err(
      'BUDGET_CURRENT_MISMATCH',
      `current_budget ($${curr.toFixed(2)}) ≠ original_budget ($${orig.toFixed(2)}) + approved_changes ($${changes.toFixed(2)}) = $${expectedCurr.toFixed(2)}.`,
      'current_budget',
      `Set current_budget = $${expectedCurr.toFixed(2)}.`
    ));
  }

  // Forecast cannot be less than actuals
  if (forecast < actual - TOLERANCE) {
    issues.push(err(
      'FORECAST_BELOW_ACTUAL',
      `forecast_amount ($${forecast.toFixed(2)}) cannot be less than actual_amount ($${actual.toFixed(2)}).`,
      'forecast_amount',
      `Set forecast_amount ≥ $${actual.toFixed(2)}. Actuals already incurred cannot be un-spent.`
    ));
  }

  // Committed should not exceed current budget by more than 10%
  if (committed > expectedCurr * 1.1) {
    issues.push(warn(
      'COMMITTED_EXCEEDS_BUDGET',
      `committed_amount ($${committed.toFixed(2)}) exceeds current_budget ($${expectedCurr.toFixed(2)}) by more than 10%.`,
      'committed_amount',
      `Review POs and subcontracts. Possible over-commitment requires PM approval.`
    ));
  }

  return {
    valid: !issues.some(i => i.severity === 'error'),
    issues,
    corrections: {
      current_budget: expectedCurr,
      forecast_amount: Math.max(forecast, actual)
    }
  };
}

/**
 * RULE: ChangeOrder.cost_impact == SUM(ChangeOrderLineItem.price)
 *       CO with status=approved must have approved_date and approved_by
 *       CO.sov_allocations SUM == CO.cost_impact
 *       Contract revised total = original_contract + SUM(approved CO cost_impacts)
 */
export function validateChangeOrder(co, lineItems = [], approvedCOs = [], contractValue = 0) {
  const issues = [];

  // Header fields
  if (!co.title || co.title.trim().length < 3) {
    issues.push(err('CO_TITLE_REQUIRED', 'Change order title must be at least 3 characters.', 'title', 'Enter a descriptive title for the change order.'));
  }
  issues.push(...validateCurrencyField(co.cost_impact, 'cost_impact', {
    allowNegative: true,
    allowNegativeReason: co.negative_co_reason
  }));

  // Header vs line items
  const lineSum = round2(lineItems.reduce((s, li) => s + n(li.price), 0));
  if (lineItems.length > 0 && !near(n(co.cost_impact), lineSum)) {
    issues.push(err(
      'CO_HEADER_LINE_MISMATCH',
      `CO cost_impact ($${n(co.cost_impact).toFixed(2)}) ≠ sum of line item prices ($${lineSum.toFixed(2)}).`,
      'cost_impact',
      `Update cost_impact = $${lineSum.toFixed(2)} to match line items, or correct the line items.`
    ));
  }

  // SOV allocation sum check
  if (co.sov_allocations && co.sov_allocations.length > 0) {
    const sovSum = round2(co.sov_allocations.reduce((s, a) => s + n(a.amount), 0));
    if (!near(n(co.cost_impact), sovSum)) {
      issues.push(err(
        'CO_SOV_ALLOCATION_MISMATCH',
        `CO SOV allocations total ($${sovSum.toFixed(2)}) ≠ cost_impact ($${n(co.cost_impact).toFixed(2)}).`,
        'sov_allocations',
        `Allocate the full CO amount across SOV lines. Unallocated: $${(n(co.cost_impact) - sovSum).toFixed(2)}.`
      ));
    }
  }

  // Approval completeness guard
  if (co.status === 'approved') {
    if (!co.approved_by) {
      issues.push(err('CO_APPROVED_BY_MISSING', 'Approved change orders must have approved_by set.', 'approved_by', 'Record who approved this change order.'));
    }
    if (!co.approved_date) {
      issues.push(err('CO_APPROVED_DATE_MISSING', 'Approved change orders must have an approved_date.', 'approved_date', 'Enter the date this CO was approved.'));
    }
  }

  // Revised contract total check
  if (contractValue > 0 && approvedCOs.length > 0) {
    const approvedTotal = round2(approvedCOs.filter(c => c.id !== co.id && c.status === 'approved').reduce((s, c) => s + n(c.cost_impact), 0));
    const revisedContract = round2(contractValue + approvedTotal + (co.status === 'approved' ? n(co.cost_impact) : 0));
    // Informational — no error, surface for awareness
    issues.push({
      code: 'CO_CONTRACT_REVISED_TOTAL',
      message: `Revised contract total will be $${revisedContract.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`,
      field: null,
      fix: null,
      severity: 'info'
    });
  }

  // Line item validation
  for (const li of lineItems) {
    issues.push(...validateCurrencyField(li.total_cost, `line[${li.item_number}].total_cost`, { min: 0 }));
    issues.push(...validateCurrencyField(li.price,      `line[${li.item_number}].price`,      { allowNegative: true, allowNegativeReason: li.negative_reason }));

    // price should be >= total_cost (markup ≥ 0) unless explicitly a credit
    const price = n(li.price), cost = n(li.total_cost);
    if (price < cost - TOLERANCE && li.type !== 'credit') {
      issues.push(warn(
        'CO_LINE_PRICE_BELOW_COST',
        `Line [${li.item_number}] "${li.description}": sell price ($${price.toFixed(2)}) is below cost ($${cost.toFixed(2)}). Negative markup.`,
        `line[${li.item_number}].price`,
        `Verify markup. Price should be ≥ cost unless this is a negotiated concession.`
      ));
    }
  }

  return { valid: !issues.some(i => i.severity === 'error'), issues };
}

/**
 * RULE: Expense amount > 0 unless allow_credits
 *       Expense must have cost_code_id
 *       Expense with source=payroll must have work_date
 */
export function validateExpense(expense, opts = {}) {
  const issues = [];

  issues.push(...validateCurrencyField(expense.amount, 'amount', {
    required: true,
    allowNegative: opts.allow_credits,
    allowNegativeReason: expense.credit_reason,
    min: opts.allow_credits ? undefined : 0.01
  }));

  if (!expense.cost_code_id) {
    issues.push(err('EXPENSE_NO_COST_CODE', 'Expense must be assigned to a cost code.', 'cost_code_id', 'Select a cost code to categorize this expense.'));
  }

  if (!expense.expense_date) {
    issues.push(err('EXPENSE_NO_DATE', 'Expense date is required.', 'expense_date', 'Enter the date this expense was incurred.'));
  }

  if (expense.source === 'payroll' && !expense.expense_date) {
    issues.push(err('PAYROLL_NO_DATE', 'Payroll expense must have a work date.', 'expense_date', 'Enter the pay period end date.'));
  }

  // Invoice reference for invoice-sourced expenses
  if (expense.source === 'invoice' && !expense.invoice_number) {
    issues.push(warn('EXPENSE_INVOICE_NO_REF', 'Invoice-sourced expense has no invoice number.', 'invoice_number', 'Enter the vendor invoice number for audit trail.'));
  }

  return { valid: !issues.some(i => i.severity === 'error'), issues };
}

/**
 * RULE: LaborHours.hours > 0, <= 24/day
 *       LaborHours must have cost_code_id, work_package_id, work_date, crew_employee
 */
export function validateLaborHours(entry) {
  const issues = [];
  const hrs = n(entry.hours);
  const ot  = n(entry.overtime_hours);

  if (hrs <= 0) {
    issues.push(err('LABOR_HOURS_ZERO', 'Regular hours must be greater than 0.', 'hours', 'Enter the number of regular hours worked.'));
  }
  if (hrs > 24) {
    issues.push(err('LABOR_HOURS_EXCEEDS_DAY', `Regular hours (${hrs}) exceed 24 hours in a day.`, 'hours', 'Verify. Maximum regular hours in a single day is 24.'));
  }
  if (ot < 0) {
    issues.push(err('LABOR_OT_NEGATIVE', 'Overtime hours cannot be negative.', 'overtime_hours', 'Enter 0 or a positive OT hour count.'));
  }
  if (hrs + ot > 24) {
    issues.push(warn('LABOR_TOTAL_EXCEEDS_DAY', `Total hours (${hrs + ot}) exceed 24 in a single day. Verify.`, 'overtime_hours', 'Confirm total hours. Split across multiple dates if needed.'));
  }
  if (!entry.cost_code_id) {
    issues.push(err('LABOR_NO_COST_CODE', 'Labor entry requires a cost code.', 'cost_code_id', 'Select the cost code this work applies to.'));
  }
  if (!entry.crew_employee) {
    issues.push(err('LABOR_NO_EMPLOYEE', 'Labor entry requires an employee or crew identifier.', 'crew_employee', 'Enter the employee email or crew ID.'));
  }
  if (!entry.work_date) {
    issues.push(err('LABOR_NO_DATE', 'Labor entry requires a work date.', 'work_date', 'Enter the date work was performed.'));
  }

  return { valid: !issues.some(i => i.severity === 'error'), issues };
}

// ─── 3. DUPLICATE DETECTION ───────────────────────────────────────────────────

/**
 * Check for duplicate expense (same project, vendor, amount, date within ±1 day).
 * Returns { isDuplicate, matchId, reason }.
 */
export function detectDuplicateExpense(newExpense, existingExpenses) {
  const newDate  = new Date(newExpense.expense_date).getTime();
  const newAmt   = n(newExpense.amount);
  const newVendor= (newExpense.vendor || '').toLowerCase().trim();

  for (const ex of existingExpenses) {
    if (ex.id === newExpense.id) continue;
    const exDate = new Date(ex.expense_date).getTime();
    const dayDiff = Math.abs(newDate - exDate) / 86400000;
    const amtMatch  = near(n(ex.amount), newAmt, 0.01);
    const vendMatch = (ex.vendor || '').toLowerCase().trim() === newVendor;
    const dateMatch = dayDiff <= 1;
    const invMatch  = newExpense.invoice_number && ex.invoice_number === newExpense.invoice_number;

    if (invMatch && amtMatch) {
      return { isDuplicate: true, matchId: ex.id, reason: `Duplicate invoice number "${newExpense.invoice_number}" with same amount.` };
    }
    if (amtMatch && vendMatch && dateMatch) {
      return { isDuplicate: true, matchId: ex.id, reason: `Same vendor, amount, and date already exists (ID: ${ex.id}).` };
    }
  }
  return { isDuplicate: false, matchId: null, reason: null };
}

/**
 * Check for duplicate change order (same project, same co_number or same title+amount).
 */
export function detectDuplicateCO(newCO, existingCOs) {
  for (const co of existingCOs) {
    if (co.id === newCO.id) continue;
    if (co.co_number === newCO.co_number) {
      return { isDuplicate: true, matchId: co.id, reason: `CO number ${newCO.co_number} already exists (ID: ${co.id}).` };
    }
    const sameTitle = (co.title || '').toLowerCase().trim() === (newCO.title || '').toLowerCase().trim();
    const sameAmt   = near(n(co.cost_impact), n(newCO.cost_impact));
    if (sameTitle && sameAmt) {
      return { isDuplicate: true, matchId: co.id, reason: `CO with same title and amount already exists (ID: ${co.id}).` };
    }
  }
  return { isDuplicate: false, matchId: null, reason: null };
}

/**
 * Check for duplicate payment (same invoice + amount already paid).
 */
export function detectDuplicatePayment(newExpense, paidExpenses) {
  if (!newExpense.invoice_number) return { isDuplicate: false };
  const match = paidExpenses.find(e =>
    e.invoice_number === newExpense.invoice_number &&
    near(n(e.amount), n(newExpense.amount)) &&
    e.payment_status === 'paid' &&
    e.id !== newExpense.id
  );
  if (match) {
    return { isDuplicate: true, matchId: match.id, reason: `Invoice "${newExpense.invoice_number}" for $${n(newExpense.amount).toFixed(2)} was already paid (Expense ID: ${match.id}).` };
  }
  return { isDuplicate: false, matchId: null, reason: null };
}

// ─── 4. AUTO-CORRECT HELPERS ──────────────────────────────────────────────────

export function autoCorrectFinancials(financial) {
  const c = { ...financial };
  c.current_budget   = round2(n(c.original_budget) + n(c.approved_changes));
  c.forecast_amount  = Math.max(n(c.forecast_amount), n(c.actual_amount));
  return c;
}

export function autoCorrectSOVItem(item) {
  const c = { ...item };
  c.percent_complete  = clamp(c.percent_complete, 0, 100);
  c.total_billed      = round2(n(c.previous_billed) + n(c.current_billing));
  c.balance_to_finish = round2(n(c.scheduled_value) - c.total_billed);
  c.percent_complete  = c.scheduled_value > 0 ? round2((c.total_billed / n(c.scheduled_value)) * 100) : 0;
  return c;
}

// ─── 5. FULL VALIDATION SUITE (run after imports / major submissions) ──────────

/**
 * Run the full financial validation suite for a project.
 * Returns a structured report with all errors, warnings, and info messages.
 *
 * @param {{ financials, sovItems, invoices, invoiceLines, changeOrders, coLineItems, expenses, laborEntries, contractValue }} data
 */
export function runFullValidationSuite(data) {
  const {
    financials = [], sovItems = [], invoices = [], invoiceLines = [],
    changeOrders = [], coLineItems = [], expenses = [], laborEntries = [],
    contractValue = 0
  } = data;

  const report = {
    timestamp: new Date().toISOString(),
    summary: { errors: 0, warnings: 0, info: 0 },
    sections: {}
  };

  function addSection(name, issues) {
    if (!report.sections[name]) report.sections[name] = [];
    report.sections[name].push(...issues);
    issues.forEach(i => {
      if (i.severity === 'error')   report.summary.errors++;
      if (i.severity === 'warning') report.summary.warnings++;
      if (i.severity === 'info')    report.summary.info++;
    });
  }

  // SOV item checks
  for (const sov of sovItems) {
    const result = validateSOVItem(sov);
    if (!result.valid || result.issues.length > 0) {
      addSection('sov_items', result.issues.map(i => ({ ...i, entity_id: sov.id, entity_label: sov.description })));
    }
  }

  // SOV totals
  const sovTotals = validateSOVTotals(sovItems, contractValue || null);
  if (sovTotals.issues.length > 0) addSection('sov_totals', sovTotals.issues);

  // Invoice checks
  const sovMap = Object.fromEntries(sovItems.map(s => [s.id, s]));
  for (const inv of invoices) {
    const lines = invoiceLines.filter(l => l.invoice_id === inv.id);
    const result = validateInvoice(inv, lines, sovItems);
    if (!result.valid || result.issues.length > 0) {
      addSection('invoices', result.issues.map(i => ({ ...i, entity_id: inv.id })));
    }
  }

  // Budget actuals
  for (const fin of financials) {
    const result = validateBudgetActuals(fin);
    if (!result.valid || result.issues.length > 0) {
      addSection('financials', result.issues.map(i => ({ ...i, entity_id: fin.id, cost_code_id: fin.cost_code_id })));
    }
  }

  // Change orders
  for (const co of changeOrders) {
    const lines = coLineItems.filter(l => l.change_order_id === co.id);
    const result = validateChangeOrder(co, lines, changeOrders, contractValue);
    if (!result.valid || result.issues.length > 0) {
      addSection('change_orders', result.issues.map(i => ({ ...i, entity_id: co.id, entity_label: `CO-${co.co_number}` })));
    }
  }

  // Expenses — duplicate detection
  for (const exp of expenses) {
    const fieldResult = validateExpense(exp);
    if (!fieldResult.valid || fieldResult.issues.length > 0) {
      addSection('expenses', fieldResult.issues.map(i => ({ ...i, entity_id: exp.id })));
    }
    const dup = detectDuplicateExpense(exp, expenses);
    if (dup.isDuplicate) {
      addSection('expenses', [err('DUPLICATE_EXPENSE', `Possible duplicate expense: ${dup.reason}`, null, `Review and delete the duplicate. Keep expense ID: ${dup.matchId}.`)].map(i => ({ ...i, entity_id: exp.id })));
    }
    const dupPay = detectDuplicatePayment(exp, expenses);
    if (dupPay.isDuplicate) {
      addSection('expenses', [err('DUPLICATE_PAYMENT', `Possible duplicate payment: ${dupPay.reason}`, null, `Do not process this payment. Contact AP to verify.`)].map(i => ({ ...i, entity_id: exp.id })));
    }
  }

  // CO duplicates
  for (const co of changeOrders) {
    const dup = detectDuplicateCO(co, changeOrders);
    if (dup.isDuplicate) {
      addSection('change_orders', [err('DUPLICATE_CO', `Possible duplicate CO: ${dup.reason}`, null, `Review and void the duplicate CO.`)] .map(i => ({ ...i, entity_id: co.id })));
    }
  }

  // Labor hours
  for (const entry of laborEntries) {
    const result = validateLaborHours(entry);
    if (!result.valid || result.issues.length > 0) {
      addSection('labor_hours', result.issues.map(i => ({ ...i, entity_id: entry.id })));
    }
  }

  report.summary.has_errors = report.summary.errors > 0;
  report.summary.pass = !report.summary.has_errors;
  return report;
}

// ─── 6. ACCEPTANCE TESTS ──────────────────────────────────────────────────────

/**
 * Run built-in acceptance tests. Returns { passed, failed, results }.
 * Safe to call in browser or Deno — no external deps.
 */
export function runAcceptanceTests() {
  const results = [];
  let passed = 0, failed = 0;

  function test(label, fn) {
    try {
      const msg = fn();
      if (msg) { failed++; results.push({ label, pass: false, reason: msg }); }
      else      { passed++; results.push({ label, pass: true }); }
    } catch (e) {
      failed++;
      results.push({ label, pass: false, reason: e.message });
    }
  }

  function assert(cond, msg) { if (!cond) return msg || 'Assertion failed'; }

  // ── Currency field rules
  test('FIELD: negative blocked by default', () => {
    const issues = validateCurrencyField(-100, 'amount');
    return assert(issues.some(i => i.code === 'NEGATIVE_NOT_ALLOWED'));
  });
  test('FIELD: negative allowed with reason', () => {
    const issues = validateCurrencyField(-100, 'amount', { allowNegative: true, allowNegativeReason: 'Owner deduct' });
    return assert(!issues.some(i => i.severity === 'error'));
  });
  test('FIELD: negative allowed but no reason → error', () => {
    const issues = validateCurrencyField(-100, 'amount', { allowNegative: true });
    return assert(issues.some(i => i.code === 'NEGATIVE_REQUIRES_REASON'));
  });
  test('FIELD: exceeds MAX_CURRENCY → error', () => {
    const issues = validateCurrencyField(1_000_000_000, 'amount');
    return assert(issues.some(i => i.code === 'FIELD_EXCEEDS_MAX'));
  });
  test('FIELD: precision > 2dp → warning', () => {
    const issues = validateCurrencyField(100.123, 'amount');
    return assert(issues.some(i => i.code === 'PRECISION_EXCEEDS_CENTS'));
  });
  test('FIELD: required null → error', () => {
    const issues = validateCurrencyField(null, 'amount', { required: true });
    return assert(issues.some(i => i.code === 'FIELD_REQUIRED'));
  });

  // ── SOV item
  test('SOV: valid item passes', () => {
    const result = validateSOVItem({ scheduled_value: 100000, percent_complete: 50, previous_billed: 0, current_billing: 50000, total_billed: 50000, balance_to_finish: 50000, retainage_percent: 10 });
    return assert(result.valid);
  });
  test('SOV: billed_to_date mismatch → error', () => {
    const result = validateSOVItem({ scheduled_value: 100000, percent_complete: 50, previous_billed: 0, current_billing: 50000, total_billed: 55000, balance_to_finish: 45000, retainage_percent: 10 });
    return assert(result.issues.some(i => i.code === 'SOV_BTD_MISMATCH'));
  });
  test('SOV: overbilling → error', () => {
    const result = validateSOVItem({ scheduled_value: 100000, percent_complete: 100, previous_billed: 0, current_billing: 110000, total_billed: 110000, balance_to_finish: -10000, retainage_percent: 10 });
    return assert(result.issues.some(i => i.code === 'SOV_OVERBILLED'));
  });
  test('SOV: percent vs billing drift → warning', () => {
    const result = validateSOVItem({ scheduled_value: 100000, percent_complete: 55, previous_billed: 0, current_billing: 50000, total_billed: 50000, balance_to_finish: 50000, retainage_percent: 10 });
    return assert(result.issues.some(i => i.code === 'SOV_PCT_BILLING_DRIFT'));
  });

  // ── SOV totals
  test('SOV TOTALS: balanced set passes', () => {
    const items = [
      { scheduled_value: 200000, total_billed: 100000, billed_to_date: 100000, balance_to_finish: 100000 },
      { scheduled_value: 100000, total_billed:  50000, billed_to_date:  50000, balance_to_finish:  50000 },
    ];
    const result = validateSOVTotals(items);
    return assert(result.valid);
  });
  test('SOV TOTALS: unbalanced → error', () => {
    const items = [
      { scheduled_value: 200000, total_billed: 100000, billed_to_date: 100000, balance_to_finish: 99000 },
    ];
    const result = validateSOVTotals(items);
    return assert(result.issues.some(i => i.code === 'SOV_TOTALS_UNBALANCED'));
  });

  // ── Invoice
  test('INVOICE: header matches line sum → valid', () => {
    const inv   = { id: 'i1', total_amount: 50000 };
    const lines = [{ invoice_id: 'i1', sov_item_id: 's1', current_billed: 30000 }, { invoice_id: 'i1', sov_item_id: 's2', current_billed: 20000 }];
    const sov   = [{ id: 's1', description: 'Fab', balance_to_finish: 100000, retainage_percent: 10 }, { id: 's2', description: 'Erect', balance_to_finish: 100000, retainage_percent: 10 }];
    return assert(validateInvoice(inv, lines, sov).valid);
  });
  test('INVOICE: header mismatch → error', () => {
    const inv   = { id: 'i1', total_amount: 60000 };
    const lines = [{ invoice_id: 'i1', sov_item_id: 's1', current_billed: 50000 }];
    const sov   = [{ id: 's1', description: 'Fab', balance_to_finish: 100000, retainage_percent: 10 }];
    const result = validateInvoice(inv, lines, sov);
    return assert(result.issues.some(i => i.code === 'INVOICE_TOTAL_MISMATCH'));
  });
  test('INVOICE: line exceeds SOV balance → error', () => {
    const inv   = { id: 'i1', total_amount: 120000 };
    const lines = [{ invoice_id: 'i1', sov_item_id: 's1', current_billed: 120000 }];
    const sov   = [{ id: 's1', description: 'Fab', balance_to_finish: 100000, retainage_percent: 10 }];
    const result = validateInvoice(inv, lines, sov);
    return assert(result.issues.some(i => i.code === 'INVOICE_LINE_EXCEEDS_BALANCE'));
  });
  test('INVOICE: $0 invoice without retainage flag → warning', () => {
    const inv   = { id: 'i1', total_amount: 0, is_retainage_release: false };
    const result = validateInvoice(inv, [], []);
    return assert(result.issues.some(i => i.code === 'INVOICE_ZERO_AMOUNT'));
  });

  // ── Budget actuals
  test('BUDGET: current_budget = orig + changes → valid', () => {
    const fin = { original_budget: 300000, approved_changes: 18500, current_budget: 318500, actual_amount: 200000, forecast_amount: 320000, committed_amount: 250000 };
    return assert(validateBudgetActuals(fin).valid);
  });
  test('BUDGET: current_budget mismatch → error', () => {
    const fin = { original_budget: 300000, approved_changes: 18500, current_budget: 320000, actual_amount: 200000, forecast_amount: 320000, committed_amount: 0 };
    const result = validateBudgetActuals(fin);
    return assert(result.issues.some(i => i.code === 'BUDGET_CURRENT_MISMATCH'));
  });
  test('BUDGET: forecast < actual → error', () => {
    const fin = { original_budget: 300000, approved_changes: 0, current_budget: 300000, actual_amount: 200000, forecast_amount: 180000, committed_amount: 0 };
    const result = validateBudgetActuals(fin);
    return assert(result.issues.some(i => i.code === 'FORECAST_BELOW_ACTUAL'));
  });

  // ── Change order
  test('CO: header matches line sum → valid', () => {
    const co = { co_number: 5, title: 'Added embeds Grid B', status: 'draft', cost_impact: 18500, sov_allocations: [] };
    const lines = [{ item_number: 1, description: 'Shop labor', price: 10000, total_cost: 8000, type: 'charge' }, { item_number: 2, description: 'Material', price: 8500, total_cost: 8500, type: 'charge' }];
    return assert(validateChangeOrder(co, lines).valid);
  });
  test('CO: header vs line mismatch → error', () => {
    const co = { co_number: 5, title: 'Test CO', status: 'draft', cost_impact: 20000, sov_allocations: [] };
    const lines = [{ item_number: 1, description: 'Labor', price: 18500, total_cost: 16000, type: 'charge' }];
    const result = validateChangeOrder(co, lines);
    return assert(result.issues.some(i => i.code === 'CO_HEADER_LINE_MISMATCH'));
  });
  test('CO: approved without approved_by → error', () => {
    const co = { co_number: 6, title: 'Approved CO', status: 'approved', cost_impact: 5000, sov_allocations: [], approved_date: '2026-03-01' };
    const result = validateChangeOrder(co, []);
    return assert(result.issues.some(i => i.code === 'CO_APPROVED_BY_MISSING'));
  });
  test('CO: duplicate CO number → detected', () => {
    const existing = [{ id: 'co-old', co_number: 7, title: 'Old CO', cost_impact: 5000, status: 'approved' }];
    const newCO    = { id: 'co-new', co_number: 7, title: 'New CO', cost_impact: 3000 };
    return assert(detectDuplicateCO(newCO, existing).isDuplicate);
  });

  // ── Duplicate detection
  test('DUPLICATE EXPENSE: same vendor/amount/date → detected', () => {
    const existing = [{ id: 'e1', project_id: 'p1', vendor: 'ABC Steel', amount: 15000, expense_date: '2026-03-01', payment_status: 'pending', invoice_number: '' }];
    const newExp   = { id: 'e2', project_id: 'p1', vendor: 'ABC Steel', amount: 15000, expense_date: '2026-03-01', invoice_number: '' };
    return assert(detectDuplicateExpense(newExp, existing).isDuplicate);
  });
  test('DUPLICATE EXPENSE: different vendor → not duplicate', () => {
    const existing = [{ id: 'e1', vendor: 'ABC Steel', amount: 15000, expense_date: '2026-03-01', invoice_number: '' }];
    const newExp   = { id: 'e2', vendor: 'XYZ Bolts', amount: 15000, expense_date: '2026-03-01', invoice_number: '' };
    return assert(!detectDuplicateExpense(newExp, existing).isDuplicate);
  });
  test('DUPLICATE PAYMENT: same invoice + paid → detected', () => {
    const paid = [{ id: 'e1', invoice_number: 'INV-042', amount: 22000, payment_status: 'paid' }];
    const newP = { id: 'e2', invoice_number: 'INV-042', amount: 22000 };
    return assert(detectDuplicatePayment(newP, paid).isDuplicate);
  });

  // ── Labor hours
  test('LABOR: valid entry passes', () => {
    const entry = { hours: 8, overtime_hours: 2, work_date: '2026-03-01', crew_employee: 'jsmith@co.com', cost_code_id: 'cc-001', work_package_id: 'wp-1' };
    return assert(validateLaborHours(entry).valid);
  });
  test('LABOR: zero hours → error', () => {
    const entry = { hours: 0, work_date: '2026-03-01', crew_employee: 'jsmith@co.com', cost_code_id: 'cc-001', work_package_id: 'wp-1' };
    return assert(validateLaborHours(entry).issues.some(i => i.code === 'LABOR_HOURS_ZERO'));
  });
  test('LABOR: hours > 24 → error', () => {
    const entry = { hours: 25, work_date: '2026-03-01', crew_employee: 'jsmith@co.com', cost_code_id: 'cc-001', work_package_id: 'wp-1' };
    return assert(validateLaborHours(entry).issues.some(i => i.code === 'LABOR_HOURS_EXCEEDS_DAY'));
  });
  test('LABOR: missing cost code → error', () => {
    const entry = { hours: 8, work_date: '2026-03-01', crew_employee: 'jsmith@co.com', work_package_id: 'wp-1' };
    return assert(validateLaborHours(entry).issues.some(i => i.code === 'LABOR_NO_COST_CODE'));
  });

  return { passed, failed, total: passed + failed, results, pass: failed === 0 };
}