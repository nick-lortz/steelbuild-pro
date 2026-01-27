# Project Execution Modules: UX Overhaul Specification
**Work Packages • Detailing • Fabrication • Deliveries**

---

## 1. PROBLEM SUMMARY

### Work Packages Module
**Current Pain Points:**
- Table-heavy interface buries critical phase transition logic
- No visual indicators for readiness to advance (FFF drawings required, labor allocated, etc.)
- Tonnage/SOV/Task counts are static—no context on what's at risk or incomplete
- "Advance Phase" button exists but doesn't explain what it will do or validate prerequisites
- No cross-linking to schedule, detailing, or fabrication state
- KPIs show counts but don't highlight actionable items (e.g., "3 packages blocked on drawings")

**Workflow Bottlenecks:**
- Users must manually verify drawing status before advancing to fabrication
- No visibility into labor breakdown health or schedule readiness
- Phase transitions are click-and-hope—no validation or staging preview
- Can't see which packages are consuming budget vs forecast

**Information Hierarchy Issues:**
- Equal visual weight for all packages regardless of status or urgency
- Progress bar shows completion % but not what's blocking 100%
- SOV line count doesn't indicate if billing is aligned or mismatched

---

### Detailing Module
**Current Pain Points:**
- Priority queue is effective but buried under filters
- Status flow (IFA → BFA → BFS → FFF) requires user to know acronyms and next-state logic
- Reviewer assignment is inline but has no load-balancing intelligence
- Overdue items flagged but no triage queue or auto-escalation
- "RFI" button is decorative—no actual RFI creation or linking
- No dependency awareness (can't see if Package A blocks Package B)

**Workflow Bottlenecks:**
- No bulk reviewer assignment with workload intelligence
- Can't filter by "unreviewed sets" or "sets blocking fabrication"
- Revision history is modal-only—can't see "changed between Rev 2 and Rev 3" at a glance
- Batch actions exist but don't suggest smart defaults (e.g., "assign all structural to Joe")

**Information Hierarchy Issues:**
- All drawing sets treated equally—no critical path or sequence awareness
- Sheet count shown but no indicator of "sheets with open markups" or "sheets never opened"
- Due date displayed but no "expected approval turnaround" based on historical data

---

### Fabrication Module
**Current Pain Points:**
- Generic list view with no fabrication-specific intelligence
- QC status is a badge—no drill-down into inspection results or hold reasons
- Priority field exists but no auto-prioritization based on delivery dates or critical path
- No linkage to detailing (can't see "waiting on Rev 4" or "drawings approved 2d ago")
- Weight/piece count tracked but not compared to work package estimates (variance detection)
- Target completion shown but no connection to delivery schedule or erection sequencing

**Workflow Bottlenecks:**
- Can't see "ready to release to shop" vs "blocked on detailing" vs "in QC hold"
- No fabrication capacity planning (tonnage/day, crew assignments, equipment needs)
- No visual grouping by project priority or delivery sequence
- Missing "next 10 pieces to cut" or "hot list" view for shop floor

**Information Hierarchy Issues:**
- All packages shown equally—no urgency or sequencing logic
- Status badges don't indicate how long items have been in current state (cycle time)
- No visual flow showing detailing → fab → QC → ready-to-ship progression

---

### Deliveries Module
**Current Pain Points:**
- Rich KPIs (on-time %, variance) but main table is still flat list
- Task-based deliveries mixed with manual entries—visually confusing
- Variance calculation exists but no predictive "at risk of delay" for scheduled items
- Carrier tracking present but no carrier performance scoring or reliability indicators
- Extended KPIs tab is isolated—should be inline with delivery planning
- No connection to erection sequencing (delivery order vs installation order mismatch)

**Workflow Bottlenecks:**
- Can't see "deliveries blocking erection tasks this week"
- No grouping by project phase or erection area (grid 1 vs grid 2)
- Scheduled vs actual comparison is per-row—no timeline view showing slippage trends
- Missing "delivery readiness" indicator (fab complete? QC passed? truck reserved?)

**Information Hierarchy Issues:**
- Upcoming deliveries buried in filters—should be default view
- Weight/piece data shown but not contextualized (is this the full package or partial?)
- No visual separation between "needs attention" vs "on track" vs "delivered"

---

## 2. UNIFIED UX PRINCIPLES FOR ALL FOUR MODULES

### A. Single Navigation Pattern
**Principle:** All execution modules share a consistent 3-tier header structure:
1. **Tier 1 (Module Title Bar):** Module name, project selector, primary action (+ New)
2. **Tier 2 (KPI Strip):** 3-5 critical metrics in uniform card format with color-coded thresholds
3. **Tier 3 (Controls Bar):** Search, view mode, filters, sort, AI assistant toggle

**Implementation Rules:**
- Project selector always top-right, consistent across all modules
- KPIs follow Red (critical) / Amber (warning) / Green (healthy) / White (neutral) color system
- View mode toggles share same button group styling (PHASE | TIMELINE | LIST | GANTT)
- AI assistant always accessible via ✨ icon in header, consistent placement

---

### B. Reusable Card/Table Hybrid Component
**Component Name:** `ExecutionCard`

**Structure:**
```
┌─ ExecutionCard ─────────────────────────────────────────┐
│ [Status Bar] [Icon] Package Name              [Badge]  │
│ Metadata line: ID • Rev • Due Date • Assigned          │
│ ─────────────────────────────────────────────────────── │
│ [Progress Indicators] [Dependencies] [Warnings]         │
│ ─────────────────────────────────────────────────────── │
│ [Action Buttons: Advance | RFI | History | Delete]     │
└─────────────────────────────────────────────────────────┘
```

**Variants:**
- **WorkPackageCard:** Shows phase flow, tonnage, SOV health, readiness gates
- **DetailingCard:** Shows status flow, reviewer, overdue warning, sheet count
- **FabricationCard:** Shows QC status, weight, delivery linkage, shop priority
- **DeliveryCard:** Shows scheduled vs actual, variance, carrier, erection impact

**Shared Behaviors:**
- Left-edge color bar indicates current status/phase
- Click card body to view details (Sheet panel)
- Checkbox for batch operations (top-left)
- Actions always right-aligned, icon-based
- Expand/collapse for additional metadata (dependencies, linked items, notes)

---

### C. Consistent Status, Phase, and Priority System

**Phase Progression (Work Packages & Tasks):**
```
DETAILING → FABRICATION → DELIVERY → ERECTION → CLOSEOUT
```
Color coding:
- Detailing: Blue (#3B82F6)
- Fabrication: Amber (#F59E0B)
- Delivery: Purple (#A855F7)
- Erection: Green (#10B981)
- Closeout: Zinc (#71717A)

**Status Progression (Detailing/Drawings):**
```
IFA → BFA → BFS → FFF
```
Color coding:
- IFA (Issued for Approval): Blue
- BFA (Back from Approval): Amber
- BFS (Back from Scrub): Purple
- FFF (Fit for Fabrication): Green
- As-Built: Zinc

**Universal Status Set (Tasks, Fabrication, Deliveries):**
```
NOT_STARTED → IN_PROGRESS → COMPLETED
                  ↓
              ON_HOLD / BLOCKED / DELAYED
```

**Priority Levels (All Modules):**
- **CRITICAL:** Red, reserved for items blocking multiple downstream tasks
- **HIGH:** Amber, items due within 7 days or on critical path
- **MEDIUM:** Blue, standard priority
- **LOW:** Zinc, deferred or optional scope

---

### D. Shared Filtering + Search Header
**FilterBar Component Structure:**
- **Search Input:** Left-aligned, full-width on mobile, icon-prefixed
- **Multi-Select Filters:** Pills-based UI, show active count (e.g., "Projects (2)")
- **Date Range Picker:** Preset ranges + custom range option
- **Save/Load Views:** Allow users to save filter combinations as named views
- **Clear All:** Always visible when filters active

**Standard Filter Groups (adapt per module):**
1. Projects (multi-select)
2. Status/Phase (multi-select)
3. Assigned To / Reviewer (multi-select)
4. Date Range (single-select with presets)
5. Risk Level (Critical | Warning | Healthy)

**Implementation:**
- Filters stored in localStorage per module
- Filter state persists across sessions
- Active filters displayed as removable pills below search bar
- "X results shown • Y total" counter always visible

---

### E. Universal Warning Logic
**System-Wide Risk Indicators:**

**Red (Critical):**
- Overdue by >3 days and not completed
- Blocking 3+ downstream tasks
- Missing required data (dates, assignments, approvals)
- Budget overrun >15%

**Amber (Warning):**
- Due within 3 days and not started
- Due within 7 days and in progress
- Variance >10% from baseline
- Reviewer/resource assigned but no activity in 5+ days

**Blue (Info):**
- Approaching milestone (7-14 days out)
- Dependency chain detected
- Change order or RFI linked

**Visual Treatment:**
- Icons: ⚠️ (Critical), 🟠 (Warning), 🔵 (Info)
- Left-edge color bar on cards
- Inline badges on list rows
- Counts in KPI strip (e.g., "CRITICAL: 3")

---

### F. Cross-Module Linkages
**Linkage Map:**
```
Work Package ──┬─→ Detailing (Drawing Sets required)
               ├─→ Fabrication (Tonnage to build)
               ├─→ Schedule (Task breakdown)
               └─→ SOV (Billing alignment)

Drawing Set ───→ Work Package (FFF required to advance)
               └─→ Fabrication (Needed before shop release)

Fabrication ───→ Delivery (Ready-to-ship triggers delivery creation)
               └─→ QC Hold (Blocks delivery planning)

Delivery ──────→ Erection (Delivery sequence = install sequence)
               └─→ Schedule (Late delivery delays field tasks)
```

**UI Implementation:**
- All cards show linked item counts as badges (e.g., "🔗 3 Tasks")
- Clicking badge opens quick-view popover with linked items
- Status propagation warnings (e.g., "Cannot advance: 2 drawing sets still BFA")
- Breadcrumb navigation when drilling into linked items

---

## 3. REDESIGNED UI LAYOUTS

### A. WORK PACKAGES MODULE

#### Header (Tier 1)
```
┌────────────────────────────────────────────────────────────┐
│ WORK PACKAGES                    [Project: ABC Steel MVD ▼]│
│ ABC Steel MVD                                   [+ NEW]     │
└────────────────────────────────────────────────────────────┘
```

#### KPI Strip (Tier 2)
```
┌──────────────────────────────────────────────────────────────┐
│ ACTIVE: 8    COMPLETE: 12    TONNAGE: 245.3    AVG: 67%    │
│ ⚠️ 2 BLOCKED ON DRAWINGS        🟠 3 NEED LABOR ALLOCATION   │
└──────────────────────────────────────────────────────────────┘
```

#### Controls (Tier 3)
```
┌──────────────────────────────────────────────────────────────┐
│ [Search...] [PHASE▼] [STATUS▼] [✨ AI]    PHASE | LIST | KAN│
└──────────────────────────────────────────────────────────────┘
```

#### Main View (Phase-Grouped Cards)
```
┌─ FABRICATION PHASE (5 packages) ──────────────────────────┐
│                                                            │
│  ┌─ WP-001: Main Columns ──────────────────────┐          │
│  │ 🟩 Active │ WP-001 • 45.2T • 3 SOV Lines     │          │
│  │ Progress: ████████░░ 80%                     │          │
│  │ ✅ Drawings: FFF (2/2)  ⚠️ Labor: 0/450hr   │          │
│  │ 🔗 12 Tasks • Due: Feb 15                    │          │
│  │ [Ready to Advance →] [View Details]          │          │
│  └──────────────────────────────────────────────┘          │
│                                                            │
│  ┌─ WP-002: Beams & Joists ─────────────────────┐         │
│  │ 🟠 Active │ WP-002 • 67.8T • 5 SOV Lines      │         │
│  │ Progress: ████░░░░░░ 40%                      │         │
│  │ ⚠️ Drawings: BFA (1/3)  ✅ Labor: 340/600hr  │         │
│  │ 🔗 8 Tasks • Due: Feb 20 (5d)                 │         │
│  │ [Blocked on Drawings] [View Details]          │         │
│  └───────────────────────────────────────────────┘         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Key UX Improvements:**
- Grouped by current phase with expand/collapse
- Readiness gates shown inline (drawings, labor, schedule)
- Action button changes based on state (Ready to Advance | Blocked | Review Required)
- Visual progress breakdown: not just %, but what's complete and what's missing
- Mobile: Cards stack vertically, phase headers sticky

---

### B. DETAILING MODULE

#### Header
```
┌────────────────────────────────────────────────────────────┐
│ DETAILING                        [Project: ABC Steel MVD ▼]│
│ ABC Steel MVD                                  [+ NEW SET] │
└────────────────────────────────────────────────────────────┘
```

#### KPI Strip
```
┌──────────────────────────────────────────────────────────────┐
│ ⚠️ BLOCKED: 2    🟠 DUE 3D: 4    🔵 IN PROGRESS: 6    ✅ FFF: 12│
│ Avg Turnaround: 8.5 days (Target: 7d)                       │
└──────────────────────────────────────────────────────────────┘
```

#### Priority Queue (Always Top)
```
┌─ PRIORITY QUEUE ─────────────────────────────────────────┐
│ 2 OVERDUE • 4 DUE IN 3 DAYS                              │
│                                                          │
│  [🔴 OVD] S-101 Main Grid Structural             [BFA]  │
│  R3 • 12SH • Due: Jan 20 (7d ago)                        │
│  [Reviewer: Joe ▼] [Create RFI] [→ BFS]                 │
│  ─────────────────────────────────────────────────────── │
│  [🟠 2D] S-102 Level 2 Framing                  [IFA]   │
│  R1 • 8SH • Due: Jan 29                                  │
│  [Reviewer: Sarah ▼] [Create RFI] [→ BFA]               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Active Drawing Sets (Filtered View)
```
┌─ IN PROGRESS (6 sets) ────────────────────────────────────┐
│ [Filter: IFA | BFA | BFS ▼] [Reviewer: All ▼] [✨ AI]    │
│                                                           │
│  BFA ║ S-103: Misc Metals Shop Drawings          [BFA]  │
│       R2 • 15SH • Due: Feb 5 (9d) • Sarah                │
│       [History] [→ BFS] [Create RFI]                     │
│  ──────────────────────────────────────────────────────── │
│  IFA ║ S-104: Stair Towers                       [IFA]  │
│       R1 • 6SH • Due: Feb 10 (14d) • Unassigned          │
│       [Assign Reviewer ▼] [→ BFA]                        │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Key UX Improvements:**
- Priority queue permanently visible with count badge
- Status flow shown as visual pipeline (IFA ─→ BFA ─→ BFS ─→ FFF)
- Reviewer assignment integrated with workload visibility
- RFI creation context-aware (pre-fills drawing set, project)
- Bulk actions for "assign all unassigned to..." or "advance all BFS sets"
- Historical turnaround time displayed to set expectations

---

### C. FABRICATION MODULE

#### Header
```
┌────────────────────────────────────────────────────────────┐
│ FABRICATION TRACKING             [Project: All Projects ▼] │
│ 24 Active Packages                            [+ NEW ITEM] │
└────────────────────────────────────────────────────────────┘
```

#### KPI Strip
```
┌──────────────────────────────────────────────────────────────┐
│ IN PROGRESS: 18    READY TO SHIP: 6    QC HOLD: 2    245.3T│
│ Shop Capacity: 78% (35/45 tons/day)                         │
└──────────────────────────────────────────────────────────────┘
```

#### Hot List (Top Priority)
```
┌─ HOT LIST ─────────────────────────────────────────────────┐
│ 6 READY TO SHIP • 2 QC HOLD                               │
│                                                           │
│  [🟢 READY] WP-001: Main Columns              ABC Steel │
│  45.2T • 48pc • Delivery: Feb 1 (5d out)                 │
│  ✅ QC Passed • ✅ Drawings: FFF • 🚚 Truck Reserved      │
│  [Create Delivery] [View Package]                        │
│  ──────────────────────────────────────────────────────── │
│  [🔴 HOLD] WP-003: Beam Line 2                 DEF Build │
│  22.1T • 36pc • QC Hold: Weld repair req'd               │
│  🔗 Linked RFI #45 • Est Release: Jan 30                 │
│  [View QC Report] [View Package]                         │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

#### Shop Floor View (Grouped by Status)
```
┌─ IN PROGRESS (18 packages) ───────────────────────────────┐
│ [Sort: Delivery Date ▼] [Filter: Project ▼] [✨ AI]      │
│                                                           │
│  Group: ABC Steel MVD (8 packages, 124.5T)               │
│  ┌─────────────────────────────────────────────┐          │
│  │ WP-002: Beams            67.8T • 85pc       │          │
│  │ Progress: ██████░░ 75% • QC: Pending        │          │
│  │ Delivery Target: Feb 8 • 🟠 Behind 2d       │          │
│  │ [Update Progress] [QC Inspection]           │          │
│  └─────────────────────────────────────────────┘          │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Key UX Improvements:**
- Hot list surfaces actionable items (ready to ship, QC holds)
- Fabrication state tied to delivery planning (shows target delivery date)
- QC status expanded beyond badge—shows inspection date, hold reasons, clearance path
- Shop capacity indicator helps with loading decisions
- Grouping by project with tonnage rollups
- Weight variance detection (estimated vs actual)

---

### D. DELIVERIES MODULE

#### Header
```
┌────────────────────────────────────────────────────────────┐
│ DELIVERY TRACKING                [Project: All Projects ▼] │
│ 34 Total • 8 Next 14D                         [+ NEW]     │
└────────────────────────────────────────────────────────────┘
```

#### KPI Strip
```
┌──────────────────────────────────────────────────────────────┐
│ ON-TIME: 92%    DELAYED: 3    TONNAGE: 456.7T    VAR: +1.2D│
│ Next Delivery: WP-001 in 2 days (Feb 1)                     │
└──────────────────────────────────────────────────────────────┘
```

#### Timeline View (Default)
```
┌─ UPCOMING DELIVERIES ──────────────────────────────────────┐
│                                                            │
│  ┌─ FEB 1 (THU) ─────────────────────────────┐            │
│  │ 📅 WP-001: Main Columns      ABC Steel     │            │
│  │ 45.2T • 48pc • Carrier: Smith Trucking     │            │
│  │ ✅ Fab Complete • ✅ QC Passed              │            │
│  │ 🔗 Erection Task: Grid 1 Install (Feb 2)   │            │
│  │ [Confirm Delivery] [Update Status]         │            │
│  └────────────────────────────────────────────┘            │
│                                                            │
│  ┌─ FEB 3 (SAT) ─────────────────────────────┐            │
│  │ 📅 WP-004: Secondary Beams   ABC Steel     │            │
│  │ 32.1T • 64pc • Carrier: TBD                │            │
│  │ ⚠️ Fab In Progress (85%)                    │            │
│  │ 🟠 At Risk: Fab not complete for load date  │            │
│  │ [View Fabrication] [Adjust Date]           │            │
│  └────────────────────────────────────────────┘            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### Completed Deliveries (Variance Analysis)
```
┌─ PAST 30 DAYS ────────────────────────────────────────────┐
│ [Sort: Variance ▼] [Show: Delayed Only ☐]                 │
│                                                           │
│  ✅ Jan 25: WP-007 Misc Metals          +3d (Delayed)    │
│     Carrier: ABC Transport • 28.5T                        │
│     Reason: Weather hold Jan 22-24                        │
│     Erection Impact: 2 tasks delayed 3d                   │
│  ─────────────────────────────────────────────────────── │
│  ✅ Jan 20: WP-005 Main Frame              -1d (Early)   │
│     Carrier: Smith Trucking • 52.3T                       │
│     No erection impact                                    │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Key UX Improvements:**
- Timeline-first view groups by delivery date
- Readiness gates for each delivery (fab status, QC, truck booking)
- Variance tracking with root cause and downstream impact
- Carrier performance implied through on-time delivery history
- Integration with erection schedule (shows if delivery delay affects install tasks)
- Mobile: Collapse to date headers with expandable delivery cards

---

## 4. NEW WORKFLOW MODELS

### A. Work Package Lifecycle
```
1. CREATE PACKAGE
   ├─ Define scope, tonnage, target dates
   ├─ Link to SOV line items (auto-inherit budget)
   ├─ Assign PM/superintendent
   └─ Set phase to DETAILING (default)

2. DETAILING PHASE
   ├─ System creates drawing set placeholders
   ├─ Drawings progress through IFA → BFA → BFS → FFF
   ├─ Package status: ACTIVE (waiting on drawings)
   └─ Advance Gate: All linked drawing sets must be FFF

3. FABRICATION PHASE
   ├─ Package auto-advances when all drawings FFF
   ├─ Labor breakdown allocated (shop hours estimated)
   ├─ Fabrication records created (tonnage, piece count, QC)
   ├─ Schedule tasks created (if not already)
   └─ Advance Gate: Fabrication status = READY_TO_SHIP

4. DELIVERY PHASE
   ├─ Delivery record auto-created from fabrication completion
   ├─ Carrier, truck, load details entered
   ├─ Scheduled vs actual date tracked
   └─ Advance Gate: Delivery status = DELIVERED

5. ERECTION PHASE
   ├─ Erection tasks activated (unlocked)
   ├─ Field crews assigned
   ├─ Daily logs capture installation progress
   └─ Advance Gate: All erection tasks complete

6. CLOSEOUT PHASE
   ├─ As-built drawings submitted
   ├─ Final billing reconciliation
   ├─ Package status: COMPLETE
```

**Key Validation Rules:**
- Cannot skip phases
- Cannot advance without meeting phase gates
- System warns if prerequisites incomplete (e.g., "2 drawings still BFA")
- Rollback allowed (e.g., fabrication → detailing if major revision needed)

---

### B. Prioritization & Triage Workflow

**Auto-Priority Algorithm:**
```
Priority = f(due_date, critical_path, dependencies, contract_value)

CRITICAL:
- On critical path AND due <7 days
- Blocking 3+ downstream packages/tasks
- High-value SOV line (>$100k) behind schedule

HIGH:
- Due <7 days (not critical path)
- Blocking 1-2 downstream items
- Delayed >3 days from baseline

MEDIUM:
- Due 7-14 days
- Standard sequence

LOW:
- Due >14 days
- No dependencies
- Optional scope or deferred work
```

**Triage Queue UI:**
- Always-visible panel for CRITICAL + HIGH items
- Auto-refreshes when status changes
- Suggested actions per item ("Assign to Joe", "Request RFI", "Expedite QC")
- One-click bulk assignment for similar items

---

### C. Date-Driven Sequencing

**Backward Scheduling from Erection:**
```
Erection Start (Feb 20)
  ↓ -1d (offload/inspect)
Delivery Target (Feb 19)
  ↓ -3d (fab buffer for QC/load)
Fabrication Complete Target (Feb 16)
  ↓ -10d (estimated fab duration)
Fabrication Start (Feb 6)
  ↓ -2d (shop drawing approval)
Detailing FFF Target (Feb 4)
  ↓ -14d (detailing + approval cycle)
Detailing Start (Jan 21)
```

**UI Implementation:**
- Work package form auto-calculates phase dates when erection date entered
- Visual timeline showing critical date dependencies
- Alerts when dates drift from calculated sequence
- "Rebaseline" button to recalculate all dates after delay

---

### D. Responsible Party Handoffs

**Handoff Points & Notifications:**

| **Handoff**               | **From**       | **To**          | **Trigger**                  | **Notification**                          |
|---------------------------|----------------|-----------------|------------------------------|-------------------------------------------|
| Drawings to Approval      | Detailer       | PM              | Status → IFA                 | "S-101 submitted for your approval"       |
| Approved Drawings         | PM             | Detailer        | Status → BFA                 | "S-101 back from GC, review markups"      |
| Scrubbed Drawings         | Detailer       | PM              | Status → BFS                 | "S-101 scrubbed, ready for final release" |
| Release to Fabrication    | PM             | Shop Manager    | Status → FFF                 | "WP-001 released, all drawings FFF"       |
| Fabrication Complete      | Shop Manager   | Logistics       | Fab Status → READY_TO_SHIP   | "WP-001 ready, schedule delivery"         |
| Delivery Scheduled        | Logistics      | Superintendent  | Delivery Created             | "WP-001 delivering Feb 1, crew ready?"    |
| Delivery Complete         | Logistics      | Field Crew      | Delivery Status → DELIVERED  | "WP-001 on site, begin install"           |

**UI Treatment:**
- Handoff button highlights when action required by current user
- Notification badge in header (🔔 3) links to handoff queue
- Handoff history log shows who did what when

---

### E. QC & Approval Steps

**Detailing QC (Drawing Review):**
```
IFA Submit → PM Review (2-3d) → GC Review (5-7d) → BFA Return
  → Detailer Scrub (1-2d) → PM Re-Review (1d) → BFS → FFF Release
```

**Fabrication QC:**
```
Piece Fabricated → Dimensional Check → Weld Inspection
  → Coating/Paint → Final QC → READY_TO_SHIP
```

**UI for QC:**
- Checklist-style UI for inspection steps
- Photo upload for non-conformance reports
- Hold reasons categorized (dimensional, weld, material, other)
- Expected clearance date for holds
- QC sign-off timestamp and user

---

## 5. AI AUGMENTATION OPPORTUNITIES

### A. Conflict & Missing Data Detection

**AI Agent: "Schedule Guardian"**

**Capabilities:**
- Scan all packages/tasks for missing dates, assignments, or approvals
- Detect circular dependencies or impossible sequences
- Flag packages where fabrication is >90% but no delivery scheduled
- Identify drawing sets >7 days overdue with no RFI submitted
- Warn when work package phase doesn't match linked task phases

**UI:**
- Real-time badge in header: "⚠️ 5 Issues Detected"
- Expandable panel listing each issue with "Fix" button
- Auto-suggest fixes (e.g., "Assign reviewer to S-105" → dropdown pre-loaded)

---

### B. Delay Prediction

**AI Agent: "Risk Forecaster"**

**Inputs:**
- Historical turnaround times (detailing, fabrication, delivery)
- Current progress rates
- Weather forecasts (for outdoor erection)
- Resource availability
- Open RFIs and change orders

**Outputs:**
- Predicted completion date vs target (with confidence %)
- Tasks/packages at risk of missing target by >3 days
- Recommended mitigation (expedite detailing, add fab crew, pre-order truck)

**UI:**
- Risk score per package (0-100, color-coded)
- Trend chart showing predicted vs baseline over time
- "What-if" scenario tool: "If WP-002 delayed 5d, what's the impact?"

---

### C. Optimized Sequencing Suggestions

**AI Agent: "Sequence Optimizer"**

**Scenario:**
User has 10 packages in fabrication with limited shop capacity (30 tons/day).

**AI Analysis:**
- Analyzes delivery dates, erection critical path, resource availability
- Suggests optimal fabrication order to minimize late deliveries
- Proposes crew assignments based on skills and workload
- Identifies packages that can run in parallel vs sequential

**UI:**
- "Optimize Sequence" button in fabrication module
- Shows current vs suggested sequence side-by-side
- Highlights expected improvement (e.g., "Reduces late deliveries by 40%")
- One-click apply (updates all package priorities)

---

### D. Status Summary Generation

**AI Agent: "Status Reporter"**

**Use Case:**
PM needs weekly update for GC/owner.

**AI Generates:**
- Executive summary (2-3 paragraphs)
- Key metrics (completion %, on-time delivery %, schedule adherence)
- Critical issues and mitigation plans
- Upcoming milestones (next 2 weeks)
- Format: Email-ready text or PDF attachment

**UI:**
- "Generate Summary" button in each module
- Template selection (weekly update, executive summary, delay notice)
- Editable output before sending
- Auto-includes relevant charts/graphs

---

### E. Overdue & At-Risk Item Surfacing

**AI Agent: "Priority Triager"**

**Auto-Detection:**
- Items >3 days overdue
- Items due <7 days and not started
- Items with variance >20% from baseline
- Items blocking high-priority downstream work

**Auto-Actions:**
- Elevates priority to HIGH or CRITICAL
- Sends notifications to assigned users
- Suggests reassignment if assignee overloaded
- Proposes schedule adjustments to recover

**UI:**
- Auto-populated triage queue at top of each module
- Snooze/dismiss options with required reason
- Escalation path (e.g., auto-notify PM if item overdue >7 days)

---

## 6. ACCEPTANCE CRITERIA

### A. Work Packages Module

**Functional Requirements:**
- ✅ User can create package, link to SOV, assign PM, set target dates
- ✅ System validates phase gates before allowing advancement
- ✅ Phase advancement creates downstream records (fab, delivery) automatically
- ✅ User can view linked drawing sets, tasks, SOV lines, and financials in one panel
- ✅ Batch operations: advance multiple packages, bulk reassign, bulk delete

**UX Rules:**
- Default view: Phase-grouped with active phase expanded
- Readiness gates displayed for each package (drawings, labor, schedule)
- Action button text changes based on state (not generic "Advance")
- Mobile: Phase headers sticky, cards full-width

**Status Definitions:**
- **ACTIVE:** Package in current phase, work in progress
- **ON_HOLD:** Work paused, reason required
- **COMPLETE:** All phases closed, ready for billing
- **CANCELLED:** Scope removed, no further work

**Warning Thresholds:**
- RED: Missing >50% of prerequisites for phase advancement
- AMBER: Missing <50% prerequisites OR due date <7 days
- BLUE: All prerequisites met, ready to advance

---

### B. Detailing Module

**Functional Requirements:**
- ✅ User can create drawing set, upload sheets, assign reviewer, set due date
- ✅ Status progression enforced (can't skip IFA → FFF without BFA/BFS)
- ✅ Revision history auto-created on status change
- ✅ Batch reviewer assignment with workload balancing
- ✅ RFI creation pre-populated with drawing set context

**UX Rules:**
- Priority queue always top (overdue + due <3 days)
- Status shown as visual pipeline with current step highlighted
- Reviewer dropdown shows current workload count (e.g., "Joe (5 sets)")
- Overdue items have red left-edge bar

**Status Definitions:**
- **IFA (Issued for Approval):** Submitted to GC/owner, awaiting feedback
- **BFA (Back from Approval):** Returned with markups, needs scrubbing
- **BFS (Back from Scrub):** Scrubbed by detailer, ready for final PM review
- **FFF (Fit for Fabrication):** Approved, released to shop
- **As-Built:** Post-erection redline set

**Warning Thresholds:**
- RED: Overdue (past due_date and not FFF)
- AMBER: Due <3 days and not BFS or FFF
- BLUE: Due 3-7 days

---

### C. Fabrication Module

**Functional Requirements:**
- ✅ User can create fabrication record, link to work package, set target completion
- ✅ QC inspection steps tracked (dimensional, weld, coating, final)
- ✅ QC holds block ready-to-ship status
- ✅ System warns if fabrication target misaligned with delivery schedule
- ✅ Weight/piece count variance flagged if >10% from work package estimate

**UX Rules:**
- Hot list shows READY_TO_SHIP and QC_HOLD items
- Fabrication status color-coded by urgency (based on delivery target)
- QC badge expandable to show inspection checklist
- Capacity indicator updates in real-time

**Status Definitions:**
- **NOT_STARTED:** Awaiting shop release (drawings not FFF)
- **IN_PROGRESS:** Actively being fabricated
- **QC_INSPECTION:** Awaiting quality control
- **QC_HOLD:** Failed inspection, rework required
- **READY_TO_SHIP:** QC passed, ready for delivery scheduling
- **COMPLETED:** Delivered and confirmed

**Warning Thresholds:**
- RED: QC hold >3 days OR delivery target <3 days and not ready
- AMBER: Delivery target <7 days and progress <80%
- BLUE: On track, no issues

---

### D. Deliveries Module

**Functional Requirements:**
- ✅ User can schedule delivery, assign carrier, set scheduled date
- ✅ System auto-calculates variance (actual vs scheduled)
- ✅ Delivery status updates trigger notifications to superintendent
- ✅ Linked erection tasks updated if delivery delayed
- ✅ Carrier performance tracked (on-time %, avg variance)

**UX Rules:**
- Default view: Timeline (grouped by delivery date)
- Upcoming deliveries (next 14 days) highlighted
- Variance displayed with visual indicator (early=green, late=red)
- Erection impact shown inline ("Delays 3 tasks by 2d")

**Status Definitions:**
- **SCHEDULED:** Confirmed with carrier, awaiting pickup
- **IN_TRANSIT:** Left shop, en route to site
- **DELIVERED:** Arrived on site, offloaded
- **DELAYED:** Past scheduled date, not delivered
- **CANCELLED:** Delivery cancelled or rescheduled

**Warning Thresholds:**
- RED: Delayed >1 day OR fabrication not ready <3 days before scheduled delivery
- AMBER: Scheduled <3 days and fabrication <95% complete
- BLUE: Delivery confirmed, on track

---

## 7. FUTURE-STATE CONCEPT: UNIFIED EXECUTION DASHBOARD

### Vision: One Integrated Workflow

**Unified Execution Hub:**
A single dashboard that surfaces the right information at the right time, organized by workflow stage rather than data silo.

```
┌─────────────────────────────────────────────────────────────┐
│ PROJECT EXECUTION DASHBOARD                    [ABC Steel] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─ ACTION REQUIRED (7) ────────────────────────────────┐   │
│ │ ⚠️ 2 Drawings Overdue (Detailing)                     │   │
│ │ 🟠 1 QC Hold (Fabrication)                            │   │
│ │ 📅 4 Deliveries This Week (Logistics)                 │   │
│ │ [Triage Queue →]                                      │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─ WORKFLOW PIPELINE ──────────────────────────────────┐   │
│ │                                                       │   │
│ │ DETAILING     FABRICATION    DELIVERY      ERECTION  │   │
│ │ ─────────     ───────────    ────────      ────────  │   │
│ │ │ 6 Sets  │   │ 18 Pkgs │    │ 8 Loads│    │ 12 Tasks│ │
│ │ │ 2 OVD   │→  │ 6 Ready │→   │ 3 Next │→   │ 4 Active││
│ │ │ 4 Due3D │   │ 2 Hold  │    │ 2 Late │    │ 1 Block ││
│ │                                                       │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─ CRITICAL PATH VIEW ─────────────────────────────────┐   │
│ │ WP-001: Main Columns [■■■■■■■■░░] 80%               │   │
│ │ ├─ Detailing: FFF ✅                                  │   │
│ │ ├─ Fabrication: 75% (On Track)                       │   │
│ │ ├─ Delivery: Feb 1 (5d out)                          │   │
│ │ └─ Erection: Ready Feb 2                             │   │
│ │                                                       │   │
│ │ WP-002: Beams [■■■■░░░░░░] 40% ⚠️ AT RISK           │   │
│ │ ├─ Detailing: BFA (Delayed 3d)                       │   │
│ │ ├─ Fabrication: Waiting on drawings                  │   │
│ │ ├─ Delivery: TBD                                     │   │
│ │ └─ [View Mitigation Options]                         │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### One Design Language

**Typography:**
- Headers: Uppercase, bold, tracking-widest (consistent hierarchy)
- Body: Sentence case, medium weight
- Metadata: Font-mono, size-xs, zinc-600
- Numbers: Font-mono, bold (KPIs, dates, counts)

**Color Palette (Steel Industry Theme):**
- Primary: Amber (#F59E0B) - Actions, progress, highlights
- Background: Black (#000000) / Zinc-900 (#18181B)
- Success: Green-500 (#10B981)
- Warning: Amber-500 (#F59E0B)
- Critical: Red-500 (#EF4444)
- Info: Blue-500 (#3B82F6)
- Neutral: Zinc-400 (#A1A1AA)

**Spacing:**
- Card padding: 4 (16px)
- Section gaps: 6 (24px)
- KPI strip: py-4, gap-6
- Button heights: h-9 (default), h-8 (compact)

**Component Library:**
- ExecutionCard (shared across all modules)
- KPIStrip (3-tier header system)
- FilterBar (multi-select pills)
- ActionButton (context-aware label/icon)
- StatusPipeline (visual flow indicator)
- ThreatIndicator (⚠️ red/amber/blue warnings)

---

### One Information Architecture

**Data Hierarchy (Top to Bottom):**
1. **Alerts & Actions:** What needs immediate attention
2. **Pipeline Status:** High-level workflow state
3. **Grouped Work:** Items organized by phase, status, or date
4. **Detail Drill-Down:** Expandable cards or side panels
5. **Historical Data:** Completed items, archived, analytics

**Navigation Model:**
```
Left Sidebar: Module navigation (current)
Top Header: Project selector + AI assistant (current)
Breadcrumbs: Show drill-down path (Project > Work Packages > WP-001 > Tasks)
Quick Links: Jump between linked items (Drawing Set ←→ Work Package ←→ Tasks)
```

**Search & Filter Persistence:**
- Last used filters saved per module
- Named filter views (e.g., "My Overdue Items", "This Week's Deliveries")
- Global search across all modules (Cmd+K)

---

### One Predictable User Experience

**Interaction Patterns (Applied Everywhere):**

1. **Click Card:** Open details panel (Sheet)
2. **Click Action Button:** Execute action with confirmation if destructive
3. **Checkbox Select:** Enable batch operations (bulk update, assign, delete)
4. **Drag & Drop:** Reorder priorities, reassign resources (future enhancement)
5. **Keyboard Shortcuts:**
   - `N`: New item
   - `R`: Refresh
   - `F`: Toggle filters
   - `/`: Focus search
   - `Cmd+K`: Command palette

**Feedback Mechanisms:**
- Toast notifications for all mutations (success/error)
- Loading states: Spinner + "Creating..." text
- Optimistic updates where possible (UI updates before server confirms)
- Undo option for destructive actions (5-second window)

**Mobile Adaptations:**
- Headers collapse to hamburger menu
- KPI strip becomes vertical carousel (swipe)
- Filters move to bottom sheet
- Cards stack vertically, full-width
- Action buttons become floating action button (FAB) for primary action

---

## 8. IMPLEMENTATION PRIORITIES

### Phase 1: Core UX Unification (Week 1-2)
- [ ] Build ExecutionCard component with all variants
- [ ] Implement 3-tier header system across all modules
- [ ] Standardize KPI strip with color thresholds
- [ ] Deploy universal warning logic (red/amber/blue)
- [ ] Add cross-module linking (badges with popovers)

### Phase 2: Workflow Intelligence (Week 3-4)
- [ ] Implement phase gates and validation
- [ ] Build triage queue (action required items)
- [ ] Add auto-priority calculation
- [ ] Deploy handoff notifications
- [ ] Integrate QC checklists

### Phase 3: AI Augmentation (Week 5-6)
- [ ] Deploy Schedule Guardian (conflict detection)
- [ ] Integrate Risk Forecaster (delay prediction)
- [ ] Build Sequence Optimizer
- [ ] Add Status Reporter (summary generation)
- [ ] Implement predictive alerts

### Phase 4: Refinement & Mobile (Week 7-8)
- [ ] Mobile-specific layouts
- [ ] Keyboard shortcuts
- [ ] Offline support for field use
- [ ] Performance optimization (virtualized lists for 500+ items)
- [ ] User acceptance testing with PMs/superintendents

---

## 9. SUCCESS METRICS

**Quantitative:**
- Time to create work package: <2 min (currently ~5 min)
- Drawing approval turnaround: <7 days (currently ~10 days)
- Fabrication-to-delivery lead time: <3 days (currently ~5 days)
- Data quality: <5% items missing dates/assignments (currently ~20%)
- User errors: <2% invalid phase transitions (currently ~8%)

**Qualitative:**
- "I know what needs my attention without scrolling"
- "Phase gates prevent me from making sequence mistakes"
- "AI summaries save me 30 min/week writing status reports"
- "Mobile UI lets me update from the shop floor"
- "Cross-linking eliminated 'where did I see that drawing set?' confusion"

---

## 10. APPENDIX: DESIGN PATTERNS

### Pattern A: Readiness Gate Indicator
```jsx
<ReadinessGate 
  label="Drawings" 
  status="incomplete" // complete | incomplete | partial
  details="2 of 3 sets FFF"
  blocking={true}
/>
```
Renders: `⚠️ Drawings: 2/3 FFF` (red if blocking, amber if partial, green if complete)

---

### Pattern B: Status Pipeline
```jsx
<StatusPipeline 
  stages={['IFA', 'BFA', 'BFS', 'FFF']}
  current="BFA"
/>
```
Renders: `IFA ─→ [BFA] ─→ BFS ─→ FFF` with current stage highlighted

---

### Pattern C: Linked Items Badge
```jsx
<LinkedBadge 
  entityType="Task"
  count={12}
  onClick={() => showLinkedTasks(packageId)}
/>
```
Renders: `🔗 12 Tasks` (clickable, opens popover)

---

### Pattern D: Variance Indicator
```jsx
<VarianceIndicator 
  baseline={10}
  actual={13}
  unit="days"
  threshold={2}
/>
```
Renders: `+3d` in red (exceeds threshold)

---

## END OF SPECIFICATION

**Next Steps:**
1. Review with PM/superintendent for field validation
2. Prioritize Phase 1 implementation
3. Build ExecutionCard component library
4. Iterate on AI agent prompts with real project data
5. Schedule weekly design review during implementation

**Document Version:** 1.0  
**Date:** Jan 27, 2026  
**Owner:** Base44 Product Team