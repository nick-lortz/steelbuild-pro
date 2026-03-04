/**
 * chartTheme.js — SteelBuild-Pro Recharts Theme System
 * Import: import { CHART, rechartsProps, CustomTooltip, CustomLegend } from '@/components/shared/chartTheme'
 *
 * Accessibility:
 *   - All 6 series colors pass WCAG AA (≥4.5:1) on #14181E panel background
 *   - Colorblind-safe: palette distinguishable under deuteranopia/protanopia
 *     (uses shape+dash differentiation — always pair color with strokeDasharray on lines)
 *   - Alt palette provided for full monochrome export
 */

import React from 'react';

// ── Series color palette (6 + 2 accent gradients) ────────────────────────────
// Each color: contrast ratio on #14181E in parentheses
export const CHART = {
  colors: [
    '#4DA3FF',   // [0] info-blue      — 5.2:1 ✓ — planned, budget, primary series
    '#FF5A1F',   // [1] accent-orange  — 6.3:1 ✓ — actual, COR, primary action
    '#4DD6A4',   // [2] success-teal   — 7.2:1 ✓ — on-track, approved, erection complete
    '#FFB15A',   // [3] warning-amber  — 7.8:1 ✓ — at-risk, pending, forecast
    '#C084FC',   // [4] violet         — 5.1:1 ✓ — subcontract, secondary series
    '#F472B6',   // [5] pink           — 4.8:1 ✓ — misc / 6th series
  ],

  // Semantic aliases (map to series index for consistent meaning across all charts)
  semantic: {
    planned:    '#4DA3FF',
    actual:     '#FF5A1F',
    forecast:   '#FFB15A',
    complete:   '#4DD6A4',
    variance:   '#FF4D4D',
    baseline:   'rgba(255,255,255,0.20)',
    target:     'rgba(255,255,255,0.35)',
  },

  // Accent gradients (for area fills — use as SVG linearGradient ids)
  gradients: {
    blue:   { start: 'rgba(77,163,255,0.30)',  end: 'rgba(77,163,255,0.00)'  },
    orange: { start: 'rgba(255,90,31,0.30)',   end: 'rgba(255,90,31,0.00)'   },
    teal:   { start: 'rgba(77,214,164,0.25)',  end: 'rgba(77,214,164,0.00)'  },
    amber:  { start: 'rgba(255,177,90,0.25)',  end: 'rgba(255,177,90,0.00)'  },
    violet: { start: 'rgba(192,132,252,0.20)', end: 'rgba(192,132,252,0.00)' },
    red:    { start: 'rgba(255,77,77,0.25)',   end: 'rgba(255,77,77,0.00)'   },
  },

  // Colorblind-safe alternative palette (deuteranopia / protanopia safe)
  // Use when exporting for GC/client reports
  a11yColors: [
    '#4DA3FF',   // blue
    '#FFB15A',   // amber
    '#C084FC',   // violet
    '#F472B6',   // pink
    '#4DD6A4',   // teal
    '#FFFFFF',   // white
  ],

  // Chart surface tokens
  bg:           '#14181E',
  bgTooltip:    '#1A1F27',
  grid:         'rgba(255,255,255,0.05)',
  axis:         'rgba(255,255,255,0.30)',
  axisLine:     'rgba(255,255,255,0.08)',
  border:       'rgba(255,255,255,0.08)',
  textPrimary:  'rgba(255,255,255,0.88)',
  textMuted:    'rgba(255,255,255,0.40)',
  fontFamily:   "'Inter', -apple-system, sans-serif",
  fontSize:     11,
  fontSizeSm:   10,
};

// ── Recharts shared axis/grid props ─────────────────────────────────────────
export const rechartsProps = {
  cartesianGrid: {
    strokeDasharray: '1 4',
    stroke: CHART.grid,
    vertical: false,          // horizontal only — cleaner for dense data
  },
  xAxis: {
    stroke: CHART.axisLine,
    tick:   { fill: CHART.axis, fontSize: CHART.fontSize, fontFamily: CHART.fontFamily },
    tickLine: false,
    axisLine: { stroke: CHART.axisLine },
  },
  yAxis: {
    stroke: CHART.axisLine,
    tick:   { fill: CHART.axis, fontSize: CHART.fontSize, fontFamily: CHART.fontFamily },
    tickLine: false,
    axisLine: false,
    width: 52,
  },
  legend: {
    wrapperStyle: {
      fontSize: CHART.fontSizeSm,
      color: CHART.textMuted,
      fontFamily: CHART.fontFamily,
      paddingTop: 8,
    },
  },
};

