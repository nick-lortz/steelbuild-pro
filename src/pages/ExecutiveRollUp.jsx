import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line,
  ReferenceLine, Legend
} from "recharts";

// ── Font Loader ──────────────────────────────────────────────────────────────
const FL = () => <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />;

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:       "#07090F",
  surface:  "#0C1018",
  card:     "#0F1420",
  border:   "rgba(255,255,255,0.07)",
  accent:   "#FF5A1F",
  accent2:  "#FF8C42",
  green:    "#36B37E",
  yellow:   "#FFB020",
  red:      "#FF4D4D",
  blue:     "#4DC8E8",
  purple:   "#7C6AF7",
  text:     "rgba(255,255,255,0.88)",
  muted:    "rgba(255,255,255,0.38)",
  faint:    "rgba(255,255,255,0.08)",
  mono:     "'IBM Plex Mono', monospace",
  display:  "'Barlow Condensed', sans-serif",
};

// ── Data ─────────────────────────────────────────────────────────────────────
const PROJECTS = [
  {
    id: "P1", name: "Mesa Distribution Center", pm: "J. Rivera",
    phase: "ERECTION", health: "WATCH",
    contractValue: 2850000, budgetSpend: 2140000, actualSpend: 2310000,
    percentComplete: 74,
    laborBudget: 18400, laborActual: 17200, laborForecast: 22100,
    shopBudget: 8200,  shopActual: 7800,  fieldBudget: 10200, fieldActual: 9400,
    openRFIs: { CRITICAL: 1, HIGH: 1, MEDIUM: 0, LOW: 0 },
    startDate: "2026-01-05", targetDate: "2026-04-22",
    cashflow: [
      { m: "Jan", budget: 320000, actual: 318000 },
      { m: "Feb", budget: 480000, actual: 502000 },
      { m: "Mar", budget: 610000, actual: 648000 },
      { m: "Apr", budget: 730000, actual: 842000 },
      { m: "May", budget: 420000, actual: null },
      { m: "Jun", budget: 290000, actual: null },
    ],
    laborTrend: [14, 18, 22, 28, 32, 34, 31, 29, 27, 24, 19, 17],
    changeOrders: 3, coValue: 128000,
    schedule: "BEHIND", scheduleVariance: -8,
  },
  {
    id: "P2", name: "Riverside Warehouse", pm: "M. Torres",
    phase: "FABRICATION", health: "ON TRACK",
    contractValue: 1940000, budgetSpend: 820000, actualSpend: 795000,
    percentComplete: 38,
    laborBudget: 12600, laborActual: 5200, laborForecast: 13100,
    shopBudget: 6400,  shopActual: 4100,  fieldBudget: 6200,  fieldActual: 1100,
    openRFIs: { CRITICAL: 0, HIGH: 1, MEDIUM: 1, LOW: 0 },
    startDate: "2026-01-10", targetDate: "2026-04-25",
    cashflow: [
      { m: "Jan", budget: 180000, actual: 174000 },
      { m: "Feb", budget: 260000, actual: 251000 },
      { m: "Mar", budget: 380000, actual: 370000 },
      { m: "Apr", budget: 490000, actual: null },
      { m: "May", budget: 380000, actual: null },
      { m: "Jun", budget: 250000, actual: null },
    ],
    laborTrend: [8, 12, 16, 20, 18, 14, 12, 10, 8, 6, 4, 2],
    changeOrders: 1, coValue: 22000,
    schedule: "ON TRACK", scheduleVariance: 2,
  },
  {
    id: "P3", name: "Chandler Office Build", pm: "D. Kim",
    phase: "ERECTION", health: "ON TRACK",
    contractValue: 980000, budgetSpend: 890000, actualSpend: 871000,
    percentComplete: 91,
    laborBudget: 7200,  laborActual: 6900, laborForecast: 7400,
    shopBudget: 3200,  shopActual: 3100,  fieldBudget: 4000,  fieldActual: 3800,
    openRFIs: { CRITICAL: 0, HIGH: 0, MEDIUM: 1, LOW: 1 },
    startDate: "2025-12-15", targetDate: "2026-04-05",
    cashflow: [
      { m: "Jan", budget: 120000, actual: 118000 },
      { m: "Feb", budget: 210000, actual: 204000 },
      { m: "Mar", budget: 320000, actual: 316000 },
      { m: "Apr", budget: 240000, actual: 233000 },
      { m: "May", budget: 90000,  actual: null },
    ],
    laborTrend: [18, 24, 28, 32, 30, 26, 22, 18, 14, 10, 6, 3],
    changeOrders: 2, coValue: 45000,
    schedule: "AHEAD", scheduleVariance: 4,
  },
];

