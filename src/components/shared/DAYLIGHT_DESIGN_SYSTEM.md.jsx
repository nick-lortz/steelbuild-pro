# SteelBuild Pro — Daylight Mode Design System
**Enterprise UI/UX Overhaul Specification**  
*Version 1.0 — February 2026*

---

## Executive Summary

This document defines the complete daylight (light-mode) design system for SteelBuild Pro, optimized for:
- **Field visibility** in bright sunlight conditions
- **Enterprise professionalism** for office and executive use
- **Rapid decision-making** with clear information hierarchy
- **Mobile-first workflows** for on-site teams
- **WCAG 2.1 AA compliance** for accessibility

**Core Design Principles:**
1. **High Contrast** — All text meets minimum 7:1 contrast ratios for outdoor readability
2. **Visual Clarity** — Reduced visual noise, clear grouping, predictable patterns
3. **Action-Oriented** — Critical actions always visible and within 2 taps/clicks
4. **Status-First** — Project health, blockers, and deadlines immediately visible
5. **Mobile-Optimized** — Touch targets ≥44px, legible at arm's length in sunlight

---

## 1. COLOR SYSTEM

### Primary Palette (Daylight Mode)

**Foundation Colors**
```
Background Primary:   #FAFBFC (Cool white, reduces glare)
Background Secondary: #F4F6F8 (Soft gray for panels)
Background Elevated:  #FFFFFF (Pure white for cards)
Surface Border:       #DFE3E8 (Subtle separation)
```

**Text Hierarchy**
```
Text Primary:         #0F1419 (Near-black, 16:1 contrast)
Text Secondary:       #3D4752 (Dark gray, 10:1 contrast)
Text Tertiary:        #6B7684 (Medium gray, 7:1 contrast)
Text Disabled:        #9BA3AE (Light gray, 4.5:1 min)
```

**Brand & Accent Colors**
```
Primary (Amber):      #D97706 (Steel/construction orange)
Primary Hover:        #B45309
Primary Light:        #FEF3C7
Primary Dark:         #92400E

Secondary (Slate):    #475569
Secondary Hover:      #334155
Secondary Light:      #F1F5F9
```

**Status Colors (High Contrast)**
```
Success:              #047857 (Green, outdoor-visible)
Success Light:        #D1FAE5
Warning:              #D97706 (Amber, attention)
Warning Light:        #FEF3C7
Error:                #DC2626 (Red, stop-signal)
Error Light:          #FEE2E2
Info:                 #0369A1 (Blue, informational)
Info Light:           #DBEAFE
```

**Project Health Indicators**
```
On Track:             #047857
At Risk:              #EA580C (High-vis orange)
Critical:             #DC2626
Blocked:              #7C2D12 (Dark red)
Completed:            #6B7684
```

**Interactive States**
```
Hover Background:     #F4F6F8
Active Background:    #E5E8EB
Focus Ring:           #D97706 (2px solid, 2px offset)
Selected:             #FEF3C7
```

### Contrast Ratios (WCAG AA+)
- **Body Text (14px+):** Minimum 7:1 contrast
- **Headers (18px+):** Minimum 7:1 contrast
- **Interactive Elements:** Minimum 4.5:1 contrast
- **Touch Targets:** Minimum 44×44px (mobile)

---

## 2. TYPOGRAPHY SYSTEM

