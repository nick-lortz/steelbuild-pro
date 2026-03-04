markdown
# SteelBuild-Pro · Design System v1.0
**Theme: Industrial Dark** | Grid: 8px base | Font: Inter | Accent: #FF5A1F

## Summary

SteelBuild-Pro's visual language is built on a deep-well dark palette — frame surfaces at `#0B0D10` (replacing harsh `#000000`), layered panels at `#14181E` and `#1A1F27` (replacing flat `#6b7280`) — creating physical depth that mirrors the materiality of structural steel. The single brand accent (`#FF5A1F` → hover `#FF7A2F`) is used sparingly as a hot-metal orange, conveying urgency and action without overwhelming dense data views. Typography runs on Inter at 13px body with uppercase caption labels at 10px/700 weight to match engineering drawing annotation conventions. All interactive states use a 150–200ms `cubic-bezier(0.65,0,0.35,1)` easing — crisp, not bouncy — appropriate for a tool used by field-side PMs who need instant visual feedback. Component tokens enforce an 8px grid, 10px control radius, and WCAG AA contrast minimums throughout, ensuring the UI is legible in low-light field office conditions.

---

## Color Quick Reference

| Token | Hex | Usage |
|---|---|---|
| `surface/frame` | `#0B0D10` | App shell background |
| `surface/panel` | `#14181E` | Cards, dialogs |
| `surface/panel-alt` | `#1A1F27` | Nested rows, secondary panels |
| `brand/accent` | `#FF5A1F` | CTAs, active nav, focus rings |
| `brand/accent-hover` | `#FF7A2F` | Button hover state |
| `text/primary` | `rgba(255,255,255,0.92)` | Body text (16.5:1 contrast ✓) |
| `text/muted` | `rgba(255,255,255,0.50)` | Labels, placeholders (8:1 ✓) |
| `status/success` | `#4DD6A4` | On-time, approved, complete |
| `status/warning` | `#FFB15A` | At-risk, pending |
| `status/danger` | `#FF4D4D` | Blocked, overdue, critical |
| `status/info` | `#4DA3FF` | Submitted, in-review |

## Substitution Map (current → new)

| Current | Replaces With | Reason |
|---|---|---|
| `#000000` | `#0B0D10` | Pure black causes harsh glare; near-black reads softer on monitors |
| `#6b7280` | `#52596A` | Cooler blue-gray, better AA contrast on dark panels |
| `#374151` | `#1A1F27` | Deeper, more cohesive with panel system |

## Spacing Scale (8px grid)

```
4px · 8px · 12px · 16px · 20px · 24px · 32px · 40px · 48px · 64px · 80px · 96px
```

## Component Radius

| Component | Radius |
|---|---|
| Buttons (primary) | 10px |
| Buttons (pill/secondary) | 999px |
| Cards / Modals | 16px |
| App Frame | 20px |
| Inputs / Selects | 10px |
| Badges | 999px |
| Tooltips | 8px |

## Motion Timings

| Interaction | Duration | Easing |
|---|---|---|
| Button hover/focus | 150ms | `cubic-bezier(0.65,0,0.35,1)` |
| Button press | 80ms | `cubic-bezier(0.4,0,1,1)` |
| Dropdown open | 150ms | `cubic-bezier(0,0,0.2,1)` |
| Dropdown close | 120ms | `cubic-bezier(0.4,0,1,1)` |
| Modal open | 200ms | `cubic-bezier(0,0,0.2,1)` |
| Page transition | 180ms | `cubic-bezier(0.65,0,0.35,1)` |
| Table row hover | 120ms | linear |

## Page Layout

- **Max content width:** 1280px
- **Frame padding:** 16px (wraps entire app)
- **Mobile page padding:** 8px
- **Desktop page padding:** 16px
- **Nav height:** 48px (sticky)
- **Section gap default:** 16px

---
*See STYLE_GUIDE.json for all exact token values.*
