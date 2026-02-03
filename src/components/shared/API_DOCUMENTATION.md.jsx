# SteelBuild Pro API Documentation

**Version:** 1.0  
**Platform:** Base44  
**Industry:** Structural Steel Erection & Fabrication

---

## Authentication

All API endpoints require authentication via Base44 session token.

**Headers:**
```
Authorization: Bearer <session_token>
```

**User Roles:**
- `admin` - Full access to all projects, settings, user management
- `user` - Access to assigned projects only

---

## Backend Functions

### Project Management

#### `createProject`
Creates a new project with validation.

**Endpoint:** `POST /functions/createProject`

**Payload:**
```json
{
  "project_number": "2026-001",
  "name": "Downtown Office Tower",
  "client": "ABC Construction",
  "location": "123 Main St",
  "status": "awarded",
  "phase": "detailing",
  "contract_value": 1500000,
  "start_date": "2026-03-01",
  "target_completion": "2026-09-30",
  "project_manager": "pm@company.com"
}
```

**Validations:**
- `project_number` required, unique
- `name` required
- `contract_value` must be numeric >= 0

**Audit Log:** All creates logged with user email, timestamp.

---

#### `updateProject` / `deleteProject`
Update or delete project. Audit logged.

---

### RFI Management

#### `createRFI`
Creates RFI with auto-incrementing number per project.

**Auto-Generated:**
- `rfi_number` - Sequential per project
- `business_days_open` - Calculated
- `escalation_level` - Based on aging

**Escalation Thresholds:**
- Normal: < 10 business days
- Warning: 10-14 business days
- Urgent: 15-19 business days
- Overdue: 20+ business days

---

### Load Testing

#### `seedLoadTestData`
Generate test data for performance testing (admin only).

**Payload:**
```json
{
  "projectCount": 100,
  "rfisPerProject": 5,
  "tasksPerProject": 20
}
```

---

### Security

#### `validateFileAccess`
Check user permission to access document/file.

**Authorization Logic:**
- Admin: Access to all
- User: Access if assigned to project

---

## Entities (Database)

### Project
**Indexes:** status, start_date, phase

**Key Fields:**
- `project_number` (unique)
- `status` (bidding, awarded, in_progress, on_hold, completed, closed)
- `phase` (detailing, fabrication, erection, closeout)
- `assigned_users` (array of emails)

---

### RFI
**Indexes:** project_id, status, escalation_level, due_date

**Key Fields:**
- `rfi_number` (auto-incremented per project)
- `business_days_open` (auto-calculated)
- `escalation_level` (normal, warning, urgent, overdue)
- `blocker_info.is_blocker` (boolean)

---

## Performance Targets

| Operation | Target | Acceptable |
|-----------|--------|------------|
| Dashboard Load (1,000 projects) | < 2s | < 5s |
| RFI Hub Load (5,000 RFIs) | < 3s | < 6s |
| Document Upload (50MB) | < 10s | < 20s |

---

## Error Codes

| Code | Message | Action |
|------|---------|--------|
| 401 | Unauthorized | Re-authenticate |
| 403 | Forbidden | Check user role/project assignment |
| 404 | Not Found | Verify entity ID |
| 422 | Validation Failed | Check required fields |
| 500 | Server Error | Retry, contact support if persists |