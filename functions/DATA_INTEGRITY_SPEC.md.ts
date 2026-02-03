# Data Integrity & Referential Constraints

## Overview

This document defines the referential integrity rules, cascade behaviors, and data validation requirements for SteelBuild Pro.

## Referential Integrity Rules

### Parent-Child Relationships

| Parent Entity | Child Entity | Cascade Delete | Orphan Check |
|---------------|--------------|----------------|--------------|
| Project | Task | ✅ Yes | ✅ Required |
| Project | WorkPackage | ✅ Yes | ✅ Required |
| Project | RFI | ✅ Yes | ✅ Required |
| Project | ChangeOrder | ✅ Yes | ✅ Required |
| Project | Financial | ✅ Yes | ✅ Required |
| Project | Expense | ✅ Yes | ✅ Required |
| Project | DrawingSet | ✅ Yes | ✅ Required |
| Project | Document | ✅ Yes | ✅ Required |
| Project | DailyLog | ✅ Yes | ✅ Required |
| Project | Meeting | ✅ Yes | ✅ Required |
| Project | ProductionNote | ✅ Yes | ✅ Required |
| Project | Delivery | ✅ Yes | ✅ Required |
| Project | SOVItem | ✅ Yes | ✅ Required |
| WorkPackage | Task | ✅ Yes | ⚠️ Optional |
| WorkPackage | LaborHours | ✅ Yes | ✅ Required |
| DrawingSet | DrawingSheet | ✅ Yes | ✅ Required |
| DrawingSet | DrawingRevision | ✅ Yes | ✅ Required |
| Task | Task (subtask) | ✅ Yes | ✅ Required |
| Task | Task (predecessor) | ⚠️ Remove ref | ✅ Required |
| CostCode | Financial | ❌ No | ✅ Required |
| Resource | ResourceAllocation | ❌ No | ✅ Required |

### Unique Constraints

**Global Uniqueness:**
- Project.project_number (across all projects)
- CostCode.code (across all cost codes)
- Resource.name (across all resources, per type)

**Project-Scoped Uniqueness:**
- RFI.rfi_number (per project)
- ChangeOrder.co_number (per project)
- WorkPackage.wpid (per project)
- DrawingSet.set_number (per project)

## Date Ordering Rules

### Projects
```
start_date ≤ target_completion ≤ actual_completion
```

### Tasks
```
start_date ≤ end_date
baseline_start ≤ baseline_end
```

### RFIs
```
submitted_date ≤ response_date ≤ closed_date
```
- Status 'submitted' requires submitted_date
- Status 'answered' requires response_date
- Status 'closed' requires closed_date AND (response OR question)

### Change Orders
```
submitted_date ≤ approved_date
```

### Drawing Sets
```
ifa_date ≤ bfa_date
bfa_date ≤ bfs_date
bfs_date ≤ released_for_fab_date
```

## Numeric Range Rules

### Percentages (0-100)
- Task.progress_percent
- WorkPackage.progress_percent

### Non-Negative Values (≥ 0)
- Project.contract_value
- Project.crane_budget
- Project.sub_budget
- Project.rough_square_footage
- Financial.original_budget
- Financial.current_budget
- Financial.committed_amount
- Financial.actual_amount
- Financial.forecast_amount
- Expense.amount
- Task.estimated_hours
- Task.actual_hours
- Task.estimated_cost
- Task.actual_cost
- LaborHours.hours
- LaborHours.overtime_hours

### Valid Ranges
- RFI.days_to_respond: 1-60
- ChangeOrder.schedule_impact_days: -365 to 365 (can be negative for acceleration)

## State Machine Rules

### Project Status Flow
```
bidding → awarded → in_progress → completed → closed
                 ↓
              on_hold (can return to in_progress)
```

### RFI Status Flow
```
draft → internal_review → submitted → under_review → answered → closed
                                                              ↓
                                                          reopened
```
- Cannot close without response
- Cannot reopen from draft/internal_review

### Task Status Flow
```
not_started → in_progress → completed
           ↓
      blocked/on_hold (can return to not_started or in_progress)
           ↓
      cancelled (terminal)
```

### Drawing Set Status Flow
```
IFA → BFA → BFS → Revise & Resubmit → FFF → As-Built
      ↑______|
```

## Validation Rules

### Project Creation
- ✅ project_number unique
- ✅ name required
- ✅ start_date ≤ target_completion
- ✅ contract_value ≥ 0
- ✅ assigned_users valid emails

### RFI Creation
- ✅ project_id exists
- ✅ subject required
- ✅ question required (unless updating existing)
- ✅ rfi_number unique per project
- ✅ priority in enum
- ✅ status workflow valid

### Task Creation
- ✅ project_id exists
- ✅ name required
- ✅ start_date ≤ end_date
- ✅ progress_percent 0-100
- ✅ No circular dependencies
- ✅ predecessors exist

### Financial Operations
- ✅ project_id exists
- ✅ cost_code_id exists
- ✅ All amounts ≥ 0
- ✅ current_budget = original_budget + approved_changes

## Cascade Delete Order

When deleting a Project:
1. Tasks (and their subtasks, dependencies)
2. Work packages
3. Labor hours
4. Financials, expenses, budget items
5. RFIs
6. Change orders
7. Drawing sets → sheets, revisions, annotations
8. Documents
9. Submittals
10. Deliveries
11. Fabrication packages
12. Daily logs
13. Meetings
14. Production notes
15. SOV items, invoices
16. Resource allocations
17. Project itself

## Integrity Check Schedule

Run `checkDataIntegrity` function:
- **Daily:** Automated scan for orphaned records
- **Weekly:** Full integrity check with violations report
- **On-Demand:** After major data migrations or bulk operations

## Repair Strategies

### Orphaned Records
- **Option 1:** Delete orphaned records (recommended)
- **Option 2:** Reassign to valid parent
- **Option 3:** Create placeholder parent (last resort)

### Date Violations
- **Automated:** Adjust end_date = start_date + 1 day if reversed
- **Manual:** Review and fix based on business logic

### Circular Dependencies
- **Manual:** Must be resolved by removing one dependency in cycle
- **Prevention:** Validate before creating task dependencies

## Migration from JSON String Settings

For existing projects with `settings` as JSON string:

```javascript
// Migration script pattern
const projects = await base44.entities.Project.list();
for (const project of projects) {
  if (typeof project.settings === 'string') {
    const parsed = JSON.parse(project.settings || '{}');
    await base44.entities.Project.update(project.id, {
      settings: parsed
    });
  }
}
```

## Implementation Status

- ✅ Cascade delete utilities created
- ✅ Data integrity check functions created
- ✅ Validation utilities created
- ✅ Project.settings migrated to object type
- ⏳ Migration script for existing JSON strings
- ⏳ Automated integrity check scheduling
- ⏳ Frontend validation UI components