# SteelBuild-Pro — Design System v2
> Industrial Dark UI · React + Tailwind + shadcn/ui  
> All values derived from the live codebase (`globals.css`, `Layout.js`) and hardened for WCAG AA.

---

## Design Rationale
SteelBuild-Pro targets PMs and field supers who read dashboards in harsh light on tablets and job-site monitors. The system uses a near-black chrome frame (`#0B0D10`) with a warm orange accent (`#FF5A1F`) that reads clearly at distance, mirrors the heat/steel metaphor, and satisfies 7:1 contrast against dark panels. Every component is designed for density-first readability: compact paddings, tight caps-locked labels, and 8px-grid spacing ensure maximum data per viewport without feeling cramped. The `Inter` typeface provides optical clarity at 10–12px label sizes critical for KPI strips.

---

## 1 · Color Palette

### Core Tokens
| Token | Hex | Usage |
|---|---|---|
| `--frame-bg` | `#0B0D10` | App shell / frame |
| `--panel-bg` | `#14181E` | Cards, panels, modals |
| `--panel-bg-2` | `#1A1F27` | Nested panels, table rows |
| `--page-bg` | `#2B2F38` | Outer page margin |
| `--panel-border` | `rgba(255,255,255,0.06)` | All borders |
| `--text` | `rgba(255,255,255,0.92)` | Primary text |
| `--text-dim` | `rgba(255,255,255,0.70)` | Secondary text |
| `--text-mute` | `rgba(255,255,255,0.50)` | Labels, placeholders |
| `--accent` | `#FF5A1F` | CTA, active nav, brand |
| `--accent-2` | `#FF7A2F` | Hover accent |
| `--accent-glow` | `rgba(255,90,31,0.35)` | Button glow shadow |
| `--success` | `#4DD6A4` | Completed, approved |
| `--warning` | `#FFB15A` | Pending, hold |
| `--danger` | `#FF4D4D` | Blocked, failed, 404 |
| `--info` | `#4DA3FF` | Informational, RFI |

### Mapped Substitutions (from `#000000` / `#6b7280`)
| Old | New SBP Token | Hex |
|---|---|---|
| `#000000` (pure black bg) | `--frame-bg` | `#0B0D10` |
| `#6b7280` (neutral gray text) | `--text-mute` | `rgba(255,255,255,0.50)` |
| `#374151` (dark gray) | `--panel-bg-2` | `#1A1F27` |
| `#1f2937` (near-black bg) | `--panel-bg` | `#14181E` |
| `#9ca3af` (mid gray) | `--text-dim` | `rgba(255,255,255,0.70)` |

---

## 2 · Typography

**Font family:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

| Role | Size | Weight | Letter-spacing | Usage |
|---|---|---|---|---|
| `h1` | `1.5rem / 24px` | 800 | `-0.02em` | Page title |
| `h2` | `1.125rem / 18px` | 700 | `-0.01em` | Section header |
| `h3` | `0.875rem / 14px` | 700 | `0` | Card title, panel header |
| `h4` | `0.75rem / 12px` | 700 | `0.06em` | Sub-section header |
| `body` | `0.8125rem / 13px` | 400 | `0` | Default content text |
| `body-sm` | `0.75rem / 12px` | 400 | `0` | Table cells, form text |
| `caption` | `0.625rem / 10px` | 700 | `0.12em` | ALL-CAPS labels, badges |
| `mono` | `0.6875rem / 11px` | 400 | `0` | IDs, piece marks, codes |

---

## 3 · Spacing Scale (8px grid)

| Token | Value | Usage |
|---|---|---|
| `space-1` | `4px` | Micro gap (icon–label) |
| `space-2` | `8px` | Tight padding (badges, chips) |
| `space-3` | `12px` | Button padding horizontal |
| `space-4` | `16px` | Card padding, section gap |
| `space-5` | `20px` | Panel inner padding |
| `space-6` | `24px` | Section vertical rhythm |
| `space-8` | `32px` | Page section gap |
| `space-10` | `40px` | Large section separator |

### Container Widths
| Context | Max-width |
|---|---|
| Full-page layout | `100%` (fluid inside frame) |
| Content area | `1280px` |
| Form / modal | `560px` |
| Compact panel | `360px` |

### Recommended Component Paddings
| Component | Padding |
|---|---|
| Page body | `16px` desktop / `12px` mobile |
| Card | `16px 20px` |
| Table cell | `8px 12px` |
| Input | `7px 12px` |
| Button (sm) | `5px 12px` |
| Button (md) | `7px 16px` |
| Button (lg) | `10px 24px` |
| Modal | `20px 24px` |

