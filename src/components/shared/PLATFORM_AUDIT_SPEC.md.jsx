# SteelBuild Pro: Complete Platform Audit & Overhaul Specification
**Full System UX/UI Audit • Date Bug Root-Cause Analysis • Future-State Redesign**

---

## EXECUTIVE SUMMARY

**Platform:** SteelBuild Pro (Steel Construction Project Execution Platform)  
**Scope:** End-to-end audit of 20+ modules covering detailing, fabrication, logistics, delivery, financials, resources, and field operations  
**Critical Issue:** Persistent date picker bug causing off-by-one-day errors across scheduling, delivery tracking, and reporting  
**Primary Finding:** Fragmented UX with inconsistent patterns, redundant filters, poor cross-module workflows, and timezone/date handling issues  

**Recommended Action:** Phased overhaul with immediate date bug fix, followed by unified design system deployment and workflow streamlining.

---

## 1. FULL PLATFORM AUDIT (MODULE-BY-MODULE)

### 1.1 WORK PACKAGES MODULE

**Current State:**
- Table-based list with inline phase advancement
- KPIs show counts (active, complete, tonnage, avg progress)
- Phase/status filters in controls bar
- Advance phase button (→) visible per row

**UX/UI Issues:**
- ⚠️ **CRITICAL:** No visual indication of phase gate prerequisites (drawings FFF, labor allocated)
- Tonnage shown but no variance from SOV estimate
- Progress bar shows % but not what's blocking completion
- SOV line count displayed without billing alignment indicator
- Equal visual weight for all packages (no urgency hierarchy)
- "Advance Phase" button doesn't explain validation requirements

**Workflow Bottlenecks:**
- Manual verification required before phase transitions (user must check detailing status separately)
- No visibility into labor breakdown health (planned vs allocated hours)
- Can't see which packages are consuming budget vs forecast
- Missing cross-reference to schedule readiness (are tasks created? assigned?)

**Missing/Unclear Data:**
- Phase gate checklist (what must be complete to advance?)
- Linked drawing set status summary
- Budget consumption vs work package scope
- Dependency chain (which packages block others?)

**High-Impact Risks:**
- Advancing to fabrication before drawings approved (rework risk)
- Missing labor allocation causing shop schedule gaps
- Phase mismatch between package and linked tasks

**Immediate Fixes:**
- Add readiness indicator (✅/⚠️) next to advance button
- Surface drawing status inline (e.g., "Drawings: 2/3 FFF")
- Block phase advancement if prerequisites not met

**Systemic Redesign Needs:**
- ExecutionCard component with phase flow visualization
- Readiness gate widget
- Cross-module status aggregation

---

### 1.2 DETAILING MODULE

**Current State:**
- Priority queue for overdue + due-soon items (effective)
- Status flow: IFA → BFA → BFS → FFF
- Inline reviewer assignment dropdown
- Batch selection with checkbox
- History and RFI buttons per row

