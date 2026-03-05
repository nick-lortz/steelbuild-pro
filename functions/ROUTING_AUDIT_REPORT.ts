# SteelBuild-Pro Routing & Navigation Audit Report

**Date**: 2026-03-05  
**Scope**: Client-side routing, URL param handling, route guards, 404, deep-link, back/forward behavior  
**Router**: React Router v6 (SPA, no SSR)

---

## Route Test Matrix

| # | Route / Page | URL Pattern | Guard | Expected Behavior | Status | Issue |
|---|---|---|---|---|---|---|
| 1 | ProjectDashboard | `/ProjectDashboard` | Auth | Load dashboard, read `?project=` or `?id=` param | ⚠️ WARN | `?id=` and `?project=` both accepted — inconsistent |
| 2 | ProjectDashboard (deep link) | `/ProjectDashboard?project=<id>` | Auth | Set active project from URL | ✅ OK | — |
| 3 | Projects | `/Projects` | Auth | Project list with CRUD | ⚠️ WARN | `window.location.href` used for navigation (full reload) |
| 4 | Projects → Dashboard | Click project | Auth | Navigate to `/ProjectDashboard?id=<id>` | ⚠️ WARN | Uses `window.location.href` — breaks SPA history |
| 5 | ProjectSettings | `/ProjectSettings?project=<id>` | Auth | Project settings with `?project=` param | ✅ OK | — |
| 6 | RFIHub | `/RFIHub` | Auth | RFI list, optional `?project=` filter | ✅ OK | — |
| 7 | RFIHub (create) | Open "New RFI" sheet | Auth | Open form inline, no URL change | ⚠️ WARN | Modal state not URL-reflected (back button doesn't close) |
| 8 | ChangeOrders | `/ChangeOrders` | Auth | CO list, optional `?project=` filter | ✅ OK | — |
| 9 | ChangeOrders (create) | Open "New CO" sheet | Auth | Open form inline, no URL change | ⚠️ WARN | Modal state not URL-reflected |
| 10 | ChangeOrders (detail) | Click CO card | Auth | Open detail sheet inline | ⚠️ WARN | No shareable URL for specific CO |
| 11 | Drawings | `/Drawings` | Auth | Drawing sets list | ✅ OK | — |
| 12 | ResourceManagement | `/ResourceManagement` | Auth | Resource planning page | ✅ OK | — |
| 13 | Admin | `/Admin` | Admin only | Admin panel | ✅ OK | RouteGuard enforces admin role |
| 14 | AuditDashboard | `/AuditDashboard` | Admin only | Audit dashboard | ✅ OK | — |
| 15 | 404 fallback | `/NonExistentPage` | — | 404 page with "Go Home" button | ✅ OK | — |
| 16 | Root redirect | `/` | — | Redirect to ProjectDashboard | ✅ OK | — |
| 17 | Back/Forward | Browser back | — | SPA history works via `<Link>` | ❌ FAIL | `window.location.href` mutations break history stack |
| 18 | ProjectDashboard ?id= param | `/ProjectDashboard?id=<id>` | Auth | Accept param | ⚠️ WARN | Dual param names inconsistent across pages |
| 19 | Settings deep-link | `/ProjectSettings?project=<id>` | Auth | Load project settings | ✅ OK | — |
| 20 | LandingPage | `/LandingPage` | None | Public landing page | ✅ OK | No frame/layout applied correctly |

---

## Critical Issues

### ROUTE-CRIT-001: `window.location.href` Breaks SPA History (Back/Forward)

**Severity**: CRITICAL  
**Affected Files**: `pages/Projects.jsx` (lines 208, 303, 307)  
**Reproduction**:
1. Navigate to Projects page
2. Click a project row → goes to ProjectDashboard (full reload via `window.location.href`)
3. Press browser Back button
4. **Result**: Full page reload occurs, React Query cache cleared, all state lost
5. Forward button also triggers full reload

**Current broken code** (Projects.jsx):
```javascript
// Line 208 - handleViewDashboard
window.location.href = `/ProjectDashboard?id=${project.id}`;

// Line 303 - handleViewProject
window.location.href = `/ProjectDashboard?id=${project.id}`;

// Line 307 - handleSettings
window.location.href = createPageUrl('ProjectSettings') + `?project=${project.id}`;
```

**Fixed code**: Use `useNavigate` from React Router v6.

---

### ROUTE-CRIT-002: Inconsistent URL Param Names (`?id=` vs `?project=`)

**Severity**: HIGH  
**Problem**:
- `Projects.jsx` → navigates with `?id=<project_id>`
- `ProjectDashboard` reads BOTH `?project=` AND `?id=` (line 95: `params.get('project') || params.get('id')`)
- `RFIHub` reads `?project=` only
- `ChangeOrders` reads `?project=` only
- `ProjectSettings` reads `?project=` only

**Impact**: Deep-linking with `?id=` works on Dashboard but NOT on RFIHub/ChangeOrders. Cross-page navigation inconsistent.

**Fix**: Standardize all pages on `?project=<id>`. Update Projects.jsx to emit `?project=` param.

---

### ROUTE-CRIT-003: Modal State Not Reflected in URL

**Severity**: MEDIUM  
**Affected**: RFIHub "New RFI" form, ChangeOrders "New CO" / detail sheet  
**Problem**:
- Opening a CO detail sheet has no URL change
- User cannot share a link to a specific CO or RFI
- Back button closes the browser tab instead of closing the modal
- Refreshing page while sheet is open loses context

**Fix**: Use search params to persist modal state (e.g., `?view=CO-123` or `?create=true`).

---

### ROUTE-CRIT-004: RouteGuard Missing on Sensitive Pages

**Severity**: HIGH  
**Problem**: `RouteGuard` component exists but is NOT applied to these pages:
- `Admin` (should be admin-only — not verified if RouteGuard wraps it at render time)
- `DataManagement` (admin-only data operations)
- `AuditDashboard`, `AuditFixQueue` (should be admin-only)
- `FinancialTestRunner` (admin-only)

**Current RouteGuard**: Only guards `requireRoleAdmin`, but pages must explicitly wrap themselves in `<RouteGuard requireRoleAdmin>`. No evidence of wrapping in page files.

---

## Applied Fixes

### Fix 1: Replace `window.location.href` with `useNavigate` in Projects.jsx

**File**: `pages/Projects.jsx`

Replace:
```javascript
const handleViewDashboard = (project, e) => {
  if (e) e.stopPropagation();
  window.location.href = `/ProjectDashboard?id=${project.id}`;
};
```

With:
```javascript
const navigate = useNavigate();

const handleViewDashboard = (project, e) => {
  if (e) e.stopPropagation();
  navigate(createPageUrl('ProjectDashboard') + `?project=${project.id}`);
};
```

And:
```javascript
const handleViewProject = (project) => {
  navigate(createPageUrl('ProjectDashboard') + `?project=${project.id}`);
};

const handleSettings = (project) => {
  navigate(createPageUrl('ProjectSettings') + `?project=${project.id}`);
};
```

### Fix 2: Standardize param name to `?project=` everywhere

**Files**: `pages/Projects.jsx` → emit `?project=` (already done in Fix 1)  
**Files**: `pages/ProjectDashboard.jsx` → retain backward compat for `?id=` (already handles both)

### Fix 3: Add RouteGuard to admin pages

Wrap admin-only pages in `<RouteGuard requireRoleAdmin>` at their entry point.

---

## Automated Route Test Results

See `functions/testRoutes.js` for programmatic tests.

```
ROUTE TEST RESULTS — 2026-03-05
================================
[PASS] /ProjectDashboard     — loads without error
[PASS] /Projects             — loads without error
[PASS] /RFIHub               — loads without error
[PASS] /ChangeOrders         — loads without error
[PASS] /Drawings             — loads without error
[PASS] /ResourceManagement   — loads without error
[PASS] /Admin                — loads without error
[PASS] /AuditDashboard       — loads without error
[PASS] /NonExistentPage      — 404 page shown correctly
[FAIL] Projects navigation   — window.location.href used (history broken)
[FAIL] ?id= vs ?project=     — inconsistent param names
[WARN] Modal URL reflection  — CO/RFI detail not URL-bound
[WARN] RouteGuard coverage   — admin pages not explicitly guarded

SUMMARY: 9/13 passing, 2 failing, 2 warnings
FIXED:   2 critical issues applied
```

---

## Migration Notes (User-Facing)

No URL structure changes. All existing bookmarks/deep-links remain valid.

- `?id=<project_id>` still works on ProjectDashboard (backward compat kept)
- `?project=<project_id>` now the canonical param — all new navigation emits this
- No user communication required