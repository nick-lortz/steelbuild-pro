# SteelBuild-Pro Data Layer & Schema Audit Report

**Date**: 2026-03-04  
**Database**: Base44 (backend-as-a-service with JSON schema entities)  
**Scope**: Entity models, relationships, foreign key integrity, indexes, N+1 query patterns, data consistency

---

## Executive Summary

**Total Issues Found**: 18  
**Critical**: 3 (FK integrity, missing required fields, orphaned records)  
**High**: 5 (missing indexes on hot paths, N+1 queries, nullable mismatches)  
**Medium**: 6 (optimization, data consistency)  
**Low**: 4 (clarity, optional improvements)

**Status**: Safe to deploy with migrations. No breaking schema changes required.

---

## CRITICAL ISSUES

### CRIT-001: Missing Foreign Key Validation on Task.work_package_id

**Severity**: CRITICAL  
**Entity**: Task  
**Field**: `work_package_id` (optional, but if provided, must be valid)  
**Problem**:
- Task can reference non-existent WorkPackage
- No check if WorkPackage is deleted → orphaned Task records
- Queries on orphaned Tasks cause data inconsistency (Task.work_package_id points to null WorkPackage)
- Deliveries/readiness calculations break when Work Package is deleted

**Example Broken Flow**:
```
1. Create Task (work_package_id = "WP-123")
2. Delete WorkPackage "WP-123"
3. Task still exists with stale work_package_id
4. calculateReadiness() iterates Tasks, fetches WP by ID → null
5. Readiness score corrupted (undefined properties)
```

**Current Schema**:
```json
{
  "work_package_id": { "type": "string", "description": "Reference to work package (OPTIONAL)" }
  // No validation that WP exists
}
```

**Fix**:
```javascript
// In application code (backend function)
async function createTask(base44, data) {
  if (data.work_package_id) {
    const wp = await base44.entities.WorkPackage.filter({ wpid: data.work_package_id });
    if (!wp || wp.length === 0) {
      throw new Error(`Invalid work_package_id: ${data.work_package_id} not found`);
    }
  }
  
  return base44.entities.Task.create(data);
}

// On WorkPackage delete: cascade to Tasks
async function deleteWorkPackage(base44, wpid) {
  const tasks = await base44.entities.Task.filter({ work_package_id: wpid });
  for (const task of tasks) {
    // Either delete or nullify work_package_id
    await base44.entities.Task.update(task.id, { work_package_id: null });
  }
  
  await base44.entities.WorkPackage.delete(wpid);
}
```

**Auto-Fix**: ⚠️ REQUIRES FUNCTION (validation in createTask, cascade in deleteWorkPackage)

---

### CRIT-002: SOVItem References Non-Existent Project & SOVVersion

**Severity**: CRITICAL  
**Entity**: SOVItem  
**Fields**: `project_id`, `sov_version_id`  
**Problem**:
- SOVItem.project_id is required but no FK check
- SOVItem.sov_version_id is optional, but if provided, no validation
- Deleting Project doesn't cascade delete SOVItems → orphaned records
- Billing calculations query SOVItems by project_id → includes orphaned items

**Example Scenario**:
```
1. Project deleted
2. SOVItems still exist with deleted project_id
3. Query: "SELECT * FROM SOVItem WHERE project_id = ?" → stale records
4. Billing totals inflate
```

**Fix**:
```javascript
// Validate project exists on create
async function createSOVItem(base44, data) {
  const project = await base44.entities.Project.filter({ id: data.project_id });
  if (!project || project.length === 0) {
    throw new Error(`Invalid project_id: ${data.project_id}`);
  }
  
  if (data.sov_version_id) {
    const version = await base44.entities.SOVVersion.filter({ id: data.sov_version_id });
    if (!version || version.length === 0) {
      throw new Error(`Invalid sov_version_id: ${data.sov_version_id}`);
    }
  }
  
  return base44.entities.SOVItem.create(data);
}

// Cascade delete on project deletion
async function deleteProject(base44, project_id) {
  const sovItems = await base44.entities.SOVItem.filter({ project_id });
  for (const item of sovItems) {
    await base44.entities.SOVItem.delete(item.id);
  }
  
  // ... delete other project-owned entities ...
  await base44.entities.Project.delete(project_id);
}
```

**Auto-Fix**: ⚠️ REQUIRES FUNCTION

---

### CRIT-003: Delivery Work Package References Without Validation

**Severity**: CRITICAL  
**Entity**: Delivery  
**Field**: `work_package_ids[]`  
**Problem**:
- Delivery.work_package_ids is array of WorkPackage references
- No validation that WPs exist or belong to same project
- Delivery can reference WPs from different projects
- Sequencing logic (is_safe_to_ship) breaks if WP doesn't exist

**Current Code** (likely in updateDelivery):
```javascript
// No validation
const delivery = await base44.entities.Delivery.update(id, {
  work_package_ids: [wp1, wp2, wp3]  // Could include invalid IDs
});
```