### Font Stack
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
```

**Why Inter:** Clean, legible at small sizes, excellent hinting for screens, professional enterprise aesthetic.

### Type Scale (Desktop)

```
Display Large:   32px / 40px line / 700 weight (Project headers)
Display Medium:  28px / 36px line / 700 weight (Section titles)
Heading 1:       24px / 32px line / 600 weight (Page titles)
Heading 2:       20px / 28px line / 600 weight (Card headers)
Heading 3:       18px / 26px line / 600 weight (Subsections)
Body Large:      16px / 24px line / 500 weight (Primary content)
Body:            14px / 22px line / 400 weight (Standard text)
Body Small:      13px / 20px line / 400 weight (Helper text)
Caption:         12px / 18px line / 500 weight (Labels, metadata)
```

### Type Scale (Mobile/Field)

```
Display Large:   28px / 36px line / 700 weight
Display Medium:  24px / 32px line / 700 weight
Heading 1:       22px / 30px line / 600 weight
Heading 2:       18px / 26px line / 600 weight
Body Large:      16px / 24px line / 500 weight (Minimum for sunlight)
Body:            15px / 23px line / 400 weight (Increased from desktop)
Caption:         13px / 20px line / 500 weight
```

**Field Optimization:** All text ≥15px on mobile for outdoor readability.

### Font Weight Usage
- **700 (Bold):** Display text, critical alerts
- **600 (Semibold):** Headings, primary actions
- **500 (Medium):** Labels, important data
- **400 (Regular):** Body text, descriptions

---

## 3. SPACING & LAYOUT SYSTEM

### Spacing Scale (8px base unit)
```
4px   (0.5 unit) — Tight inline spacing
8px   (1 unit)   — Component internal padding
12px  (1.5)      — Related element groups
16px  (2)        — Card padding, form spacing
24px  (3)        — Section spacing
32px  (4)        — Major section breaks
48px  (6)        — Page sections
64px  (8)        — Large page breaks
```

### Layout Grid
- **Desktop:** 12-column grid, 16px gutters, max-width 1440px
- **Tablet:** 8-column grid, 16px gutters
- **Mobile:** 4-column grid, 12px gutters

### Container Max-Widths
```
Narrow:     720px  (Forms, single-column content)
Standard:   1024px (Project details, reports)
Wide:       1280px (Dashboards, tables)
Full:       1440px (Analytics, Gantt charts)
```

### Breakpoints
```
Mobile:     320px - 767px
Tablet:     768px - 1023px
Desktop:    1024px - 1439px
Wide:       1440px+
```

---

## 4. COMPONENT LIBRARY

### 4.1 Buttons

**Primary Button (Call-to-Action)**
```css
Background:       #D97706
Text:             #FFFFFF (white)
Height:           40px (desktop) / 44px (mobile)
Padding:          12px 20px
Border Radius:    6px
Font:             14px / 600 weight
Icon + Text:      16px icon, 8px gap

Hover:            Background #B45309
Active:           Background #92400E
Disabled:         Background #E5E8EB, Text #9BA3AE
Focus:            2px solid #D97706, 2px offset
```

**Secondary Button**
```css
Background:       #F4F6F8
Text:             #0F1419
Border:           1px solid #DFE3E8
Height:           40px / 44px
Padding:          12px 20px
Border Radius:    6px

Hover:            Background #E5E8EB
Active:           Background #DFE3E8
```

**Destructive Button**
```css
Background:       #DC2626
Text:             #FFFFFF
(Same dimensions as primary)

Hover:            Background #B91C1C
```

**Ghost Button (Tertiary)**
```css
Background:       Transparent
Text:             #475569
Padding:          8px 12px

Hover:            Background #F4F6F8
```

**Button Sizes**
- **Large:** 48px height, 16px font (Mobile CTAs)
- **Default:** 40px height, 14px font
- **Small:** 32px height, 13px font (Inline actions)
- **Icon-only:** 40×40px (mobile: 44×44px)

### 4.2 Form Inputs

**Text Input**
```css
Height:           40px (44px mobile)
Padding:          10px 12px
Border:           1px solid #DFE3E8
Border Radius:    6px
Background:       #FFFFFF
Text:             14px / #0F1419

