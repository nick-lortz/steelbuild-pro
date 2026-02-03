# SteelBuild Pro - Security Guidelines

**Platform:** Base44  
**Security Level:** WCAG 2.1 AA + Industry Best Practices

---

## Authentication & Authorization

### User Roles

**Admin:**
- Full access to all projects
- User management
- Delete operations

**User (Regular):**
- Access to assigned projects only
- Create/edit RFIs, tasks, documents
- Cannot delete projects or change orders

### Backend Function Security

**All functions MUST:**
```javascript
import { requireAuth } from './utils/auth.js';

const user = await requireAuth(base44); // Throws 401 if not authenticated
```

**Admin-Only Functions:**
```javascript
if (user.role !== 'admin') {
  return Response.json({ error: 'Admin only' }, { status: 403 });
}
```

**Project-Scoped Access:**
```javascript
const isAssigned = 
  project.project_manager === user.email ||
  project.superintendent === user.email ||
  (project.assigned_users && project.assigned_users.includes(user.email));

if (!isAssigned && user.role !== 'admin') {
  return Response.json({ error: 'Access denied' }, { status: 403 });
}
```

---

## File Upload Security

### Client-Side Validation

**Allowed File Types:**
- Documents: PDF, DOC, DOCX, XLS, XLSX
- Images: JPG, PNG, GIF, WEBP
- Drawings: PDF, DWG, DXF

**Size Limits:**
- Images: 10 MB
- Documents: 50 MB
- Drawings: 100 MB

**Filename Validation:**
- No special characters: `< > : " | ? * \x00-\x1f`

### Backend Validation

**Function:** `validateFileAccess`

Enforces project-based authorization before file download.

### Virus Scanning

**Platform Level:** Base44 automatically scans all uploaded files for malware.

---

## Data Protection

### Encryption

**In Transit:**
- All API calls use HTTPS (TLS 1.3)

**At Rest:**
- Database encrypted by Base44 platform
- File storage encrypted (S3 server-side encryption)

---

## Input Validation

### Frontend Validation
```javascript
import { validateRequired, validateEmail, validateNumeric } from '@/components/shared/validation';

validateRequired(value, 'Project name');
validateEmail(email);
validateNumeric(amount, 'Contract value', { min: 0 });
```

### Backend Validation
```javascript
import { validateInput, validateEmail, validateNumeric } from './utils/validation.js';

validateInput(data.name, 'Project name');
validateEmail(data.email);
validateNumeric(data.contract_value, 'Contract value', 0, 100000000);
```

---

## Audit Logging

**All Entity Operations:**
```
[INFO] createRFI: AUDIT - CREATE by user@company.com
  Entity: RFI (rfi_123)
  Project: proj_456
```

**Log Retention:** 90 days (Base44 platform)

---

## Security Checklist (Pre-Deployment)

- [ ] All backend functions use `requireAuth()`
- [ ] Admin-only functions check user role
- [ ] File upload validation active
- [ ] `validateFileAccess` enforced
- [ ] No hardcoded secrets in code
- [ ] Audit logging enabled
- [ ] HTTPS enforced

---

## Secure Coding Practices

### Do's

✅ Always validate user input (frontend + backend)  
✅ Use `requireAuth()` in all backend functions  
✅ Check user role before admin operations  
✅ Sanitize HTML/text before rendering  
✅ Log security-relevant events  

### Don'ts

❌ Never store passwords in code/database  
❌ Don't trust client-side validation alone  
❌ Don't expose sensitive data in error messages  
❌ Don't use `eval()` or `innerHTML` with user input  
❌ Don't hardcode API keys