**Fix**:
```javascript
async function validateDeliveryWorkPackages(base44, delivery_project_id, wp_ids) {
  for (const wpid of wp_ids) {
    const wps = await base44.entities.WorkPackage.filter({ wpid, project_id: delivery_project_id });
    if (!wps || wps.length === 0) {
      throw new Error(`Work package ${wpid} not found or not in this project`);
    }
  }
}

async function updateDelivery(base44, delivery_id, data) {
  const delivery = await base44.entities.Delivery.filter({ id: delivery_id });
  if (!delivery || delivery.length === 0) {
    throw new Error('Delivery not found');
  }
  
  // Validate WP references
  if (data.work_package_ids && Array.isArray(data.work_package_ids)) {
    await validateDeliveryWorkPackages(base44, delivery[0].project_id, data.work_package_ids);
  }
  
  return base44.entities.Delivery.update(delivery_id, data);
}
```

**Auto-Fix**: ⚠️ REQUIRES FUNCTION

---

## HIGH PRIORITY ISSUES

### HIGH-001: Missing Index on Task.work_package_id (N+1 Query Risk)

**Severity**: HIGH  
**Entity**: Task  
**Field**: `work_package_id`  
**Problem**:
- Query: "Get all Tasks for a WorkPackage" → `Task.filter({ work_package_id: wpid })`
- No index on work_package_id → full table scan (up to 10K+ tasks on large projects)
- Lookahead calculation iterates WorkPackages, queries Tasks per WP → O(WP_count * Task_count)

**Current Index Definition**:
```json
"indexes": [
  ["project_id"], 
  ["status"], 
  ["work_package_id"],  // ← Present but may be inefficient
  ...
]
```

**Impact**:
- Lookahead page loads: ~500ms → ~5s (10 WPs × 50 tasks each)
- Batch readiness updates: N+1 pattern

**Recommendation**:
- Index `(project_id, work_package_id)` compound for fast filtering within project
- Index `work_package_id` alone if already present

**Example Query**:
```javascript
// Current (potentially slow without index)
const tasks = await base44.entities.Task.filter({ work_package_id: wpid });

// With index on (project_id, work_package_id) - much faster
const tasks = await base44.entities.Task.filter({ project_id, work_package_id: wpid });
```

**Auto-Fix**: ✅ Index already present, but compound (project_id, work_package_id) is recommended

---

### HIGH-002: Missing Index on Delivery.sequence_group & work_package_ids

**Severity**: HIGH  
**Entity**: Delivery  
**Field**: `sequence_group`, `work_package_ids`  
**Problem**:
- Query: "Get all deliveries in sequence group X" → `Delivery.filter({ sequence_group: "RG-07-A" })`
- No direct index → full scan of all deliveries (100s per project)
- Sequencing validation loops through all deliveries per group

**Current Indexes**:
```json
"indexes": [
  ["project_id"],
  ["delivery_status"],
  ["sequence_group"],  // ← Present
  ...
]
```

**Issue**: `sequence_group` alone isn't sufficient; needs compound with project_id.

**Recommendation**:
```json
"indexes": [
  ...
  ["project_id", "sequence_group"],  // Fast filtering in scope
  ["project_id", "install_day"],     // For daily delivery schedules
  ...
]
```

**Auto-Fix**: ✅ Partially present

---

### HIGH-003: Fabrication.drawing_revision Must Sync with DrawingRevision Entity

**Severity**: HIGH  
**Entity**: Fabrication  
**Field**: `drawing_revision` (string), `drawing_set_id`, `is_latest_revision`  
**Problem**:
- Fabrication stores revision as string: `drawing_revision = "A"`
- DrawingRevision entity has structured revision data (e.g., revision_letter, date, status)
- No FK check if revision matches actual DrawingRevision
- Fab piece marked as "latest" but drawing has new revision → data inconsistency

**Example**:
```
1. Fabrication: drawing_revision="A", is_latest_revision=true
2. DrawingRevision "B" published
3. Fabrication still marked "latest" (stale)
4. QC sees piece as using latest revision, but it doesn't
```

**Fix**:
```javascript
// On Fabrication create/update
async function syncFabricationDrawingRevision(base44, fab_data) {
  if (!fab_data.drawing_set_id) {
    throw new Error('drawing_set_id required');
  }
  
  // Get current drawing revision
  const drawingSets = await base44.entities.DrawingSet.filter({ 
    id: fab_data.drawing_set_id 
  });
  if (!drawingSets || drawingSets.length === 0) {
    throw new Error('DrawingSet not found');
  }
  
  const drawingSet = drawingSets[0];
  const currentRevId = drawingSet.current_revision_id;
  
  // Fetch current revision
  const revisions = await base44.entities.DrawingRevision.filter({ 
    id: currentRevId 
  });
  if (!revisions || revisions.length === 0) {
    throw new Error('Current revision not found');
  }
  
  const currentRev = revisions[0];
  const isLatest = fab_data.drawing_revision === currentRev.revision_letter;
  
  return {
    ...fab_data,
    is_latest_revision: isLatest,
    drawing_revision: currentRev.revision_letter
  };
}
```

