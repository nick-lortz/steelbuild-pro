/**
 * SteelBuild-Pro — Financial Formula Test Runner UI
 * ==================================================
 * Live in-app test dashboard for engineers and PMs.
 * Surfaces all formula unit test results, grouped by suite.
 * Shows pass/fail counts, individual failures, and overall health.
 */

import React, { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, ChevronDown, ChevronRight, FlaskConical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ─── Run tests inline (import the pure formula lib + run tests) ──────────────

// ─── Canonical Formula Library (inlined to avoid cross-module build issues) ──

const n = (v) => (typeof v === 'number' && !isNaN(v) ? v : Number(v) || 0);

function roundHalfEven(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  const shifted = value * factor;
  const floor = Math.floor(shifted);
  const diff = shifted - floor;
  let rounded;
  if (diff === 0.5) { rounded = floor % 2 === 0 ? floor : floor + 1; }
  else { rounded = Math.round(shifted); }
  return rounded / factor;
}

const clamp = (v, min, max) => Math.min(Math.max(n(v), n(min)), n(max));

const calcLineItemExtended = (qty, price) => roundHalfEven(n(qty) * n(price));
const calcEstimateSubtotal = (items) => roundHalfEven((items || []).reduce((s, v) => s + n(v), 0));
const calcMarkupSellPrice  = (cost, pct) => roundHalfEven(n(cost) * (1 + n(pct) / 100));
const calcMarginToMarkup   = (m) => { const mv = n(m); if (mv >= 100) return Infinity; if (mv <= 0) return 0; return roundHalfEven(mv / (1 - mv / 100), 4); };
const calcDiscount         = (price, pct) => { const d = roundHalfEven(n(price) * (clamp(pct,0,100)/100)); return { discount_amount: d, net_price: roundHalfEven(n(price)-d) }; };
const calcTax              = (amt, rate) => roundHalfEven(n(amt) * (n(rate) / 100));
const calcTaxGrossUp       = (gross, rate) => { const r = n(rate)/100; const tax = roundHalfEven(n(gross)*r/(1+r)); return { tax, net: roundHalfEven(n(gross)-tax) }; };
const calcRetainageWithheld= (billing, pct = 10) => roundHalfEven(n(billing) * (clamp(pct,0,100)/100));
const calcNetPaymentDue    = (billing, pct = 10) => { const ret = calcRetainageWithheld(billing,pct); return { retainage: ret, net_due: roundHalfEven(n(billing)-ret) }; };
const calcRetainageBalance = (held, released = 0) => roundHalfEven(Math.max(0, n(held)-n(released)));
const calcSOVCurrentBilling= (sv, pct, prev) => roundHalfEven(n(sv)*(clamp(pct,0,100)/100) - n(prev));
const calcSOVBalanceToFinish= (sv, billed) => roundHalfEven(n(sv)-n(billed));
const calcG703Totals       = (lines = []) => { let tc=0,tr=0; for(const l of lines){const b=n(l.current_billed);const r=n(l.retainage_pct??10);tc+=b;tr+=b*(r/100);} return {total_current:roundHalfEven(tc),total_retainage:roundHalfEven(tr),net_due:roundHalfEven(tc-tr)}; };
const calcCOTotalCost      = (items=[], sr=65, fr=85) => roundHalfEven(items.reduce((s,li)=>s+n(li.shop_hours)*sr+n(li.field_hours)*fr+n(li.equipment_cost)+n(li.material_cost)+n(li.other_cost),0));
const validateCODelta      = (header, lines=[]) => { const sum=roundHalfEven(lines.reduce((s,v)=>s+n(v),0)); const delta=roundHalfEven(n(header)-sum); return {valid:Math.abs(delta)<0.01,delta}; };
const calcLaborCost        = (rh,rr,oh=0,or_=0,dh=0,dr=0,burden=1.0) => { const lc=roundHalfEven(n(rh)*n(rr)+n(oh)*n(or_)+n(dh)*n(dr)); return {labor_cost:lc,loaded_cost:roundHalfEven(lc*Math.max(1,n(burden)))}; };
const inferOTRate          = (rate) => roundHalfEven(n(rate)*1.5);
const calcEV               = (BAC, pct) => roundHalfEven(n(BAC)*(clamp(pct,0,100)/100));
const calcCPI              = (EV, AC) => { if(n(AC)===0) return n(EV)>0?Infinity:1; return roundHalfEven(n(EV)/n(AC),4); };
const calcSPI              = (EV, PV) => { if(n(PV)===0) return 1; return roundHalfEven(n(EV)/n(PV),4); };
const calcEAC              = (BAC,EV,AC,method='typical') => { const b=n(BAC),ev=n(EV),ac=n(AC); const cpi=ac>0?ev/ac:1; if(method==='optimistic') return roundHalfEven(ac+(b-ev)); if(method==='pessimistic') return roundHalfEven(cpi>0?b/cpi:b); return roundHalfEven(ac+(cpi>0?(b-ev)/cpi:(b-ev))); };
const calcTCPI             = (BAC,EV,AC) => { const d=n(BAC)-n(AC); if(d===0) return n(BAC)===n(EV)?1:Infinity; return roundHalfEven((n(BAC)-n(EV))/d,4); };
const calcWIP              = (cv,pct,billed) => { const earned=roundHalfEven(n(cv)*(clamp(pct,0,100)/100)); const b=n(billed); return {earned_revenue:earned,over_billing:roundHalfEven(Math.max(0,b-earned)),under_billing:roundHalfEven(Math.max(0,earned-b))}; };
const calcInvoiceAgeDays   = (inv_date, ref=new Date()) => Math.max(0,Math.floor((new Date(ref)-new Date(inv_date))/(86400000)));
const calcAgingBucket      = (days) => { const d=n(days); if(d<=0)return'current'; if(d<=30)return'1-30'; if(d<=60)return'31-60'; if(d<=90)return'61-90'; return'90+'; };
const calcETCBudgetMethod  = (budget, actual) => roundHalfEven(Math.max(0,n(budget)-n(actual)));
const calcETCPerformanceMethod=(BAC,EV,CPI)=>{ const cpi=n(CPI); if(cpi<=0) return Math.max(0,n(BAC)-n(EV)); return roundHalfEven(Math.max(0,(n(BAC)-n(EV))/cpi)); };
const calcResourceCost     = (hrs,rate,burden=1.0) => { const tc=roundHalfEven(n(hrs)*n(rate)); return {total_cost:tc,loaded_cost:roundHalfEven(tc*Math.max(1,n(burden)))}; };
const calcShippingCost     = ({loads_shipped=1,load_unload_hours=0,distance_miles=0,time_from_shop_hours=0,labor_rate=0,mileage_rate=0})=>{ const per=roundHalfEven(n(time_from_shop_hours)*n(labor_rate)+n(distance_miles)*n(mileage_rate)+n(load_unload_hours)*n(labor_rate)); return {per_load_cost:per,total_cost:roundHalfEven(per*Math.max(1,n(loads_shipped)))}; };
const calcTravelCost       = ({duration_weeks=1,men=1,distance_miles=0,travel_hours=0,labor_rate=0,mileage_rate=0})=>{ const pmw=roundHalfEven(n(travel_hours)*n(labor_rate)+n(distance_miles)*2*n(mileage_rate)); return {per_man_week:pmw,total_cost:roundHalfEven(pmw*Math.max(1,n(men))*Math.max(1,n(duration_weeks)))}; };

// ─── Inline test runner (no Node dependency) ─────────────────────────────────

function approximately(a, b, tol = 0.01) {
  if (a === Infinity && b === Infinity) return true;
  if (typeof b === 'object' && b !== null) {
    return Object.keys(b).every(k => approximately(a?.[k], b[k], tol));
  }
  return Math.abs(Number(a) - Number(b)) <= tol;
}

function runTests() {
  const suites = [];
  let currentSuite = null;

  function suite(name, fn) {
    currentSuite = { name, tests: [] };
    suites.push(currentSuite);
    fn();
  }

  function expect(label, actual, expected, tolerance = 0.005) {
    const pass = approximately(actual, expected, tolerance);
    currentSuite.tests.push({ label, pass, actual, expected });
  }

  // ── Rounding
  suite('Banker\'s Rounding', () => {
    expect('0.5 → 0',  roundHalfEven(0.5),  0);
    expect('1.5 → 2',  roundHalfEven(1.5),  2);
    expect('2.5 → 2',  roundHalfEven(2.5),  2);
    expect('3.5 → 4',  roundHalfEven(3.5),  4);
    expect('-1.5 → -2',roundHalfEven(-1.5), -2);
    expect('0 → 0',    roundHalfEven(0),     0);
  });

  // ── Line Items
  suite('Line Item Math', () => {
    expect('10 tons @ $850',         calcLineItemExtended(10, 850),       8500);
    expect('0.5 tons @ $850',        calcLineItemExtended(0.5, 850),      425);
    expect('0 qty',                  calcLineItemExtended(0, 850),        0);
    expect('null qty',               calcLineItemExtended(null, 850),     0);
    expect('credit line (neg qty)',  calcLineItemExtended(-5, 200),       -1000);
    expect('fractional unit price',  calcLineItemExtended(100, 12.555),   1255.5);
    expect('subtotal 3 lines',       calcEstimateSubtotal([1000, 2500.50, 750]), 4250.5);
    expect('subtotal with credit',   calcEstimateSubtotal([5000, -500, 1250]),   5750);
    expect('subtotal empty',         calcEstimateSubtotal([]),            0);
  });

  // ── Markup
  suite('Markup & Discount', () => {
    expect('$100k at 20% markup',       calcMarkupSellPrice(100000, 20),   120000);
    expect('0% markup passthrough',     calcMarkupSellPrice(50000, 0),     50000);
    expect('100% markup = double',      calcMarkupSellPrice(10000, 100),   20000);
    expect('20% margin → 25% markup',  calcMarginToMarkup(20),             25, 0.01);
    expect('50% margin → 100%',        calcMarginToMarkup(50),             100, 0.01);
    expect('$10k, 10% discount → $9k', calcDiscount(10000, 10),            { discount_amount: 1000, net_price: 9000 });
    expect('100% discount → free',     calcDiscount(5000, 100),            { discount_amount: 5000, net_price: 0 });
    expect('>100% discount clamped',   calcDiscount(5000, 150),            { discount_amount: 5000, net_price: 0 });
  });

  // ── Tax
  suite('Tax Calculations', () => {
    expect('$50k @ 8.5%',        calcTax(50000, 8.5),       4250);
    expect('$0 base',            calcTax(0, 8.5),            0);
    expect('0% rate',            calcTax(50000, 0),          0);
    expect('gross-up $108.50',   calcTaxGrossUp(108.5, 8.5), { tax: 7.88, net: 100.62 }, 0.01);
    expect('gross-up 0%',        calcTaxGrossUp(1000, 0),    { tax: 0, net: 1000 });
    expect('$125k @ 8.1%',       calcTax(125000, 8.1),       10125);
  });

  // ── Retainage
  suite('Retainage & Net Payment', () => {
    expect('$100k @ 10%',            calcRetainageWithheld(100000, 10), 10000);
    expect('$85k @ 5%',              calcRetainageWithheld(85000, 5),   4250);
    expect('default 10%',            calcRetainageWithheld(20000),      2000);
    expect('>100% clamped',          calcRetainageWithheld(50000, 150), 50000);
    expect('net due $100k @ 10%',    calcNetPaymentDue(100000, 10),     { retainage: 10000, net_due: 90000 });
    expect('retainage balance held', calcRetainageBalance(20000, 10000),10000);
    expect('fully released',         calcRetainageBalance(20000, 20000),0);
    expect('over-released clamped',  calcRetainageBalance(10000, 15000),0);
  });

  // ── SOV
  suite('SOV / G703 Billing', () => {
    expect('68% on $280k, prev $156.8k', calcSOVCurrentBilling(280000, 68, 156800), 33600);
    expect('0% complete → $0',           calcSOVCurrentBilling(280000, 0, 0),        0);
    expect('100% fully billed → $0',     calcSOVCurrentBilling(100000, 100, 100000), 0);
    expect('percent regression (neg)',   calcSOVCurrentBilling(100000, 55, 60000),  -5000);
    expect('balance $89.6k',             calcSOVBalanceToFinish(280000, 190400),     89600);
    expect('overbilled → negative',      calcSOVBalanceToFinish(100000, 105000),    -5000);
    const lines = [
      { current_billed: 50000, retainage_pct: 10 },
      { current_billed: 30000, retainage_pct: 10 },
      { current_billed: 20000, retainage_pct: 5  },
    ];
    expect('G703 three lines net', calcG703Totals(lines), { total_current: 100000, total_retainage: 9000, net_due: 91000 });
    expect('G703 empty',           calcG703Totals([]),     { total_current: 0, total_retainage: 0, net_due: 0 });
  });

  // ── Change Orders
  suite('Change Order Math', () => {
    const items = [
      { shop_hours: 40, field_hours: 80, equipment_cost: 3000, material_cost: 12000, other_cost: 500 },
      { shop_hours: 0,  field_hours: 16, equipment_cost: 0,    material_cost: 2400,  other_cost: 0   },
    ];
    expect('CO two lines total',     calcCOTotalCost(items, 65, 85),        28660);
    expect('CO empty lines',         calcCOTotalCost([], 65, 85),           0);
    expect('CO delta valid',         validateCODelta(28660, [24900, 3760]), { valid: true, delta: 0 });
    expect('CO delta invalid $500',  validateCODelta(29160, [24900, 3760]), { valid: false, delta: 500 });
    expect('CO delta empty→valid',   validateCODelta(0, []),               { valid: true, delta: 0 });
  });

  // ── Labor
  suite('Labor Cost', () => {
    expect('8reg+2OT ironworker w/ burden',
      calcLaborCost(8, 48.50, 2, 72.75, 0, 0, 1.42),
      { labor_cost: 533.5, loaded_cost: 757.57 }, 0.02);
    expect('straight time no burden',
      calcLaborCost(10, 50), { labor_cost: 500, loaded_cost: 500 });
    expect('zero hours',
      calcLaborCost(0, 48.5), { labor_cost: 0, loaded_cost: 0 });
    expect('OT rate inferred $48.50→$72.75', inferOTRate(48.50), 72.75);
    expect('OT rate inferred $65→$97.50',    inferOTRate(65),    97.50);
  });

  // ── EVM
  suite('Earned Value Management', () => {
    expect('EV $500k BAC at 60%',        calcEV(500000, 60),                        300000);
    expect('EV 100% = BAC',              calcEV(500000, 100),                       500000);
    expect('EV 0%  = 0',                 calcEV(500000, 0),                         0);
    expect('CPI=0.9375 (over budget)',   calcCPI(300000, 320000),                   0.9375, 0.0001);
    expect('CPI=1.0 (on budget)',        calcCPI(200000, 200000),                   1.0);
    expect('SPI=0.857 (behind)',         calcSPI(300000, 350000),                   0.857, 0.001);
    expect('EAC typical method',         calcEAC(500000, 300000, 320000, 'typical'),533333, 1);
    expect('EAC optimistic',             calcEAC(500000, 300000, 320000, 'optimistic'),520000);
    expect('TCPI over-budget',           calcTCPI(500000, 300000, 320000),          1.111, 0.001);
    expect('TCPI on-budget',             calcTCPI(500000, 250000, 250000),          1.0);
  });

  // ── WIP
  suite('WIP Recognition', () => {
    expect('under-billed project',
      calcWIP(1000000, 68, 600000), { earned_revenue: 680000, over_billing: 0, under_billing: 80000 });
    expect('over-billed project',
      calcWIP(1000000, 60, 650000), { earned_revenue: 600000, over_billing: 50000, under_billing: 0 });
    expect('fully complete + billed',
      calcWIP(500000, 100, 500000), { earned_revenue: 500000, over_billing: 0, under_billing: 0 });
    expect('not started',
      calcWIP(500000, 0, 0),        { earned_revenue: 0, over_billing: 0, under_billing: 0 });
  });

  // ── Invoice Aging
  suite('Invoice Aging', () => {
    const ref = new Date('2026-03-04');
    expect('59 days old',         calcInvoiceAgeDays('2026-01-04', ref), 59);
    expect('today = 0',           calcInvoiceAgeDays('2026-03-04', ref), 0);
    expect('future clamped to 0', calcInvoiceAgeDays('2026-04-01', ref), 0);
    expect('bucket: current',     calcAgingBucket(0),   'current');
    expect('bucket: 1-30',        calcAgingBucket(15),  '1-30');
    expect('bucket: 31-60',       calcAgingBucket(45),  '31-60');
    expect('bucket: 61-90',       calcAgingBucket(75),  '61-90');
    expect('bucket: 90+',         calcAgingBucket(120), '90+');
  });

  // ── ETC
  suite('Cost-to-Complete (ETC)', () => {
    expect('budget method $102k',    calcETCBudgetMethod(300000, 198000), 102000);
    expect('over budget → ETC=0',   calcETCBudgetMethod(300000, 310000), 0);
    expect('performance method',     calcETCPerformanceMethod(500000, 300000, 0.9375), 213333, 1);
    expect('perf method CPI=1',      calcETCPerformanceMethod(500000, 300000, 1.0),    200000);
  });

  // ── Resource / Shipping / Travel
  suite('Resource & Logistics Cost', () => {
    expect('40hrs @ $85 no burden',  calcResourceCost(40, 85),        { total_cost: 3400, loaded_cost: 3400 });
    expect('40hrs @ $85 burden 1.42',calcResourceCost(40, 85, 1.42), { total_cost: 3400, loaded_cost: 4828 });
    expect('shipping 2 loads 150mi',
      calcShippingCost({ loads_shipped: 2, load_unload_hours: 2, distance_miles: 150, time_from_shop_hours: 1, labor_rate: 85, mileage_rate: 0.67 }),
      { per_load_cost: 355.50, total_cost: 711 }, 0.02);
    expect('travel 4 men 2 weeks 200mi',
      calcTravelCost({ duration_weeks: 2, men: 4, distance_miles: 200, travel_hours: 4, labor_rate: 85, mileage_rate: 0.67 }),
      { per_man_week: 608, total_cost: 4864 }, 0.02);
  });

  return suites;
}

// ─── UI Component ─────────────────────────────────────────────────────────────

export default function FinancialTestRunner() {
  const [ran, setRan] = useState(false);
  const [suites, setSuites] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [filter, setFilter] = useState('all'); // 'all' | 'failed' | 'passed'

  const runAll = () => {
    const results = runTests();
    setSuites(results);
    setRan(true);
    // auto-expand failed suites
    const exp = {};
    results.forEach(s => {
      if (s.tests.some(t => !t.pass)) exp[s.name] = true;
    });
    setExpanded(exp);
  };

  const totals = useMemo(() => {
    const all = suites.flatMap(s => s.tests);
    return {
      total: all.length,
      passed: all.filter(t => t.pass).length,
      failed: all.filter(t => !t.pass).length,
      suites: suites.length,
    };
  }, [suites]);

  const healthColor = !ran ? 'rgba(255,255,255,0.3)'
    : totals.failed === 0 ? '#4DD6A4'
    : totals.failed <= 3  ? '#FFB15A'
    : '#FF4D4D';

  const toggle = (name) => setExpanded(e => ({ ...e, [name]: !e[name] }));

  const visibleSuites = suites.filter(s => {
    if (filter === 'failed') return s.tests.some(t => !t.pass);
    if (filter === 'passed') return s.tests.every(t => t.pass);
    return true;
  });

  return (
    <div style={{ color: 'rgba(255,255,255,0.88)', minHeight: '100%' }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FlaskConical size={22} style={{ color: '#FF8C42' }} />
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#fff' }}>
              Financial Formula Test Runner
            </h1>
            <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Unit tests · all formulas · live verification
            </p>
          </div>
        </div>
        <Button
          onClick={runAll}
          style={{ background: 'linear-gradient(90deg,#FF5A1F,#FF8C42)', color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          <RefreshCw size={13} className="mr-2" />
          {ran ? 'Re-run Tests' : 'Run All Tests'}
        </Button>
      </div>

      {/* Summary Cards */}
      {ran && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Tests', value: totals.total,   color: 'rgba(255,255,255,0.6)' },
            { label: 'Passed',      value: totals.passed,  color: '#4DD6A4' },
            { label: 'Failed',      value: totals.failed,  color: totals.failed > 0 ? '#FF4D4D' : '#4DD6A4' },
            { label: 'Suites',      value: totals.suites,  color: '#FF8C42' },
          ].map(card => (
            <div key={card.label} style={{ background: '#14181E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 18px' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)', marginBottom: 6 }}>{card.label}</p>
              <p style={{ fontSize: '1.6rem', fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Overall Health Bar */}
      {ran && (
        <div style={{ background: '#14181E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 18px' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>Formula Health</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: healthColor }}>
              {totals.failed === 0 ? '✓ All Passing' : `${totals.failed} Failing`}
            </span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${totals.total > 0 ? (totals.passed / totals.total) * 100 : 0}%`,
              background: healthColor,
              borderRadius: 4,
              transition: 'width 0.5s ease'
            }} />
          </div>
          <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.28)', marginTop: 6 }}>
            {totals.passed}/{totals.total} tests passing · CI will block merge if any test fails
          </p>
        </div>
      )}

      {/* Filter */}
      {ran && (
        <div className="flex gap-2 flex-wrap">
          {['all', 'failed', 'passed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '5px 14px', borderRadius: 999, cursor: 'pointer', border: '1px solid',
                background: filter === f ? 'rgba(255,90,31,0.15)' : 'transparent',
                borderColor: filter === f ? 'rgba(255,90,31,0.4)' : 'rgba(255,255,255,0.1)',
                color: filter === f ? '#FF8C42' : 'rgba(255,255,255,0.4)',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Test Suites */}
      {visibleSuites.map(suite => {
        const suitePassed = suite.tests.filter(t => t.pass).length;
        const suiteFailed = suite.tests.filter(t => !t.pass).length;
        const open = expanded[suite.name];

        return (
          <div key={suite.name} style={{ background: '#14181E', border: `1px solid ${suiteFailed > 0 ? 'rgba(255,77,77,0.25)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 14, overflow: 'hidden' }}>
            {/* Suite Header */}
            <button
              onClick={() => toggle(suite.name)}
              className="w-full flex items-center justify-between p-4"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <div className="flex items-center gap-3">
                {suiteFailed > 0
                  ? <XCircle size={16} style={{ color: '#FF4D4D' }} />
                  : <CheckCircle2 size={16} style={{ color: '#4DD6A4' }} />
                }
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{suite.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#4DD6A4' }}>{suitePassed} ✓</span>
                {suiteFailed > 0 && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#FF4D4D' }}>{suiteFailed} ✗</span>}
                {open ? <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.38)' }} /> : <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.38)' }} />}
              </div>
            </button>

            {/* Test Rows */}
            {open && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                {suite.tests.map((test, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px',
                      borderBottom: i < suite.tests.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                      background: test.pass ? 'transparent' : 'rgba(255,77,77,0.04)',
                    }}
                  >
                    {test.pass
                      ? <CheckCircle2 size={13} style={{ color: '#4DD6A4', marginTop: 2, flexShrink: 0 }} />
                      : <XCircle     size={13} style={{ color: '#FF4D4D', marginTop: 2, flexShrink: 0 }} />
                    }
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: '0.7rem', color: test.pass ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.88)', margin: 0 }}>
                        {test.label}
                      </p>
                      {!test.pass && (
                        <div style={{ marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: '#FF4D4D' }}>
                            got: {JSON.stringify(test.actual)}
                          </span>
                          <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: '#FFB15A' }}>
                            expected: {JSON.stringify(test.expected)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {!ran && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.25)' }}>
          <FlaskConical size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Click "Run All Tests" to execute formula verification</p>
        </div>
      )}

      {/* CI Instructions */}
      <div style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 20 }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#FF8C42', marginBottom: 10 }}>CI / Build Integration</p>
        <pre style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
{`# package.json
"scripts": {
  "test:financials": "node components/shared/financialFormulas.test.js"
}

# .github/workflows/ci.yml
- name: Financial Formula Tests
  run: npm run test:financials
  # Exits code 1 on any failure → blocks PR merge

# Run locally:
node components/shared/financialFormulas.test.js`}
        </pre>
      </div>
    </div>
  );
}