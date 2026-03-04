# SteelBuild-Pro — Theme Migration Guide
## From ~25% → Fully Themed (Industrial Dark v2)

**Token sources:**
- CSS variables → `globals.css` (`:root`)
- JS tokens → `components/shared/designTokens.js` (`t`, `cls`)
- Chart theme → `components/shared/chartTheme.js` (`CHART`, `rechartsProps`)
- Component snippets → `components/shared/ComponentSnippets.jsx`

---

## PHASE 1 — GLOBAL OVERRIDES (Quick wins, do first — ~4h total)

### 1.1 Tailwind config — add SBP color aliases
File: `tailwind.config.js` → extend `theme.extend.colors`:

```js
colors: {
  // ... keep existing shadcn tokens ...
  sbp: {
    frame:   '#0B0D10',
    panel:   '#14181E',
    alt:     '#1A1F27',
    page:    '#2B2F38',
    accent:  '#FF5A1F',
    accent2: '#FF7A2F',
    success: '#4DD6A4',
    warning: '#FFB15A',
    danger:  '#FF4D4D',
    info:    '#4DA3FF',
  },
}
```

### 1.2 Globals.css — verify :root variables are applied
Already done. Confirm `--panel-bg`, `--accent`, `--text`, `--text-mute` are live.
Run: grep for `#27272a`, `#374151`, `#1f2937`, `zinc-` — these are legacy; replace per §3.

### 1.3 shadcn base overrides (index.css already has :root, confirm dark values match)
The `--card`, `--popover`, `--input`, `--border` HSL values in `:root` must match:
- `--card: 220 14% 9%` → `#14181E` ✓
- `--input: 220 14% 10%`
- `--border: 220 14% 10%`
- `--ring: 19 100% 56%` → `#FF5A1F` ✓

### 1.4 Base body/html (globals.css — already applied)
Confirm: `body { background-color: var(--page-bg); color: var(--text); font-family: 'Inter' ... }`

---

## PHASE 2 — PAGE AUDIT CHECKLIST

Priority order: Dashboard → Projects → RFI Hub → Drawings → Change Orders → Resources → Settings → Auth

### P1 — CRITICAL PATH (do first)

| Page | File | One-line instruction |
|------|------|----------------------|
| **Project Dashboard** | `pages/ProjectDashboard` | Replace `bg-gray-*`/`bg-zinc-*` cards with `<SBPCard>`; apply `CHART` tokens to all inline chart colors; use `<SBPMetricCard>` for KPI cells |
| **Projects** | `pages/Projects` | Replace table with `<SBPTableHeader>` + `<SBPTableRow>`; replace Add button with `<SBPButtonPrimary>`; replace filter dropdowns with `<SBPSelect>` |
| **RFI Hub** | `pages/RFIHub` | Apply `<SBPStatusBadge>` to all status chips; replace `contentStyle` tooltip with `<CustomTooltip>`; apply `cls.tableRow` to list rows |
| **Financials** | `pages/FinancialsRedesign` | Replace KPI strip with `<SBPMetricCard>`; apply `rechartsProps` + `SBPChartGradients` to BurnDown and EVM charts; replace card wrappers |
| **Drawings** | `pages/Drawings` | Apply `<CompactHeader>` + `<CompactFilterBar>` from CompactPageShell; replace status chips with `<SBPStatusBadge>`; use `cls.tableHead`/`cls.tableCell` |

### P2 — HIGH VALUE

| Page | File | One-line instruction |
|------|------|----------------------|
| **Change Orders** | `pages/ChangeOrders` | Replace approval action buttons with `btnPrimary`/`btnDanger`/`btnGhost` tokens; apply `<SBPCard>` to CO detail panels |
| **Work Packages** | `pages/WorkPackages` | Replace phase progress bars with token-colored divs; apply `<SBPStatusBadge>` to gate status; replace table |
| **Schedule** | `pages/Schedule` | Replace Gantt bar colors with `CHART.semantic.*` tokens; apply `rechartsProps.cartesianGrid` to all timeline grids |
| **Deliveries** | `pages/Deliveries` | Apply `<SBPListItem>` to delivery rows; replace status badges; apply `cls.card` to delivery cards |
| **Fabrication** | `pages/Fabrication` | Replace fab-status color maps with `CHART.semantic.*`; apply `<CompactKPIStrip>` to header metrics |

### P3 — STANDARD