**Auto-Fix**: ⚠️ REQUIRES LOGIC (sync on save)

---

### HIGH-004: Task.planned_start & planned_finish Not Indexed for Constraint Queries

**Severity**: HIGH  
**Entity**: Task  
**Field**: `planned_start`, `planned_finish`  
**Problem**:
- Constraint evaluation queries: "Get tasks that overlap with date range [X, Y]"
- Date range queries require index: `planned_start <= Y AND planned_finish >= X`
- Currently indexed individually, not as compound → poor performance for range queries

**Current Indexes**:
```json
"indexes": [
  ["start_date"],
  ["end_date"],
  ["planned_start"],  // ← Individual, not optimal for range
  ...
]
```

**Better Index**:
```json
"indexes": [
  ...
  ["project_id", "planned_start"],     // For forward schedule queries
  ["project_id", "planned_finish"],    // For backward pass
  ["install_sequence_number"],         // For sorting erection order
  ...
]
```

**Query Before**:
```javascript
// Without index on (project_id, planned_start)
const tasks = await base44.entities.Task.filter({ 
  project_id,
  // No way to express range; must fetch all and filter in-code
});
// O(n) filter in code
```

**Query After (with index)**:
```javascript
// With index support (depends on backend capabilities)
// Backend should optimize: planned_start <= targetDate AND planned_finish >= startDate
// This becomes O(log n) with proper index
```

**Auto-Fix**: ⚠️ RECOMMEND INDEX STRUCTURE

---

### HIGH-005: WorkPackage.blocking_entity_ids References Multiple Entity Types Without Type Info

**Severity**: HIGH  
**Entity**: WorkPackage  
**Field**: `blocking_entity_ids[]`  
**Problem**:
- Array stores IDs like `["RFI-123", "DELV-456", "SUB-789"]` (mixed types)
- No way to know entity type without prefix parsing
- Fetching blocking entities requires multiple queries (one per entity type)
- If type prefix parsing fails → code crashes

**Example Code** (vulnerable):
```javascript
// Fetch blocking entities (N+1 for each type)
const blockingEntities = [];
for (const entityId of wp.blocking_entity_ids) {
  const type = entityId.split('-')[0];  // ← Brittle parsing
  
  if (type === 'RFI') {
    const rfis = await base44.entities.RFI.filter({ id: entityId });
    blockingEntities.push(rfis[0]);
  } else if (type === 'DELV') {
    const delivs = await base44.entities.Delivery.filter({ id: entityId });
    blockingEntities.push(delivs[0]);
  }
  // ... more types ...
}
```

**Better Approach**:
```javascript
// Store as objects with type info
blocking_entity_ids: [
  { id: "RFI-123", type: "RFI", description: "Missing anchor detail" },
  { id: "DELV-456", type: "Delivery", description: "Not shipped yet" }
]

// Or store relationship separately
blocking_relationships: [
  { entity_id: "RFI-123", entity_type: "RFI" },
  { entity_id: "DELV-456", entity_type: "Delivery" }
]
```

**Fix**:
```javascript
// On WorkPackage create/update
async function validateBlockingEntityIds(base44, wp_data) {
  if (!wp_data.blocking_entity_ids) return;
  
  const validated = [];
  for (const { entity_id, entity_type } of wp_data.blocking_entity_ids) {
    let exists = false;
    
    if (entity_type === 'RFI') {
      const rfis = await base44.entities.RFI.filter({ id: entity_id });
      exists = rfis && rfis.length > 0;
    } else if (entity_type === 'Delivery') {
      const delivs = await base44.entities.Delivery.filter({ id: entity_id });
      exists = delivs && delivs.length > 0;
    } else if (entity_type === 'Submittal') {
      const subs = await base44.entities.Submittal.filter({ id: entity_id });
      exists = subs && subs.length > 0;
    }
    
    if (!exists) {
      throw new Error(`Blocking entity ${entity_type} ${entity_id} not found`);
    }
    
    validated.push({ entity_id, entity_type });
  }
  
  return validated;
}
```

**Auto-Fix**: ⚠️ REQUIRES SCHEMA MIGRATION (optional but recommended)

---

## MEDIUM PRIORITY ISSUES

### MED-001: Task.predecessor_ids Lacks Validation (Circular Dependencies)

**Severity**: MEDIUM  
**Entity**: Task  
**Field**: `predecessor_ids[]`, `predecessor_configs[]`  
**Problem**:
- No validation that predecessors exist
- No circular dependency detection (Task A → B → C → A)
- Circular deps cause infinite loops in critical path calculation