**UX/UI Issues:**
- ⚠️ **CRITICAL:** Status acronyms (IFA, BFA, BFS, FFF) require industry knowledge—no on-screen legend
- Reviewer dropdown shows user names but not current workload
- "RFI" button is decorative—doesn't actually create RFI, just placeholder
- Overdue items flagged but no escalation path or auto-notify
- No dependency awareness (can't see "Package A blocks Package B on critical path")
- Revision history modal-only—can't see quick diff between revisions

**Workflow Bottlenecks:**
- Bulk reviewer assignment lacks intelligence (no load balancing suggestions)
- Can't filter by "sets blocking fabrication" or "sets with no reviewer"
- No historical turnaround time display (users don't know if 10-day cycle is normal)
- Batch actions present but no smart defaults ("assign all structural to Joe")

**Missing/Unclear Data:**
- Expected approval turnaround based on historical data
- Sheet-level status (sheets reviewed vs total)
- Markup density (# of comments/redlines per sheet)
- Downstream impact (which work packages awaiting this set?)

**High-Impact Risks:**
- Drawing sets languishing unassigned (no auto-assign logic)
- Overdue sets not escalating to PM/super automatically
- Critical path sets not prioritized visually

**Immediate Fixes:**
- Add status flow legend at top (IFA → BFA → BFS → FFF with labels)
- Show reviewer workload in dropdown (e.g., "Joe (5 active sets)")
- Make RFI button functional (pre-fill RFI form with drawing set context)

**Systemic Redesign Needs:**
- Visual status pipeline component
- Auto-prioritization based on critical path + due date
- Integrated RFI creation workflow

---

### 1.3 FABRICATION TRACKING MODULE

**Current State:**
- Generic DataTable with package name, project, status, weight, pieces, target, QC, priority
- KPIs: in progress, ready to ship, complete, total packages
- Search + filters (project, status, PM)
- Edit/delete actions per row

**UX/UI Issues:**
- ⚠️ **CRITICAL:** No fabrication-specific intelligence (shop capacity, queue, hot list)
- QC status is a badge—no drill-down into inspection checklist or hold reasons
- Priority field exists but no auto-prioritization based on delivery dates
- No linkage to detailing state (can't see "waiting on Rev 4" vs "drawings approved 2d ago")
- Weight/piece count shown but not compared to work package estimates (no variance detection)
- Target completion visible but no connection to delivery schedule or erection sequencing

**Workflow Bottlenecks:**
- Can't see "ready to release to shop" vs "blocked on detailing" vs "in QC hold" at a glance
- No fabrication capacity planning (tonnage/day, crew loading, bay assignments)
- No visual grouping by project priority or delivery sequence
- Missing "next 10 pieces to cut" or "hot list" view for shop floor use

**Missing/Unclear Data:**
- Fabrication start date vs drawing FFF date (lag time)
- Shop capacity utilization (tons/day, bay occupancy)
- Tonnage variance (estimated vs actual weight)
- Link to delivery record (is truck booked? delivery date confirmed?)

**High-Impact Risks:**
- Fabricating without FFF drawings (rework, scrap)
- Missing delivery deadlines due to poor shop sequencing
- QC holds blocking ready-to-ship without visibility

**Immediate Fixes:**
- Add "Hot List" section at top (ready-to-ship + QC holds)
- Link to drawing status (show "⚠️ Drawings: BFA" if not FFF)
- Display delivery target date inline

**Systemic Redesign Needs:**
- Shop floor priority queue
- QC inspection checklist UI
- Capacity planning integration

---

### 1.4 DELIVERIES MODULE

**Current State:**
- Rich KPIs (on-time %, avg variance, delayed count, total weight)
- Timeline + list views with scheduled vs actual dates
- Variance calculation (days early/late)
- Carrier tracking
- Multi-select filters (projects, statuses, carriers, date ranges)
- Extended KPIs tab

**UX/UI Issues:**
- ⚠️ **CRITICAL:** Task-based deliveries mixed with manual entries—visually confusing (blue "SCHEDULE" badge)
- Variance shown per row but no timeline view showing slippage trends over time
- Carrier performance tracked but no carrier scorecard or reliability indicators
- Extended KPIs isolated in tab—should be contextual with delivery planning
- No connection to erection sequencing (delivery order vs install order mismatch)

**Workflow Bottlenecks:**
- Can't see "deliveries blocking erection tasks this week"
- No grouping by project phase or erection area (grid 1, grid 2, etc.)
- Scheduled vs actual comparison is row-level—no aggregate view of schedule adherence
- Missing "delivery readiness" status (fab complete? QC passed? truck reserved? crew notified?)

**Missing/Unclear Data:**
- Fabrication readiness for upcoming deliveries (is shop done? QC clear?)
- Erection task impact (if delivery delayed, which tasks slip?)
- Carrier historical performance (avg on-time %, avg variance by carrier)
- Delivery sequence optimization (is this the right order for install?)

**High-Impact Risks:**
- Scheduling delivery before fabrication complete (truck shows up, nothing to load)
- Late deliveries cascading to erection delays without warning
- Delivery sequence not aligned with erection critical path

**Immediate Fixes:**
- Add fabrication status to delivery row (e.g., "Fab: 85% ⚠️ Not Ready")
- Show erection impact inline ("Delays 3 tasks by 2d")
- Default view should be timeline (upcoming deliveries) not flat list

**Systemic Redesign Needs:**
- Timeline-first view with date grouping
- Fabrication readiness gates
- Erection dependency warnings

---

### 1.5 SCHEDULE MODULE

**Current State:**
- Multiple views: Phase, Timeline, List, Gantt, Calendar
- Project selector, search, view mode toggles, status filters
- KPIs: task counts by status
- AI Assistant integration (conflict detection, optimization, summaries)
- Task creation via FAB or clicking work packages

**UX/UI Issues:**
- View mode abundance (5 options) may cause decision fatigue
- Phase/Timeline views recently added—good improvements
- AI Assistant is optional—should surface critical conflicts automatically in header KPIs
- Task form is comprehensive but long (may overwhelm for quick updates)
- No visual indication of critical path vs non-critical tasks in list views

**Workflow Bottlenecks:**
- Task creation requires selecting work package—if user doesn't know WP ID, they must go to Work Packages first
- Dependencies configured in detailed form but not visible in list/phase/timeline views
- Gantt view requires horizontal scrolling on mobile (not mobile-optimized)

**Missing/Unclear Data:**
- Critical path indicator on task cards
- Baseline vs current dates (schedule variance)
- Float/slack days
- Predecessor/successor visual linkage

**High-Impact Risks:**
- Missing dependencies causing invalid schedules
- No early warning for critical path slippage
- Mobile users can't effectively use Gantt view

**Immediate Fixes:**
- Surface AI conflicts in KPI strip (e.g., "⚠️ 3 CONFLICTS")
- Add critical path badge to tasks on critical path
- Improve mobile Gantt or hide on small screens

**Systemic Redesign Needs:**
- Already strong; focus on surfacing AI insights proactively
- Consider consolidated view combining Phase + Timeline

---

### 1.6 TO-DO LIST MODULE

**Current State:**
- Project-scoped todo items
- Quick add input (press Enter)
- Detailed form for full task creation
- Checkbox to mark done
- Filters: status, priority
- Stats: total, completed, due today, overdue

**UX/UI Issues:**
- ⚠️ **MEDIUM:** Duplicate concept with Schedule module (both track tasks)
- Not linked to work packages or schedule tasks (isolated silo)
- No recurring task support
- Limited cross-linking (can't link to RFI, drawing set, delivery)

**Workflow Bottlenecks:**
- Users unclear when to use To-Do vs Schedule
- No sync between Schedule tasks and To-Do items
- Completing a to-do doesn't update related schedule task

**Missing/Unclear Data:**
- Relationship to schedule/work packages
- Task source (manual vs auto-generated from workflow)
- Responsible party handoff (who assigned? to whom?)

**High-Impact Risks:**
- Data duplication (tasks in both Schedule and To-Do)
- Confusion over single source of truth

**Immediate Fixes:**
- Clarify use case: "Personal to-dos" vs "Project tasks" (Schedule)
- Add option to convert to-do to schedule task
- Consider merging into Schedule module as "Quick Tasks" filter

**Systemic Redesign Needs:**
- Unify task management (To-Do becomes filter view within Schedule)
- Or clearly separate: To-Do = personal, Schedule = project execution

---

### 1.7 DOCUMENTS MODULE

**Current State:**
- Folder tree + list view hybrid
- AI search panel
- Approval workflow panel
- Multi-select filters (project, category, status, phase)
- Sort options (date, title, category, status)
- Version control support
- CSV import capability
- OCR processing integration

**UX/UI Issues:**
- Feature-rich but overwhelming (tree + AI search + approval + OCR + versions)
- Folder tree on left, but many documents may not use folders (folder_path = '/')
- Approval workflow panel shown per document—should be queue/dashboard style
- OCR button requires user to click—should auto-process on upload for searchable PDFs
- Version history shown in modal—could be inline timeline

**Workflow Bottlenecks:**
- Finding documents requires multiple filter selections
- No quick jump to "my pending approvals" or "documents I uploaded"
- Approval workflow requires opening each document individually
- No bulk approval/rejection

**Missing/Unclear Data:**
- Document read status (has reviewer opened it?)
- Time in current workflow stage (how long pending review?)
- Full-text search within PDFs (OCR exists but not auto-applied)

**High-Impact Risks:**
- Critical documents stuck in approval queue without visibility
- Duplicate uploads (no duplicate detection)

**Immediate Fixes:**
- Add "My Approvals" quick filter
- Auto-run OCR on upload (background job)
- Bulk approval UI for multiple documents

**Systemic Redesign Needs:**
- Approval dashboard (separate from document library)
- Document relationship graph (supersedes, relates to, revises)
- Smart folders (auto-categorize by category/phase/work package)

---

### 1.8 DAILY LOGS MODULE

**Current State:**
- Log list with date, project, weather, crew, hours, issues (safety/delay)
- Form includes: weather, temps, crew count, hours, work performed, materials, visitors, safety, delays, notes
- Photo capture integration
- Project filter

**UX/UI Issues:**
- ⚠️ **DATE BUG OBSERVED:** Date picker defaulting to today—if user selects different date, may log as previous day
- Form is comprehensive but repetitive for daily use (typing same crew count, weather)
- No templates or auto-fill from yesterday's log
- Photos shown as grid in edit mode but not in table view (user must open log to see photos)

**Workflow Bottlenecks:**
- Daily logs not linked to schedule tasks or work packages (isolated data)
- Can't auto-populate "work performed" from completed tasks
- Weather data manual entry—should integrate weather API
- No weekly rollup view (summary of week's activities)

**Missing/Unclear Data:**
- Productivity metrics (tons erected per crew-hour, pieces installed per day)
- Cumulative hours by project (running total)
- Photo thumbnails in list view
- Link to schedule tasks completed that day

**High-Impact Risks:**
- Safety incidents logged but no auto-notification to safety manager
- Delay reasons not categorized—hard to analyze trends
- Logs not feeding into earned value or productivity tracking

**Immediate Fixes:**
- **FIX DATE BUG** (see Section 5)
- Add "Copy from yesterday" button
- Auto-notify on safety incident
- Integrate weather API for auto-fill

**Systemic Redesign Needs:**
- Link logs to schedule (auto-populate work from completed tasks)
- Productivity dashboard (derived from logs)
- Mobile-first design (field supers use on phone)

---

### 1.9 FIELD TOOLS MODULE

**Current State:**
- Tabbed interface: Photo, Scan, Sync, Alerts
- Photo capture with GPS tagging
- Barcode scanner for equipment/delivery verification
- Offline sync status
- Notification manager

**UX/UI Issues:**
- Underutilized (good features but not integrated into workflows)
- Photo capture works but photos not auto-linked to daily logs or tasks
- Barcode scan finds equipment but doesn't trigger any workflow (e.g., "check in equipment to project")
- Offline sync is passive—should show which entities have pending sync
- Notification manager is settings-only—no actionable notification queue

**Workflow Bottlenecks:**
- Field tools isolated—should be embedded in relevant modules (photo capture in Daily Logs, barcode in Deliveries)
- No field-optimized task view (large buttons, voice input, minimal typing)

**Missing/Unclear Data:**
- GPS coordinates for photos (feature exists but not displayed)
- Equipment check-in/check-out workflow (barcode scan should update resource status)
- Voice-to-text for field notes

**High-Impact Risks:**
- Field users bypassing system (too many clicks to capture field data)
- Photos scattered (not organized by work package or task)

**Immediate Fixes:**
- Integrate photo capture directly into Daily Logs and Task forms
- Barcode scan should trigger equipment assignment workflow
- Simplify UI for glove-friendly use (larger touch targets)

**Systemic Redesign Needs:**
- Field-optimized UI mode (toggle in settings)
- Voice input for notes
- Offline-first architecture with clear sync indicators

---

### 1.10 COST CODES MODULE

**Current State:**
- Simple CRUD for cost codes (code, name, category, unit, active/inactive)
- Category-based KPIs (count per category: labor, material, equipment, sub, other)
- Search + category filter
- Table view with edit/delete

**UX/UI Issues:**
- Basic functionality—works but no intelligence
- No usage tracking (which cost codes are heavily used? which are never used?)
- No budget summary per cost code (how much allocated across all projects?)
- Active/inactive toggle exists but no archive view

**Workflow Bottlenecks:**
- Cost codes not linked to SOV or labor categories (separate silos)
- Creating financials/expenses requires manual cost code selection (no smart suggestions)

**Missing/Unclear Data:**
- Usage frequency (X expenses, Y financials use this code)
- Budget allocation across projects
- Suggested codes based on description (AI-powered categorization)

**High-Impact Risks:**
- Inconsistent cost code usage (typos, duplicates)
- Inactive codes still appearing in dropdowns

**Immediate Fixes:**
- Filter dropdown menus to exclude inactive codes by default
- Add usage count column ("Used in 23 transactions")

**Systemic Redesign Needs:**
- Cost code analytics (spend by code, variance, trends)
- AI-suggested cost code mapping for expenses

---

### 1.11 FINANCIALS MODULE

**Current State:**
- Tabs: Budget, Actuals, SOV, Invoices, ETC (Estimate to Complete)
- Budget shows original, approved changes, current, committed, actual, forecast
- Actuals show expenses with drill-down
- SOV manager with cost code alignment
- Invoice tracking
- ETC calculations

**UX/UI Issues:**
- Tab-heavy interface—users must click through multiple tabs to get full financial picture
- Cost variance shown per line but no rollup summary card (e.g., "Total Variance: -$45K (3% under)")
- SOV cost code alignment is manual—no auto-suggestion based on description
- Burn rate shown in sub-component but not in main KPI strip

**Workflow Bottlenecks:**
- Updating budget requires navigating to Budget tab, finding cost code, editing
- No "at-risk" cost codes surfaced (forecast > budget by >10%)
- Invoice generation requires manual line item selection—should pre-populate from SOV progress

**Missing/Unclear Data:**
- Cash flow forecast (when will invoices be paid?)
- Cost trend over time (are we trending over or under?)
- Variance by phase (detailing under, fabrication over, etc.)

**High-Impact Risks:**
- Cost overruns not flagged until too late
- SOV billing misaligned with cost codes (revenue vs cost disconnect)

**Immediate Fixes:**
- Add "At Risk" KPI card (count of cost codes >10% over forecast)
- Surface burn rate in main KPI strip
- Auto-suggest SOV cost code mappings based on historical data

**Systemic Redesign Needs:**
- Unified financial dashboard (all tabs consolidated into single view with drill-downs)
- Predictive variance alerts
- Cost-to-revenue alignment checker

---

### 1.12 DELIVERIES MODULE (Extended Analysis)

**Additional Issues:**
- ⚠️ **DATE BUG CRITICAL:** Scheduled date picker frequently logs previous day—impacts delivery planning and erection coordination
- Variance calculation depends on accurate dates—bug compounds error
- "Upcoming" filter (next 7/14 days) uses scheduled_date—if date off by 1, delivery may not appear in filter

**Date Bug Impact:**
- Delivery scheduled for Feb 1 logged as Jan 31
- Erection crew shows up Feb 1, material not on site
- Variance metrics skewed (appears 1 day late when actually on time)

---

### 1.13 RFIs MODULE

**Current State:**
- (Not read in detail; inferred from references in other modules)
- RFI creation, tracking, response workflow
- Status: draft, submitted, pending, answered, closed
- Priority levels
- Linked to drawings, change orders

**Inferred Issues:**
- RFI creation not integrated into detailing workflow (separate navigation)
- No auto-RFI suggestions based on drawing delays or unresolved markups
- Response time tracking likely manual

**Immediate Fixes:**
- Add RFI quick-create from Detailing module (pre-fill drawing set, project)
- Track response SLA (days pending)

---

### 1.14 CHANGE ORDERS MODULE

**Current State:**
- (Not read in detail; inferred from entity schema)
- CO number, title, description, status (pending, submitted, approved, rejected)
- Cost impact, schedule impact
- SOV allocation breakdown

**Inferred Issues:**
- SOV allocations manual—no auto-suggest based on CO description
- Schedule impact entered as days but not linked to actual schedule tasks (manual rebaselining required)

**Immediate Fixes:**
- Auto-link CO to affected tasks (update task end dates based on schedule_impact_days)
- Suggest SOV line items based on CO description (AI categorization)

---

### 1.15 ANALYTICS & REPORTS

**Current State:**
- (Viewed in preview; not read in detail)
- Multiple dashboards: EVM, Portfolio, Risk Analysis, Trends
- Chart widgets, heatmaps, comparisons
- Custom dashboard builder

**Inferred Issues:**
- Analytics powerful but disconnected from operational modules
- Insights generated but not actionable (no "click to fix" links)
- Reports likely PDF export—no interactive drill-down from report to source data

**Immediate Fixes:**
- Link anomalies to source (e.g., "Budget overrun on cost code 05120" → click → Financials page filtered)
- Add "Action Required" section in analytics (top risks with fix buttons)

---

### 1.16 RESOURCE MANAGEMENT MODULE

**Current State:**
- Tabs: Capacity Planning, Skill Matrix, Overview, Leveling, Forecast
- KPIs: total, assigned, available, overallocated
- Charts: type distribution, allocation by project, utilization bar chart
- Alerts for overallocated (>3 tasks) and underutilized (0 tasks)

**UX/UI Issues:**
- Excellent structure but heavy on charts—actionability secondary to analysis
- Overallocated resources shown in alert card but no "resolve" button
- Skill matrix exists but not used for task assignment suggestions
- Forecast tab likely predictive but not linked to work package planning

**Workflow Bottlenecks:**
- Can't bulk reassign tasks from overallocated to underutilized resources
- No integration with schedule (can't see resource conflicts on Gantt view)

**Missing/Unclear Data:**
- Resource cost (labor rate, equipment daily rate) not shown in utilization view
- Skills vs task requirements matching (does Joe have AWS cert for this task?)

**Immediate Fixes:**
- Add "Rebalance" button in overallocated alert (AI suggests reassignments)
- Show resource cost in utilization table ($/hour or $/day)

**Systemic Redesign Needs:**
- Integrated resource assignment (from Schedule, suggest resources based on skills + availability)

---

### 1.17 MEETINGS MODULE

**Current State:**
- (Inferred from entity schema)
- Meeting date/time, attendees, notes, action items
- Recurring meeting support
- Reminder notifications

**Inferred Issues:**
- Likely calendar list view—no visual calendar integration
- Action items tracked but not linked to Schedule tasks or To-Dos
- Recurring meetings generated but no template support

**Immediate Fixes:**
- Link action items to task creation (one-click convert action item to task)
- Calendar view (week/month grid)

---

### 1.18 MESSAGES MODULE

**Current State:**
- (Inferred from entity schema)
- Likely project-based messaging/chat

**Inferred Issues:**
- May duplicate email communication
- Not integrated with RFIs (should be)

**Immediate Fixes:**
- Link messages to RFIs, drawings, change orders (contextual threads)

---

### 1.19 PROFILE & SETTINGS

**Current State:**
- User profile editing
- Notification preferences
- Integration management (OAuth connectors)

**UX/UI Issues:**
- Settings likely flat list—no categorization
- Notification prefs may not align with actual notification triggers

**Immediate Fixes:**
- Group settings: Account, Notifications, Integrations, Preferences
- Add timezone setting (critical for date bug fix)

---

### 1.20 OTHER MODULES (Brief Notes)

- **Labor & Scope:** Labor breakdown by work package—good structure, likely similar issues to Financials (tab-heavy)
- **Equipment:** Resource subset—likely CRUD with booking calendar
- **Production Notes:** Weekly production meetings—good concept, ensure linkage to actual project progress
- **Insights (AI):** AI-generated insights—should be proactive, not just analytics page

---

## 2. CROSS-MODULE SYSTEMWIDE FINDINGS

### 2.1 Layout Inconsistencies

**Issue:** Three different header structures observed:

**Pattern A (Work Packages, Detailing, Deliveries, Schedule):**
```
Header Bar: Title | Project Selector | Actions
KPI Strip: 4-5 metric cards
Controls Bar: Search + Filters
```

**Pattern B (Documents, Daily Logs, Cost Codes):**
```
Header Bar: Title | Subtitle | Actions
KPI Strip: 3-4 metrics
Filters inline or below
```

**Pattern C (To-Do List, Field Tools):**
```
Header: Title | Project Selector
Stats Bar: KPIs
Quick Add + Filters in same row
```

**Impact:**
- Users must relearn navigation pattern per module
- Inconsistent spacing/padding
- Mobile breakpoints differ (some collapse, some don't)

**Fix:**
- Standardize on Pattern A (3-tier header system)
- Apply to all modules

---

### 2.2 Inconsistent Status/Badge Logic

**Issue:** Status chips use different color schemes and labels across modules:

| **Module**     | **Statuses**                                         | **Colors**                                      |
|----------------|------------------------------------------------------|-------------------------------------------------|
| Work Packages  | active, on_hold, complete                            | Green (active), Amber (hold), Zinc (complete)   |
| Detailing      | IFA, BFA, BFS, FFF, As-Built                         | Blue, Amber, Purple, Green, Zinc                |
| Fabrication    | not_started, in_progress, delayed, ready_to_ship, completed | Zinc, Blue, Red, Amber, Green                   |
| Deliveries     | scheduled, in_transit, delivered, delayed, cancelled | Blue, Purple, Green, Red, Zinc                  |
| Tasks          | not_started, in_progress, completed, on_hold, blocked, cancelled | Zinc, Blue, Green, Amber, Red, Zinc             |
| To-Do          | to_do, in_progress, done                             | Zinc, Blue, Green                               |

**Impact:**
- Blue means "in progress" in some modules, "issued/scheduled" in others
- Green means "complete" in some, "approved/ready" in others
- No universal "at risk" or "critical" visual treatment

**Fix:**
- Define universal status color system:
  - **RED:** Blocked, Failed, Critical, Overdue (>3d)
  - **AMBER:** Warning, Delayed, On Hold, Due Soon (<7d)
  - **BLUE:** In Progress, Active, Pending
  - **GREEN:** Complete, Approved, Delivered, Success
  - **PURPLE:** In Transit, In Review, Processing
  - **ZINC:** Not Started, Draft, Cancelled, Inactive

---

### 2.3 Repeated Filter/Header Designs

**Issue:** Every module implements its own search + filter bar:

- **Work Packages:** Phase + Status dropdowns
- **Detailing:** Status + Discipline + Reviewer dropdowns
- **Fabrication:** Project + Status + PM dropdowns
- **Deliveries:** FilterBar component with multi-select (advanced)
- **Documents:** 5 filters + sort dropdown + search
- **Schedule:** Search + Status button group + View mode toggles

**Impact:**
- Code duplication (6+ different filter implementations)
- Inconsistent UX (some multi-select, some single, some pills, some dropdowns)
- No filter persistence across sessions (except some modules using localStorage inconsistently)

**Fix:**
- Build universal `FilterBarV2` component:
  - Multi-select pill-based filters
  - Persistent via localStorage (per module)
  - Save/load named filter views
  - Clear all button
  - Active filter count badge

---

### 2.4 Duplicate Patterns That Should Be Unified

**Identified Duplicates:**

1. **Project Selector:**
   - 8+ modules have identical project dropdown
   - Should be global component with auto-filtering (admin sees all, users see assigned)
   - Should persist across session (last selected project)

2. **KPI Strip:**
   - Every module has 3-5 KPI cards
   - Layouts vary (grid-cols-3, grid-cols-4, grid-cols-5)
   - Should be `<KPIStrip metrics={[...]} />` component

3. **DataTable:**
   - Used in 12+ modules
   - Already shared component but implementations vary (some use emptyMessage, some custom empty states)
   - Should enforce consistent empty state, loading state, and row actions

4. **Form Patterns:**
   - Every module has Dialog or Sheet with form
   - Labels, inputs, spacing inconsistent
   - Should use `react-hook-form` consistently (some modules do, some don't)

5. **Delete Confirmations:**
   - All modules use AlertDialog for delete
   - Text varies ("Delete X?", "Are you sure?", "Permanently delete...")
   - Should be single `<DeleteConfirmation entity={...} />` component

**Fix:**
- Audit shared components inventory
- Refactor all modules to use shared components exclusively
- Remove duplicate implementations

---

### 2.5 Missing Hierarchy Conventions

**Issue:** No consistent visual hierarchy across modules:

- Some use uppercase titles (WORK PACKAGES), some sentence case (Work Packages)
- KPI labels sometimes uppercase tracking-widest, sometimes normal case
- Font sizes vary (text-xl, text-2xl, text-lg for headers)
- Metadata styling inconsistent (font-mono in some modules, regular font in others)

**Impact:**
- Platform feels like collection of separate apps, not unified system

**Fix:**
- Define typography scale:
  - **Module Title:** text-xl, font-bold, uppercase, tracking-wide
  - **Section Headers:** text-sm, font-bold, uppercase, tracking-wider, text-muted-foreground
  - **Body Text:** text-sm, normal
  - **Metadata:** text-xs, font-mono, text-muted-foreground
  - **Numbers/KPIs:** text-2xl, font-bold, font-mono

---

### 2.6 Breakdowns in Cross-Module Workflow Handoff

**Issue:** Workflow progression disconnected:

**Example Flow: Work Package → Detailing → Fabrication → Delivery**

**Current Reality:**
1. Create work package (Work Packages module)
2. Navigate to Detailing, manually create drawing sets, link to work package
3. Mark drawings FFF (Detailing module)
4. Navigate back to Work Packages, click "Advance Phase" (no validation that drawings are FFF)
5. Navigate to Fabrication, manually create fabrication record, link to work package
6. Mark fabrication "ready to ship" (Fabrication module)
7. Navigate to Deliveries, manually create delivery, link to fabrication
8. Schedule delivery (Deliveries module)

**Problems:**
- 7 navigation hops
- 4 manual data entry points (linking IDs)
- No automated workflow progression
- No validation at handoff points

**Expected Reality:**
1. Create work package with target dates
2. System auto-creates drawing set placeholders
3. Drawings progress through IFA → FFF
4. System auto-advances work package to fabrication when all drawings FFF
5. System auto-creates fabrication record
6. Fabrication progresses to "ready to ship"
7. System auto-creates delivery record with suggested date (based on fab completion + lead time)
8. User confirms delivery details, schedules truck

**Fix:**
- Implement workflow automation (backend functions triggered on status changes)
- Add phase gate validation (cannot advance without prerequisites)
- Auto-create downstream records with intelligent defaults

---

### 2.7 Opportunities for Shared Components

**High-Value Shared Components to Build:**

1. **`ExecutionCard`** (used in Work Packages, Detailing, Fabrication, Deliveries, Schedule)
   - Props: entity, status, actions, expandable, warnings, linkedItems
   - Variants: WorkPackageCard, DetailingCard, FabCard, DeliveryCard

2. **`KPIStrip`** (used in all modules)
   - Props: metrics[] with { label, value, threshold, format }
   - Auto-applies color based on threshold

3. **`FilterBarV2`** (used in all list modules)
   - Props: filterGroups, activeFilters, onFilterChange
   - Built-in search, multi-select, pills, clear all

4. **`StatusPipeline`** (Detailing, Work Packages)
   - Visual flow: IFA → BFA → BFS → FFF with current step highlighted

5. **`ReadinessGate`** (Work Packages, Fabrication, Deliveries)
   - Shows prerequisites: ✅ Drawings FFF, ⚠️ Labor 50% allocated, ❌ QC Pending

6. **`LinkedItemsBadge`** (all modules)
   - Shows count + icon: 🔗 12 Tasks, 📄 3 Drawings, 💰 5 SOV Lines
   - Clickable → popover with quick list

7. **`VarianceIndicator`** (Deliveries, Financials, Schedule)
   - Shows baseline vs actual with color coding
   - Props: baseline, actual, unit, threshold

8. **`ThreatIndicator`** (all modules)
   - ⚠️ red/amber/blue warnings with hover tooltip explaining issue

9. **`ActionButton`** (all modules)
   - Context-aware button (label changes based on entity state)
   - Examples: "Ready to Advance", "Blocked on Drawings", "Create RFI"

10. **`TimelineGroupedView`** (Schedule, Deliveries, potentially Detailing)
    - Groups items by date: Overdue, This Week, This Month, Later

---

## 3. UNIFIED REDESIGN FRAMEWORK

### 3.1 Global Navigation Pattern

**Sidebar Navigation (Current - Good):**
- Grouped by workflow area (Overview, Execution, Design & Fab, Logistics, Cost, Resources, Communications, Insights, Settings)
- Collapsible groups
- Active page highlighted

**Recommendation:** Keep sidebar structure, enhance with:
- Notification badges (🔴 3) on navigation items with pending actions
- Quick jump menu (Cmd+K) for search across all modules
- Recently viewed (last 5 pages) in dropdown at top

---

### 3.2 Card/List/Table Hybrid Component

**Component Hierarchy:**

```
<ExecutionCard>
  <CardStatusBar /> <!-- Left-edge color bar -->
  <CardHeader>
    <StatusIcon />
    <Title />
    <Badges /> <!-- Status, Priority, Phase -->
  </CardHeader>
  <CardMetadata> <!-- ID, dates, assigned user -->
  <CardBody>
    <ProgressIndicators /> <!-- % complete, gates, warnings -->
    <LinkedItems /> <!-- Tasks, Drawings, SOV, etc. -->
  </CardBody>
  <CardActions>
    <PrimaryAction /> <!-- Context-aware button -->
    <SecondaryActions /> <!-- RFI, History, Delete -->
  </CardActions>
</ExecutionCard>
```

**Responsive Behavior:**
- Desktop: Cards in grid (2-3 cols) or list
- Tablet: 2 cols or full-width cards
- Mobile: Full-width cards, sticky headers, swipe actions

---

### 3.3 Status, Priority, and Risk Hierarchy

**Universal Status Categories:**

| **Category**     | **Lifecycle States**                          | **Color**   |
|------------------|-----------------------------------------------|-------------|
| Not Started      | Draft, Not Started, Pending                   | Zinc        |
| Active/Pending   | IFA, In Progress, Scheduled, Pending Review   | Blue        |
| Processing       | BFA, BFS, In Transit, QC Inspection           | Purple      |
| Warning          | On Hold, Delayed, Due <7d                     | Amber       |
| Complete         | Completed, FFF, Delivered, Approved, Done     | Green       |
| Blocked/Failed   | Blocked, QC Hold, Rejected, Overdue, Cancelled| Red         |

**Priority Levels (All Modules):**
- **CRITICAL:** Red • Blocks 3+ items or overdue >7d or contract risk
- **HIGH:** Amber • Due <7d or blocks 1-2 items
- **MEDIUM:** Blue • Standard workflow
- **LOW:** Zinc • Deferred or optional

**Risk Scoring:**
```
Risk = f(overdue_days, dependency_count, cost_impact, critical_path_flag)

0-30:   Green (healthy)
31-60:  Amber (monitor)
61-100: Red (critical)
```

---

### 3.4 Standard Filters + Search Bar Logic

**FilterBarV2 Component Spec:**

**Structure:**
```
[Search Input (full-width)] 
[Filter Pills: Projects (2) | Status (3) | Phase (1) | Clear All]
[Save View] [Load View ▼]
```

**Features:**
- Multi-select filters show active count in parentheses
- Pills removable (click X to remove individual filter)
- Clear All button visible when any filter active
- Save View → name popup → saves to localStorage
- Load View dropdown shows saved views + "New View" option

**Persistence:**
- Per-module filter state in localStorage: `filters_${moduleName}`
- Last selected project persists globally: `last_project_id`

**Search Behavior:**
- Debounced (300ms) to avoid query spam
- Searches across: name, description, ID fields, tags
- Highlights matches in results (future enhancement)

---

### 3.5 Error/Warning/Success States

**Toast Notification Standards:**

| **Type**   | **Duration** | **Icon** | **Use Case**                     |
|------------|--------------|----------|----------------------------------|
| Success    | 3s           | ✅       | Create, update, delete success   |
| Error      | 5s           | ❌       | API failure, validation error    |
| Warning    | 4s           | ⚠️       | Data quality issue, near-limit   |
| Info       | 3s           | ℹ️       | Background job started, tips     |

**Empty States:**
- Consistent `<EmptyState icon={...} title="..." description="..." actionLabel="..." />`
- Always provide clear next step ("Create your first X", "Adjust filters")

**Loading States:**
- Skeleton loaders for tables (avoid blank screen flash)
- Spinner + text for long operations ("Generating report...")
- Optimistic updates where possible (UI updates before server confirm)

---

### 3.6 Collapsible Groups

**Use Cases:**
- Phase-grouped views (Detailing, Schedule)
- Date-grouped views (Timeline, Deliveries)
- Folder trees (Documents)

**Standard Behavior:**
- Click header to expand/collapse
- ChevronRight icon rotates 90° when expanded
- Persist expansion state in localStorage
- Show count badge in header (e.g., "FABRICATION (8)")

**Implementation:**
- Use Radix UI Collapsible or Accordion primitive
- Animate height transition (150ms ease-out)

---

### 3.7 Mobile vs Desktop Requirements

**Mobile-Specific Adaptations:**

**Navigation:**
- Hamburger menu (sidebar becomes drawer)
- Bottom navigation bar (4-5 primary modules)
- FAB for primary action (+ New)

**Headers:**
- Tier 1: Module title + hamburger
- Tier 2: KPIs become horizontal scrollable carousel
- Tier 3: Filters move to bottom sheet (Filter button opens drawer)

**Cards:**
- Full-width, stack vertically
- Swipe actions (swipe left → delete, swipe right → complete)
- Tap card → expand inline (no sheet navigation on mobile due to performance)

**Forms:**
- Single-column layout
- Larger touch targets (min 44x44px)
- Native date/time pickers (not custom React components)

**Tables:**
- Horizontal scroll with sticky first column
- Or switch to card view automatically on <768px

**Performance:**
- Lazy load images
- Virtualized lists for >50 items
- Debounced search (500ms on mobile, 300ms desktop)

---

## 4. DEEP REDESIGN PLANS (EXECUTION MODULES)

*(See EXECUTION_MODULES_UX_SPEC.md for detailed Work Packages, Detailing, Fabrication, Deliveries redesigns)*

### 4.1 Work Packages Redesign Summary

**New Workflow:**
1. Create package → auto-creates drawing set placeholders
2. Drawings progress → system tracks FFF status
3. When all FFF → "Ready to Advance" button enabled
4. Advance → system creates fabrication record + schedule tasks
5. Fabrication complete → system creates delivery record

**UI Enhancements:**
- Phase-grouped collapsible cards
- Readiness gates inline (✅ Drawings FFF, ⚠️ Labor 60%)
- Action button changes text based on state (not generic "Advance")
- Visual progress breakdown (not just %)

---

### 4.2 Detailing Redesign Summary

**New Workflow:**
- Priority queue always top (overdue + due <3 days)
- Status pipeline visual (IFA ─→ [BFA] ─→ BFS ─→ FFF)
- One-click RFI creation (pre-filled from drawing context)
- Reviewer auto-assignment with load balancing
- Batch actions for "advance all BFS sets to FFF"

**UI Enhancements:**
- Status legend always visible
- Reviewer workload shown (Joe: 5 active, Sarah: 2 active)
- Turnaround time KPI (avg days IFA→FFF)
- Critical path highlighting (sets blocking work packages)

---

### 4.3 Fabrication Redesign Summary

**New Workflow:**
- Hot list (ready-to-ship + QC holds) always top
- Shop capacity meter (current tonnage/day vs capacity)
- QC inspection checklist (dimensional, weld, coating, final)
- Auto-sequence by delivery date (earliest delivery first)

**UI Enhancements:**
- Fabrication state linked to delivery planning (shows target delivery date)
- QC badge expandable (shows inspection steps, hold reasons)
- Weight variance detection (estimated vs actual)
- Grouping by project with tonnage rollups

---

### 4.4 Deliveries Redesign Summary

**New Workflow:**
- Timeline-first view (grouped by delivery date)
- Readiness gates (fab status, QC passed, truck reserved)
- Variance tracking with root cause + erection impact
- Carrier performance scoring (auto-calculated)

**UI Enhancements:**
- Upcoming deliveries default view (next 14 days)
- Fabrication readiness inline (⚠️ Fab 85%, not ready)
- Erection impact shown ("Delays Grid 1 install by 2d")
- Carrier on-time % badge per delivery

---

### 4.5 Schedule Redesign Enhancements

**Already Strong, Additional Enhancements:**
- Surface AI conflicts in KPI strip automatically (don't require button click)
- Critical path badge on all critical tasks
- Baseline variance column in list view (planned vs actual dates)
- Float/slack indicator (days of buffer)

---

### 4.6 To-Do List Redesign

**Recommendation:** Merge into Schedule as "Quick Tasks" view

**Rationale:**
- Eliminates duplicate task management
- Personal to-dos become filter: "Assigned to Me + Not Linked to Work Package"
- Unified task data model

**Alternative:** Keep separate but link to Schedule
- To-Do items can be promoted to Schedule tasks (one-click "Add to Schedule")
- Schedule tasks can create to-dos for sub-items

---

### 4.7 Documents Redesign

**New Workflow:**
- Auto-OCR on upload (background job)
- AI auto-categorize (suggest category/phase based on filename + content)
- Approval queue dashboard (separate from document library)
- Smart folders (dynamic filters acting as folders: "All RFIs", "Pending My Review")

**UI Simplification:**
- Default view: Recent documents (last 30 days)
- Folder tree collapsible (not always visible)
- Approval workflow as dedicated page (not inline panel)

---

### 4.8 Daily Logs Redesign

**New Workflow:**
- Mobile-first design (field supers use on phone)
- "Copy from yesterday" pre-fills weather, crew, equipment
- Auto-populate "work performed" from completed schedule tasks
- Weather API integration (auto-fill based on project location)
- Photo capture embedded (not separate Field Tools navigation)

**UI Enhancements:**
- Quick log mode (minimal fields: project, date, work summary, crew, hours)
- Full log mode (all fields)
- Weekly summary view (rollup of 5-7 days)
- Voice-to-text for work performed field

---

### 4.9 Field Tools Redesign

**Recommendation:** Dissolve into relevant modules

**Photo Capture:** Embed in Daily Logs, Tasks, RFIs, Work Packages  
**Barcode Scanner:** Embed in Deliveries (verify shipment), Equipment (check-in/out)  
**Offline Sync:** Global status indicator (top bar)  
**Notifications:** Global notification center (header icon)

**Result:** Field Tools becomes "Mobile Utilities" settings page, actual tools integrated contextually

---

### 4.10 Resource Management Redesign

**New Workflow:**
- Integrated with Schedule (assign resources from schedule task form)
- Skill-based recommendations ("Task requires AWS cert → suggest Joe, Sarah")
- One-click rebalancing (AI suggests moving tasks from overallocated to underutilized)

**UI Enhancements:**
- Resource calendar view (visual timeline of allocations)
- Cost per resource in utilization table ($/hour or $/day)
- Skill matrix filterable (show all resources with Rigging skill)

---

## 5. ROOT-CAUSE ANALYSIS: DATE PICKER BUG

### 5.1 Bug Description

**Symptom:** When user selects a date in date picker, the system logs the previous day.

**Example:**
- User selects: February 1, 2026
- System stores: January 31, 2026
- User discovers discrepancy later, creates confusion

**Affected Modules:**
- Daily Logs (log_date)
- Deliveries (scheduled_date, actual_date)
- Tasks (start_date, end_date, due_date)
- Meetings (meeting_date)
- Documents (review_due_date)
- Work Packages (target_date)
- Drawing Sets (due_date, ifa_date, bfa_date, etc.)

**Frequency:** Intermittent but reproducible (likely timezone-dependent)

---

### 5.2 Likely Root Causes

#### Cause 1: UTC Midnight Conversion

**Scenario:**
- User in Arizona (UTC-7) selects "2026-02-01"
- Browser creates: `new Date("2026-02-01")` → interpreted as `2026-02-01T00:00:00` **in local time**
- Converted to UTC for storage: `2026-01-31T07:00:00Z`
- Displayed back as: `2026-01-31` (UTC date extracted)

**Evidence:**
- Date inputs use `type="date"` → value is `YYYY-MM-DD` string
- `new Date("YYYY-MM-DD")` in JavaScript is **ambiguous** (some browsers interpret as local midnight, some as UTC midnight)

**Fix:**
```javascript
// WRONG (current likely implementation):
<Input type="date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} />
// Stores: "2026-02-01" string → backend interprets as UTC → shifts to "2026-01-31"

// CORRECT:
// Always treat date-only fields as LOCAL dates, store as YYYY-MM-DD strings without time component
// Backend must NOT convert to UTC for date-only fields
```

---

#### Cause 2: Backend Datetime Conversion

**Scenario:**
- Frontend sends: `{ due_date: "2026-02-01" }`
- Backend (Deno/Base44) interprets as ISO datetime
- Backend converts to UTC for storage
- Frontend retrieves and displays UTC date (off by 1 day in negative UTC offsets)

**Evidence:**
- Entity fields use `"format": "date"` in JSON schema
- Base44 SDK may auto-convert date strings to datetime objects

**Fix:**
- Backend must treat `"format": "date"` fields as **date-only** (no time component, no timezone conversion)
- Store as `YYYY-MM-DD` string or as date at UTC midnight **without timezone adjustment**

---

#### Cause 3: JavaScript Date Object Inconsistencies

**Scenario:**
- `new Date("2026-02-01")` behavior varies by browser:
  - Chrome/Firefox: Interprets as UTC midnight → local display shifts
  - Safari: Interprets as local midnight → correct display
- Code using `new Date(dateString)` may behave differently for different users

**Fix:**
- **NEVER** use `new Date("YYYY-MM-DD")` for date-only values
- **ALWAYS** use explicit parsing:
```javascript
// Correct:
const parseLocalDate = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // Local midnight, no timezone shift
};
```

---

#### Cause 4: date-fns or date Library Misuse

**Scenario:**
- Using `parseISO("2026-02-01")` from date-fns
- `parseISO` interprets date-only strings as **UTC midnight by default**
- Then formatting with `format(date, 'yyyy-MM-dd')` may shift based on local timezone

**Fix:**
```javascript
// WRONG:
const date = parseISO("2026-02-01"); // UTC midnight
format(date, 'yyyy-MM-dd'); // May shift in negative UTC offset timezones

// CORRECT (for date-only fields):
// Store and display as strings, no parsing unless displaying as formatted text
// If parsing needed for comparisons:
const parseLocalDate = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};
```

---

### 5.3 Permanent Fix Specification

#### Step 1: Universal Date Handling Standard

**Rule:** All date-only fields (start_date, end_date, due_date, log_date, etc.) must be stored and transmitted as **ISO date strings (`YYYY-MM-DD`)** with **no time component** and **no timezone conversion**.

**Implementation:**

**Frontend:**
```javascript
// utilities/dateUtils.js

/**
 * Parse date string (YYYY-MM-DD) to local Date object at midnight
 * Use this when displaying dates or comparing dates
 */
export const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // Local midnight
};

/**
 * Format Date object to YYYY-MM-DD string for storage
 * Use this when saving dates from date pickers
 */
export const formatDateForStorage = (date) => {
  if (!date) return '';
  if (typeof date === 'string') return date; // Already formatted
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Safe date comparison (compares YYYY-MM-DD strings or Date objects)
 */
export const compareDates = (date1, date2) => {
  const d1 = typeof date1 === 'string' ? parseLocalDate(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseLocalDate(date2) : date2;
  return d1.getTime() - d2.getTime();
};

/**
 * Check if date is overdue (past today in local timezone)
 */
export const isOverdue = (dateString, status = null) => {
  if (!dateString || status === 'completed' || status === 'done') return false;
  const targetDate = parseLocalDate(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to midnight
  return targetDate < today;
};

/**
 * Get days until/since date
 */
export const getDaysUntil = (dateString) => {
  if (!dateString) return null;
  const targetDate = parseLocalDate(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
};
```

**Replace All Instances:**
```javascript
// BEFORE (causes bug):
import { parseISO, differenceInDays, isPast } from 'date-fns';
const date = parseISO(task.due_date);
const overdue = isPast(date);

// AFTER (correct):
import { parseLocalDate, isOverdue, getDaysUntil } from '@/utilities/dateUtils';
const overdue = isOverdue(task.due_date, task.status);
const daysUntil = getDaysUntil(task.due_date);
```

---

#### Step 2: Backend Date Storage Standard

**Entity Schema Validation:**
- All fields with `"format": "date"` must be stored as **date-only strings** (`YYYY-MM-DD`)
- Backend must NOT apply timezone conversion to date-only fields
- DateTime fields (e.g., `created_date`, `updated_date`) use ISO8601 with timezone (`2026-01-27T14:32:00Z`)

**Base44 SDK Configuration:**
- Verify SDK does not auto-convert date strings to Date objects
- If SDK converts, configure to preserve string format for date-only fields

**Backend Functions (Deno):**
```javascript
// When reading date from payload:
const dueDate = payload.due_date; // Keep as string "YYYY-MM-DD"
// Do NOT: new Date(payload.due_date) → causes timezone shift

// When writing date to entity:
await base44.entities.Task.create({
  due_date: "2026-02-01" // String, not Date object
});
```

---

#### Step 3: Form Component Date Input Standard

**DatePicker Component Spec:**

```javascript
// components/ui/DatePicker.jsx

import { Input } from "@/components/ui/input";
import { formatDateForStorage, parseLocalDate } from '@/utilities/dateUtils';

export function DatePicker({ value, onChange, ...props }) {
  // value and onChange always work with YYYY-MM-DD strings
  
  return (
    <Input
      type="date"
      value={value || ''}
      onChange={(e) => {
        const dateString = e.target.value; // Already YYYY-MM-DD from native picker
        onChange(dateString); // Pass string directly, no conversion
      }}
      {...props}
    />
  );
}

// Usage:
<DatePicker
  value={formData.due_date}
  onChange={(dateString) => setFormData({...formData, due_date: dateString})}
/>
```

**Critical Rules:**
- ❌ **NEVER** use `new Date(inputValue)` on date picker values
- ❌ **NEVER** use `date.toISOString()` to get date-only value (includes time + UTC shift)
- ✅ **ALWAYS** treat date inputs as strings
- ✅ **ALWAYS** use `formatDateForStorage()` if converting from Date object

---

#### Step 4: Display Formatting Standard

**When displaying dates in UI:**

```javascript
// CORRECT (for date-only fields):
import { parseLocalDate } from '@/utilities/dateUtils';
import { format } from 'date-fns';

const displayDate = (dateString) => {
  if (!dateString) return '-';
  const date = parseLocalDate(dateString); // Local midnight
  return format(date, 'MMM d, yyyy'); // "Feb 1, 2026"
};

// Usage:
<span>{displayDate(task.due_date)}</span>
```

**When comparing dates:**

```javascript
// CORRECT:
import { parseLocalDate, getDaysUntil } from '@/utilities/dateUtils';

const daysUntil = getDaysUntil(task.end_date); // Uses local midnight comparison
const isLate = daysUntil < 0;
```

---

#### Step 5: Validation Rules

**Form Validation:**
- `start_date` must be ≤ `end_date`
- `due_date` for tasks should be ≤ work package `target_date` (warning, not error)
- `scheduled_date` for delivery should be ≥ fabrication `target_completion` + 1 day

**Data Integrity Checks:**
- Daily log `log_date` cannot be future (warning if >today)
- Meeting `meeting_date` should be ≥ today for new meetings (unless creating past meeting)

---

#### Step 6: Test Cases

**Unit Tests:**
1. User in UTC-7 selects Feb 1 → system stores "2026-02-01" → system displays "Feb 1, 2026" ✅
2. User in UTC+5 selects Feb 1 → system stores "2026-02-01" → system displays "Feb 1, 2026" ✅
3. Task with due_date="2026-02-01" and today=2026-02-02 → isOverdue() returns true ✅
4. Task with due_date="2026-02-03" and today=2026-02-01 → getDaysUntil() returns 2 ✅
5. Delivery with scheduled="2026-02-01", actual="2026-02-03" → variance = +2 days ✅

**Integration Tests:**
1. Create work package with target_date via form → verify stored value matches selected value
2. Create daily log for yesterday → verify log_date matches selected date
3. Create delivery schedule for next week → verify upcoming deliveries filter includes it
4. View task in Schedule after creation → verify displayed dates match entered dates

**Browser Compatibility Tests:**
- Chrome (UTC-7, UTC+0, UTC+5)
- Firefox (UTC-7, UTC+0, UTC+5)
- Safari (UTC-7, UTC+0, UTC+5)
- Mobile Chrome (UTC-7, UTC+0, UTC+5)
- Mobile Safari (UTC-7, UTC+0, UTC+5)

---

### 5.4 Rollout Plan

**Phase 1: Immediate Fix (Week 1)**
- [ ] Create `utilities/dateUtils.js` with parseLocalDate, formatDateForStorage, etc.
- [ ] Create `components/ui/DatePicker.jsx` standardized component
- [ ] Replace all `<Input type="date" />` with `<DatePicker />`
- [ ] Replace all `parseISO()` calls for date-only fields with `parseLocalDate()`
- [ ] Replace all `isPast()`, `differenceInDays()` calls for date-only fields with `isOverdue()`, `getDaysUntil()`

**Phase 2: Backend Validation (Week 1)**
- [ ] Audit backend functions for Date object usage on date-only fields
- [ ] Verify Base44 SDK does not convert date strings to Date objects
- [ ] Add validation to entity create/update operations (reject Date objects for date fields)

**Phase 3: Testing (Week 2)**
- [ ] Run unit tests across all timezones
- [ ] Manual testing on mobile (iOS Safari, Android Chrome)
- [ ] Regression testing on all affected modules
- [ ] User acceptance testing with PM/super in field

**Phase 4: Monitoring (Ongoing)**
- [ ] Add logging for date field submissions (track if any Date objects slipping through)
- [ ] User feedback survey ("Have you noticed date discrepancies?")

---

### 5.5 Prevention Measures

**Code Review Checklist:**
- [ ] All date pickers use DatePicker component (not raw Input type="date")
- [ ] No `new Date(stringValue)` for date-only fields
- [ ] All date comparisons use dateUtils functions
- [ ] No `.toISOString()` on dates intended for date-only storage

**Linting Rules (ESLint):**
```javascript
// Add custom rule:
'no-date-constructor-on-strings': 'error', // Prevent new Date("2026-02-01")
'require-date-utils': 'warn', // Encourage using dateUtils.parseLocalDate
```

**Documentation:**
```markdown
# Date Handling Guidelines

## Date-Only Fields (start_date, end_date, due_date, log_date, etc.)
- Store as: `"YYYY-MM-DD"` string (no time, no timezone)
- Parse with: `parseLocalDate(dateString)` (NOT `new Date()` or `parseISO()`)
- Compare with: `isOverdue()`, `getDaysUntil()`, `compareDates()`
- Display with: `format(parseLocalDate(dateString), 'MMM d, yyyy')`

## DateTime Fields (created_date, updated_date, meeting start, etc.)
- Store as: ISO8601 with timezone `"2026-01-27T14:32:00Z"`
- Parse with: `parseISO()` (OK for datetime fields)
- Display with: `format(parseISO(datetimeString), 'MMM d, yyyy h:mm a')`
```

---

## 6. ACCEPTANCE CRITERIA

### 6.1 UI Consistency

**Layout:**
- [ ] All modules use 3-tier header structure (Module Title | KPI Strip | Controls Bar)
- [ ] KPI Strip always has 3-5 metrics, uniform card styling
- [ ] Project selector consistent across all project-scoped modules
- [ ] Search input always left-aligned in controls bar with magnifying glass icon

**Typography:**
- [ ] Module titles: text-xl, font-bold, uppercase, tracking-wide
- [ ] KPI labels: text-[10px], uppercase, tracking-widest, text-muted-foreground
- [ ] KPI values: text-2xl, font-bold, font-mono
- [ ] Body text: text-sm
- [ ] Metadata: text-xs, font-mono, text-muted-foreground

**Spacing:**
- [ ] Section gaps: space-y-6 (24px)
- [ ] Card padding: p-4 (16px)
- [ ] KPI strip: py-4, gap-6
- [ ] Controls bar: py-3

---

### 6.2 Workflow Clarity

**Phase Gates:**
- [ ] Work package cannot advance to fabrication unless all linked drawing sets are FFF
- [ ] Fabrication cannot release to shop unless drawings are FFF
- [ ] Delivery cannot be scheduled unless fabrication status is READY_TO_SHIP
- [ ] System displays clear error message when gate requirement not met

**Handoff Notifications:**
- [ ] Drawing status → FFF triggers notification to shop manager
- [ ] Fabrication status → READY_TO_SHIP triggers notification to logistics coordinator
- [ ] Delivery status → DELIVERED triggers notification to superintendent
- [ ] Each notification includes link to relevant entity

**Cross-Module Linking:**
- [ ] All entities with relationships show linked item badges (e.g., 🔗 12 Tasks, 📄 3 Drawings)
- [ ] Clicking badge opens popover with linked items list
- [ ] Popover includes quick actions (View, Edit, Unlink)

---

### 6.3 Navigation Usability

**Keyboard Shortcuts (Global):**
- [ ] `Cmd/Ctrl + K`: Command palette (global search)
- [ ] `N`: New item (context-aware per page)
- [ ] `R`: Refresh current view
- [ ] `F`: Toggle filters
- [ ] `/`: Focus search input

**Mobile:**
- [ ] Sidebar collapses to hamburger menu <1024px
- [ ] Bottom navigation shows 5 most-used modules
- [ ] FAB for primary action (+ New) on all list pages
- [ ] Swipe actions on cards (swipe left = delete, swipe right = complete)

**Breadcrumbs:**
- [ ] All detail views show breadcrumb (Project > Work Packages > WP-001)
- [ ] Breadcrumbs clickable to navigate back

---

### 6.4 Status Accuracy

**Status Definitions (No Ambiguity):**

**Work Packages:**
- ACTIVE: Package in current phase, work in progress
- ON_HOLD: Work paused, reason required in notes field
- COMPLETE: All phases closed, percent_complete=100

**Detailing:**
- IFA: Submitted to GC/owner, awaiting approval (ifa_date populated)
- BFA: Returned with markups, scrubbing in progress (bfa_date populated)
- BFS: Scrubbed, awaiting final PM review (bfs_date populated)
- FFF: Approved for fabrication (released_for_fab_date populated)

**Fabrication:**
- NOT_STARTED: Awaiting drawing FFF or shop release
- IN_PROGRESS: Actively being fabricated
- QC_INSPECTION: Fabrication complete, awaiting QC
- QC_HOLD: Failed QC, rework required (hold_reason required)
- READY_TO_SHIP: QC passed, ready for delivery
- COMPLETED: Delivered and confirmed on site

**Deliveries:**
- SCHEDULED: Confirmed with carrier, awaiting pickup
- IN_TRANSIT: Left shop, en route (carrier_tracking_number populated)
- DELIVERED: Arrived on site, offloaded (actual_date populated)
- DELAYED: Past scheduled_date, not delivered (delay_reason required)
- CANCELLED: Delivery cancelled (cancellation_reason required)

**Tasks:**
- NOT_STARTED: No work begun, start_date may be future
- IN_PROGRESS: Work begun, progress 1-99%
- COMPLETED: Work finished, progress=100
- ON_HOLD: Work paused, cannot proceed (hold_reason required)
- BLOCKED: Waiting on dependency (predecessor_ids not complete)
- CANCELLED: Scope removed or task no longer needed

---

### 6.5 Date Handling Reliability

**Requirements:**
- [ ] **Zero date offset errors** across all timezones (UTC-12 to UTC+12)
- [ ] User selects Feb 1 in date picker → system stores `"2026-02-01"` → system displays "Feb 1, 2026"
- [ ] Variance calculations accurate (scheduled Feb 1, actual Feb 3 → variance = +2 days, not +3)
- [ ] Overdue detection accurate (task due Feb 1, today Feb 2 → flagged as overdue)
- [ ] Date filters accurate (deliveries next 7 days includes delivery scheduled 6 days from now)

**Validation:**
- [ ] All date fields accept only `YYYY-MM-DD` format (reject other formats)
- [ ] Backend rejects Date objects for date-only fields (returns 400 error)
- [ ] Frontend displays validation error if user enters invalid date

**User Timezone Handling:**
- [ ] Platform detects user timezone: `Intl.DateTimeFormat().resolvedOptions().timeZone`
- [ ] Timezone displayed in Settings > Profile
- [ ] All date operations use user's local timezone (no UTC conversion for date-only)
- [ ] DateTime fields (meeting times, created_date) show timezone-adjusted time with label (e.g., "2:00 PM MST")

---

### 6.6 Performance Expectations

**Page Load:**
- [ ] Initial page load (cold start): <2 seconds
- [ ] Navigation between pages: <500ms
- [ ] Module with 100 items: <1 second to render
- [ ] Module with 500 items: <2 seconds (use virtualization)

**Mutations:**
- [ ] Create/update entity: <500ms server response
- [ ] Optimistic UI update: <100ms (before server confirm)
- [ ] Toast notification appears: <200ms after mutation

**Search/Filter:**
- [ ] Search debounce: 300ms desktop, 500ms mobile
- [ ] Filter application: <200ms (client-side filtering)
- [ ] Results render: <500ms for 100 items

**Mobile:**
- [ ] Avoid horizontal scroll (except Gantt chart, which is optional)
- [ ] Touch targets: min 44x44px
- [ ] Scroll performance: 60fps on modern devices

---

## 7. FINAL "FUTURE STATE" CONCEPT

### 7.1 Unified Experience Vision

**One Platform, One Language:**

Users land on **Dashboard** (Portfolio Overview):
- At-a-glance health across all projects
- Action Required panel: "3 drawing sets overdue • 2 QC holds • 5 deliveries this week"
- Click any alert → jumps to relevant module with context pre-loaded

**Project Execution Flow (Steel Logic):**

```
1. ESTIMATING/BIDDING → Project created
2. DETAILING → Drawing sets progress (IFA → FFF)
3. FABRICATION → Shop builds per FFF drawings
4. DELIVERY → Logistics coordinates shipment
5. ERECTION → Field installs per sequence
6. CLOSEOUT → Final billing, as-builts
```

**System Auto-Orchestration:**
- Work package created → system creates drawing set placeholders
- Drawing sets reach FFF → system auto-advances work package to fabrication
- Fabrication reaches ready-to-ship → system creates delivery record
- Delivery confirmed → system notifies erection crew
- Erection tasks complete → system prompts for closeout docs

**User Experience:**
- **No duplicate data entry:** Each piece of information entered once
- **No manual phase tracking:** System advances phases automatically when gates met
- **No hunting for status:** Every card shows linked item status inline
- **No unexpected delays:** Predictive AI alerts before issues become critical

---

### 7.2 Cross-Module Coherence

**Scenario: PM Reviews Morning Dashboard**

**Dashboard shows:**
- 📊 Portfolio: 12 active projects, 8 on track, 3 at risk, 1 critical
- ⚠️ Action Required:
  - **CRITICAL:** WP-002 (ABC Steel) blocked—drawing S-102 overdue 5 days
  - **WARNING:** Delivery D-045 (DEF Build) at risk—fabrication only 75% complete, delivery in 3 days
  - **INFO:** 8 tasks due this week

**PM clicks "WP-002 blocked" alert:**
- Navigates to Detailing module
- Filters auto-applied: project=ABC Steel, status=overdue
- Drawing S-102 highlighted in priority queue
- PM assigns to reviewer, sets expedite flag
- System notifies reviewer, updates dashboard alert

**PM clicks "Delivery D-045 at risk":**
- Navigates to Deliveries module
- Delivery D-045 shown with fabrication status inline: "⚠️ Fab: 75% (Est. complete: Feb 3)"
- PM opens fabrication record (click link)
- Sees QC hold blocking completion
- Resolves QC issue, updates delivery date
- System recalculates erection task dates, notifies super

**Result:** PM addressed 2 critical issues in <5 minutes, minimal navigation, contextual information always visible

---

### 7.3 Date Issue Fully Eliminated

**After Fix:**
- User in any timezone selects Feb 1 in any date picker → system stores "2026-02-01"
- System displays "Feb 1, 2026" or "Feb 1" or "2/1" depending on context—always correct date
- Variance calculations accurate (scheduled Feb 1, actual Feb 1 → variance = 0 days, not +1)
- Overdue flags accurate (due Feb 1, today Feb 2 → overdue, not "on time")
- Filters work (deliveries next 7 days includes delivery scheduled 6 days out, not missing it)

**User Confidence Restored:**
- PMs trust delivery schedules
- Supers rely on daily log dates for timecards
- Billing team uses accurate dates for invoicing
- No more "why is this showing yesterday?" confusion

---

### 7.4 Platform Scalability & Predictability

**Scalability:**
- Shared component library (30+ components) used across all modules
- Any new module built with existing components (faster development)
- UI updates applied globally (change button style → all modules update)

**Predictability:**
- Users learn once, use everywhere (same filter pattern in every module)
- New users onboard faster (consistent patterns)
- Mobile users get optimized experience without separate app

**Maintainability:**
- Single source of truth for date handling (dateUtils.js)
- Single FilterBar component (not 10 variants)
- Single status color system (StatusBadge component)
- Regression testing easier (test shared components, not every module independently)

---

## 8. IMPLEMENTATION ROADMAP

### Phase 1: CRITICAL FIXES (Week 1-2)
**Priority: Date Bug + High-Risk Issues**

- [ ] **DAY 1-3:** Implement date utilities, DatePicker component, replace all date inputs
- [ ] **DAY 4-5:** Test date handling across timezones, fix any remaining issues
- [ ] **DAY 6-7:** Work package phase gate validation (block advance if drawings not FFF)
- [ ] **DAY 8-10:** Detailing RFI integration (functional RFI creation from detailing module)
- [ ] **DAY 11-14:** Fabrication hot list + delivery readiness gates

**Acceptance:**
- Date bug fully resolved (0 reported incidents in 2-week user test)
- Phase gates prevent invalid transitions (PM confirms "system stopped me from advancing when drawings not ready")
- RFI creation from detailing works (users create 5+ RFIs via new workflow)

---

### Phase 2: DESIGN SYSTEM UNIFICATION (Week 3-4)
**Priority: Shared Components + Consistency**

- [ ] Build ExecutionCard component library (4 variants)
- [ ] Build KPIStrip, FilterBarV2, StatusPipeline, ReadinessGate components
- [ ] Refactor Work Packages to use ExecutionCard
- [ ] Refactor Detailing to use ExecutionCard + StatusPipeline
- [ ] Refactor Fabrication to use ExecutionCard + ReadinessGate
- [ ] Refactor Deliveries to use ExecutionCard
- [ ] Apply universal status color system (update StatusBadge)

**Acceptance:**
- All 4 execution modules use shared ExecutionCard
- Visual consistency across modules (PM feedback: "feels like one app now")
- Code duplication reduced by 40% (measured via static analysis)

---

### Phase 3: WORKFLOW AUTOMATION (Week 5-6)
**Priority: Reduce Manual Handoffs**

- [ ] Auto-create drawing sets when work package created
- [ ] Auto-advance work package when all drawings FFF (backend automation)
- [ ] Auto-create fabrication record when package advances to fab phase
- [ ] Auto-create delivery record when fab status = READY_TO_SHIP
- [ ] Auto-notify on status changes (drawing FFF → notify shop, delivery confirmed → notify super)

**Acceptance:**
- Work package lifecycle requires 50% fewer manual steps (user study)
- Phase transitions include validation + auto-progression
- Notifications received within 1 minute of status change

---

### Phase 4: AI PROACTIVE INTELLIGENCE (Week 7-8)
**Priority: Surface Insights Automatically**

- [ ] Dashboard "Action Required" panel (auto-populated from all modules)
- [ ] Schedule conflicts shown in KPI strip (don't require AI Assistant button click)
- [ ] Detailing auto-assigns reviewers based on workload + discipline
- [ ] Fabrication auto-sequences shop queue based on delivery dates
- [ ] Deliveries predict delays based on fabrication progress

**Acceptance:**
- Dashboard action panel shows 90% of critical items (users confirm "I saw the alert before it became urgent")
- AI auto-assignments accepted 70% of time (measured via user edits)
- Delay predictions accurate within 1 day (80% confidence)

---

### Phase 5: MOBILE OPTIMIZATION (Week 9-10)
**Priority: Field User Experience**

- [ ] Mobile-first Daily Logs (large buttons, voice input, photo capture embedded)
- [ ] Schedule mobile view (card-based, no horizontal scroll)
- [ ] Deliveries mobile view (timeline with swipe actions)
- [ ] Field Tools dissolved (features embedded in relevant modules)
- [ ] Offline-first architecture (background sync, conflict resolution)

**Acceptance:**
- Field supers can complete daily log in <2 minutes on phone (timed user test)
- 80% of field data entry done via mobile (tracked via analytics)
- Offline mode works for 8-hour shift (sync on WiFi reconnect)

---

### Phase 6: ANALYTICS INTEGRATION (Week 11-12)
**Priority: Insights → Actions**

- [ ] Analytics anomalies linked to source data (clickable drill-down)
- [ ] EVM dashboard embedded in Financials module (not separate page)
- [ ] Risk dashboard embedded in Dashboard (not separate Analytics page)
- [ ] Reports include action buttons ("Fix overrun on cost code 05120" → navigate + pre-fill)

**Acceptance:**
- Users navigate from insight to fix in <10 seconds (user study)
- Report engagement increases 3x (measured via analytics events)

---

## 9. SUCCESS METRICS

### 9.1 Quantitative (Measurable)

**User Efficiency:**
- [ ] Time to create work package: <2 min (baseline: ~5 min)
- [ ] Time to find document: <30 sec (baseline: ~2 min)
- [ ] Time to log daily field report: <90 sec on mobile (baseline: ~5 min desktop)
- [ ] Phase transitions per user per day: +40% (automation reduces manual steps)

**Data Quality:**
- [ ] Date discrepancies: 0% (baseline: ~5% of date entries off by 1 day)
- [ ] Missing assignments: <3% (baseline: ~15%)
- [ ] Missing dates on tasks: <5% (baseline: ~20%)
- [ ] SOV cost code alignment: >95% (baseline: ~70%)

**System Adoption:**
- [ ] Daily active users: +25%
- [ ] Mobile usage: 50% of total sessions (baseline: ~10%)
- [ ] Module cross-navigation: +60% (users jumping between linked items)
- [ ] AI feature usage: 40% of users weekly (schedule assistant, auto-assignments)

---

### 9.2 Qualitative (User Feedback)

**PM Quotes (Target):**
- "I know what needs my attention without scrolling"
- "Phase gates prevent me from making sequencing mistakes"
- "AI summaries save me 30 min/week on status reports"
- "Date bug is gone—I trust the schedule now"

**Superintendent Quotes (Target):**
- "Mobile daily logs let me update from the field in under 2 minutes"
- "I see delivery readiness before truck arrives—no more surprises"
- "Photo capture linked to work packages keeps everything organized"

**Shop Manager Quotes (Target):**
- "Hot list tells me what to build next—no more guessing priority"
- "Fabrication queue auto-sequences by delivery date"
- "QC holds are visible immediately—I can reassign crew while we fix"

---

## 10. APPENDIX

### 10.1 Date Bug Code Examples

**WRONG (Current Pattern Causing Bug):**

```javascript
// Form component:
<Input
  type="date"
  value={task.due_date}
  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
/>
// User selects Feb 1 → e.target.value = "2026-02-01" (string) → looks correct

// Somewhere in the code (likely backend or SDK):
const dueDate = new Date(task.due_date); // "2026-02-01" → Date object
// Browser interprets as UTC midnight → 2026-02-01T00:00:00Z
// User in UTC-7 (Arizona) → local time is 2026-01-31 5:00 PM
// Backend stores UTC → retrieves as 2026-01-31 when extracting date part

// Display:
import { parseISO, format } from 'date-fns';
const displayDate = format(parseISO(task.due_date), 'MMM d, yyyy');
// parseISO("2026-01-31") → displays "Jan 31, 2026" (WRONG)
```

---

**CORRECT (After Fix):**

```javascript
// Form component:
import { DatePicker } from '@/components/ui/DatePicker';

<DatePicker
  value={formData.due_date} // "2026-02-01" string
  onChange={(dateString) => setFormData({...formData, due_date: dateString})}
  // dateString is "2026-02-01" (no Date object created)
/>

// Backend:
await base44.entities.Task.create({
  due_date: "2026-02-01" // String, no conversion
});
// Backend stores: "2026-02-01" as string (or date type without timezone)

// Display:
import { parseLocalDate } from '@/utilities/dateUtils';
import { format } from 'date-fns';

const displayDate = (dateString) => {
  const date = parseLocalDate(dateString); // Local midnight: 2026-02-01T00:00:00 (user timezone)
  return format(date, 'MMM d, yyyy'); // "Feb 1, 2026" (CORRECT)
};
```

---

### 10.2 Shared Component Inventory (To Build)

**Core Components:**
1. `ExecutionCard` (WorkPackageCard, DetailingCard, FabCard, DeliveryCard variants)
2. `KPIStrip` (universal KPI display with thresholds)
3. `FilterBarV2` (multi-select pills, search, save/load views)
4. `DatePicker` (safe date input, no timezone bugs)
5. `StatusPipeline` (visual workflow: IFA → BFA → BFS → FFF)
6. `ReadinessGate` (prerequisite checklist widget)
7. `LinkedItemsBadge` (clickable badge showing related items)
8. `VarianceIndicator` (baseline vs actual with color)
9. `ThreatIndicator` (⚠️ warnings with tooltips)
10. `ActionButton` (context-aware labels)
11. `TimelineGroupedView` (date-based grouping)
12. `ProgressBreakdown` (not just %, but what's done and what's left)
13. `DeleteConfirmation` (universal delete dialog)
14. `EmptyStateV2` (consistent empty states with actions)
15. `LoadingStateV2` (skeleton loaders + spinners)

**Utility Hooks:**
1. `useFilterPersistence(moduleName)` (localStorage filter state)
2. `useSafeDate()` (date handling hooks)
3. `useLinkedItems(entityType, entityId)` (fetch related items)
4. `usePhaseGates(workPackageId)` (check phase prerequisites)
5. `useNotifications()` (global notification state)

---

### 10.3 Design Tokens (CSS Variables)

```css
/* Colors - Steel Industry Theme */
--color-primary: #F59E0B; /* Amber - Actions, progress */
--color-success: #10B981; /* Green - Complete, approved */
--color-warning: #F59E0B; /* Amber - Warning, due soon */
--color-critical: #EF4444; /* Red - Overdue, blocked, failed */
--color-info: #3B82F6; /* Blue - In progress, active */
--color-processing: #A855F7; /* Purple - In transit, under review */
--color-neutral: #A1A1AA; /* Zinc - Not started, inactive */

/* Phase Colors */
--phase-detailing: #3B82F6; /* Blue */
--phase-fabrication: #F59E0B; /* Amber */
--phase-delivery: #A855F7; /* Purple */
--phase-erection: #10B981; /* Green */
--phase-closeout: #71717A; /* Zinc */

/* Typography */
--font-mono: 'Roboto Mono', 'Courier New', monospace;
--font-sans: system-ui, -apple-system, sans-serif;

/* Spacing Scale */
--space-xs: 0.25rem; /* 4px */
--space-sm: 0.5rem; /* 8px */
--space-md: 1rem; /* 16px */
--space-lg: 1.5rem; /* 24px */
--space-xl: 2rem; /* 32px */

/* Border Radius */
--radius-sm: 0.25rem; /* 4px - badges */
--radius-md: 0.5rem; /* 8px - cards */
--radius-lg: 0.75rem; /* 12px - dialogs */
```

---

### 10.4 Mobile-First Component Examples

**Mobile Daily Log (Quick Entry):**
```
┌─────────────────────────────────────┐
│ 📅 Jan 27, 2026                     │
│ [Copy from Yesterday]               │
├─────────────────────────────────────┤
│ Project: [ABC Steel MVD ▼]         │
│ Crew: [12] Hours: [96]             │
│ Weather: [☀️ Clear] Temp: [45°F]   │
├─────────────────────────────────────┤
│ Work Performed:                     │
│ [🎤 Tap to dictate]                 │
│ ┌─────────────────────────────────┐ │
│ │ Erected Grid 1 columns...       │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ [📷 Add Photos (3)]                 │
├─────────────────────────────────────┤
│ ☐ Safety Incident                  │
│ ☐ Delays                            │
├─────────────────────────────────────┤
│          [SAVE LOG]                 │
└─────────────────────────────────────┘
```

**Key Features:**
- Voice input for work performed (reduces typing)
- Large touch targets (48px min)
- Photo capture embedded (no navigation)
- Copy from yesterday pre-fills 80% of form

---

## 11. ACCEPTANCE TESTING CHECKLIST

### 11.1 Date Bug Verification

**Test Case 1: UTC-7 User (Arizona - No DST)**
- [ ] Select Feb 1, 2026 in task due_date
- [ ] Submit form
- [ ] Verify database stores: `"2026-02-01"`
- [ ] Reload page, verify displays: "Feb 1, 2026"
- [ ] Check overdue detection: If today is Feb 2 → task flagged overdue ✅

**Test Case 2: UTC+0 User (London)**
- [ ] Repeat test case 1
- [ ] Expected result: Identical behavior (stores "2026-02-01", displays "Feb 1, 2026")

**Test Case 3: UTC+9 User (Tokyo)**
- [ ] Repeat test case 1
- [ ] Expected result: Identical behavior (no date shift)

**Test Case 4: Delivery Variance Calculation**
- [ ] Create delivery: scheduled_date="2026-02-01"
- [ ] Update delivery: actual_date="2026-02-03"
- [ ] Verify variance: +2 days (NOT +3, NOT +1)

**Test Case 5: Filter Accuracy**
- [ ] Create delivery: scheduled_date="2026-02-07"
- [ ] Today: 2026-02-01
- [ ] Apply filter: "Next 7 Days"
- [ ] Verify delivery appears in results (6 days out)

---

### 11.2 Workflow Validation

**Test Case 1: Phase Gate Blocking**
- [ ] Create work package in detailing phase
- [ ] Create drawing set, leave in IFA status
- [ ] Attempt to advance work package to fabrication
- [ ] System blocks with message: "Cannot advance: 1 drawing set not FFF (S-101: IFA)"

**Test Case 2: Auto-Progression**
- [ ] Create work package with 2 drawing sets
- [ ] Advance both drawing sets to FFF
- [ ] Verify work package status auto-advances to fabrication
- [ ] Verify fabrication record auto-created

**Test Case 3: Cross-Module Linking**
- [ ] Create work package WP-001
- [ ] View in Detailing module → see linked work package badge
- [ ] View in Fabrication module → see linked work package badge
- [ ] Click badge → popover shows "WP-001: Main Columns"

---

### 11.3 UI Consistency Verification

**Visual Inspection Checklist:**
- [ ] All modules have same header height (h-16 for tier 1)
- [ ] KPI strip cards uniform size and spacing
- [ ] Search input icon placement consistent (left, 3px from edge)
- [ ] Status badges use universal color system
- [ ] Font sizes match typography scale
- [ ] Empty states use EmptyStateV2 component

**Component Audit:**
- [ ] Zero instances of `<Input type="date" />` (all replaced with DatePicker)
- [ ] All tables use DataTable component (no custom table implementations)
- [ ] All delete confirmations use DeleteConfirmation component
- [ ] All filters use FilterBarV2 component

---

## 12. CONCLUSION & NEXT STEPS

### 12.1 Summary of Findings

**Critical Issues (Fix Immediately):**
1. ⚠️ **Date picker bug** (off-by-one-day) → Impacts scheduling, delivery, billing
2. ⚠️ **Work package phase gates missing** → Risk of fabricating without approved drawings
3. ⚠️ **Detailing RFI button non-functional** → Workflow broken

**High-Priority Improvements:**
1. Unify design system (ExecutionCard, KPIStrip, FilterBarV2)
2. Automate workflow handoffs (detailing → fab → delivery)
3. Surface AI insights proactively (conflicts in KPI strip, not buried in assistant)

**Medium-Priority Enhancements:**
1. Mobile optimization (Daily Logs, Schedule, Deliveries)
2. Cross-module navigation improvements (breadcrumbs, linked items)
3. Resource management integration with scheduling

**Low-Priority (Nice-to-Have):**
1. Voice input for field notes
2. Advanced analytics drill-downs
3. Carrier performance scorecards

---

### 12.2 Phased Implementation (12-Week Plan)

| **Phase** | **Weeks** | **Focus**                  | **Deliverables**                          |
|-----------|-----------|----------------------------|-------------------------------------------|
| 1         | 1-2       | Critical Fixes             | Date bug resolved, phase gates, RFI functional |
| 2         | 3-4       | Design System              | Shared components, visual consistency     |
| 3         | 5-6       | Workflow Automation        | Auto-progression, notifications, validation |
| 4         | 7-8       | AI Intelligence            | Proactive insights, auto-assignments      |
| 5         | 9-10      | Mobile Optimization        | Field-first UI, offline support           |
| 6         | 11-12     | Analytics Integration      | Insights → actions, embedded dashboards   |

---

### 12.3 Immediate Action Items (Next 48 Hours)

**For Development Team:**
1. Create `utilities/dateUtils.js` and `components/ui/DatePicker.jsx`
2. Audit all `<Input type="date" />` instances (search codebase)
3. Begin replacement in highest-impact modules (Daily Logs, Deliveries, Tasks)
4. Write unit tests for date utilities (all timezones)

**For Product Team:**
1. Validate roadmap with PM/superintendent (confirm priorities)
2. Prepare user communications ("We're fixing the date bug—here's what changed")
3. Schedule UAT sessions (Week 2, Week 4, Week 6)

**For Design Team:**
1. Build ExecutionCard design in Figma (all 4 variants)
2. Create design system documentation (colors, typography, spacing)
3. Mockup unified Dashboard "Action Required" panel

---

### 12.4 Long-Term Vision (6-12 Months)

**Platform Evolution:**
- **Predictive Intelligence:** AI predicts project completion dates with 90% accuracy
- **Automated Workflow:** 80% of routine handoffs automated (drawings → fab → delivery)
- **Mobile-First Field Operations:** 70% of field data entry via mobile
- **Unified Data Model:** Single source of truth (no duplicate tasks, documents, or assignments)
- **Real-Time Collaboration:** Multiple users can edit same entity concurrently (conflict resolution)
- **Voice-Driven Interface:** Field supers dictate daily logs, safety notes (95% accuracy)

**Result:**
SteelBuild Pro becomes the **industry-standard** platform for structural steel execution—trusted, predictable, and indispensable for PMs running complex jobsites.

---

**Document Version:** 1.0  
**Date:** January 27, 2026  
**Audit Performed By:** Base44 Platform Team  
**Review Required By:** Product, Engineering, Field Operations Stakeholders  

**Next Review:** February 10, 2026 (after Phase 1 completion)

---

## END OF SPECIFICATION