# Security Migration Checklist

## Completed ✅

### Infrastructure
- [x] Auth utilities created (`functions/utils/auth.js`)
- [x] Validation utilities created (`functions/utils/validation.js`)
- [x] Uniqueness utilities created (`functions/utils/uniqueness.js`)
- [x] XSS sanitization utilities created (`components/shared/sanitization.js`)
- [x] Error boundary component created (`components/ui/ErrorBoundary.js`)
- [x] Error boundary integrated in Layout

### Example Secure Functions
- [x] `createProject.js` - Demonstrates full security pattern
- [x] `updateProject.js` - Admin-only, validation, uniqueness
- [x] `deleteProject.js` - Cascade deletion with auth
- [x] `createRFI.js` - Project-level access control
- [x] `updateRFI.js` - Project-level access, auto-date setting
- [x] `listProjects.js` - User-filtered results
- [x] `listRFIs.js` - Project-filtered results
- [x] `createTask.js` - Project access + dependency validation
- [x] `createCostCode.js` - Admin-only, uniqueness check

### Frontend XSS Protection
- [x] DOMPurify installed
- [x] Sanitization components created (SafeHTML, SafeText)
- [x] RFIHubTable updated with SafeText
- [x] ProjectsTable updated with SafeText

## Remaining Work 🚧

### High Priority Functions to Migrate (Week 1)

Project Operations:
- [ ] Update existing `createProject` entity calls to use backend function
- [ ] Update existing `updateProject` entity calls to use backend function
- [ ] Update existing `deleteProject` entity calls to use backend function
- [ ] Verify `cascadeDeleteProject` function handles ALL entity types

RFI Operations:
- [ ] Update RFI create/update in RFIHubForm to use backend functions
- [ ] Add `deleteRFI.js` backend function
- [ ] Migrate all RFI entity operations

Task Operations:
- [ ] Update `updateTask.js` function (already exists, needs security)
- [ ] Update `deleteTask.js` function (already exists, needs security)
- [ ] Update `createTaskForWorkPackage` function
- [ ] Update `getFilteredTasks` function

Financial Operations:
- [ ] Audit `budgetOperations.js`
- [ ] Audit `expenseOperations.js`
- [ ] Audit `sovOperations.js`
- [ ] Audit `invoiceOperations.js`
- [ ] Audit `etcOperations.js`
- [ ] Add validation to all financial mutations

Work Package Operations:
- [ ] Audit `createWorkPackage.js`
- [ ] Audit `workPackageLifecycle.js`
- [ ] Audit `cascadeDeleteWorkPackage.js`

Change Order Operations:
- [ ] Audit `changeOrderOperations.js`
- [ ] Audit `applyCOApproval.js`
- [ ] Audit `routeChangeOrderApproval.js`

Drawing Operations:
- [ ] Audit `drawingOperations.js`
- [ ] Audit `extractDrawingMetadata.js`
- [ ] Add auth to drawing upload handlers

### XSS Sanitization Deployment (Week 1-2)

Components to update with SafeText/SafeHTML:
- [ ] RFI detail panels
- [ ] Change order details
- [ ] Project dashboard widgets
- [ ] Task cards/lists
- [ ] Production notes display
- [ ] Meeting notes
- [ ] Document descriptions
- [ ] Comment threads
- [ ] All table cells displaying user input

### Additional Validators to Create (Week 2)

- [ ] `validateWorkPackage()`
- [ ] `validateChangeOrder()`
- [ ] `validateSOVItem()`
- [ ] `validateInvoice()`
- [ ] `validateDelivery()`
- [ ] `validateLaborHours()`
- [ ] `validateDocument()`

### Unique Constraints to Enforce (Week 2)

- [ ] Invoice numbers per project
- [ ] Submittal numbers per project
- [ ] Drawing set numbers per project
- [ ] Equipment IDs (global)
- [ ] Crew names (global)

### Scheduled Function Security (Week 2)

Functions that run on schedule MUST verify they're system-initiated:
- [ ] `generateWeeklyDigest.js`
- [ ] `checkTaskDeadlines.js`
- [ ] `createRecurringTaskInstances.js`
- [ ] `generateRecurringMeetings.js`
- [ ] `scheduleReportDelivery.js`

Pattern:
```javascript
const { user, error, base44 } = await requireAdmin(req);
if (error) return error;
// Scheduled tasks must be admin-initiated
```

### Entity Automation Security (Week 2)

Functions triggered by entity changes need proper context:
- [ ] Verify automation payload includes user context
- [ ] Ensure automated actions use service role appropriately
- [ ] Add audit logging for automated changes

### CSRF Verification (Week 1)

- [ ] Review Base44 platform CSRF documentation
- [ ] Verify SameSite cookie configuration
- [ ] Test cross-origin request blocking
- [ ] Document CSRF protections in security.md

### Session Management Verification (Week 1)

- [ ] Document Base44 session timeout policy
- [ ] Test token expiration behavior
- [ ] Verify token refresh mechanism
- [ ] Test concurrent session handling
- [ ] Document session security in security.md

### Testing Requirements (Weeks 3-6)

- [ ] Auth tests: 15 tests covering all permission paths
- [ ] Validation tests: 25 tests for all entity types
- [ ] Uniqueness tests: 10 tests for constraint violations
- [ ] XSS tests: 20 tests for user-generated content rendering
- [ ] Integration tests: Project CRUD with cascades
- [ ] E2E tests: Critical user flows with security checks

## Verification Commands

### Test Authentication
```bash
# Should fail without token
curl -X POST https://app.base44.app/api/functions/createProject \
  -H "Content-Type: application/json" \
  -d '{"project_number":"TEST","name":"Test"}'

# Should fail with user token (not admin)
curl -X POST https://app.base44.app/api/functions/createProject \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"project_number":"TEST","name":"Test"}'

# Should succeed with admin token
curl -X POST https://app.base44.app/api/functions/createProject \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"project_number":"TEST-001","name":"Test Project"}'
```

### Test Validation
```bash
# Should fail: missing required field
curl -X POST https://app.base44.app/api/functions/createProject \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"name":"Test"}'

# Should fail: negative budget
curl -X POST https://app.base44.app/api/functions/createProject \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"project_number":"TEST","name":"Test","contract_value":-1000}'

# Should fail: invalid email
curl -X POST https://app.base44.app/api/functions/createProject \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"project_number":"TEST","name":"Test","gc_email":"invalid"}'
```

### Test Unique Constraints
```bash
# Create project
curl -X POST https://app.base44.app/api/functions/createProject \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"project_number":"DUP-001","name":"Original"}'

# Try to create duplicate - should fail with 409
curl -X POST https://app.base44.app/api/functions/createProject \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"project_number":"DUP-001","name":"Duplicate"}'
```

### Test XSS Protection
```bash
# Create RFI with XSS payload
curl -X POST https://app.base44.app/api/functions/createRFI \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{"project_id":"xxx","subject":"<script>alert(1)</script>","question":"test"}'

# Verify subject is sanitized when displayed in UI
# Expected: Script tags stripped, only text shown
```

## Progress Tracking

**Total Functions:** ~50  
**Migrated:** 9  
**Remaining:** ~41  
**Estimated Completion:** 3-4 weeks at current pace

**High Priority Remaining:**
1. Financial operations (6 functions)
2. Work package operations (3 functions)
3. Change order operations (3 functions)
4. Task operations (2 functions)
5. Drawing operations (3 functions)

**Next Steps:**
1. Complete high-priority function migrations
2. Deploy XSS sanitization across all components
3. Set up automated security testing
4. Document Base44 platform security features
5. Conduct penetration testing