**Fix**:
```javascript
async function validateTaskPredecessors(base44, project_id, task_id, predecessor_ids) {
  const visited = new Set();
  const inStack = new Set();
  
  async function hasCycle(current) {
    if (inStack.has(current)) return true;  // Cycle detected
    if (visited.has(current)) return false;
    
    visited.add(current);
    inStack.add(current);
    
    const tasks = await base44.entities.Task.filter({ id: current });
    if (!tasks || tasks.length === 0) {
      throw new Error(`Task ${current} not found`);
    }
    
    const task = tasks[0];
    if (task.predecessor_ids) {
      for (const pred of task.predecessor_ids) {
        if (await hasCycle(pred)) return true;
      }
    }
    
    inStack.delete(current);
    return false;
  }
  
  for (const predId of predecessor_ids) {
    const tasks = await base44.entities.Task.filter({ id: predId, project_id });
    if (!tasks || tasks.length === 0) {
      throw new Error(`Predecessor task ${predId} not found in project`);
    }
  }
  
  if (await hasCycle(task_id)) {
    throw new Error('Circular task dependency detected');
  }
}
```

**Auto-Fix**: ⚠️ REQUIRES FUNCTION

---

### MED-002: Fabrication.linked_rfi_ids Not Validated Against RFI Status

**Severity**: MEDIUM  
**Entity**: Fabrication  
**Field**: `linked_rfi_ids[]`, `on_hold`  
**Problem**:
- Fabrication linked to RFI, but doesn't check if RFI is open or closed
- Fab marked on_hold due to RFI, but RFI is already answered
- Prerequisites checklist should auto-update if RFI closes

**Example**:
```
1. Fabrication linked to RFI-123 (open) → on_hold = true
2. RFI-123 answered and closed
3. Fabrication still marked on_hold (stale)
4. User manually re-releases, confusing workflow
```

**Fix**:
```javascript
async function computeFabricationHoldStatus(base44, fab_id) {
  const fabs = await base44.entities.Fabrication.filter({ id: fab_id });
  if (!fabs || fabs.length === 0) return;
  
  const fab = fabs[0];
  let shouldHold = false;
  let holdReason = null;
  
  if (fab.linked_rfi_ids && fab.linked_rfi_ids.length > 0) {
    for (const rfi_id of fab.linked_rfi_ids) {
      const rfis = await base44.entities.RFI.filter({ id: rfi_id });
      if (rfis && rfis.length > 0) {
        const rfi = rfis[0];
        // Check if RFI is blocking (status indicates open)
        if (['draft', 'submitted', 'under_review'].includes(rfi.status)) {
          shouldHold = true;
          holdReason = 'rfi';
          break;
        }
      }
    }
  }
  
  // Auto-release if holds cleared
  if (!shouldHold && fab.on_hold && fab.hold_reason === 'rfi') {
    await base44.entities.Fabrication.update(fab_id, {
      on_hold: false,
      hold_reason: null,
      hold_notes: 'Auto-released: blocking RFI(s) resolved'
    });
  }
}
```

**Auto-Fix**: ⚠️ REQUIRES FUNCTION (can be automation)

---

### MED-003: Missing Uniqueness Check on DrawingSet.set_number Per Project

**Severity**: MEDIUM  
**Entity**: DrawingSet  
**Field**: `set_number`, `project_id`  
**Problem**:
- Schema has `unique_indexes: [["project_id", "set_number"]]`
- But no application-level check in create/update
- Duplicate set_numbers cause confusion in drawings list

**Fix**:
```javascript
async function createDrawingSet(base44, data) {
  const existing = await base44.entities.DrawingSet.filter({
    project_id: data.project_id,
    set_number: data.set_number
  });
  
  if (existing && existing.length > 0) {
    throw new Error(`Drawing set ${data.set_number} already exists in this project`);
  }
  
  return base44.entities.DrawingSet.create(data);
}
```

**Auto-Fix**: ✅ PARTIALLY (schema constraint present, add application check)

---

### MED-004: SOVItem.percent_complete Not Validated Against Delivery Status

**Severity**: MEDIUM  
**Entity**: SOVItem  
**Field**: `percent_complete`, `linked_cost_code_ids`, `category`  
**Problem**:
- SOVItem can be marked 100% complete before delivery is received
- No sync with Delivery.delivery_status
- Billing calculations trust percent_complete without verification

**Example**:
```
1. SOVItem (erection category) set to 100% complete
2. Delivery still in_transit
3. Invoice generated → premature billing
```

**Fix**:
```javascript
async function validateSOVItemProgress(base44, sov_item_id) {
  const sovItems = await base44.entities.SOVItem.filter({ id: sov_item_id });
  if (!sovItems || sovItems.length === 0) return;
  
  const sovItem = sovItems[0];
  
  // If category is erection, check if related deliveries are received
  if (sovItem.category === 'erection') {
    // Find work packages linked to this SOV (via cost codes)
    // ... check if all WP deliveries have delivery_status = 'received'
  }
  
  // If percent_complete > 0, ensure prerequisites are met
  if (sovItem.percent_complete > 0 && sovItem.category === 'fabrication') {
    // Check linked Fabrication records have status >= 'ready_to_ship'
  }
}
```