---

## 4 · Component Tokens

### Buttons
| Variant | Background | Border | Color | Radius | Shadow |
|---|---|---|---|---|---|
| Primary | `linear-gradient(90deg,#FF5A1F,#FF7A2F)` | none | `#fff` | `8px` | `0 0 0 1px rgba(255,90,31,0.25), 0 8px 22px rgba(255,90,31,0.18)` |
| Secondary | `#1A1F27` | `1px solid rgba(255,255,255,0.08)` | `rgba(255,255,255,0.6)` | `999px` | none |
| Ghost | transparent | `1px solid rgba(255,255,255,0.07)` | `rgba(255,255,255,0.4)` | `8px` | none |
| Danger | `rgba(255,77,77,0.1)` | `1px solid rgba(255,77,77,0.25)` | `#FF4D4D` | `8px` | none |
| Success | `rgba(77,214,164,0.08)` | `1px solid rgba(77,214,164,0.2)` | `#4DD6A4` | `8px` | none |

**Hover:** `translateY(-1px)` + glow intensify `0.2s ease`  
**Active/Pressed:** `translateY(0)` + glow reduce  
**Disabled:** `opacity: 0.35`, `cursor: not-allowed`

### Cards / Panels
| Property | Value |
|---|---|
| Background | `#14181E` |
| Border | `1px solid rgba(255,255,255,0.06)` |
| Inner highlight | `inset 0 0 0 1px rgba(255,255,255,0.04)` |
| Border radius | `16px` (card) / `20px` (frame) |
| Shadow | `0 8px 24px rgba(0,0,0,0.45)` |
| Hover | `border-color: rgba(255,255,255,0.1)` |

### Inputs
| Property | Value |
|---|---|
| Background | `#14181E` |
| Border | `1px solid rgba(255,255,255,0.08)` |
| Border radius | `10px` |
| Focus ring | `0 0 0 3px rgba(255,90,31,0.18)`, border `rgba(255,90,31,0.5)` |
| Placeholder color | `rgba(255,255,255,0.25)` |
| Text color | `rgba(255,255,255,0.88)` |

### Table Rows
| State | Background | Border-bottom |
|---|---|---|
| Default | transparent | `1px solid rgba(255,255,255,0.03)` |
| Hover | `rgba(255,255,255,0.025)` | — |
| Selected | `rgba(255,90,31,0.06)` | — |
| Error/404 | `rgba(255,77,77,0.04)` | `1px dashed rgba(255,77,77,0.2)` |

### Badges / Chips
| Radius | Padding | Font | Letter-spacing |
|---|---|---|---|
| `999px` | `3px 8px` | `0.6rem / 700` | `0.08em` |

---

## 5 · Micro-interactions

| Interaction | Duration | Easing | Notes |
|---|---|---|---|
| Button hover | `200ms` | `cubic-bezier(0.65,0,0.35,1)` | transform + glow |
| Button press | `100ms` | `ease-in` | snap down |
| Card hover | `200ms` | `ease` | border brighten only |
| Dropdown open | `150ms` | `ease-out` | opacity 0→1 + y +4px→0 |
| Dropdown close | `100ms` | `ease-in` | opacity 1→0 |
| Modal open | `200ms` | `cubic-bezier(0.34,1.56,0.64,1)` | scale 0.96→1 + fade |
| Modal close | `150ms` | `ease-in` | fade only |
| Page transition | `180ms` | `cubic-bezier(0.65,0,0.35,1)` | opacity + y 6px |
| Toast enter | `300ms` | `spring` | slide up from bottom |
| Focus ring | `150ms` | `ease` | `box-shadow` animate |
| Skeleton pulse | `1.5s` | `ease-in-out` | infinite `opacity` 0.4→0.7 |

---

## 6 · Elevation Scale (z-index)

| Layer | z-index | Usage |
|---|---|---|
| Base | 0 | Normal content |
| Sticky header | 100 | Table header |
| Sticky banner | 800 | ErrorBanner |
| Drawer | 1000 | Side panels |
| Modal | 9000 | Dialogs |
| Toast | 9500 | Notifications |
| Queue bar | 9000 | QueueStatusBar |

---

## 7 · Scrollbar

```css
::-webkit-scrollbar       { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,90,31,0.25); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,90,31,0.45); }
``