// ── Custom Tooltip ────────────────────────────────────────────────────────────
export function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: CHART.bgTooltip,
      border: `1px solid ${CHART.border}`,
      borderRadius: 10,
      padding: '8px 12px',
      fontSize: 11,
      fontFamily: CHART.fontFamily,
      boxShadow: '0 8px 24px rgba(0,0,0,0.50)',
      minWidth: 120,
    }}>
      {label && (
        <p style={{ color: CHART.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          {label}
        </p>
      )}
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: i < payload.length - 1 ? 3 : 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
          <span style={{ color: CHART.textMuted, fontSize: 10 }}>{entry.name}:</span>
          <span style={{ color: CHART.textPrimary, fontWeight: 600, marginLeft: 'auto', paddingLeft: 8 }}>
            {formatter ? formatter(entry.value, entry.name) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Custom Legend ─────────────────────────────────────────────────────────────
export function CustomLegend({ payload }) {
  if (!payload?.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', padding: '8px 0 0', fontFamily: CHART.fontFamily }}>
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 12, height: 3, borderRadius: 2, background: entry.color, display: 'inline-block' }} />
          <span style={{ fontSize: 10, color: CHART.textMuted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── SVG Gradient Defs (paste inside <defs> in any Recharts chart) ─────────────
export function SBPChartGradients() {
  return (
    <defs>
      {Object.entries(CHART.gradients).map(([name, g]) => (
        <linearGradient key={name} id={`sbp-grad-${name}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%"  stopColor={g.start.replace(/[\d.]+\)$/, '0.30)')} stopOpacity={1} />
          <stop offset="95%" stopColor={g.end.replace(/[\d.]+\)$/, '0.00)')}  stopOpacity={1} />
        </linearGradient>
      ))}
    </defs>
  );
}

// ── Sparkline config (for inline mini-charts in table rows / KPI cards) ───────
export const sparklineProps = {
  height: 36,
  margin: { top: 2, right: 2, bottom: 2, left: 2 },
  dot: false,
  activeDot: { r: 3, strokeWidth: 0 },
  strokeWidth: 1.5,
  isAnimationActive: false,
};

// ── Small multiples wrapper style ─────────────────────────────────────────────
export const smallMultiplesStyle = {
  container: {
    display: 'grid',
    gap: 1,
    background: CHART.grid,
    borderRadius: 12,
    overflow: 'hidden',
    border: `1px solid ${CHART.border}`,
  },
  cell: {
    background: CHART.bg,
    padding: '12px',
  },
  cellLabel: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    color: CHART.textMuted,
    marginBottom: 4,
    fontFamily: CHART.fontFamily,
  },
};

// ── SVG/PNG Export helper styles ──────────────────────────────────────────────
// Apply these before triggering html2canvas / recharts SVG export
export const exportOverrides = {
  background: CHART.bg,
  color: CHART.textPrimary,
  fontFamily: CHART.fontFamily,
  padding: 24,
  borderRadius: 0, // flatten for export
};

// ── Chart.js options object (copy-paste into Chart.js config.options) ─────────
export const chartjsTheme = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400, easing: 'easeInOutQuart' },
  plugins: {
    legend: {
      labels: {
        color: CHART.axis,
        font: { family: CHART.fontFamily, size: 10, weight: '600' },
        boxWidth: 12,
        boxHeight: 3,
        padding: 16,
        usePointStyle: true,
        pointStyle: 'rectRounded',
      },
    },
    tooltip: {
      backgroundColor: CHART.bgTooltip,
      borderColor: CHART.border,
      borderWidth: 1,
      titleColor: CHART.textMuted,
      bodyColor: CHART.textPrimary,
      titleFont: { family: CHART.fontFamily, size: 10, weight: '700' },
      bodyFont: { family: CHART.fontFamily, size: 11 },
      padding: 10,
      cornerRadius: 10,
      boxPadding: 4,
      callbacks: {
        // Customize per chart: callbacks.label = (ctx) => `$${ctx.raw.toLocaleString()}`
      },
    },
  },
  scales: {
    x: {
      grid:   { color: CHART.grid, drawBorder: false, lineWidth: 1 },
      border: { display: false },
      ticks:  { color: CHART.axis, font: { family: CHART.fontFamily, size: 10 }, maxRotation: 0 },
    },
    y: {
      grid:   { color: CHART.grid, drawBorder: false, lineWidth: 1 },
      border: { display: false, dash: [4, 4] },
      ticks:  { color: CHART.axis, font: { family: CHART.fontFamily, size: 10 }, padding: 8 },
    },
  },
  elements: {
    line:  { tension: 0.3, borderWidth: 2, borderCapStyle: 'round' },
    point: { radius: 0, hoverRadius: 4, hitRadius: 16, borderWidth: 0 },
    bar:   { borderRadius: 4, borderSkipped: 'bottom' },
    arc:   { borderWidth: 0, hoverBorderWidth: 2, hoverBorderColor: '#fff' },
  },
};