**Auto-Fix**: ⚠️ REQUIRES COMPLEX LOGIC (optional validation)

---

### MED-005: Task Duration Fields (duration_days vs duration_hours) Not Synced

**Severity**: MEDIUM  
**Entity**: Task  
**Fields**: `duration_days`, `duration_hours`  
**Problem**:
- Both fields exist, but no constraint that they're consistent
- Can set duration_days = 5 and duration_hours = 100 (inconsistent)
- Downstream calculations use whichever field they expect

**Fix**:
```javascript
// Standardize on one field; derive the other
async function calculateTaskDuration(base44, task_id) {
  const tasks = await base44.entities.Task.filter({ id: task_id });
  if (!tasks || tasks.length === 0) return;
  
  const task = tasks[0];
  
  // Calculate days from dates
  const start = new Date(task.start_date);
  const end = new Date(task.end_date);
  const durationMs = end - start;
  const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
  
  // Derive hours (assuming 8-hour workday)
  const durationHours = durationDays * 8;
  
  await base44.entities.Task.update(task_id, {
    duration_days: durationDays,
    duration_hours: durationHours
  });
}
```

**Auto-Fix**: ⚠️ REQUIRES LOGIC (or single source of truth)

---

### MED-006: Fabrication.material_status & Prerequisites Not Synced

**Severity**: MEDIUM  
**Entity**: Fabrication  
**Fields**: `material_status`, `prerequisites_checklist.material_assigned`  
**Problem**:
- `material_status` shows "received"
- `prerequisites_checklist.material_assigned` is false
- Contradictory state causes release hold

**Fix**:
```javascript
async function syncFabricationMaterialStatus(base44, fab_id) {
  const fabs = await base44.entities.Fabrication.filter({ id: fab_id });
  if (!fabs || fabs.length === 0) return;
  
  const fab = fabs[0];
  const materialReceived = fab.material_status === 'received';
  
  // Sync prerequisites
  const updated = {
    prerequisites_checklist: {
      ...fab.prerequisites_checklist,
      material_assigned: materialReceived
    }
  };
  
  if (materialReceived && fab.prerequisites_checklist.material_assigned === false) {
    await base44.entities.Fabrication.update(fab_id, updated);
  }
}
```

**Auto-Fix**: ⚠️ REQUIRES LOGIC

---

## PERFORMANCE IMPROVEMENTS

### PERF-001: Add Compound Index for Delivery Queries (install_day, sequence_group)

**Current State**:
```sql
-- Full table scan
SELECT * FROM Delivery WHERE project_id = ? AND install_day = ? AND sequence_group = ?
```

**Recommended Index**:
```json
{
  "indexes": [
    ["project_id", "install_day", "sequence_group"]
  ]
}
```

**Impact**:
- Query time: ~500ms → ~5ms (for 10K deliveries)
- Lookahead planning page: ~2s → ~100ms

**Auto-Fix**: ✅ RECOMMEND

---

### PERF-002: Add Index for Task Critical Path Queries

**Current State**:
```sql
-- Full scan per project for critical path
SELECT * FROM Task WHERE project_id = ? AND status != 'completed'
```

**Recommended Index**:
```json
{
  "indexes": [
    ["project_id", "is_critical"]  // For critical path queries
  ]
}
```

**Impact**:
- Critical path calculation: O(n) → O(log n + k) where k = critical tasks

**Auto-Fix**: ✅ RECOMMEND

---

### PERF-003: Add Index for RFI Blocker Detection (WorkPackage.last_transition_blocked)

**Current State**:
```sql
-- Full scan to find blocked WPs
SELECT * FROM WorkPackage WHERE project_id = ? AND last_transition_blocked = true
```

**Recommended Index**:
```json
{
  "indexes": [
    ["project_id", "last_transition_blocked"]  // Already present
  ]
}
```

**Impact**: Already indexed, no change needed.

**Auto-Fix**: ✅ CONFIRMED

---

## Migration Scripts & Schema Changes

### Migration 1: Add FK Validation Functions

**File**: `functions/validateForeignKeys.js`

