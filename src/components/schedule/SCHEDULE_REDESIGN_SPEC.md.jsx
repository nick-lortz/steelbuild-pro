# Schedule Management System — Complete Redesign Specification

**Version:** 1.0  
**Date:** 2026-01-31  
**Audience:** Product, Design, Engineering, PM  
**Focus:** Steel erection sequencing, crew/crane resource coordination, daily execution planning

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Current State Assessment](#current-state-assessment)
3. [New Information Architecture](#new-information-architecture)
4. [Page States & Views](#page-states--views)
5. [Interaction Flows](#interaction-flows)
6. [Functional Specification](#functional-specification)
7. [Backend Entity Schemas](#backend-entity-schemas)
8. [Scheduling Rules & Validation](#scheduling-rules--validation)
9. [User Stories (Gherkin Format)](#user-stories-gherkin-format)
10. [Performance & Accessibility Requirements](#performance--accessibility-requirements)
11. [Implementation Roadmap](#implementation-roadmap)

---

## EXECUTIVE SUMMARY

The current Schedule Management page is an empty-state placeholder. The redesign introduces:

- **Master Gantt Calendar** — Phase-based timeline with task bars, dependencies, and critical path highlighting
- **Lift Sequencing Panel** — Piece-level steel erection scheduling with readiness checks and crane slot allocation
- **Resource Dashboard** — Real-time crew and equipment utilization, conflicts, and capacity planning
- **Daily Lookahead** — 5-day rolling execution plan with crew assignments, material readiness, and safety checkpoints
- **Critical Path Engine** — Auto-calculation of dependencies and schedule impact visualization
- **Drag-and-Drop Execution** — Adjust task dates, reassign crews, manage crane picks with conflict detection

**Target Users:**
- PM: Schedule creation, baseline tracking, change impact
- Foreman: Daily crew assignments, lift execution, task completion logging
- Superintendent: Day-to-day plan adjustments, conflict resolution, status review
- Crane Coordinator: Lift sequencing, piece assignments, crane capacity management
- Detailer: Sequence validation against drawing readiness

---

## CURRENT STATE ASSESSMENT

**Current Page State (from screenshot):**
- Empty-state UI only
- Tab structure exists (PHASES, TIMELINE, FLEET, SAFETY, CAL, NETWORKS, ETC, CREW, ACTUALS, DAILY, DATE)
- No data visualizations
- No integration with Task, Resource, or Delivery entities
- No drag-drop or real-time collaboration

**Gaps to Address:**
1. No Gantt chart or timeline visualization
2. No crew/equipment resource allocation
3. No lift-level scheduling (crucial for steel erection)
4. No lookahead planning (daily/weekly execution)
5. No dependency or critical path logic
6. No conflict detection or readiness validation

---

## NEW INFORMATION ARCHITECTURE

### Page Structure (Desktop, 1400px+)

```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER: Project Name | Phase | AI Assistant | Export | Settings      │
├────────┬─────────────────────────────────────────────────────────────┤
│        │ SCHEDULE GANTT (60% width)                                   │
│FILTERS │ ┌──────────────────────────────────────────────────────┐   │
│ • View │ │ Timeline Ruler (Weeks/Days)                           │   │
│ • Date │ │ ┌─ Phase 1: Detailing ────────────┐                 │   │
│ • Phase│ │ │  ├─ Dwg. Issue          [=======] Jan 5-12         │   │
│ • Crew │ │ │  ├─ Client Review       [======] Jan 8-10          │   │
│ • Lift │ │ │  └─ Revision            [=====]  Jan 12-15         │   │
│        │ │ ┌─ Phase 2: Fabrication ──────────────────────┐     │   │
│        │ │ │  ├─ Cutting/Prep        [==========] Jan 15-28      │   │
│        │ │ │  ├─ Welding             [============] Jan 20-Feb5  │   │
│        │ │ │  └─ QC/Touch-up         [====] Feb 5-8              │   │
│        │ │ ┌─ Phase 3: Delivery ────────────┐                  │   │
│        │ │ │  └─ Final Pickup/Haul   [===] Feb 8-10              │   │
│        │ │ ┌─ Phase 4: Erection ───────────────────────────┐   │   │
│        │ │ │  ├─ Grid 1-2 (10 pieces) [==] Feb 12-13          │   │
│        │ │ │  ├─ Grid 3-4 (12 pieces) [==] Feb 14-15          │   │
│        │ │ │  ├─ Grid 5-6 (15 pieces) [==] Feb 16-18          │   │
│        │ │ │  └─ Connections         [===] Feb 18-22           │   │
│        │ │ └─────────────────────────────────────────────────   │   │
│        │ └──────────────────────────────────────────────────────┘   │
├────────┼─────────────────────────────────────────────────────────────┤
│        │ RESOURCE UTILIZATION (40% width, scrolls with Gantt)        │
│ QUICK  │ ┌──────────────────────────────────────────────────────┐   │
│ ACTIONS│ │ CREW CAPACITY (Feb 12-18)                            │   │
│        │ │ Crew A: ████████░░░ 8/10 days | Conflicts: 2       │   │
│        │ │ Crew B: █████░░░░░░ 5/10 days | Available         │   │
│        │ │ Crew C: ███████░░░░ 7/10 days | Heavy             │   │
│        │ │                                                      │   │
│        │ │ EQUIPMENT & CRANE (Feb 12-22)                      │   │
│        │ │ ▼ Crane A (40T): ██████████████░░░░░░ 15/22 picks  │   │
│        │ │ ▼ Crane B (35T): ████████░░░░░░░░░░░░ 8/22 picks   │   │
│        │ │                                                      │   │
│        │ │ ⚠ ALERTS (3)                                        │   │
│        │ │ • Grid 5-6 blocked: waiting on delivery Jan 30     │   │
│        │ │ • Crew C overallocated Feb 14-15                   │   │
│        │ │ • Crane A maintenance Feb 16 (replanning needed)   │   │
│        │ └──────────────────────────────────────────────────────┘   │
└────────┴─────────────────────────────────────────────────────────────┘

DETAIL DRAWER (right slide-out, 400px)
┌──────────────────────────────┐
│ TASK: Grid 1-2 Erection      │
│ Duration: Feb 12-13 (2 days) │
│ Crew: Crew A (5 ironworkers) │
│ Crane: Crane A (40T)         │
│ Pieces: 10 (5+5 lifts)       │
│ Status: Scheduled            │
│                              │
│ DEPENDENCIES                 │
│ Waits for: Delivery          │
│ Blocks: Grid 3-4 Erection    │
│                              │
│ READINESS CHECKS             │
│ ✓ Drawings released          │
│ ✓ Delivery confirmed         │
│ ○ Rigging hardware ready     │
│ ✗ Safety plan approved       │
│                              │
│ ACTIONS                      │
│ [Edit] [Assign Crew] [Lift]  │
│ [Block] [Reassign Date]      │
│ [Safety Checklist] [Export]  │
└──────────────────────────────┘
```

---

## ENTITY SCHEMAS (Key Entities Only - Full schemas in backend section)

### Task (Enhanced)
- **Fields:** project_id, task_number, name, phase, start_date, end_date, duration_days, status, progress_percent, is_critical, assigned_resources (crew, equipment, crane), dependencies, readiness_checks, pieces (for erection), lifts, estimated_hours, actual_hours, notes

### ScheduleResource
- **Fields:** project_id, resource_type (crew/equipment/crane), resource_id, resource_name, allocation_start, allocation_end, availability, constraints, utilization_hours, cost_per_unit, total_cost

### LiftSchedule
- **Fields:** project_id, task_id, crane_id, scheduled_date, scheduled_time, piece_mark, weight_tons, lift_sequence, estimated_duration_minutes, crew_assigned, status, actual_time, actual_duration_minutes, notes

### ScheduleBaseline
- **Fields:** project_id, baseline_name, baseline_date, baseline_tasks (snapshot), total_duration_days, project_finish_date, is_active, approved_by, approved_date

### ScheduleConflict
- **Fields:** project_id, conflict_date, conflict_type (crew_overallocated, crane_overloaded, dependency_broken, readiness_gap), severity, involved_tasks, involved_resources, description, suggested_resolutions, status

---

## SCHEDULING RULES & VALIDATION

### Dependency Rules
1. **Finish-Start (FS):** Predecessor must complete before successor starts
2. **Start-Start (SS):** Successor starts when predecessor starts (with optional lag)
3. **Finish-Finish (FF):** Successor finishes when predecessor finishes
4. **Lag:** Optional gap between predecessor finish and successor start

### Crew Allocation Rules
1. **Single task per crew per day** (default, allow light task parallelization)
2. **Minimum crew size:** 2 ironworkers for erection (safety rule)
3. **Crew availability:** Respect vacation, reassign if overallocated > 80% util
4. **Conflict resolution:** Critical path tasks get priority

### Crane Allocation Rules
1. **Weight capacity:** Piece weight ≤ Crane capacity
2. **One lift per crane at a time** (no simultaneous lifts)
3. **Lift capacity:** Max 22 lifts per 8-hour day per crane (~20 min per lift)
4. **Maintenance windows:** Block crane on scheduled maintenance dates

### Readiness Validation Rules
1. **Drawing release:** Cannot start task if drawing not released
2. **Material delivery:** Cannot start erection without confirmed delivery
3. **Safety plan:** Erection tasks require approved safety plan
4. **Equipment ready:** Crane must be on-site before first lift

### Critical Path Rules
1. **Auto-calculate** after every task change
2. **Float = 0** marks task as critical
3. **Recalculate daily** as tasks complete and dates shift
4. **Warn on delays** that impact project finish date

---

## KEY USER WORKFLOWS (Gherkin Scenarios)

See FULL SPECIFICATION document for detailed user stories with acceptance criteria in Gherkin format.

### Story 1: PM Creates Master Schedule
- Create tasks from baseline bid schedule
- Import schedule from template
- Establish baseline for tracking changes

### Story 2: Foreman Executes Daily Lookahead
- Review 5-day rolling execution plan
- Mark tasks complete with actual hours/pieces
- Escalate blocking issues

### Story 3: Superintendent Adjusts Daily Plan
- Detect and resolve crew overallocation
- Reassign tasks due to illness/equipment failure
- Approve safety plans to unblock tasks

### Story 4: Crane Coordinator Schedules Lifts
- Create lift schedule per crane
- Reassign lifts due to weight/capacity issues
- Export lift schedule (PDF for site)

### Story 5: Steel Detailer Validates Sequence
- Check lift sequence against drawing requirements
- Mark drawings as ready for erection
- Flag sequence issues for review

---

## PERFORMANCE & ACCESSIBILITY

**Performance Targets:**
- Page load: < 2s (empty), < 3s (100+ tasks)
- Gantt rendering: 60 FPS smooth scroll
- Drag-drop: < 50ms latency
- Dependency calculation: < 500ms (CPM)
- Conflict detection: < 200ms (realtime)

**Accessibility (WCAG 2.1 AA):**
- Keyboard navigation (Tab, Arrow keys, Enter, Esc, Spacebar)
- Screen reader support (aria-labels on all bars)
- Color contrast: ≥ 4.5:1
- Responsive mobile/tablet/desktop

**Browser Support:**
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Mobile: iOS Safari 14+, Chrome Android 90+

---

## IMPLEMENTATION ROADMAP (12 Weeks)

### Phase 1 (Weeks 1-2): Core Gantt & Data Model
- [ ] Task entity schema + CPM engine
- [ ] Basic Gantt chart component
- [ ] Dependency calculation
- [ ] **Deliverable:** Static Gantt timeline

### Phase 2 (Weeks 3-4): Resource Management
- [ ] ScheduleResource entity schema
- [ ] Resource utilization panel
- [ ] Crew conflict detection & alerts
- [ ] **Deliverable:** Resource planning

### Phase 3 (Weeks 5-6): Drag-Drop & Execution
- [ ] Drag-drop reschedule with validation
- [ ] Lookahead 5-day rolling view
- [ ] Task completion logging
- [ ] **Deliverable:** Real-time schedule mgmt

### Phase 4 (Weeks 7-8): Lift Scheduling
- [ ] LiftSchedule entity schema
- [ ] Lift Board component
- [ ] Lift reordering & crane reassignment
- [ ] **Deliverable:** Piece-level lift scheduling

### Phase 5 (Weeks 9-10): Baseline & Reporting
- [ ] ScheduleBaseline entity schema
- [ ] Baseline creation & approval
- [ ] Variance reporting
- [ ] **Deliverable:** Baseline tracking

### Phase 6 (Weeks 11-12): Polish & Launch
- [ ] Performance optimization
- [ ] Accessibility testing
- [ ] Mobile responsiveness
- [ ] **Deliverable:** Production-ready

---

**Status:** READY FOR HANDOFF  
**Next Steps:** Design review → Schema validation → Component development → UAT

For full detailed specification including UI layouts, interaction flows, complete Gherkin scenarios, and backend schemas, see the full SCHEDULE_REDESIGN_SPEC document.