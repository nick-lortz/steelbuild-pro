# Quality Gate - Enterprise Audit

## Overview
Automated quality gate that scans backend security, UI theme compliance, navigation patterns, and data correctness before release.

## Gate Criteria

### FAIL Conditions
- **CRITICAL severity**: Any critical issue fails the gate
- **HIGH severity**: More than 5 high severity issues fails the gate

### WARN Conditions
- **MEDIUM severity**: More than 20 medium issues triggers warning

## Checks Performed

### 1. Backend Security
- **Unauthenticated functions**: Detects `Deno.serve` without `auth.me()` check
- **Unchecked asServiceRole**: Finds service role usage without project authorization
- **Missing RLS**: Identifies project-owned entities without Row Level Security

**Example findings:**
```json
{
  "severity": "CRITICAL",
  "category": "AUTHZ",
  "title": "Unauthenticated function: getUserData.js",
  "location": "functions/getUserData.js",
  "proposed_fix": "Add: const user = await base44.auth.me(); if (!user) return 401;"
}
```

### 2. UI Theme Correctness
- **Hardcoded colors**: Detects hex/rgb/rgba instead of design tokens
- **Theme violations**: Flags non-standard colors outside theme palette

**Allowed theme colors:**
- `#0A0E13`, `#151B24`, `#FF6B2C`, `#FF9D42`

**Example findings:**
```json
{
  "severity": "MEDIUM",
  "category": "UI_ACTIONS",
  "title": "Hardcoded color: #3498db",
  "location": "components/dashboard/Widget.jsx",
  "proposed_fix": "Replace with CSS variable or Tailwind class"
}
```

### 3. Navigation & State Preservation
- **Hard reloads**: Detects `window.location.reload()` that resets app state
- **Missing keys**: Identifies `.map()` without key props (causes re-renders)

**Example findings:**
```json
{
  "severity": "MEDIUM",
  "category": "UI_ACTIONS",
  "title": "Hard reload detected: Dashboard.jsx",
  "location": "pages/Dashboard.jsx",
  "proposed_fix": "Use queryClient.invalidateQueries() instead"
}
```

### 4. Data Correctness
- **Unsafe currency math**: Operations on price/cost/amount without `.toFixed()` or `Math.round()`
- **Missing validation**: Entity creation without input validation
- **Referential integrity**: Missing `project_id` checks

**Example findings:**
```json
{
  "severity": "HIGH",
  "category": "DATA_FLOW",
  "title": "Unsafe currency math: BudgetCalculator.jsx",
  "location": "components/financials/BudgetCalculator.jsx",
  "proposed_fix": "Use .toFixed(2) or Math.round() for currency"
}
```

## Running the Gate

### Via Dashboard
1. Navigate to Admin Panel → App Audit
2. Click "Run Full Audit"
3. Review findings and gate status

### Via API
```bash
curl -X POST https://your-app.base44.com/functions/runFullAppAudit \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Response Format
```json
{
  "success": true,
  "gate": {
    "status": "FAIL",
    "counts": {
      "CRITICAL": 2,
      "HIGH": 8,
      "MEDIUM": 15,
      "LOW": 3
    },
    "blockers": [
      "2 CRITICAL issues (threshold: 0)",
      "8 HIGH severity issues (threshold: 5)"
    ],
    "total": 28
  },
  "summary": {
    "gate_status": "FAIL",
    "total_findings": 28,
    "by_severity": { "CRITICAL": 2, "HIGH": 8, "MEDIUM": 15, "LOW": 3 },
    "by_category": {
      "AUTHZ": 10,
      "UI_ACTIONS": 12,
      "DATA_FLOW": 6
    },
    "blockers": [...]
  },
  "findings": [...]
}
```

## Pre-Release Checklist

Before deploying to production:

- [ ] Run `runFullAppAudit` function
- [ ] Gate status: **PASS**
- [ ] No CRITICAL issues
- [ ] HIGH issues ≤ 5
- [ ] Review all AUTHZ findings manually
- [ ] Verify theme compliance on sample pages
- [ ] Test navigation state preservation
- [ ] Spot-check currency calculations

## Fixing Common Issues

### CRITICAL: Unauthenticated Function
```javascript
// BEFORE
Deno.serve(async (req) => {
  const data = await fetchData();
  return Response.json(data);
});

// AFTER
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  
  const data = await fetchData();
  return Response.json(data);
});
```

### HIGH: Unchecked asServiceRole
```javascript
// BEFORE
const items = await base44.asServiceRole.entities.WorkPackage.list();

// AFTER
const user = await base44.auth.me();
const projectId = payload.project_id;
// Verify user has access
const project = await base44.entities.Project.filter({ id: projectId });
if (!project.length) return Response.json({ error: 'Forbidden' }, { status: 403 });

const items = await base44.asServiceRole.entities.WorkPackage.filter({ project_id: projectId });
```

### MEDIUM: Hardcoded Color
```javascript
// BEFORE
<div className="bg-[#3498db]">

// AFTER
<div className="bg-[#3B82F6]"> // Use theme color
// OR
<div className="bg-blue-500"> // Use Tailwind class
```

### HIGH: Unsafe Currency Math
```javascript
// BEFORE
const total = price * quantity + tax;

// AFTER
const total = parseFloat((price * quantity + tax).toFixed(2));
// OR
const total = Math.round((price * quantity + tax) * 100) / 100;
```

## CI/CD Integration

Add to your deployment pipeline:

```yaml
- name: Quality Gate
  run: |
    RESULT=$(curl -X POST https://your-app/functions/runFullAppAudit -H "Authorization: Bearer $TOKEN")
    STATUS=$(echo $RESULT | jq -r '.gate.status')
    if [ "$STATUS" != "PASS" ]; then
      echo "Quality gate failed"
      exit 1
    fi
```

## Thresholds Configuration

Edit in `functions/runFullAppAudit.js`:

```javascript
const GATE_THRESHOLDS = {
  blocking: 0,      // FAIL if any CRITICAL
  high: 5,          // FAIL if >5 HIGH
  medium: 20,       // WARN if >20 MEDIUM
};
```

## Notes

- Gate runs against filesystem (current code), not database
- Findings are saved to `AuditRun` and `AuditFinding` entities
- Use `AuditFixQueue` page to track remediation
- Re-run after fixes to verify gate passes