# Backend Security Implementation Guide

## Overview

All backend functions MUST implement the security patterns defined in `/functions/utils/`:
- **auth.js** - Authentication & authorization
- **validation.js** - Input validation
- **uniqueness.js** - Unique constraint enforcement

## Required Pattern for ALL Backend Functions

```javascript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAuth, requireAdmin, requireProjectAccess } from './utils/auth.js';
import { validate } from './utils/validation.js';

Deno.serve(async (req) => {
  try {
    // 1. AUTHENTICATE & AUTHORIZE
    // Choose appropriate auth check:
    
    // Option A: Require any authenticated user
    const { user, error, base44 } = await requireAuth(req);
    
    // Option B: Require admin role
    // const { user, error, base44 } = await requireAdmin(req);
    
    // Option C: Require project access
    // const { user, project, error, base44 } = await requireProjectAccess(req, projectId);
    
    if (error) return error;
    
    // 2. PARSE & VALIDATE INPUT
    const data = await req.json();
    
    const validation = validate('EntityName', data, false);
    if (!validation.valid) {
      return Response.json({
        error: 'Validation failed',
        details: validation.errors
      }, { status: 400 });
    }
    
    // 3. BUSINESS LOGIC
    // ... your code here
    
    // 4. RETURN SUCCESS
    return Response.json({ success: true, data: result });
    
  } catch (error) {
    console.error('Function error:', error);
    return Response.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
});
```

## Authorization Matrix

| Operation | Required Role | Check Function |
|-----------|---------------|----------------|
| Create/Update/Delete Project | Admin | `requireAdmin` |
| View Projects | User (filtered) | `requireAuth` + filter by assigned_users |
| Create RFI/Task/CO | User (on assigned project) | `requireProjectAccess` |
| View Financials | User (on assigned project) | `requireProjectAccess` |
| Edit SOV/Budget | Admin | `requireAdmin` |
| Delete any entity | Admin | `requireAdmin` |

## Project-Level Access Control

For operations on project-scoped entities (Tasks, RFIs, Financials, etc.):

```javascript
// Extract project_id from request
const { project_id } = await req.json();

// Verify user has access to this project
const { user, project, error, base44 } = await requireProjectAccess(req, project_id);
if (error) return error;

// Proceed - user is authorized
const task = await base44.entities.Task.create({ ...data, project_id });
```

## Validation Before Create/Update

```javascript
import { validateProject, validateRFI, validateTask } from './utils/validation.js';

// Validate before create
const validation = validateProject(data, false);
if (!validation.valid) {
  return Response.json({
    error: 'Validation failed',
    details: validation.errors
  }, { status: 400 });
}

// Validate before update
const validation = validateProject(data, true);
```

## Unique Constraint Enforcement

```javascript
import { checkProjectNumberUnique, checkRFINumberUnique } from './utils/uniqueness.js';

// Check uniqueness before create
const uniqueCheck = await checkProjectNumberUnique(base44, data.project_number);
if (!uniqueCheck.unique) {
  return Response.json({ error: uniqueCheck.error }, { status: 409 });
}

// Check uniqueness before update (exclude current record)
const uniqueCheck = await checkProjectNumberUnique(base44, data.project_number, currentId);
```

## CSRF Protection

Base44 platform provides built-in CSRF protection via:
- SameSite cookie attributes on session tokens
- Origin header validation
- Referer header validation

**No additional CSRF implementation needed** when using Base44 SDK's `createClientFromRequest(req)`.

## Session Validation

Base44 handles session management:
- JWT-based tokens with automatic expiration
- Token refresh on activity
- Automatic logout on expiration

Functions using `createClientFromRequest(req)` automatically validate session tokens.

## Testing Security

```bash
# Test unauthorized access
curl -X POST https://your-app.base44.app/api/functions/createProject \
  -H "Content-Type: application/json" \
  -d '{"project_number": "TEST-001", "name": "Test"}'
# Expected: 401 Unauthorized

# Test forbidden access (user trying admin operation)
curl -X POST https://your-app.base44.app/api/functions/deleteProject \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{"id": "project_id"}'
# Expected: 403 Forbidden

# Test validation failure
curl -X POST https://your-app.base44.app/api/functions/createProject \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"project_number": "", "name": "Test"}'
# Expected: 400 Bad Request with validation errors

# Test duplicate constraint
curl -X POST https://your-app.base44.app/api/functions/createProject \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"project_number": "EXISTING-001", "name": "Test"}'
# Expected: 409 Conflict
```

## Migration Checklist

For EACH existing backend function:

- [ ] Import appropriate auth utility
- [ ] Add auth check at function start
- [ ] Return error response if auth fails
- [ ] Validate input data
- [ ] Check unique constraints (if applicable)
- [ ] Use `base44.asServiceRole` for elevated operations (with auth)
- [ ] Use `base44` (user-scoped) for normal operations
- [ ] Test with unauthorized user
- [ ] Test with invalid input
- [ ] Test with duplicate data

## Estimated Migration Effort

- ~50 backend functions exist
- Average 15 minutes per function to add auth + validation
- **Total: ~12 hours of focused work**

## Priority Order

1. **Critical (Week 1):**
   - createProject, updateProject, deleteProject
   - createRFI, updateRFI, deleteRFI
   - Financial operations (SOV, invoices, expenses)
   
2. **High (Week 2):**
   - Task operations
   - Work package operations
   - Document operations
   
3. **Medium (Week 3):**
   - Report generation
   - Analytics functions
   - Notification functions