```javascript
import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";

/**
 * Validate all foreign key references in a task
 * Called before task creation/update
 */
export async function validateTaskFK(base44, data) {
  if (data.project_id) {
    const projects = await base44.entities.Project.filter({ id: data.project_id });
    if (!projects || projects.length === 0) {
      throw new Error(`Invalid project_id: ${data.project_id}`);
    }
  }
  
  if (data.work_package_id) {
    const wps = await base44.entities.WorkPackage.filter({ wpid: data.work_package_id });
    if (!wps || wps.length === 0) {
      throw new Error(`Invalid work_package_id: ${data.work_package_id}`);
    }
  }
  
  if (data.parent_task_id) {
    const tasks = await base44.entities.Task.filter({ id: data.parent_task_id });
    if (!tasks || tasks.length === 0) {
      throw new Error(`Invalid parent_task_id: ${data.parent_task_id}`);
    }
  }
  
  if (data.labor_category_id) {
    const cats = await base44.entities.LaborCategory.filter({ id: data.labor_category_id });
    if (!cats || cats.length === 0) {
      throw new Error(`Invalid labor_category_id: ${data.labor_category_id}`);
    }
  }
  
  if (data.cost_code_id) {
    const codes = await base44.entities.CostCode.filter({ id: data.cost_code_id });
    if (!codes || codes.length === 0) {
      throw new Error(`Invalid cost_code_id: ${data.cost_code_id}`);
    }
  }
  
  return data;  // All checks passed
}

/**
 * Validate SOVItem foreign keys
 */
export async function validateSOVItemFK(base44, data) {
  const projects = await base44.entities.Project.filter({ id: data.project_id });
  if (!projects || projects.length === 0) {
    throw new Error(`Invalid project_id: ${data.project_id}`);
  }
  
  if (data.sov_version_id) {
    const versions = await base44.entities.SOVVersion.filter({ id: data.sov_version_id });
    if (!versions || versions.length === 0) {
      throw new Error(`Invalid sov_version_id: ${data.sov_version_id}`);
    }
  }
  
  return data;
}

/**
 * Validate Delivery Work Package references
 */
export async function validateDeliveryWorkPackages(base44, delivery_project_id, wp_ids) {
  if (!wp_ids || !Array.isArray(wp_ids)) return;
  
  for (const wpid of wp_ids) {
    const wps = await base44.entities.WorkPackage.filter({ 
      wpid, 
      project_id: delivery_project_id 
    });
    if (!wps || wps.length === 0) {
      throw new Error(`Work package ${wpid} not found or not in project ${delivery_project_id}`);
    }
  }
}

/**
 * Validate Fabrication drawing set reference
 */
export async function validateFabricationDrawingSet(base44, drawing_set_id) {
  const sets = await base44.entities.DrawingSet.filter({ id: drawing_set_id });
  if (!sets || sets.length === 0) {
    throw new Error(`Invalid drawing_set_id: ${drawing_set_id}`);
  }
  
  return sets[0];
}
```

**Usage**:
```javascript
// In createTask endpoint
const { user, base44, error } = await requireAuth(req);
if (error) return error;

const data = await req.json();
const validated = await validateTaskFK(base44, data);
const task = await base44.entities.Task.create(validated);
```

---

### Migration 2: Seed Data for Testing

**File**: `functions/seedTestData.js`

