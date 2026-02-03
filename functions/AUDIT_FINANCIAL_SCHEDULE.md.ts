# Financial & Schedule Logic Audit

## Financial Calculations

### SOV (Schedule of Values)
**Formula Validation:**
```
Earned to Date = (Scheduled Value × % Complete) / 100
Current Billing = Previous Billing + This Period Billing
Balance to Finish = Scheduled Value - Current Billing
```

**Integrity Rules:**
- ✅ Percent complete: 0-100 range enforced
- ✅ Current billing ≤ Scheduled value
- ✅ Balance equation: Scheduled = Current + Balance
- ✅ Cannot decrease % complete if line has approved invoices
- ✅ Cannot edit scheduled value after invoicing (requires Change Order)

**Implementation:** `functions/utils/financialValidation.js`

### Budget vs Actuals
**Formula Validation:**
```
Current Budget = Original Budget + Approved Changes
Budget Variance = Current Budget - Actual Amount
Forecast Variance = Current Budget - Forecast Amount
```

**Integrity Rules:**
- ✅ Forecast ≥ Actual (cannot forecast less than spent)
- ✅ Budget equation enforced
- ✅ All amounts non-negative

**Implementation:** `functions/utils/financialValidation.js`

### ETC (Estimate to Complete)
**Formula Validation:**
```
Forecast at Completion = Actual to Date + ETC
CPI = Earned Value / Actual Cost
EAC = Actual + ((Budget - Earned Value) / CPI)
VAC = Budget - EAC
```

**Integrity Rules:**
- ✅ ETC changes >$5K or >20% require comment/justification
- ✅ Audit trail tracks all ETC changes
- ✅ Last reviewed date required

**Implementation:** `components/financials/ETCManager.jsx`

### Invoice Generation
**Formula Validation:**
```
Line Item Amount = Scheduled Value × (% Complete - % Previously Billed)
Invoice Total = Sum(Line Items)
```

**Integrity Rules:**
- ✅ Cannot bill more than earned
- ✅ Validates against SOV line balances
- ✅ Tracks cumulative billing by line

**Implementation:** `components/sov/InvoiceManager.jsx`

---

## Schedule Algorithms

### Dependency Types
**Supported:**
- **FS (Finish-to-Start):** Successor starts after predecessor finishes
- **SS (Start-to-Start):** Successor starts when predecessor starts
- **FF (Finish-to-Finish):** Successor finishes when predecessor finishes
- **SF (Start-to-Finish):** Successor finishes when predecessor starts

**Lag Days:** Positive = delay, Negative = overlap

**Implementation:** `functions/utils/scheduleValidation.js`

### Circular Dependency Detection
**Algorithm:**
- Depth-first search with recursion stack
- Detects cycles in task dependency graph
- Returns full cycle path for diagnosis

**Validation:** Blocks auto-adjustment if circular deps exist

**Implementation:** `functions/utils/scheduleValidation.js::detectCircularDependencies()`

### Forward Pass Scheduling
**Algorithm:**
```
For each task in topological order:
  Earliest Start = MAX(Predecessor Constraints)
  
  Constraint calculation by type:
    FS: Pred.End + Lag
    SS: Pred.Start + Lag
    FF: Pred.End + Lag - Task.Duration
    SF: Pred.Start + Lag - Task.Duration
  
  Earliest Finish = Earliest Start + Duration
```

**Implementation:** `functions/utils/scheduleValidation.js::autoAdjustDatesForward()`

### Backward Pass Scheduling
**Algorithm:**
```
For each task in reverse topological order:
  Latest Finish = MIN(Successor Constraints) OR Project End
  Latest Start = Latest Finish - Duration
  Float = Latest Start - Earliest Start
  Is Critical = Float ≤ 0
```

**Implementation:** `functions/utils/scheduleValidation.js::calculateBackwardPass()`

### Critical Path Calculation
**Identifies:**
- Tasks with zero or near-zero float
- Longest path through network
- Schedule risk points

**Uses:** Forward + Backward pass results

**Implementation:** `functions/utils/scheduleValidation.js::getCriticalPath()`

### Date Auto-Adjustment
**Triggers:**
- Predecessor date changes
- Dependency config changes
- Duration changes

**Process:**
1. Detect circular dependencies (block if found)
2. Run forward pass to adjust dates
3. Recalculate critical path
4. Update tasks in database

**Implementation:** `functions/validateSchedule.js` (auto_adjust mode)

---

## Validation Endpoints

### Financial Validation
**Endpoint:** `validateFinancials.js`
**Parameters:**
- `project_id` (required)
- `auto_fix` (optional, default false)

**Checks:**
- SOV line item calculations
- SOV totals balance
- Budget equations
- ETC reasonableness

**Auto-Fix:** Corrects calculation errors if enabled

### Schedule Validation
**Endpoint:** `validateSchedule.js`
**Parameters:**
- `project_id` (required)
- `auto_adjust` (optional, default false)

**Checks:**
- Circular dependencies
- Date ordering (start ≤ end)
- Dependency logic
- Critical path calculation

**Auto-Adjust:** Fixes dates based on dependencies if enabled

---

## Real-Time Subscription Security

### Authorization Enforcement
**Server-Side Filtering:** `functions/subscriptionAuth.js`

**Rules:**
- Admins: access all events
- Users: only events for projects where they are PM, superintendent, or assigned
- Creates: user can access own records

**Implementation:** Pre-filters subscription events before delivery

### Reconnection Strategy
**Hook:** `useEntitySubscription`

**Features:**
- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Max 5 reconnect attempts
- Auto-resubscribe on mount
- Cleanup on unmount

### Delta Updates
**Strategy:** Update query cache directly instead of full refetch

**Operations:**
- Create: Append to array
- Update: Replace matching item
- Delete: Remove from array

**Benefits:**
- Reduced API calls
- Lower latency
- Better UX (no flicker)

---

## Testing & Monitoring

### Validation Commands
```js
// Financial validation
await base44.functions.invoke('validateFinancials', {
  project_id: 'proj_123',
  auto_fix: false
});

// Schedule validation
await base44.functions.invoke('validateSchedule', {
  project_id: 'proj_123',
  auto_adjust: false
});
```

### Subscription Health
```js
const { isConnected, reconnectAttempts } = useEntitySubscription('Task', ['tasks']);
// Display reconnection indicator if reconnectAttempts > 0
```

---

## Implementation Checklist

- [x] SOV calculation validation
- [x] Budget/Actuals validation  
- [x] ETC calculation validation
- [x] Invoice vs SOV validation
- [x] Circular dependency detection
- [x] Forward pass scheduling
- [x] Backward pass scheduling
- [x] Critical path calculation
- [x] Date auto-adjustment
- [x] Dependency type support (FS/SS/FF/SF)
- [x] Lag days support
- [x] Subscription authorization
- [x] Reconnection logic
- [x] Delta updates
- [x] Auto-fix capabilities
- [ ] Scheduled integrity checks (weekly automation)
- [ ] Admin UI for running validations
- [ ] Subscription health monitoring dashboard