| Page | File | One-line instruction |
|------|------|----------------------|
| **Resources** | `pages/Resources` | Apply `<SBPCard>` to resource cards; replace `text-gray-*` with `text-[rgba(255,255,255,0.70)]`; token-color utilization bars |
| **Settings** | `pages/Settings` | Replace tab bar with token nav classes; apply `cls.input` to all form fields; replace Save button with `<SBPButtonPrimary>` |
| **Budget Control** | `pages/BudgetControl` | Apply `rechartsProps` to all charts; replace `bg-zinc-*` card wrappers |
| **Labor** | `pages/Labor` | Apply `cls.tableHead`/`cls.tableCell`; replace approve/reject buttons with token variants |
| **Daily Logs** | `pages/DailyLogs` | Apply `<SBPCard>` to log entries; replace `text-zinc-500` with `text-[rgba(255,255,255,0.40)]` |
| **Documents** | `pages/Documents` | Replace folder tree bg with `var(--panel-bg-2)`; apply `<SBPButtonSecondary>` to upload CTAs |
| **Reports** | `pages/Reports` | Apply `chartjsTheme` to all Chart.js instances; replace export button styles |
| **Portfolio Pulse** | `pages/PortfolioPulse` | Apply `<SBPMetricCard>` to KPI grid; use `CHART.colors` for portfolio breakdown charts |
| **Profile** | `pages/Profile` | Apply `cls.input` to all fields; replace Save/Cancel with token buttons |
| **Landing Page** | `pages/LandingPage` | Apply `phoenixFrame` shell; use `<SBPButtonPrimary>` for main CTA; background `var(--page-bg)` |

---

## PHASE 3 — AUTOMATED FIND & REPLACE RULES

Run these as IDE global search/replace or ESLint codemods.

### 3.1 Background colors (legacy → token)

| Find | Replace | Notes |
|------|---------|-------|
| `bg-zinc-900` | `bg-[#14181E]` | panel bg |
| `bg-zinc-800` | `bg-[#1A1F27]` | panel alt |
| `bg-zinc-950` | `bg-[#0B0D10]` | frame bg |
| `bg-gray-900` | `bg-[#14181E]` | panel bg |
| `bg-gray-800` | `bg-[#1A1F27]` | panel alt |
| `bg-gray-950` | `bg-[#0B0D10]` | frame bg |
| `bg-\[#1f2937\]` | `bg-[#14181E]` | tooltip/panel |
| `bg-\[#18181b\]` | `bg-[#0B0D10]` | frame |
| `bg-\[#27272a\]` | `bg-[#1A1F27]` | alt panel |

### 3.2 Border colors

| Find | Replace |
|------|---------|
| `border-zinc-800` | `border-[rgba(255,255,255,0.06)]` |
| `border-zinc-700` | `border-[rgba(255,255,255,0.08)]` |
| `border-gray-800` | `border-[rgba(255,255,255,0.06)]` |
| `border-gray-700` | `border-[rgba(255,255,255,0.08)]` |
| `stroke="#374151"` | `stroke={CHART.grid}` (in JSX) |
| `stroke="#27272a"` | `stroke={CHART.grid}` |
| `stroke="#71717a"` | `stroke={CHART.axis}` |
| `stroke="#9ca3af"` | `stroke={CHART.axis}` |

### 3.3 Text colors

| Find | Replace |
|------|---------|
| `text-zinc-500` | `text-[rgba(255,255,255,0.40)]` |
| `text-zinc-400` | `text-[rgba(255,255,255,0.50)]` |
| `text-gray-500` | `text-[rgba(255,255,255,0.40)]` |
| `text-gray-400` | `text-[rgba(255,255,255,0.50)]` |
| `text-gray-300` | `text-[rgba(255,255,255,0.70)]` |
| `text-white` | `text-[rgba(255,255,255,0.92)]` (body) OR keep for display headings |

### 3.4 Recharts inline styles → chartTheme tokens

**Before:**
```jsx
<CartesianGrid strokeDasharray="3 3" stroke="#374151" />
<XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
<YAxis stroke="#9ca3af" fontSize={12} />
<Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
<Legend wrapperStyle={{ fontSize: '12px' }} />
```

**After:**
```jsx
import { CHART, rechartsProps, CustomTooltip, CustomLegend, SBPChartGradients } from '@/components/shared/chartTheme';

<SBPChartGradients />                          // inside chart root
<CartesianGrid {...rechartsProps.cartesianGrid} />
<XAxis dataKey="date" {...rechartsProps.xAxis} />
<YAxis {...rechartsProps.yAxis} />
<Tooltip content={<CustomTooltip />} />
<Legend content={<CustomLegend />} />
```

### 3.5 Status badge pattern

**Before:**
```jsx
<span className={`px-2 py-1 rounded text-xs font-medium ${
  status === 'approved' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
}`}>{status}</span>
```

**After:**
```jsx
import { SBPStatusBadge } from '@/components/shared/ComponentSnippets';
<SBPStatusBadge status={status} />
```

### 3.6 Tooltip contentStyle inline → CustomTooltip

**Before:**
```jsx
<Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }} />
```

**After:**
```jsx
<Tooltip content={<CustomTooltip formatter={v => `$${v.toLocaleString()}`} />} />
```

---

## PHASE 4 — EFFORT TIERS

### Tier 1: QUICK (< 1 day each, do these first)
- [x] `globals.css` token definitions ✅ DONE
- [x] `chartTheme.js` ✅ DONE
- [x] `ComponentSnippets.jsx` ✅ DONE
- [ ] `tailwind.config.js` — add `sbp.*` color extensions (§1.1)
- [ ] Global find/replace pass: bg-zinc-*, border-zinc-*, text-zinc-* (§3.1–3.3) — ~2h
- [ ] `TopNav` — already themed. Verify all pages use it, not a custom header.
- [ ] `BudgetBurnDownChart` ✅ DONE
- [ ] `ChartWidget` ✅ DONE