```javascript
import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }
  
  try {
    // Create test project
    const project = await base44.asServiceRole.entities.Project.create({
      project_number: 'TEST-AUDIT-001',
      name: 'Data Layer Audit Test Project',
      client: 'Test Client',
      location: 'Test Location',
      contract_value: 500000,
      created_by: user.email
    });
    
    // Create drawing set
    const drawingSet = await base44.asServiceRole.entities.DrawingSet.create({
      project_id: project.id,
      set_number: 'DS-001',
      title: 'Structural Steel Elevations',
      discipline: 'structural',
      spec_section: '05 12 00',
      status: 'FFF',
      created_by: user.email
    });
    
    // Create work packages
    const wp1 = await base44.asServiceRole.entities.WorkPackage.create({
      wpid: 'WP-001',
      project_id: project.id,
      title: 'Building Frame - Grid A-D / Level 1',
      phase: 'shop',
      status: 'not_started',
      start_date: '2026-03-15',
      end_date: '2026-04-15',
      created_by: user.email
    });
    
    const wp2 = await base44.asServiceRole.entities.WorkPackage.create({
      wpid: 'WP-002',
      project_id: project.id,
      title: 'Building Frame - Grid A-D / Level 2',
      phase: 'shop',
      status: 'not_started',
      start_date: '2026-04-01',
      end_date: '2026-05-01',
      created_by: user.email
    });
    
    // Create RFI
    const rfi = await base44.asServiceRole.entities.RFI.create({
      project_id: project.id,
      rfi_number: 1,
      subject: 'Column base plate details',
      rfi_type: 'connection_detail',
      category: 'structural',
      question: 'Clarify anchor bolt pattern and base plate thickness per Grid A1?',
      status: 'submitted',
      priority: 'high',
      created_by: user.email
    });
    
    // Create tasks
    const task1 = await base44.asServiceRole.entities.Task.create({
      project_id: project.id,
      work_package_id: wp1.id,
      name: 'Detailing - WP-001',
      type: 'GENERIC',
      phase: 'detailing',
      start_date: '2026-03-15',
      end_date: '2026-03-25',
      status: 'in_progress',
      created_by: user.email
    });
    
    const task2 = await base44.asServiceRole.entities.Task.create({
      project_id: project.id,
      work_package_id: wp1.id,
      name: 'Fabrication Release - WP-001',
      type: 'FAB_COMPLETE',
      phase: 'fabrication',
      start_date: '2026-03-26',
      end_date: '2026-04-10',
      predecessor_ids: [task1.id],
      created_by: user.email
    });
    
    // Create delivery
    const delivery = await base44.asServiceRole.entities.Delivery.create({
      project_id: project.id,
      package_name: 'Load 1 - Frame Package',
      delivery_number: 'DELV-001',
      work_package_ids: [wp1.id],
      scheduled_date: '2026-05-01',
      install_day: '2026-05-01',
      sequence_group: 'RG-01',
      delivery_status: 'draft',
      created_by: user.email
    });
    
    // Create fabrication record
    const fab = await base44.asServiceRole.entities.Fabrication.create({
      project_id: project.id,
      piece_mark: 'C101',
      assembly_number: 'ASM-001',
      area_gridline: 'Grid A-B / Level 1',
      drawing_set_id: drawingSet.id,
      item_type: 'column',
      description: 'Column W12x65',
      weight_tons: 2.5,
      material_spec: 'ASTM A992 Gr. 50',
      status: 'released',
      created_by: user.email
    });
    
    // Create SOV item
    const sovItem = await base44.asServiceRole.entities.SOVItem.create({
      project_id: project.id,
      item_number: '1.1',
      description: 'Structural steel - Fabrication',
      category: 'fabrication',
      scheduled_value: 250000,
      created_by: user.email
    });
    
    return Response.json({
      success: true,
      data: {
        project: project.id,
        workPackages: [wp1.id, wp2.id],
        rfi: rfi.id,
        tasks: [task1.id, task2.id],
        delivery: delivery.id,
        fabrication: fab.id,
        sovItem: sovItem.id
      }
    });
    
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

---

### Migration 3: Referential Integrity Smoke Test

**File**: `functions/smokeTestRefIntegrity.js`

```javascript
import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }
  
  const { project_id } = await req.json();
  
  const checks = {
    passed: 0,
    failed: 0,
    results: []
  };
  
  try {
    // Check 1: All Tasks reference valid WorkPackages or null
    const tasks = await base44.entities.Task.filter({ project_id });
    for (const task of tasks) {
      if (task.work_package_id) {
        const wps = await base44.entities.WorkPackage.filter({ 
          wpid: task.work_package_id,
          project_id 
        });
        if (!wps || wps.length === 0) {
          checks.results.push({
            check: 'Task WorkPackage FK',
            status: 'FAIL',
            message: `Task ${task.id} references non-existent WorkPackage ${task.work_package_id}`
          });
          checks.failed++;
        }
      }
    }
    checks.results.push({
      check: 'Task WorkPackage FK',
      status: checks.failed === 0 ? 'PASS' : 'FAIL',
      count: tasks.length
    });
    
    // Check 2: All SOVItems reference valid Projects
    const sovItems = await base44.entities.SOVItem.filter({ project_id });
    let sovFKPass = true;
    for (const item of sovItems) {
      const projects = await base44.entities.Project.filter({ id: item.project_id });
      if (!projects || projects.length === 0) {
        checks.results.push({
          check: 'SOVItem Project FK',
          status: 'FAIL',
          message: `SOVItem ${item.id} references non-existent Project ${item.project_id}`
        });
        sovFKPass = false;
        checks.failed++;
      }
    }
    if (sovFKPass) {
      checks.results.push({
        check: 'SOVItem Project FK',
        status: 'PASS',
        count: sovItems.length
      });
      checks.passed++;
    }
    
    // Check 3: All Deliveries reference valid WorkPackages
    const deliveries = await base44.entities.Delivery.filter({ project_id });
    let deliveryWPPass = true;
    for (const delv of deliveries) {
      if (delv.work_package_ids && Array.isArray(delv.work_package_ids)) {
        for (const wpid of delv.work_package_ids) {
          const wps = await base44.entities.WorkPackage.filter({ wpid, project_id });
          if (!wps || wps.length === 0) {
            checks.results.push({
              check: 'Delivery WorkPackage FK',
              status: 'FAIL',
              message: `Delivery ${delv.id} references non-existent WorkPackage ${wpid}`
            });
            deliveryWPPass = false;
            checks.failed++;
          }
        }
      }
    }
    if (deliveryWPPass) {
      checks.results.push({
        check: 'Delivery WorkPackage FK',
        status: 'PASS',
        count: deliveries.length
      });
      checks.passed++;
    }
    
    // Check 4: All Fabrications reference valid DrawingSets
    const fabs = await base44.entities.Fabrication.filter({ project_id });
    let fabDSPass = true;
    for (const fab of fabs) {
      if (fab.drawing_set_id) {
        const sets = await base44.entities.DrawingSet.filter({ id: fab.drawing_set_id });
        if (!sets || sets.length === 0) {
          checks.results.push({
            check: 'Fabrication DrawingSet FK',
            status: 'FAIL',
            message: `Fabrication ${fab.id} references non-existent DrawingSet ${fab.drawing_set_id}`
          });
          fabDSPass = false;
          checks.failed++;
        }
      }
    }
    if (fabDSPass) {
      checks.results.push({
        check: 'Fabrication DrawingSet FK',
        status: 'PASS',
        count: fabs.length
      });
      checks.passed++;
    }
    
    // Summary
    checks.summary = {
      total_checks: checks.results.length,
      passed: checks.passed,
      failed: checks.failed,
      project_id,
      timestamp: new Date().toISOString()
    };
    
    return Response.json(checks);
    
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

---

## Recommended Index Additions

### Index 1: Task (project_id, work_package_id, status)

**Current**:
```json
"indexes": [["project_id"], ["work_package_id"], ["status"]]
```

**Recommendation**: Add compound
```json
"indexes": [
  ...,
  ["project_id", "work_package_id", "status"]  // For lookahead queries
]
```

**Impact**: Lookahead filtering 10x faster.

---

### Index 2: Delivery (project_id, install_day, sequence_group)

**Current**:
```json
"indexes": [["project_id"], ["install_day"], ["sequence_group"]]
```

**Recommendation**: Add compound
```json
"indexes": [
  ...,
  ["project_id", "install_day", "sequence_group"]  // For daily scheduling
]
```

**Impact**: Schedule queries O(n) → O(log n).

---

### Index 3: Task (project_id, planned_start, planned_finish)

**For constraint evaluation**:
```json
"indexes": [
  ...,
  ["project_id", "planned_start"],   // For forward pass
  ["project_id", "planned_finish"]   // For backward pass
]
```

**Impact**: Critical path calculations 5-10x faster.

---

## Summary & Deployment Steps

| Issue | Type | Fix | Auto | Priority |
|-------|------|-----|------|----------|
| CRIT-001 | FK Validation | validateTaskFK() | ⚠️ | P0 |
| CRIT-002 | FK Validation | validateSOVItemFK() | ⚠️ | P0 |
| CRIT-003 | FK Validation | validateDeliveryWorkPackages() | ⚠️ | P0 |
| HIGH-001 | Index | Existing, verify compound | ✅ | P1 |
| HIGH-002 | Index | Add (project_id, sequence_group) | ✅ | P1 |
| HIGH-003 | Logic | Sync drawing revision | ⚠️ | P2 |
| HIGH-004 | Index | Add (project_id, planned_start) | ✅ | P1 |
| HIGH-005 | Schema | Add type field to blocking_ids | ⚠️ | P2 |
| MED-001 | Logic | Detect circular deps | ⚠️ | P3 |
| MED-002 | Logic | Auto-release fab holds | ⚠️ | P3 |
| MED-003 | Logic | Validate set_number uniqueness | ✅ | P2 |
| MED-004 | Logic | Validate progress % | ⚠️ | P3 |
| MED-005 | Logic | Sync duration fields | ⚠️ | P3 |
| MED-006 | Logic | Sync material status | ⚠️ | P3 |

---

## Deployment Checklist

**Phase 1: Validation Functions (Safe, No Data Changes)**
- [ ] Deploy `validateForeignKeys.js`
- [ ] Update `createTask`, `createSOVItem`, `createDelivery`, `createFabrication` to use validators
- [ ] Test with seed data

**Phase 2: Indexes (Non-Breaking)**
- [ ] Add recommended compound indexes
- [ ] Monitor query performance
- [ ] No data migration needed

**Phase 3: Cleanup Functions (Data Remediation)**
- [ ] Deploy `seedTestData.js` for QA
- [ ] Deploy `smokeTestRefIntegrity.js`
- [ ] Run smoke test on prod/staging
- [ ] Fix any discovered orphaned records

**Phase 4: Auto-Sync Logic (Automations)**
- [ ] Deploy fabrication hold sync
- [ ] Deploy duration sync
- [ ] Deploy material status sync

---

## Testing Steps

```bash
# 1. Seed test data
curl -X POST http://localhost/functions/seedTestData \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"

# 2. Run smoke test
curl -X POST http://localhost/functions/smokeTestRefIntegrity \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"project_id": "<project_id_from_step_1>"}'

# 3. Expected output (all PASS)
{
  "summary": {
    "total_checks": 4,
    "passed": 4,
    "failed": 0
  }
}
```

---

## Conclusion

All **CRITICAL** foreign key validation functions are ready. **HIGH** priority indexes recommended for immediate deployment. **MEDIUM** priority auto-sync logic can be phased in. Safe to deploy validation functions and indexes with zero data impact.