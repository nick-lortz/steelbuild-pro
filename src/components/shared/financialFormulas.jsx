/**
 * SteelBuild-Pro — Financial Formula Unit Tests
 * =============================================
 * Pure JS test harness — no external test framework required.
 * Compatible with Base44 backend functions (Deno) and browser (React).
 *
 * HOW TO RUN:
 *   Node:  node components/shared/financialFormulas.test.js
 *   Deno:  deno run components/shared/financialFormulas.test.js
 *   UI:    Import runAllFinancialTests() → display in FinancialTestRunner page
 *
 * CI INTEGRATION:
 *   Process exits with code 1 if any test fails.
 *   Add to package.json scripts: "test:financials": "node components/shared/financialFormulas.test.js"
 *   Add to CI: - run: npm run test:financials
 */

import {
  roundHalfEven,
  calcLineItemExtended,
  calcEstimateSubtotal,
  calcMarkupSellPrice,
  calcMarginToMarkup,
  calcDiscount,
  calcTax,
  calcTaxGrossUp,
  calcRetainageWithheld,
  calcNetPaymentDue,
  calcRetainageBalance,
  calcSOVCurrentBilling,
  calcSOVBalanceToFinish,
  calcG703Totals,
  calcCOTotalCost,
  calcCOSellPrice,
  validateCODelta,
  calcLaborCost,
  inferOTRate,
  calcCurrentBudget,
  calcVarianceDollar,
  calcVariancePct,
  calcEV,
  calcCPI,
  calcSPI,
  calcEAC,
  calcTCPI,
  calcWIP,
  calcInvoiceAgeDays,
  calcAgingBucket,
  calcAgingSummary,
  calcETCBudgetMethod,
  calcETCPerformanceMethod,
  calcResourceCost,
  calcShippingCost,
  calcTravelCost,
} from './financialFormulas.js';

// ─── Mini Test Harness ────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];

function approximately(a, b, tolerance = 0.01) {
  return Math.abs(a - b) <= tolerance;
}