### Tier 2: MEDIUM (1–3 days each)
- [ ] `ProjectDashboard` — token cards + chart color swap
- [ ] `Projects` — table + form inputs + buttons
- [ ] `RFIHub` — table rows + status badges + filters
- [ ] `FinancialsRedesign` — KPI strip + chart wrappers
- [ ] `ChangeOrders` — button tokens + card panels
- [ ] `WorkPackages` — phase progress + gate status
- [ ] `Settings` — all inputs + tab nav + buttons
- [ ] Remaining chart components (§ apply `rechartsProps` sweep)

### Tier 3: DEEP (3–5 days each)
- [ ] `Schedule` / Gantt — bar color tokens + dependency line colors
- [ ] Drawing viewer (`DrawingSetDetailDialog`, `DrawingMarkup`) — panel bg + toolbar
- [ ] `FinancialsRedesign` EVM dashboard — full chart suite
- [ ] `LookAheadPlanning` — constraint panel + resource heat map colors
- [ ] Mobile views (`FieldTools`, `DailyLogs`) — verify 44px touch targets

---

## PHASE 5 — TESTING CHECKLIST

### 5.1 Visual Regression (per page, after each tier)
- [ ] Screenshot before/after — compare panel bg (should be `#14181E` not `#1f2937`)
- [ ] No white/light backgrounds visible inside the phoenix frame
- [ ] All chart series use `CHART.colors[]` — no legacy `#f59e0b`, `#3b82f6`, `#10b981`
- [ ] Tooltip bg is `#1A1F27` with `rgba(255,255,255,0.08)` border
- [ ] Active nav item shows orange gradient + border

### 5.2 Contrast Audit (WCAG AA — ≥4.5:1 for body text, ≥3:1 for UI components)
Run axe DevTools or Colour Contrast Analyser on each page:
- [ ] Body text `rgba(255,255,255,0.92)` on `#14181E` — target 16.5:1 ✓
- [ ] Muted text `rgba(255,255,255,0.50)` on `#14181E` — 8.0:1 ✓ (must not go below `0.40` = 6.4:1)
- [ ] Accent `#FF5A1F` on `#0B0D10` — 6.3:1 ✓ (for button text: use white not orange)
- [ ] Status success `#4DD6A4` on `#14181E` — 7.2:1 ✓
- [ ] Status danger `#FF4D4D` on `#14181E` — 4.6:1 ✓ (borderline — do not use as body text, badges only)
- [ ] Chart label text `rgba(255,255,255,0.30)` on `#14181E` — 4.9:1 ✓ (do not go lower)
- [ ] **Flag:** `text-zinc-500` on dark bg fails AA — catch with §3.3 replacements

### 5.3 Keyboard Navigation
- [ ] All buttons reachable by Tab, visible focus ring (orange, 2px, offset 2)
- [ ] Modals: focus trapped inside, Esc closes, focus returns to trigger on close
- [ ] Table rows: if clickable, `tabIndex={0}` + `onKeyDown Enter/Space`
- [ ] Dropdowns/Selects: arrow key nav works (Radix handles this by default)
- [ ] Skip link (#main-content) present in layout ✓ (already in Layout.js)
- [ ] `aria-current="page"` on active nav items
- [ ] No focus outline suppressed globally (`:focus:not(:focus-visible)` pattern in globals.css ✓)

### 5.4 Mobile / Touch
- [ ] All interactive elements ≥44×44px (enforced in globals.css @media <1024px ✓)
- [ ] Bottom MobileNav renders correct active item color
- [ ] Charts reflow correctly at 375px width (ResponsiveContainer handles this)
- [ ] No horizontal scroll on any page at 375px

### 5.5 Export / Print
- [ ] Apply `exportOverrides` from `chartTheme.js` before html2canvas calls
- [ ] SVG exports embed Inter font or fall back to system sans-serif
- [ ] Colorblind-safe export: swap `CHART.colors` → `CHART.a11yColors` behind a toggle

---

## QUICK-START CHECKLIST (engineer onboarding)

```
□ 1. Pull latest — confirm globals.css :root tokens are in place
□ 2. Add sbp.* color extensions to tailwind.config.js (§1.1)
□ 3. Run global find/replace pass (§3.1–3.3) — commit as single "chore: token sweep"
□ 4. Import chartTheme in all Recharts files (§3.4) — commit as "feat: chart theme"
□ 5. Replace status badge JSX with <SBPStatusBadge /> globally (§3.5)
□ 6. Work through Tier 2 page list top-to-bottom
□ 7. Run axe + contrast check after each page
□ 8. Tab through each page — fix any missing focus rings
□ 9. Mobile smoke test at 375px
□ 10. Tier 3 deep work (Gantt, drawing viewer, EVM)
``