Hover:            Border #9BA3AE
Focus:            Border 2px solid #D97706, outline none
Error:            Border 2px solid #DC2626
Disabled:         Background #F4F6F8, Border #E5E8EB
```

**Select / Dropdown**
```css
Height:           40px (44px mobile)
Padding:          10px 12px (with 24px right for icon)
Icon:             ChevronDown, 16px, #6B7684
(Same styling as text input)
```

**Checkbox / Radio**
```css
Size:             20px (24px mobile)
Border:           2px solid #DFE3E8
Border Radius:    4px (checkbox) / 50% (radio)
Checked:          Background #D97706, white checkmark
Focus:            2px solid #D97706 ring, 2px offset
```

**Toggle Switch**
```css
Width:            44px
Height:           24px
Thumb:            20px circle
Off:              Background #DFE3E8
On:               Background #D97706
```

### 4.3 Cards

**Standard Card**
```css
Background:       #FFFFFF
Border:           1px solid #DFE3E8
Border Radius:    8px
Padding:          16px (mobile) / 20px (desktop)
Shadow:           0 1px 3px rgba(0,0,0,0.08)

Hover:            Shadow 0 4px 12px rgba(0,0,0,0.12)
Interactive:      Cursor pointer, transition 200ms
```

**Elevated Card (Dashboards)**
```css
Background:       #FFFFFF
Border:           None
Border Radius:    12px
Padding:          24px
Shadow:           0 2px 8px rgba(0,0,0,0.1)
```

**Card Header**
```css
Padding Bottom:   12px
Border Bottom:    1px solid #E5E8EB
Title:            18px / 600 / #0F1419
Action:           Ghost button (top-right)
```

### 4.4 Tables

**Table Container**
```css
Background:       #FFFFFF
Border:           1px solid #DFE3E8
Border Radius:    8px
Overflow:         Auto with custom scrollbar
```

**Table Header**
```css
Background:       #F4F6F8
Border Bottom:    2px solid #DFE3E8
Padding:          12px 16px
Text:             12px / 600 / #3D4752 / uppercase / letter-spacing 0.5px
Sortable:         Hover background #E5E8EB, cursor pointer
```

**Table Row**
```css
Border Bottom:    1px solid #E5E8EB
Padding:          12px 16px
Text:             14px / #0F1419

Hover:            Background #F4F6F8
Selected:         Background #FEF3C7
Clickable:        Cursor pointer
```

**Table Cell**
```css
Vertical Align:   Middle
Text Overflow:    Ellipsis for long content
Min Width:        80px (prevent cramping)
```

**Mobile Table (Transforms to Cards)**
- Stack rows as cards on <768px
- Show most critical 3-4 fields
- Expand for full details

### 4.5 Status Badges

**Badge Component**
```css
Height:           24px (28px mobile)
Padding:          4px 10px
Border Radius:    4px
Text:             12px / 600 / uppercase / letter-spacing 0.5px
Display:          Inline-flex, align-items center
Icon:             12px, 4px left margin
```

**Status Variants**
```
On Track:         Background #D1FAE5, Text #047857, Icon CheckCircle
At Risk:          Background #FED7AA, Text #EA580C, Icon AlertTriangle
Critical:         Background #FEE2E2, Text #DC2626, Icon AlertOctagon
Blocked:          Background #FEE2E2, Text #7C2D12, Icon XCircle
Completed:        Background #E5E8EB, Text #475569, Icon Check
Draft:            Background #F4F6F8, Text #6B7684, Icon Clock
```

### 4.6 Modals & Dialogs

**Modal Container**
```css
Background:       #FFFFFF
Border Radius:    12px
Max Width:        600px (desktop), 90vw (mobile)
Padding:          24px
Shadow:           0 20px 60px rgba(0,0,0,0.3)
Backdrop:         rgba(0,0,0,0.4) (blurred on supported browsers)
```

**Modal Header**
```css
Padding Bottom:   16px
Border Bottom:    1px solid #E5E8EB
Title:            20px / 600 / #0F1419
Close Button:     Top-right, 32×32px, Ghost style
```

**Modal Footer**
```css
Padding Top:      16px
Border Top:       1px solid #E5E8EB
Actions:          Right-aligned, 8px gap
Primary Action:   Right-most
```

### 4.7 Navigation

**Top Bar (Primary Navigation)**
```css
Height:           64px
Background:       #FFFFFF
Border Bottom:    1px solid #DFE3E8
Padding:          0 20px
Z-Index:          1000
Logo:             Left, 32px height
Primary Nav:      Center (desktop) / Hidden (mobile)
User Menu:        Right
```

**Sidebar (Secondary Navigation)**
```css
Width:            260px (desktop) / 100vw (mobile overlay)
Background:       #FAFBFC
Border Right:     1px solid #DFE3E8
Padding:          16px 12px
Z-Index:          999