function expect(label, actual, expected, tolerance = 0.005) {
  let pass;
  if (expected === Infinity) {
    pass = actual === Infinity;
  } else if (typeof expected === 'object' && expected !== null) {
    pass = Object.keys(expected).every(k => approximately(actual[k], expected[k], tolerance));
  } else {
    pass = approximately(actual, expected, tolerance);
  }

  const result = { label, pass, actual, expected };
  results.push(result);
  if (pass) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${label}`);
    console.error(`        expected: ${JSON.stringify(expected)}`);
    console.error(`        actual:   ${JSON.stringify(actual)}`);
  }
  return result;
}

function suite(name, fn) {
  console.log(`\n▶ ${name}`);
  fn();
}

// ─── SUITE 1: Rounding ────────────────────────────────────────────────────────

suite('roundHalfEven (Banker\'s Rounding)', () => {
  expect('0.5 → 0 (round to even)', roundHalfEven(0.5),   0);
  expect('1.5 → 2 (round to even)', roundHalfEven(1.5),   2);
  expect('2.5 → 2 (round to even)', roundHalfEven(2.5),   2);
  expect('3.5 → 4 (round to even)', roundHalfEven(3.5),   4);
  expect('0.125 → 0.12 (2dp)',      roundHalfEven(0.125), 0.12);
  expect('0.135 → 0.14 (2dp)',      roundHalfEven(0.135), 0.14);
  expect('negative -1.5 → -2',      roundHalfEven(-1.5),  -2);
  expect('zero stays zero',         roundHalfEven(0),     0);
});

// ─── SUITE 2: Line Item / Estimate ────────────────────────────────────────────

suite('calcLineItemExtended', () => {
  expect('10 tons @ $850/ton',           calcLineItemExtended(10, 850),      8500);
  expect('0.5 tons @ $850',              calcLineItemExtended(0.5, 850),     425);
  expect('0 qty = $0',                   calcLineItemExtended(0, 850),       0);
  expect('null qty treated as 0',        calcLineItemExtended(null, 850),    0);
  expect('negative qty (credit line)',   calcLineItemExtended(-5, 200),      -1000);
  expect('fractional unit price',        calcLineItemExtended(100, 12.555),  1255.5);
  expect('large values no precision loss', calcLineItemExtended(1000, 99999.99), 99999990);
  expect('both null = $0',               calcLineItemExtended(null, null),   0);
});

suite('calcEstimateSubtotal', () => {
  expect('sum of three lines',           calcEstimateSubtotal([1000, 2500.50, 750]),  4250.5);
  expect('empty array = 0',             calcEstimateSubtotal([]),                    0);
  expect('null array = 0',              calcEstimateSubtotal(null),                  0);
  expect('includes negative (credit)',  calcEstimateSubtotal([5000, -500, 1250]),    5750);
  expect('single item',                 calcEstimateSubtotal([42000]),               42000);
  expect('all zeros',                   calcEstimateSubtotal([0, 0, 0]),             0);
});

// ─── SUITE 3: Markup / Discount ───────────────────────────────────────────────

suite('calcMarkupSellPrice', () => {
  expect('$100k cost at 20% markup',      calcMarkupSellPrice(100000, 20),    120000);
  expect('$65k cost at 15% markup',       calcMarkupSellPrice(65000, 15),     74750);
  expect('0% markup = cost passthrough',  calcMarkupSellPrice(50000, 0),      50000);
  expect('100% markup = double cost',     calcMarkupSellPrice(10000, 100),    20000);
  expect('negative markup (discount)',    calcMarkupSellPrice(10000, -10),    9000);
  expect('null cost = $0',               calcMarkupSellPrice(null, 20),      0);
  expect('fractional pct',               calcMarkupSellPrice(10000, 12.5),   11250);
  expect('zero cost any markup = 0',     calcMarkupSellPrice(0, 50),         0);
});

suite('calcMarginToMarkup', () => {
  expect('20% margin → 25% markup',  calcMarginToMarkup(20),  25, 0.01);
  expect('25% margin → 33.33%',      calcMarginToMarkup(25),  33.3333, 0.01);
  expect('50% margin → 100%',        calcMarginToMarkup(50),  100, 0.01);
  expect('0% margin → 0% markup',    calcMarginToMarkup(0),   0);
  expect('100% margin → Infinity',   calcMarginToMarkup(100), Infinity);
  expect('10% margin → 11.11%',      calcMarginToMarkup(10),  11.1111, 0.01);
  expect('negative margin = 0',      calcMarginToMarkup(-5),  0);
});

suite('calcDiscount', () => {
  expect('$10k list, 10% discount',  calcDiscount(10000, 10),  { discount_amount: 1000,   net_price: 9000 });
  expect('$0 list = no discount',    calcDiscount(0, 20),      { discount_amount: 0,      net_price: 0 });
  expect('100% discount = free',     calcDiscount(5000, 100),  { discount_amount: 5000,   net_price: 0 });
  expect('discount > 100% clamped',  calcDiscount(5000, 150),  { discount_amount: 5000,   net_price: 0 });
  expect('fractional discount',      calcDiscount(1000, 7.5),  { discount_amount: 75,     net_price: 925 });
  expect('0% discount passthrough',  calcDiscount(1000, 0),    { discount_amount: 0,      net_price: 1000 });
  expect('negative discount clamped',calcDiscount(1000, -10),  { discount_amount: 0,      net_price: 1000 });
});

// ─── SUITE 4: Tax ─────────────────────────────────────────────────────────────

suite('calcTax', () => {
  expect('$50k materials at 8.5% AZ tax', calcTax(50000, 8.5),   4250);
  expect('$0 base = $0 tax',             calcTax(0, 8.5),        0);
  expect('0% rate = $0 tax',             calcTax(50000, 0),      0);
  expect('fractional result rounds',     calcTax(333.33, 8.5),   28.33, 0.01);
  expect('100% tax rate',                calcTax(1000, 100),     1000);
  expect('null inputs = $0',             calcTax(null, null),    0);
  expect('typical material invoice',     calcTax(125000, 8.1),   10125);
  expect('small purchase rounding',      calcTax(9.99, 8.5),     0.85, 0.005);
});

suite('calcTaxGrossUp', () => {
  expect('$108.50 gross with 8.5% tax extracts $8.50', calcTaxGrossUp(108.5, 8.5),   { tax: 7.88, net: 100.62 }, 0.01);
  expect('gross = 0 → both 0',                          calcTaxGrossUp(0, 8.5),       { tax: 0, net: 0 });
  expect('0% rate → no tax extracted',                  calcTaxGrossUp(1000, 0),      { tax: 0, net: 1000 });
});

// ─── SUITE 5: Retainage ───────────────────────────────────────────────────────

suite('calcRetainageWithheld', () => {
  expect('$100k billing at 10%',      calcRetainageWithheld(100000, 10),  10000);
  expect('$85k billing at 5%',        calcRetainageWithheld(85000, 5),    4250);
  expect('0% retainage (released)',   calcRetainageWithheld(100000, 0),   0);
  expect('100% retainage (holdback)', calcRetainageWithheld(50000, 100),  50000);
  expect('>100% clamped to 100%',     calcRetainageWithheld(50000, 150),  50000);
  expect('negative clamped to 0',     calcRetainageWithheld(50000, -5),   0);
  expect('default 10%',               calcRetainageWithheld(20000),       2000);
  expect('fractional billing',        calcRetainageWithheld(33333.33, 10),3333.33, 0.005);
});

suite('calcNetPaymentDue', () => {
  expect('$100k at 10%  → net $90k',  calcNetPaymentDue(100000, 10),  { retainage: 10000, net_due: 90000 });
  expect('$0 billing → $0 net',       calcNetPaymentDue(0, 10),       { retainage: 0,     net_due: 0 });
  expect('0% retention → full amount',calcNetPaymentDue(75000, 0),    { retainage: 0,     net_due: 75000 });
});

suite('calcRetainageBalance', () => {
  expect('$20k held, $0 released',    calcRetainageBalance(20000, 0),      20000);
  expect('$20k held, $10k released',  calcRetainageBalance(20000, 10000),  10000);
  expect('fully released = 0',        calcRetainageBalance(20000, 20000),  0);
  expect('over-released clamped to 0',calcRetainageBalance(10000, 15000),  0);
  expect('no withheld, no released',  calcRetainageBalance(0, 0),          0);
});

// ─── SUITE 6: SOV ─────────────────────────────────────────────────────────────

suite('calcSOVCurrentBilling', () => {
  // scheduled_value=280000, 68% complete, previously billed 156800
  expect('68% complete on $280k SV, prev billed $156.8k',
    calcSOVCurrentBilling(280000, 68, 156800), 33600);

  expect('0% complete, no prev billing → $0',
    calcSOVCurrentBilling(280000, 0, 0), 0);

  expect('100% complete, fully billed → $0',
    calcSOVCurrentBilling(100000, 100, 100000), 0);

  expect('50% complete, no prev billing → half SV',
    calcSOVCurrentBilling(200000, 50, 0), 100000);

  // Percent regression (correction invoice) — negative result expected
  expect('percent regresses from 60% to 55% → negative correction',
    calcSOVCurrentBilling(100000, 55, 60000), -5000);

  expect('0 SV line → $0 always',
    calcSOVCurrentBilling(0, 80, 0), 0);

  expect('clamp > 100%',
    calcSOVCurrentBilling(100000, 110, 0), 100000);

  expect('fractional percent',
    calcSOVCurrentBilling(150000, 33.33, 0), 49995, 1);
});

suite('calcSOVBalanceToFinish', () => {
  expect('$280k SV, $190.4k billed',  calcSOVBalanceToFinish(280000, 190400), 89600);
  expect('fully billed → $0',         calcSOVBalanceToFinish(100000, 100000), 0);
  expect('overbilled → negative',     calcSOVBalanceToFinish(100000, 105000), -5000);
  expect('not started → full SV',     calcSOVBalanceToFinish(50000, 0),       50000);
});

suite('calcG703Totals', () => {
  const lines = [
    { current_billed: 50000, retainage_pct: 10 },
    { current_billed: 30000, retainage_pct: 10 },
    { current_billed: 20000, retainage_pct: 5  },
  ];
  // total_current = 100000, retainage = 5000+3000+1000 = 9000, net = 91000
  expect('three lines mixed retainage',
    calcG703Totals(lines), { total_current: 100000, total_retainage: 9000, net_due: 91000 });

  expect('empty lines → all zeros',
    calcG703Totals([]), { total_current: 0, total_retainage: 0, net_due: 0 });

  expect('single line default 10%',
    calcG703Totals([{ current_billed: 100000, retainage_pct: 10 }]),
    { total_current: 100000, total_retainage: 10000, net_due: 90000 });
});

// ─── SUITE 7: Change Orders ────────────────────────────────────────────────────

suite('calcCOTotalCost', () => {
  const items = [
    { shop_hours: 40, field_hours: 80, equipment_cost: 3000, material_cost: 12000, other_cost: 500 },
    { shop_hours: 0,  field_hours: 16, equipment_cost: 0,    material_cost: 2400,  other_cost: 0   },
  ];
  // Line1: 40×65 + 80×85 + 3000 + 12000 + 500 = 2600+6800+3000+12000+500 = 24900
  // Line2: 0 + 16×85 + 0 + 2400 + 0 = 1360+2400 = 3760
  // Total = 28660
  expect('two CO lines',  calcCOTotalCost(items, 65, 85),  28660);
  expect('empty lines → 0', calcCOTotalCost([]),             0);

  const singleShopOnly = [{ shop_hours: 10, field_hours: 0, equipment_cost: 0, material_cost: 0, other_cost: 0 }];
  expect('10 shop hrs @ $65', calcCOTotalCost(singleShopOnly, 65, 85), 650);
});

suite('validateCODelta', () => {
  expect('header matches lines → valid, delta 0',
    validateCODelta(28660, [24900, 3760]), { valid: true, delta: 0 });

  expect('header off by $500 → invalid',
    validateCODelta(29160, [24900, 3760]), { valid: false, delta: 500 });

  expect('empty lines, header $0 → valid',
    validateCODelta(0, []), { valid: true, delta: 0 });

  expect('rounding within $0.01 tolerance → valid',
    validateCODelta(100.001, [100.00]), { valid: true, delta: 0.001 }, 0.005);
});

// ─── SUITE 8: Labor ───────────────────────────────────────────────────────────

suite('calcLaborCost', () => {
  // Ironworker: 8 reg @ $48.50, 2 OT @ $72.75, burden 1.42
  expect('ironworker 8reg + 2OT with burden',
    calcLaborCost(8, 48.50, 2, 72.75, 0, 0, 1.42),
    { labor_cost: 533.5, loaded_cost: 757.57 }, 0.02);

  expect('straight time only, no burden',
    calcLaborCost(10, 50),
    { labor_cost: 500, loaded_cost: 500 });

  expect('all zero hours → $0',
    calcLaborCost(0, 48.5, 0, 72.75),
    { labor_cost: 0, loaded_cost: 0 });

  expect('double-time entry',
    calcLaborCost(0, 48.5, 0, 72.75, 4, 97.0),
    { labor_cost: 388, loaded_cost: 388 });

  expect('burden < 1 defaults to 1.0 (no negative burden)',
    calcLaborCost(10, 50, 0, 0, 0, 0, 0.5),
    { labor_cost: 500, loaded_cost: 500 });
});

suite('inferOTRate', () => {
  expect('$48.50 regular → $72.75 OT',   inferOTRate(48.50), 72.75);
  expect('$65 regular → $97.50 OT',      inferOTRate(65),    97.50);
  expect('$0 regular → $0 OT',           inferOTRate(0),     0);
  expect('null → $0 OT',                 inferOTRate(null),  0);
});

// ─── SUITE 9: EVM ─────────────────────────────────────────────────────────────

suite('calcEV', () => {
  expect('$500k BAC at 60% complete',   calcEV(500000, 60),  300000);
  expect('0% complete → EV=0',          calcEV(500000, 0),   0);
  expect('100% complete → EV=BAC',      calcEV(500000, 100), 500000);
  expect('over 100% clamped',           calcEV(500000, 120), 500000);
  expect('negative % clamped to 0',     calcEV(500000, -10), 0);
  expect('$0 BAC always $0',            calcEV(0, 80),       0);
});

suite('calcCPI', () => {
  expect('EV=300k, AC=320k → CPI=0.9375',  calcCPI(300000, 320000), 0.9375, 0.0001);
  expect('EV=AC (on budget) → CPI=1.0',    calcCPI(200000, 200000), 1.0);
  expect('EV=300k, AC=0 → Infinity',        calcCPI(300000, 0),      Infinity);
  expect('EV=0, AC=0 → 1.0',               calcCPI(0, 0),            1.0);
  expect('EV>AC (under budget) → CPI>1',   calcCPI(300000, 250000), 1.2, 0.001);
  expect('negative AC not meaningful → ratio', calcCPI(100, -100),  -1, 0.001);
});

suite('calcSPI', () => {
  expect('EV=300k, PV=350k → SPI=0.857',  calcSPI(300000, 350000), 0.857, 0.001);
  expect('EV=PV → SPI=1.0',               calcSPI(200000, 200000), 1.0);
  expect('PV=0 → SPI=1',                  calcSPI(0, 0),           1);
  expect('EV>PV (ahead) → SPI>1',         calcSPI(400000, 350000), 1.143, 0.001);
});

suite('calcEAC — three methods', () => {
  // BAC=500k, EV=300k, AC=320k, CPI=0.9375
  expect('typical method',
    calcEAC(500000, 300000, 320000, 'typical'),
    // AC + (BAC-EV)/CPI = 320000 + 200000/0.9375 = 320000 + 213333 = 533333
    533333, 1);

  expect('optimistic method',
    calcEAC(500000, 300000, 320000, 'optimistic'),
    // AC + (BAC-EV) = 320000 + 200000 = 520000
    520000);

  expect('pessimistic method',
    calcEAC(500000, 300000, 320000, 'pessimistic'),
    // BAC/CPI = 500000/0.9375 = 533333
    533333, 1);

  expect('on-budget project → EAC=BAC (typical)',
    calcEAC(500000, 250000, 250000, 'typical'), 500000);
});

suite('calcTCPI', () => {
  // BAC=500k, EV=300k, AC=320k → (500k-300k)/(500k-320k) = 200k/180k = 1.111
  expect('over-budget → TCPI>1',  calcTCPI(500000, 300000, 320000), 1.111, 0.001);
  expect('on-budget → TCPI=1',    calcTCPI(500000, 250000, 250000), 1.0);
  expect('BAC=AC (spent all budget)', calcTCPI(500000, 400000, 500000), Infinity);
});

// ─── SUITE 10: WIP Recognition ────────────────────────────────────────────────

suite('calcWIP', () => {
  // Contract $1M, 68% complete, billed $600k → earned=680k, under-billed 80k
  expect('under-billed project',
    calcWIP(1000000, 68, 600000),
    { earned_revenue: 680000, over_billing: 0, under_billing: 80000 });

  // 60% complete, billed $650k → earned=600k, over-billed 50k
  expect('over-billed project',
    calcWIP(1000000, 60, 650000),
    { earned_revenue: 600000, over_billing: 50000, under_billing: 0 });

  // 100% complete, fully billed → no WIP
  expect('fully complete fully billed',
    calcWIP(500000, 100, 500000),
    { earned_revenue: 500000, over_billing: 0, under_billing: 0 });

  // 0% complete, no billing → no WIP
  expect('not started, no billing',
    calcWIP(500000, 0, 0),
    { earned_revenue: 0, over_billing: 0, under_billing: 0 });

  // Over 100% complete clamped
  expect('percent > 100 clamped',
    calcWIP(100000, 110, 100000),
    { earned_revenue: 100000, over_billing: 0, under_billing: 0 });
});

// ─── SUITE 11: Invoice Aging ──────────────────────────────────────────────────

suite('calcInvoiceAgeDays', () => {
  const ref = new Date('2026-03-04');
  expect('invoice from 2026-01-04 = 59 days', calcInvoiceAgeDays('2026-01-04', ref), 59);
  expect('invoice from today = 0 days',        calcInvoiceAgeDays('2026-03-04', ref), 0);
  expect('invoice from yesterday = 1 day',     calcInvoiceAgeDays('2026-03-03', ref), 1);
  expect('future invoice = 0 (clamped)',        calcInvoiceAgeDays('2026-04-01', ref), 0);
  expect('old invoice 180 days',               calcInvoiceAgeDays('2025-09-06', ref), 179, 1);
});

suite('calcAgingBucket', () => {
  expect('0 days → current',  calcAgingBucket(0),  'current');
  expect('1 day → 1-30',      calcAgingBucket(1),  '1-30');
  expect('30 days → 1-30',    calcAgingBucket(30), '1-30');
  expect('31 days → 31-60',   calcAgingBucket(31), '31-60');
  expect('60 days → 31-60',   calcAgingBucket(60), '31-60');
  expect('61 days → 61-90',   calcAgingBucket(61), '61-90');
  expect('90 days → 61-90',   calcAgingBucket(90), '61-90');
  expect('91 days → 90+',     calcAgingBucket(91), '90+');
  expect('365 days → 90+',    calcAgingBucket(365),'90+');
});

// ─── SUITE 12: ETC ────────────────────────────────────────────────────────────

suite('calcETCBudgetMethod', () => {
  expect('budget 300k, actual 198k → ETC 102k', calcETCBudgetMethod(300000, 198000), 102000);
  expect('over budget → ETC = 0',               calcETCBudgetMethod(300000, 310000), 0);
  expect('no actual → ETC = full budget',       calcETCBudgetMethod(300000, 0),      300000);
  expect('both 0 → ETC = 0',                    calcETCBudgetMethod(0, 0),           0);
  expect('budget = actual → ETC = 0',           calcETCBudgetMethod(100000, 100000), 0);
});

suite('calcETCPerformanceMethod', () => {
  // BAC=500k, EV=300k, CPI=0.9375 → ETC = (500k-300k)/0.9375 = 213333
  expect('performance based ETC', calcETCPerformanceMethod(500000, 300000, 0.9375), 213333, 1);
  expect('CPI=1 → ETC = BAC-EV',  calcETCPerformanceMethod(500000, 300000, 1.0),   200000);
  expect('CPI=0 → ETC = BAC-EV (fallback)', calcETCPerformanceMethod(500000, 300000, 0), 200000);
  expect('EV=BAC → ETC=0',        calcETCPerformanceMethod(500000, 500000, 1.0),   0);
});

// ─── SUITE 13: Resource / Shipping / Travel ───────────────────────────────────

suite('calcResourceCost', () => {
  expect('40 hrs @ $85/hr',              calcResourceCost(40, 85),          { total_cost: 3400, loaded_cost: 3400 });
  expect('40 hrs @ $85 with 1.42 burden', calcResourceCost(40, 85, 1.42),  { total_cost: 3400, loaded_cost: 4828 });
  expect('0 hrs → $0',                   calcResourceCost(0, 85),           { total_cost: 0, loaded_cost: 0 });
  expect('burden < 1 defaults to 1',     calcResourceCost(10, 50, 0.5),    { total_cost: 500, loaded_cost: 500 });
});

suite('calcShippingCost', () => {
  // 2 loads, 2hr load/unload, 150mi, 1hr drive, rate $85, mileage $0.67
  // drive = 1×85=85, mileage=150×0.67=100.50, loading=2×85=170 → per_load=355.50, total=711
  expect('2 loads, 150mi drive',
    calcShippingCost({ loads_shipped: 2, load_unload_hours: 2, distance_miles: 150, time_from_shop_hours: 1, labor_rate: 85, mileage_rate: 0.67 }),
    { per_load_cost: 355.50, total_cost: 711 }, 0.02);

  expect('1 load, no miles, no drive time',
    calcShippingCost({ loads_shipped: 1, load_unload_hours: 0, distance_miles: 0, time_from_shop_hours: 0, labor_rate: 85, mileage_rate: 0.67 }),
    { per_load_cost: 0, total_cost: 0 });

  expect('0 loads defaults to 1',
    calcShippingCost({ loads_shipped: 0, load_unload_hours: 1, distance_miles: 0, time_from_shop_hours: 0, labor_rate: 85, mileage_rate: 0 }),
    { per_load_cost: 85, total_cost: 85 });
});

suite('calcTravelCost', () => {
  // 4 men, 2 weeks, 200mi (round trip=400mi), 4hrs travel @ $85, mileage $0.67
  // travel_hrs = 4×85=340, mileage=200×2×0.67=268, per_man_week=608, total=608×4×2=4864
  expect('4 men, 2 weeks, 200mi round trip',
    calcTravelCost({ duration_weeks: 2, men: 4, distance_miles: 200, travel_hours: 4, labor_rate: 85, mileage_rate: 0.67 }),
    { per_man_week: 608, total_cost: 4864 }, 0.02);

  expect('1 man, 1 week, no travel',
    calcTravelCost({ duration_weeks: 1, men: 1, distance_miles: 0, travel_hours: 0, labor_rate: 85, mileage_rate: 0.67 }),
    { per_man_week: 0, total_cost: 0 });
});

// ─── Summary ──────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log(`\n${'─'.repeat(60)}`);
console.log(`  Financial Formula Tests: ${total} total | ${passed} passed | ${failed} failed`);
console.log(`${'─'.repeat(60)}\n`);

if (failed > 0) {
  console.error(`❌ ${failed} test(s) failed — fix before merging`);
  if (typeof process !== 'undefined') process.exit(1);
}

// Export for UI runner
export { results, passed, failed, total };