const MONTHLY_PORTFOLIO = [
  { m: "Jan", budget: 620000,  actual: 610000  },
  { m: "Feb", budget: 950000,  actual: 957000  },
  { m: "Mar", budget: 1310000, actual: 1334000 },
  { m: "Apr", budget: 1460000, actual: 1075000 },
  { m: "May", budget: 890000,  actual: null    },
  { m: "Jun", budget: 540000,  actual: null    },
];

const LABOR_BY_PROJECT = PROJECTS.map(p => ({
  name: p.name.split(" ").slice(0, 2).join(" "),
  shopBudget: p.shopBudget, shopActual: p.shopActual,
  fieldBudget: p.fieldBudget, fieldActual: p.fieldActual,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt$ = (v) => v >= 1000000 ? `$${(v/1000000).toFixed(2)}M` : `$${(v/1000).toFixed(0)}K`;
const fmtHr = (v) => `${v.toLocaleString()}h`;
const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;
const variance = (budget, actual) => actual != null ? ((actual - budget) / budget * 100).toFixed(1) : null;

const healthMeta = {
  "ON TRACK": { color: C.green,  bg: "rgba(54,179,126,0.12)",  label: "ON TRACK" },
  "WATCH":    { color: C.yellow, bg: "rgba(255,176,32,0.12)",  label: "WATCH"    },
  "AT RISK":  { color: C.red,    bg: "rgba(255,77,77,0.12)",   label: "AT RISK"  },
};

const scheduleMeta = {
  "ON TRACK": { color: C.green,  symbol: "●" },
  "AHEAD":    { color: C.blue,   symbol: "▲" },
  "BEHIND":   { color: C.red,    symbol: "▼" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

// Sparkline
const Spark = ({ data, color = C.accent, height = 32, width = 80 }) => (
  <ResponsiveContainer width={width} height={height}>
    <LineChart data={data.map((v, i) => ({ v, i }))}>
      <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
    </LineChart>
  </ResponsiveContainer>
);

// Gauge ring
const Ring = ({ pct: p, color, size = 64, stroke = 6 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (p / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
    </svg>
  );
};

// Stat card
const StatCard = ({ label, value, sub, color = C.text, spark, trend, style }) => (
  <div style={{
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6,
    position: "relative", overflow: "hidden", ...style,
  }}>
    <div style={{ fontSize: 9, color: C.muted, letterSpacing: "0.14em", fontFamily: C.mono, textTransform: "uppercase" }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: C.display, lineHeight: 1, letterSpacing: "0.01em" }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: C.muted, fontFamily: C.mono }}>{sub}</div>}
    {spark && (
      <div style={{ position: "absolute", right: 12, bottom: 8, opacity: 0.6 }}>
        <Spark data={spark} color={color} />
      </div>
    )}
    {trend != null && (
      <div style={{ fontSize: 10, color: trend >= 0 ? C.red : C.green, fontFamily: C.mono, fontWeight: 700 }}>
        {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}% vs budget
      </div>
    )}
  </div>
);

// Section label
const SectionLabel = ({ children, action }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.16em", fontFamily: C.mono, textTransform: "uppercase" }}>{children}</div>
    {action}
  </div>
);

// Custom tooltip
const ChartTip = ({ active, payload, label, fmt = (v) => v }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0D1320", border: `1px solid ${C.border}`, borderRadius: 7, padding: "10px 14px", fontFamily: C.mono, fontSize: 11 }}>
      <div style={{ color: C.muted, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: "flex", gap: 10, justifyContent: "space-between" }}>
          <span>{p.name}</span><span style={{ fontWeight: 700 }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ── RFI Severity Chart ────────────────────────────────────────────────────────
const RFISeverityChart = ({ projects }) => {
  const totals = useMemo(() => {
    const t = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    projects.forEach(p => Object.entries(p.openRFIs).forEach(([k, v]) => t[k] += v));
    return t;
  }, [projects]);

  const totalOpen = Object.values(totals).reduce((a, b) => a + b, 0);
  const pieData = [
    { name: "Critical", value: totals.CRITICAL, color: C.red    },
    { name: "High",     value: totals.HIGH,     color: C.accent  },
    { name: "Medium",   value: totals.MEDIUM,   color: C.yellow  },
    { name: "Low",      value: totals.LOW,       color: C.muted   },
  ].filter(d => d.value > 0);

  const byProject = projects.map(p => ({
    name: p.name.split(" ").slice(0, 2).join(" "),
    Critical: p.openRFIs.CRITICAL,
    High: p.openRFIs.HIGH,
    Medium: p.openRFIs.MEDIUM,
    Low: p.openRFIs.LOW,
  }));

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "18px 20px" }}>
      <SectionLabel>Open RFIs by Severity</SectionLabel>
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        {/* Donut */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <PieChart width={110} height={110}>
            <Pie data={pieData} cx={50} cy={50} innerRadius={30} outerRadius={50}
              dataKey="value" paddingAngle={3}>
              {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
          </PieChart>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, fontFamily: C.display, color: totalOpen > 2 ? C.red : C.yellow, lineHeight: 1 }}>{totalOpen}</div>
            <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.1em" }}>OPEN</div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
          {[
            { label: "Critical", val: totals.CRITICAL, color: C.red    },
            { label: "High",     val: totals.HIGH,     color: C.accent  },
            { label: "Medium",   val: totals.MEDIUM,   color: C.yellow  },
            { label: "Low",      val: totals.LOW,       color: C.muted   },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
              <div style={{ fontSize: 10, color: C.muted, fontFamily: C.mono, flex: 1 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: val > 0 ? color : C.muted, fontFamily: C.display }}>{val}</div>
            </div>
          ))}
        </div>

        {/* By project stacked bar */}
        <div style={{ flex: 2 }}>
          <ResponsiveContainer width="100%" height={90}>
            <BarChart data={byProject} layout="vertical" barSize={12} barCategoryGap={6}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fill: C.muted, fontSize: 9, fontFamily: C.mono }} width={90} />
              <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="Critical" stackId="a" fill={C.red}    radius={[0,0,0,0]} />
              <Bar dataKey="High"     stackId="a" fill={C.accent}  />
              <Bar dataKey="Medium"   stackId="a" fill={C.yellow}  />
              <Bar dataKey="Low"      stackId="a" fill={C.muted} radius={[0,2,2,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ── Budget vs Actual ──────────────────────────────────────────────────────────
const BudgetVsActual = ({ data }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "18px 20px" }}>
    <SectionLabel>Portfolio Spend — Budget vs Actual</SectionLabel>
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="gBudget" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={C.blue}   stopOpacity={0.15} />
            <stop offset="95%" stopColor={C.blue}   stopOpacity={0}    />
          </linearGradient>
          <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={C.accent} stopOpacity={0.2} />
            <stop offset="95%" stopColor={C.accent} stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="m" tick={{ fill: C.muted, fontSize: 9, fontFamily: C.mono }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}K`} tick={{ fill: C.muted, fontSize: 9, fontFamily: C.mono }} axisLine={false} tickLine={false} width={52} />
        <Tooltip content={<ChartTip fmt={fmt$} />} />
        <Area type="monotone" dataKey="budget" name="Budget" stroke={C.blue}   strokeWidth={1.5} fill="url(#gBudget)" strokeDasharray="5 3" />
        <Area type="monotone" dataKey="actual" name="Actual" stroke={C.accent} strokeWidth={2}   fill="url(#gActual)" connectNulls={false} />
      </AreaChart>
    </ResponsiveContainer>
    {/* Variance callout */}
    <div style={{ display: "flex", gap: 16, marginTop: 10, borderTop: `1px solid ${C.faint}`, paddingTop: 10 }}>
      {data.filter(d => d.actual != null).map((d, i) => {
        const v = parseFloat(variance(d.budget, d.actual));
        return (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 8, color: C.muted, fontFamily: C.mono, letterSpacing: "0.08em" }}>{d.m}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: v > 0 ? C.red : C.green, fontFamily: C.mono }}>
              {v > 0 ? "+" : ""}{v}%
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ── Labor Hours Chart ─────────────────────────────────────────────────────────
const LaborChart = ({ data }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "18px 20px" }}>
    <SectionLabel>Labor Hours — Budget vs Actual by Project</SectionLabel>
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barGap={2} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 9, fontFamily: C.mono }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v => `${v}h`} tick={{ fill: C.muted, fontSize: 9, fontFamily: C.mono }} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<ChartTip fmt={fmtHr} />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="shopBudget"  name="Shop Budget"  fill="rgba(77,200,232,0.25)" radius={[3,3,0,0]} />
        <Bar dataKey="shopActual"  name="Shop Actual"  fill={C.blue}   radius={[3,3,0,0]} />
        <Bar dataKey="fieldBudget" name="Field Budget" fill="rgba(255,90,31,0.25)" radius={[3,3,0,0]} />
        <Bar dataKey="fieldActual" name="Field Actual" fill={C.accent} radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
    <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
      {[
        { color: C.blue,               label: "Shop Actual"  },
        { color: "rgba(77,200,232,0.4)",label: "Shop Budget"  },
        { color: C.accent,             label: "Field Actual" },
        { color: "rgba(255,90,31,0.4)", label: "Field Budget" },
      ].map(({ color, label }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
          <span style={{ fontSize: 9, color: C.muted, fontFamily: C.mono }}>{label}</span>
        </div>
      ))}
    </div>
  </div>
);

// ── Project Health Card ───────────────────────────────────────────────────────
const ProjectCard = ({ p, selected, onSelect }) => {
  const hm = healthMeta[p.health] || healthMeta["ON TRACK"];
  const sm = scheduleMeta[p.schedule] || scheduleMeta["ON TRACK"];
  const spendPct = pct(p.actualSpend, p.budgetSpend);
  const laborPct = pct(p.laborActual, p.laborBudget);
  const totalRFIs = Object.values(p.openRFIs).reduce((a, b) => a + b, 0);
  const overBudget = p.actualSpend > p.budgetSpend;

  return (
    <div
      onClick={() => onSelect(p.id === selected ? null : p.id)}
      style={{
        background: selected ? "rgba(255,90,31,0.08)" : C.card,
        border: `1px solid ${selected ? "rgba(255,90,31,0.4)" : C.border}`,
        borderRadius: 10, padding: "16px 18px", cursor: "pointer",
        transition: "all 0.15s", position: "relative", overflow: "hidden",
      }}
      onMouseEnter={e => !selected && (e.currentTarget.style.border = `1px solid rgba(255,140,66,0.25)`)}
      onMouseLeave={e => !selected && (e.currentTarget.style.border = `1px solid ${C.border}`)}
    >
      {/* Health stripe */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: hm.color, opacity: 0.8 }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: C.display, letterSpacing: "0.02em", marginBottom: 2 }}>{p.name}</div>
          <div style={{ fontSize: 9, color: C.muted, fontFamily: C.mono }}>{p.pm} · {p.phase}</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 3, color: hm.color, background: hm.bg, fontFamily: C.mono, letterSpacing: "0.1em" }}>{p.health}</span>
        </div>
      </div>

      {/* Completion bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 8, color: C.muted, fontFamily: C.mono, letterSpacing: "0.1em" }}>COMPLETION</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.text, fontFamily: C.mono }}>{p.percentComplete}%</span>
        </div>
        <div style={{ height: 4, background: C.faint, borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            width: `${p.percentComplete}%`, height: "100%", borderRadius: 2,
            background: `linear-gradient(90deg, ${C.accent}, ${C.accent2})`,
          }} />
        </div>
      </div>

      {/* Metric row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {/* Budget */}
        <div>
          <div style={{ fontSize: 8, color: C.muted, fontFamily: C.mono, letterSpacing: "0.1em", marginBottom: 3 }}>SPEND</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: overBudget ? C.red : C.green, fontFamily: C.display }}>{fmt$(p.actualSpend)}</div>
          <div style={{ fontSize: 8, color: C.muted, fontFamily: C.mono }}>of {fmt$(p.budgetSpend)}</div>
        </div>
        {/* Labor */}
        <div>
          <div style={{ fontSize: 8, color: C.muted, fontFamily: C.mono, letterSpacing: "0.1em", marginBottom: 3 }}>LABOR</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.blue, fontFamily: C.display }}>{fmtHr(p.laborActual)}</div>
          <div style={{ fontSize: 8, color: C.muted, fontFamily: C.mono }}>of {fmtHr(p.laborBudget)}</div>
        </div>
        {/* RFIs + Schedule */}
        <div>
          <div style={{ fontSize: 8, color: C.muted, fontFamily: C.mono, letterSpacing: "0.1em", marginBottom: 3 }}>RFIs / SCHED</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: totalRFIs > 1 ? C.yellow : C.green, fontFamily: C.display }}>{totalRFIs} open</div>
          <div style={{ fontSize: 9, color: sm.color, fontFamily: C.mono, fontWeight: 700 }}>
            {sm.symbol} {p.scheduleVariance > 0 ? "+" : ""}{p.scheduleVariance}d
          </div>
        </div>
      </div>

      {/* Sparkline */}
      <div style={{ marginTop: 8, opacity: 0.7 }}>
        <Spark data={p.laborTrend} color={C.accent2} height={24} width="100%" />
      </div>
    </div>
  );
};

// ── Project Detail Drawer ─────────────────────────────────────────────────────
const ProjectDetail = ({ p }) => {
  if (!p) return null;
  const totalRFIs = Object.values(p.openRFIs).reduce((a, b) => a + b, 0);

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "20px", marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 9, color: C.accent, fontFamily: C.mono, letterSpacing: "0.14em", marginBottom: 3 }}>PROJECT DRILL-DOWN</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text, fontFamily: C.display }}>{p.name}</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Ring pct={p.percentComplete} color={C.accent} size={56} stroke={5} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.accent, fontFamily: C.display }}>{p.percentComplete}%</div>
            <div style={{ fontSize: 8, color: C.muted, fontFamily: C.mono }}>COMPLETE</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Cashflow chart */}
        <div>
          <div style={{ fontSize: 9, color: C.muted, fontFamily: C.mono, letterSpacing: "0.12em", marginBottom: 8 }}>CASHFLOW — BUDGET VS ACTUAL</div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={p.cashflow}>
              <defs>
                <linearGradient id={`ga${p.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.accent} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={C.accent} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="m" tick={{ fill: C.muted, fontSize: 8, fontFamily: C.mono }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}K`} tick={{ fill: C.muted, fontSize: 8, fontFamily: C.mono }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<ChartTip fmt={fmt$} />} />
              <Area type="monotone" dataKey="budget" name="Budget" stroke={C.blue}   strokeWidth={1.5} fill="none" strokeDasharray="4 2" />
              <Area type="monotone" dataKey="actual" name="Actual" stroke={C.accent} strokeWidth={2}   fill={`url(#ga${p.id})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Key metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Contract Value",   val: fmt$(p.contractValue),   color: C.text    },
            { label: "Actual Spend",     val: fmt$(p.actualSpend),     color: p.actualSpend > p.budgetSpend ? C.red : C.green },
            { label: "Labor Actual",     val: fmtHr(p.laborActual),    color: C.blue    },
            { label: "Labor Forecast",   val: fmtHr(p.laborForecast),  color: p.laborForecast > p.laborBudget ? C.yellow : C.green },
            { label: "Change Orders",    val: `${p.changeOrders} (+${fmt$(p.coValue)})`, color: C.yellow },
            { label: "Open RFIs",        val: `${totalRFIs} open`,     color: totalRFIs > 1 ? C.yellow : C.green },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.025)", borderRadius: 7, padding: "10px 12px" }}>
              <div style={{ fontSize: 8, color: C.muted, fontFamily: C.mono, letterSpacing: "0.1em", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: C.mono }}>{val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function ExecutiveOverview() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [lastUpdated] = useState(new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }));

  const totals = useMemo(() => ({
    contractValue: PROJECTS.reduce((s, p) => s + p.contractValue, 0),
    budgetSpend:   PROJECTS.reduce((s, p) => s + p.budgetSpend, 0),
    actualSpend:   PROJECTS.reduce((s, p) => s + p.actualSpend, 0),
    laborBudget:   PROJECTS.reduce((s, p) => s + p.laborBudget, 0),
    laborActual:   PROJECTS.reduce((s, p) => s + p.laborActual, 0),
    laborForecast: PROJECTS.reduce((s, p) => s + p.laborForecast, 0),
    openRFIs:      PROJECTS.reduce((s, p) => s + Object.values(p.openRFIs).reduce((a, b) => a + b, 0), 0),
    criticalRFIs:  PROJECTS.reduce((s, p) => s + p.openRFIs.CRITICAL, 0),
    changeOrders:  PROJECTS.reduce((s, p) => s + p.changeOrders, 0),
    coValue:       PROJECTS.reduce((s, p) => s + p.coValue, 0),
  }), []);

  const detailProject = useMemo(() => PROJECTS.find(p => p.id === selectedProject), [selectedProject]);
  const portfolioSpendPct = pct(totals.actualSpend, totals.budgetSpend);
  const laborPct = pct(totals.laborActual, totals.laborBudget);
  const overallSpendVariance = parseFloat(variance(totals.budgetSpend, totals.actualSpend));

  return (
    <>
      <FL />
      <div style={{
        minHeight: "100vh", background: C.bg,
        backgroundImage: `
          radial-gradient(ellipse at 15% 0%, rgba(255,90,31,0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 85% 100%, rgba(77,200,232,0.05) 0%, transparent 50%)
        `,
        fontFamily: C.mono, color: C.text, padding: "22px 24px",
      }}>

        {/* ── Top Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 9, color: C.accent, letterSpacing: "0.22em", fontWeight: 700, marginBottom: 4, fontFamily: C.mono }}>
              STEELBUILD PRO · PORTFOLIO INTELLIGENCE
            </div>
            <h1 style={{ fontFamily: C.display, fontSize: 38, fontWeight: 900, margin: 0, letterSpacing: "0.01em", lineHeight: 1 }}>
              EXECUTIVE OVERVIEW
            </h1>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
              {PROJECTS.length} Active Projects · As of {lastUpdated}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {PROJECTS.map(p => {
              const hm = healthMeta[p.health] || healthMeta["ON TRACK"];
              return (
                <div key={p.id} style={{
                  padding: "5px 10px", borderRadius: 5, fontSize: 9, fontWeight: 700,
                  color: hm.color, background: hm.bg,
                  border: `1px solid ${hm.color}44`, fontFamily: C.mono, letterSpacing: "0.06em",
                }}>
                  {p.name.split(" ")[0].toUpperCase()} · {p.health}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 20 }}>
          <StatCard
            label="Portfolio Value"
            value={fmt$(totals.contractValue)}
            sub={`${PROJECTS.length} active projects`}
            color={C.text}
            style={{ gridColumn: "span 1" }}
          />
          <StatCard
            label="Total Spend vs Budget"
            value={fmt$(totals.actualSpend)}
            sub={`Budget: ${fmt$(totals.budgetSpend)}`}
            color={overallSpendVariance > 3 ? C.red : overallSpendVariance > 0 ? C.yellow : C.green}
            trend={overallSpendVariance}
            style={{ gridColumn: "span 1" }}
          />
          <StatCard
            label="Portfolio Completion"
            value={`${Math.round(PROJECTS.reduce((s, p) => s + p.percentComplete, 0) / PROJECTS.length)}%`}
            sub="Weighted avg across projects"
            color={C.accent}
            spark={[22, 31, 38, 44, 51, 58, 62, 67, 72]}
            style={{ gridColumn: "span 1" }}
          />
          <StatCard
            label="Labor Hours Burned"
            value={fmtHr(totals.laborActual)}
            sub={`Budget: ${fmtHr(totals.laborBudget)} · Fcast: ${fmtHr(totals.laborForecast)}`}
            color={totals.laborForecast > totals.laborBudget ? C.yellow : C.blue}
            spark={[120, 180, 240, 290, 320, 340, 310]}
            style={{ gridColumn: "span 1" }}
          />
          <StatCard
            label="Open RFIs"
            value={totals.openRFIs}
            sub={`${totals.criticalRFIs} critical · Action required`}
            color={totals.criticalRFIs > 0 ? C.red : C.yellow}
            style={{ gridColumn: "span 1" }}
          />
          <StatCard
            label="Change Orders"
            value={totals.changeOrders}
            sub={`+${fmt$(totals.coValue)} added scope`}
            color={C.yellow}
            style={{ gridColumn: "span 1" }}
          />
        </div>

        {/* ── Main Charts Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
          <div style={{ gridColumn: "span 2" }}>
            <BudgetVsActual data={MONTHLY_PORTFOLIO} />
          </div>
          <div>
            <RFISeverityChart projects={PROJECTS} />
          </div>
        </div>

        {/* ── Labor + Project Health ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
          <LaborChart data={LABOR_BY_PROJECT} />

          {/* Labor forecast summary */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "18px 20px" }}>
            <SectionLabel>Labor Hours — Forecast vs Budget</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {PROJECTS.map(p => {
                const forecastOver = p.laborForecast > p.laborBudget;
                const pctUsed = pct(p.laborActual, p.laborBudget);
                const pctFcast = pct(p.laborForecast, p.laborBudget);
                return (
                  <div key={p.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "baseline" }}>
                      <div style={{ fontSize: 10, color: C.text, fontFamily: C.mono }}>{p.name.split(" ").slice(0,3).join(" ")}</div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <span style={{ fontSize: 9, color: C.blue, fontFamily: C.mono }}>{fmtHr(p.laborActual)} actual</span>
                        <span style={{ fontSize: 9, color: forecastOver ? C.yellow : C.green, fontFamily: C.mono, fontWeight: 700 }}>
                          {fmtHr(p.laborForecast)} fcast
                        </span>
                      </div>
                    </div>
                    {/* Stacked bar: actual / forecast / budget */}
                    <div style={{ height: 8, background: C.faint, borderRadius: 4, overflow: "hidden", position: "relative" }}>
                      <div style={{ position: "absolute", left: 0, width: `${Math.min(pctFcast, 100)}%`, height: "100%", background: forecastOver ? `rgba(255,176,32,0.3)` : `rgba(77,200,232,0.25)`, borderRadius: 4 }} />
                      <div style={{ position: "absolute", left: 0, width: `${Math.min(pctUsed, 100)}%`, height: "100%", background: C.blue, borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 8, color: C.muted, fontFamily: C.mono, marginTop: 3 }}>
                      Budget: {fmtHr(p.laborBudget)} · {forecastOver ? `⚠ ${fmtHr(p.laborForecast - p.laborBudget)} over forecast` : `✓ Within budget`}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total labor gauge */}
            <div style={{ marginTop: 14, padding: "12px 0 0", borderTop: `1px solid ${C.faint}`, display: "flex", alignItems: "center", gap: 16 }}>
              <Ring pct={laborPct} color={totals.laborForecast > totals.laborBudget ? C.yellow : C.blue} size={48} stroke={5} />
              <div>
                <div style={{ fontSize: 8, color: C.muted, fontFamily: C.mono, letterSpacing: "0.1em" }}>PORTFOLIO LABOR BURN</div>
                <div style={{ fontSize: 18, fontWeight: 900, fontFamily: C.display, color: C.text }}>{laborPct}% <span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>of budget consumed</span></div>
                <div style={{ fontSize: 9, color: totals.laborForecast > totals.laborBudget ? C.yellow : C.green, fontFamily: C.mono, fontWeight: 700 }}>
                  Forecast: {fmtHr(totals.laborForecast)} ({pct(totals.laborForecast, totals.laborBudget)}% of budget)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Project Health Grid ── */}
        <div style={{ marginBottom: selectedProject ? 0 : 24 }}>
          <SectionLabel>Project Health — Click to Drill Down</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {PROJECTS.map(p => (
              <ProjectCard key={p.id} p={p} selected={selectedProject === p.id} onSelect={setSelectedProject} />
            ))}
          </div>
        </div>

        {/* ── Drill-down ── */}
        {detailProject && <ProjectDetail p={detailProject} />}

        {/* ── Footer ── */}
        <div style={{ marginTop: 20, paddingTop: 14, borderTop: `1px solid ${C.faint}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", letterSpacing: "0.1em" }}>
            STEELBUILD PRO · EXECUTIVE OVERVIEW · {lastUpdated}
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {[
              { label: "BUDGET USED", val: `${portfolioSpendPct}%`, color: portfolioSpendPct > 95 ? C.red : C.text },
              { label: "LABOR BURN",  val: `${laborPct}%`,          color: laborPct > 90 ? C.yellow : C.text },
              { label: "OPEN RFIs",   val: totals.openRFIs,         color: totals.criticalRFIs > 0 ? C.red : C.text },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ textAlign: "right" }}>
                <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.1em" }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color, fontFamily: C.display }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}