Nav Item:         Padding 10px 12px, Border-radius 6px
Active:           Background #FEF3C7, Text #92400E, 3px left border #D97706
Hover:            Background #F4F6F8
```

**Mobile Bottom Nav**
```css
Height:           56px
Background:       #FFFFFF
Border Top:       1px solid #DFE3E8
Display:          Flex, justify-content space-around
Item:             Flex-direction column, align-items center
Icon:             20px, color #6B7684
Label:            11px, color #6B7684
Active:           Icon + Label #D97706
Touch Target:     44×44px minimum
```

### 4.8 Data Visualization

**KPI Card**
```css
Background:       #FFFFFF
Border:           1px solid #DFE3E8
Border Radius:    8px
Padding:          20px
Min Height:       120px

Value:            32px / 700 / #0F1419
Label:            13px / 500 / #6B7684
Change:           14px / 600, with TrendingUp/Down icon
```

**Progress Bar**
```css
Height:           8px (12px for critical indicators)
Background:       #E5E8EB
Border Radius:    4px
Fill:             #D97706 (or status color)
Text:             12px / 600, right-aligned above
```

**Chart Colors (Daylight Optimized)**
```
Primary:          #D97706
Secondary:        #0369A1
Tertiary:         #047857
Quaternary:       #7C2D12
Quinary:          #475569
Grid Lines:       #E5E8EB
Axis Text:        #6B7684
```

---

## 5. LAYOUT PATTERNS

### 5.1 Dashboard Layout

**Structure**
```
┌──────────────────────────────────────────────────┐
│ Top Bar (64px)                                   │
├────┬─────────────────────────────────────────────┤
│    │ Page Header (80px)                          │
│    │ - Title, Breadcrumbs, Primary Action        │
│ S  ├─────────────────────────────────────────────┤
│ I  │ KPI Grid (Auto-height)                      │
│ D  │ - 4 columns desktop, 2 mobile               │
│ E  ├─────────────────────────────────────────────┤
│ B  │ Filters & Search (56px)                     │
│ A  ├─────────────────────────────────────────────┤
│ R  │ Data Table / Card Grid                      │
│    │ (Scroll container)                          │
│    │                                             │
└────┴─────────────────────────────────────────────┘
```

**Desktop:** Fixed sidebar, scrollable main content  
**Mobile:** Bottom nav, collapsible filters

### 5.2 Detail Page Layout

**Structure**
```
┌──────────────────────────────────────────────────┐
│ Page Header                                      │
│ - Back button, Title, Status badge, Actions     │
├──────────────────┬───────────────────────────────┤
│ Main Content     │ Sidebar                       │
│ (70%)            │ (30%)                         │
│                  │                               │
│ - Details Tab    │ - Quick Actions               │
│ - Activity Tab   │ - Related Items               │
│ - Documents Tab  │ - Metadata                    │
│                  │ - Timeline                    │
└──────────────────┴───────────────────────────────┘
```

**Mobile:** Stacked, tabs at top, sidebar content in expandable cards

### 5.3 Form Layout

**Structure**
```
┌──────────────────────────────────────────────────┐
│ Form Header                                      │
│ - Title, Progress indicator (if multi-step)     │
├──────────────────────────────────────────────────┤
│ Form Body (Max-width 720px, centered)           │
│                                                  │
│ Section 1 (Card)                                 │
│ - Field 1 (full width)                          │
│ - Field 2 | Field 3 (50/50 split desktop)      │
│                                                  │
│ Section 2 (Card)                                 │
│ - Field 4                                       │
│                                                  │
├──────────────────────────────────────────────────┤
│ Form Footer (Sticky)                             │
│ - Cancel (left) | Save Draft | Submit (right)   │
└──────────────────────────────────────────────────┘
```

**Field Spacing:** 16px between fields, 24px between sections

---

## 6. ICONOGRAPHY

### Icon Library: Lucide React (Already Installed)

**Size Standards**
- **Small:** 16px (inline with text)
- **Medium:** 20px (buttons, tabs)
- **Large:** 24px (headers, cards)
- **Hero:** 32px (empty states)

**Stroke Width:** 2px (default), 2.5px for emphasis

**Color Usage**
- **Default:** #6B7684 (tertiary text)
- **Active:** #0F1419 (primary text)
- **Primary Action:** #D97706
- **Status:** Use status color palette

### Common Icons
```
Navigation:      ChevronRight, ChevronDown, Menu, X
Actions:         Plus, Edit, Trash2, Download, Upload
Status:          CheckCircle, AlertTriangle, AlertOctagon, Clock
Data:            TrendingUp, TrendingDown, BarChart3, Calendar
Files:           FileText, Image, Paperclip, Folder
People:          Users, UserCircle, AtSign
```

---

## 7. PAGE TEMPLATES

### 7.1 Project Dashboard

**Key Elements:**
- **Hero Section:** Project name, phase, health score (large, bold)
- **KPI Row:** Budget, Schedule, RFIs, Open tasks (4 cards)
- **Quick Actions:** Floating action button (mobile), toolbar (desktop)
- **Gantt Preview:** Collapsible timeline view
- **Activity Feed:** Right sidebar, last 10 updates
- **Critical Alerts:** Top banner if blockers exist

**Information Hierarchy:**
1. Health status (immediate)
2. Budget vs. actual (financial risk)
3. Schedule adherence (timeline risk)
4. Open RFIs / blockers (execution risk)

### 7.2 RFI Hub

**Key Elements:**
- **Filter Bar:** Status, Priority, Ball-in-court, Date range
- **Summary Cards:** Total, Open, Overdue, Answered this week
- **Table View:** RFI #, Subject, Status badge, Priority, Days open, Assigned to
- **Bulk Actions:** Select multiple, update status, export
- **Create Button:** Prominent, top-right, primary color

**Mobile Optimization:**
- Card view instead of table
- Swipe actions for status update
- Expandable card for full details

### 7.3 Schedule/Gantt

**Key Elements:**
- **Timeline Header:** Scrollable date range, zoom controls
- **Task List (Left):** Collapsible WBS, progress bars
- **Gantt Bars (Right):** Color-coded by phase, dependencies visible
- **Critical Path:** Highlighted in red
- **Filters:** Phase, Status, Resource, Date range
- **Resource Allocation:** Heatmap view toggle

**Mobile Strategy:**
- Vertical timeline (portrait)
- Task cards with start/end dates
- Dependency indicators, not lines

### 7.4 Deliveries

**Key Elements:**
- **Today's Deliveries:** Top section, large cards, ETA countdown
- **Upcoming (7-day):** Grid view with tonnage, truck count
- **Map View:** Toggle, shows en-route and scheduled
- **Receiving Checklist:** Quick-access for field teams
- **Photo Upload:** Large button, camera integration

**Field Optimization:**
- Large touch targets (min 52px)
- High-contrast text (8:1)
- Offline mode indicator
- Auto-save all changes

---

## 8. MOBILE-SPECIFIC PATTERNS

### 8.1 Touch Targets
- **Minimum:** 44×44px (iOS guideline)
- **Recommended:** 48×48px (Android guideline)
- **Field Use:** 52×52px (with gloves)

### 8.2 Thumb Zones
- **Primary Actions:** Bottom 1/3 of screen (right-handed bias)
- **Navigation:** Bottom bar (one-handed use)
- **Filters:** Top bar (non-critical)

### 8.3 Mobile Navigation Patterns

**Bottom Nav (Primary)**
- 5 items maximum
- Dashboard, Projects, Schedule, RFIs, More
- Icons + labels
- Active state: Amber fill

**Top Bar (Contextual)**
- Back button (left)
- Page title (center)
- Actions (right, max 2)

**Hamburger Menu (Secondary)**
- Settings, Profile, Help
- Slide-in from right

### 8.4 Mobile Forms
- One column only
- Floating labels (material design)
- Date/number pickers (native)
- Large submit button, fixed to bottom
- Auto-advance on field completion

### 8.5 Field-Optimized Features

**High-Contrast Mode Toggle**
- Increases all contrast ratios to 10:1+
- Larger text (18px minimum)
- Thicker borders (2px+)
- Available in Settings > Display

**Glove Mode**
- Touch targets increase to 56×56px
- Larger buttons, less dense UI
- Confirmation dialogs for destructive actions

**Sun Mode**
- Maximum brightness indicator
- Pure white backgrounds (#FFFFFF)
- Black text (#000000)
- Reduced shadows

---

## 9. INTERACTION PATTERNS

### 9.1 Loading States

**Skeleton Screens**
```css
Background:       Linear gradient shimmer
Base Color:       #E5E8EB
Shimmer:          #F4F6F8
Animation:        2s linear infinite
Border Radius:    4px (match target component)
```

**Spinners**
```css
Size:             20px (inline), 32px (page), 48px (full-page)
Color:            #D97706
Stroke:           3px
Animation:        Spin 1s linear infinite
```

**Progress Indicators**
- Use for uploads, exports, long operations
- Show percentage and estimated time
- Allow cancellation if possible

### 9.2 Empty States

**Structure**
```
Icon (48px, #9BA3AE)
Heading (20px / 600 / #3D4752)
Description (14px / 400 / #6B7684)
Primary Action Button (optional)
Secondary Action Link (optional)
```

**Examples:**
- "No RFIs yet — Create your first RFI"
- "No deliveries scheduled for this week"
- "No tasks assigned to you"

### 9.3 Error States

**Inline Validation**
- Real-time on blur (not on type)
- Red border + red text below field
- Icon: AlertCircle (16px)
- Fix removes error immediately

**Toast Notifications**
```css
Position:         Top-right (desktop), Top-center (mobile)
Width:            360px (desktop), 90vw (mobile)
Padding:          16px
Border Radius:    8px
Shadow:           0 4px 12px rgba(0,0,0,0.15)
Duration:         4s (success), 6s (error), ∞ (action required)
```

**Error Toast**
```
Background:       #FEE2E2
Border:           2px solid #DC2626
Icon:             AlertOctagon, #DC2626
Text:             14px / 600 / #7C2D12
Action:           "Retry" button (if applicable)
```

### 9.4 Confirmation Dialogs

**Use Cases:**
- Delete actions
- Status changes with dependencies
- Large data exports
- Leaving unsaved forms

**Structure:**
```
Icon (warning/question)
Title (18px / 600)
Description (14px / 400)
Consequences (if destructive)
Actions: Cancel (secondary) | Confirm (primary/destructive)
```

### 9.5 Transitions & Animations

**Principles:**
- Fast (200ms-300ms)
- Natural (ease-out for entrances, ease-in for exits)
- Purposeful (guide user attention)

**Standards:**
```css
Fade In:          opacity 200ms ease-out
Slide In:         transform 250ms ease-out
Button Hover:     all 150ms ease-out
Modal Open:       opacity 200ms, scale 250ms ease-out
Card Elevation:   box-shadow 200ms ease-out
```

**Reduce Motion:** Respect `prefers-reduced-motion`, disable all non-essential animations

---

## 10. ACCESSIBILITY COMPLIANCE

### 10.1 WCAG 2.1 AA Standards

**Contrast Requirements**
- ✅ All text: 7:1 minimum (exceeds AA requirement)
- ✅ Large text (18px+): 7:1 (exceeds 4.5:1)
- ✅ UI components: 4.5:1 minimum
- ✅ Focus indicators: 3:1 minimum

**Keyboard Navigation**
- All interactive elements keyboard-accessible
- Focus order follows visual layout
- Skip links for main content
- Escape closes modals/menus
- Enter/Space activates buttons

**Screen Reader Support**
- Semantic HTML (nav, main, article, aside)
- ARIA labels for icons-only buttons
- ARIA live regions for status updates
- Alt text for all images
- Form labels always visible

### 10.2 Field-Specific Accessibility

**Sunlight Readability**
- All critical information: 10:1 contrast option
- No color-only status indicators (use icons + text)
- Large touch targets (52px+ with gloves)

**Offline Indicators**
- Persistent banner when offline
- Sync status for pending actions
- Local save confirmations

---

## 11. IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)
1. ✅ Update global CSS variables with new color palette
2. ✅ Import Inter font family
3. ✅ Implement spacing scale utility classes
4. ✅ Create base component library (Button, Input, Card)
5. ✅ Update Layout component with new navigation

### Phase 2: Core Components (Week 3-4)
1. ✅ Rebuild Table component with new styles
2. ✅ Update Status Badge variants
3. ✅ Rebuild Form components (Input, Select, Checkbox)
4. ✅ Create Modal/Dialog component
5. ✅ Implement Toast notification system

### Phase 3: Page Templates (Week 5-6)
1. ✅ Redesign Dashboard page
2. ✅ Redesign RFI Hub
3. ✅ Redesign Project Details
4. ✅ Redesign Schedule/Gantt
5. ✅ Redesign Deliveries page

### Phase 4: Mobile Optimization (Week 7)
1. ✅ Implement bottom navigation
2. ✅ Mobile-responsive tables (card transforms)
3. ✅ Touch target audits
4. ✅ Field mode toggles (High Contrast, Glove Mode)

### Phase 5: Polish & Testing (Week 8)
1. ✅ Accessibility audit (WAVE, axe DevTools)
2. ✅ Sunlight visibility testing
3. ✅ Performance optimization
4. ✅ Cross-browser testing
5. ✅ User acceptance testing

---

## 12. CODE IMPLEMENTATION GUIDE

### 12.1 CSS Variables Setup

```css
:root {
  /* Colors */
  --color-bg-primary: #FAFBFC;
  --color-bg-secondary: #F4F6F8;
  --color-bg-elevated: #FFFFFF;
  --color-border: #DFE3E8;
  
  --color-text-primary: #0F1419;
  --color-text-secondary: #3D4752;
  --color-text-tertiary: #6B7684;
  
  --color-primary: #D97706;
  --color-primary-hover: #B45309;
  --color-primary-light: #FEF3C7;
  
  --color-success: #047857;
  --color-warning: #D97706;
  --color-error: #DC2626;
  --color-info: #0369A1;
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  
  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --text-xs: 12px;
  --text-sm: 13px;
  --text-base: 14px;
  --text-lg: 16px;
  --text-xl: 18px;
  --text-2xl: 20px;
  --text-3xl: 24px;
  --text-4xl: 28px;
  --text-5xl: 32px;
  
  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.12);
  --shadow-lg: 0 20px 60px rgba(0,0,0,0.3);
  
  /* Radii */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  
  /* Transitions */
  --transition-fast: 150ms ease-out;
  --transition-base: 200ms ease-out;
  --transition-slow: 300ms ease-out;
}
```

### 12.2 Tailwind Config Extension

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Use CSS variables for dynamic theming
        'bg-primary': 'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        // ... rest of color system
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': 'var(--text-xs)',
        // ... rest of sizes
      },
      spacing: {
        '1': 'var(--space-1)',
        // ... rest of spacing
      }
    }
  }
}
```

### 12.3 Component Example: Button

```jsx
// components/ui/Button.jsx (Daylight optimized)
const Button = ({ 
  variant = 'primary', 
  size = 'default', 
  children,
  ...props 
}) => {
  const baseStyles = `
    inline-flex items-center justify-center
    font-semibold transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;
  
  const variants = {
    primary: `
      bg-[#D97706] text-white
      hover:bg-[#B45309] active:bg-[#92400E]
    `,
    secondary: `
      bg-[#F4F6F8] text-[#0F1419] border border-[#DFE3E8]
      hover:bg-[#E5E8EB] active:bg-[#DFE3E8]
    `,
    destructive: `
      bg-[#DC2626] text-white
      hover:bg-[#B91C1C] active:bg-[#991B1B]
    `,
  };
  
  const sizes = {
    small: 'h-8 px-3 text-sm rounded-md',
    default: 'h-10 px-5 text-base rounded-md',
    large: 'h-12 px-6 text-lg rounded-md',
  };
  
  return (
    <button 
      className={cn(baseStyles, variants[variant], sizes[size])}
      {...props}
    >
      {children}
    </button>
  );
};
```

---

## 13. DESIGN CHECKLIST

### Pre-Launch Audit

**Visual Design**
- [ ] All colors meet 7:1 contrast ratio (body text)
- [ ] All interactive elements have visible focus states
- [ ] Consistent spacing (8px grid) throughout
- [ ] Typography scale properly applied
- [ ] Icons consistent size and stroke weight
- [ ] Shadows used consistently for elevation

**Functionality**
- [ ] All forms have validation states
- [ ] Loading states for all async operations
- [ ] Empty states for all lists/tables
- [ ] Error states with recovery actions
- [ ] Confirmation dialogs for destructive actions

**Accessibility**
- [ ] Keyboard navigation works on all pages
- [ ] Screen reader tests pass (NVDA/JAWS)
- [ ] ARIA labels on icon-only buttons
- [ ] Skip links present on all pages
- [ ] Color is not the only means of conveying information

**Mobile/Field**
- [ ] Touch targets minimum 44×44px (52px field mode)
- [ ] Text minimum 15px on mobile
- [ ] Sunlight visibility tested (outdoor)
- [ ] Bottom navigation implemented
- [ ] Offline mode indicators present

**Performance**
- [ ] First Contentful Paint <1.5s
- [ ] Time to Interactive <3s
- [ ] No layout shift during load
- [ ] Images lazy-loaded
- [ ] Code-split by route

---

## 14. MAINTENANCE & EVOLUTION

### Design System Governance

**Documentation Updates**
- Review quarterly
- Update with new components
- Document edge cases and exceptions
- Maintain changelog

**Component Library**
- Version control (Storybook recommended)
- Visual regression testing
- Accessibility testing automated
- Performance benchmarks

**User Feedback Loop**
- Monthly field user interviews
- Analytics on feature usage
- A/B testing for major changes
- Continuous improvement backlog

### Future Enhancements

**Short-term (3 months)**
- Dark mode for office use (low priority)
- Customizable dashboard widgets
- Advanced filter presets
- Export templates

**Mid-term (6 months)**
- AI-powered layout recommendations
- Real-time collaboration indicators
- Advanced data visualizations
- Offline-first architecture

**Long-term (12 months)**
- AR field views (camera overlays)
- Voice command interface
- Predictive analytics dashboards
- Industry-specific templates

---

## CONCLUSION

This design system provides a complete foundation for SteelBuild Pro's daylight UI/UX overhaul. Key outcomes:

✅ **Enterprise-grade** visual consistency  
✅ **Field-optimized** for sunlight visibility  
✅ **Mobile-first** for on-site use  
✅ **Accessible** WCAG 2.1 AA+ compliant  
✅ **Scalable** component library  
✅ **Actionable** implementation roadmap  

**Next Steps:**
1. Review with stakeholders (PM, field teams, executives)
2. Prototype 2-3 key pages for user testing
3. Begin Phase 1 implementation (Foundation)
4. Iterate based on field feedback

**Questions or clarifications:** Contact design team lead or reference this document for all design decisions.