# Accessibility Defect Ledger
**App**: SteelBuild Pro  
**Standard**: WCAG 2.1 AA  
**Phase**: 3 - Fixes in Progress

---

## BLOCKER DEFECTS

### A11Y-001: DataTable Not Semantic
**WCAG SC**: 1.3.1 (Info and Relationships), 4.1.2 (Name, Role, Value)  
**Severity**: BLOCKER  
**Affected Routes**: Dashboard, Projects, RFIHub, ChangeOrders, Financials, Documents  
**Component**: `components/ui/DataTable`

**Issue**: Uses `<div role="row">` instead of semantic `<table>` markup. No table headers, no scope attributes, no caption.

**Reproduction**:
1. Navigate to Projects page
2. Inspect table structure
3. Result: Generic divs with role attributes

**Expected**: Semantic `<table>`, `<thead>`, `<tbody>`, `<th scope="col">`, `<caption>`

**Actual**: 
```jsx
<div role="table">
  <div role="row">
    <div>{data}</div>
  </div>
</div>
```

**Impact**: Screen reader users cannot navigate table, no headers announced, no column relationships

**Fix Plan**:
1. Create `AccessibleDataTable` component with semantic markup
2. Replace all DataTable usages with AccessibleDataTable
3. Add keyboard handlers for row clicks (Enter/Space)
4. Add table captions for SR context

**Files to Change**:
- ✅ Create `components/ui/AccessibleDataTable.jsx`
- [ ] Update `pages/Projects` → use AccessibleDataTable
- [ ] Update `pages/RFIHub` (via RFIHubTable component)
- [ ] Update `pages/ChangeOrders`
- [ ] Update `components/sov/InvoiceManager`
- [ ] Update all other DataTable usages

**Status**: ✅ Component created, migration pending

---

### A11Y-002: Form Labels Not Associated
**WCAG SC**: 1.3.1 (Info and Relationships), 3.3.2 (Labels or Instructions), 4.1.2 (Name, Role, Value)  
**Severity**: BLOCKER  
**Affected Routes**: Projects, RFIHub, ChangeOrders, WorkPackages, Financials, Documents  
**Components**: All forms (30+ instances)

**Issue**: `<Label>` components do not have `htmlFor` attribute, inputs do not have `id`. Screen readers cannot associate labels with inputs.

**Reproduction**:
1. Open Projects → New Project dialog
2. Use screen reader (NVDA)
3. Tab to "Project Number" input
4. Result: "Edit text" (no label announced)

**Expected**: "Project Number, required, edit text"

**Actual**:
```jsx
<Label>Project Number *</Label>
<Input value={...} required />
```

**Impact**: Screen reader users cannot identify inputs, cannot understand required fields

**Fix Plan**:
1. Create `FormField` wrapper component with automatic ID generation
2. Refactor all forms to use FormField
3. Ensure aria-describedby for hints/errors
4. Add aria-invalid for validation states

**Files to Change**:
- ✅ Create `components/ui/FormField.jsx`
- [ ] Update `pages/Projects` (ProjectForm)
- [ ] Update `components/rfi-hub/RFIHubForm`
- [ ] Update `components/change-orders/ChangeOrderForm`
- [ ] Update `components/work-packages/WorkPackageForm`
- [ ] Update `components/documents/DocumentUploadZone`
- [ ] Update all other form components

**Status**: ✅ Component created, migration pending

---

### A11Y-003: Drag-and-Drop No Keyboard Alternative
**WCAG SC**: 2.1.1 (Keyboard)  
**Severity**: BLOCKER  
**Affected Routes**: ProjectDashboard  
**Component**: `pages/ProjectDashboard` (widget reordering)

**Issue**: Widget reordering uses `@hello-pangea/dnd` with no keyboard alternative. Keyboard users cannot customize dashboard layout.

**Reproduction**:
1. Navigate to ProjectDashboard
2. Tab to widget cards
3. Attempt to reorder via keyboard
4. Result: No way to reorder

**Expected**: Ctrl+Up/Down or dedicated Move Up/Down buttons

**Actual**: Drag handles only, no keyboard handlers

**Impact**: Core functionality inaccessible to keyboard users

**Fix Plan**:
1. Create `KeyboardReorderList` component with Up/Down buttons
2. Replace DragDropContext with dual interface:
   - Visual: Keep drag handles
   - Keyboard: Add move up/down buttons (visible on focus)
3. Announce position changes to SR

**Files to Change**:
- ✅ Create `components/ui/KeyboardReorderList.jsx`
- [ ] Update `pages/ProjectDashboard` to use KeyboardReorderList OR add keyboard handlers
- [ ] Test keyboard reordering flow

**Status**: ✅ Component created, integration pending

---

### A11Y-004: Form Errors Not Programmatically Associated
**WCAG SC**: 3.3.1 (Error Identification), 3.3.3 (Error Suggestion)  
**Severity**: BLOCKER  
**Affected Routes**: All forms  
**Components**: All form components

**Issue**: Validation errors shown via toast only. Errors not associated with specific inputs via aria-describedby. No aria-invalid when validation fails. No inline error messages.

**Reproduction**:
1. Open RFI form
2. Leave subject blank
3. Submit
4. Result: Toast says "Please fill in required fields", but input has no error state

**Expected**:
- Inline error below input: "Subject is required"
- Input has `aria-invalid="true"`
- Input has `aria-describedby="subject-error"`
- Screen reader announces: "Subject, required, invalid, Subject is required"

**Actual**:
```jsx
if (!formData.subject) {
  showErrorToast('Please fill in required fields');
}
```

**Impact**: Screen reader users don't know which field has error or how to fix it

**Fix Plan**:
1. FormField component already handles aria-describedby
2. Add error state management to forms
3. Display inline errors below inputs
4. Set aria-invalid when validation fails
5. Provide specific error messages (not generic)

**Files to Change**:
- [ ] Update all form components to track errors per field
- [ ] Use FormField wrapper for automatic ARIA
- [ ] Replace generic toast errors with field-specific inline errors

**Status**: Architecture ready (FormField), implementation pending

---

## MAJOR DEFECTS

### A11Y-005: Status Messages Not Announced
**WCAG SC**: 4.1.3 (Status Messages)  
**Severity**: MAJOR  
**Affected Routes**: All routes with mutations  
**Component**: `components/ui/notifications` (toast wrapper)

**Issue**: Sonner toast library may not implement aria-live regions. Success/error messages not announced to screen readers.

**Reproduction**:
1. Create project
2. Use NVDA
3. Result: Toast appears visually but may not be announced

**Expected**: "Success: Project created successfully" announced automatically

**Impact**: Screen reader users don't receive feedback on actions

**Fix Plan**:
1. Create `AccessibleToast` wrapper with explicit aria-live region
2. Replace existing toast import with AccessibleToast
3. Test with screen reader

**Files to Change**:
- ✅ Create `components/ui/AccessibleToast.jsx`
- [ ] Update all files using `@/components/ui/notifications` → `@/components/ui/AccessibleToast`
- [ ] Verify announcements with SR

**Status**: ✅ Component created, migration pending

---

### A11Y-006: Icon-Only Buttons Missing Labels
**WCAG SC**: 1.1.1 (Non-text Content), 4.1.2 (Name, Role, Value)  
**Severity**: MAJOR  
**Affected Routes**: All routes  
**Components**: Various (Edit/Delete/View buttons)

**Issue**: Icon-only buttons (size="icon") have no accessible name. Screen readers announce "button" with no purpose.

**Examples**:
```jsx
// ChangeOrders - Line 316
<Button size="icon" onClick={() => setDeleteCO(row)}>
  <Trash2 size={16} />
</Button>

// WorkPackages - Line 369
<Button variant="ghost" size="sm" onClick={...}>
  <Trash2 size={14} />
</Button>
```

**Expected**: `aria-label="Delete change order"` or visible text

**Fix Plan**:
1. Create `IconButton` component with required label prop
2. Search all icon-only buttons
3. Add aria-label or convert to text buttons

**Files to Change**:
- ✅ Create `components/ui/AccessibleIconButton.jsx`
- [ ] Update ChangeOrders delete button
- [ ] Update WorkPackages delete button
- [ ] Update Projects edit/delete buttons
- [ ] Update Dashboard action buttons
- [ ] Search codebase for `size="icon"` and fix all instances

**Status**: ✅ Component created, migration pending

---

### A11Y-007: Color-Only Status Indicators
**WCAG SC**: 1.4.1 (Use of Color)  
**Severity**: MAJOR  
**Affected Routes**: All routes using StatusBadge  
**Component**: `components/ui/StatusBadge`

**Issue**: Status conveyed by color only (green=success, red=error, amber=warning). No text or icon to distinguish.

**Example**:
```jsx
<Badge className="bg-green-500/20 text-green-400">
  approved  <!-- Text present but color adds meaning -->
</Badge>
```

**Expected**: Text + icon or symbol (✓ Approved, ✗ Rejected)

**Impact**: Colorblind users cannot distinguish status

**Fix Plan**:
1. Update StatusBadge to include status text (not just color)
2. Add icons for critical statuses (approved ✓, rejected ✗, pending ⏱)
3. Verify status text is always present

**Files to Change**:
- [ ] Update `components/ui/StatusBadge` to include icons
- [ ] Verify all Badge usages have text content

**Status**: Pending

---

### A11Y-008: Clickable Divs Not Keyboard Accessible
**WCAG SC**: 2.1.1 (Keyboard), 4.1.2 (Name, Role, Value)  
**Severity**: MAJOR  
**Affected Routes**: WorkPackages, Documents, potentially others  
**Components**: Card components with onClick

**Issue**: Interactive cards use `onClick` on `<Card>` (div) without keyboard handlers, tabIndex, or role.

**Example**:
```jsx
// WorkPackages line 281
<Card onClick={() => setViewingPackage(pkg)} className="...cursor-pointer...">
```

**Expected**:
- Add `tabIndex={0}` to make focusable
- Add `role="button"` to indicate interactive
- Add `onKeyDown` handler for Enter/Space
- OR: Wrap in `<button>` element

**Fix Plan**:
1. Convert interactive Cards to buttons OR add full keyboard support
2. Add accessible names for card purpose
3. Test keyboard activation

**Files to Change**:
- [ ] Update WorkPackages card click handlers
- [ ] Update Documents card click handlers
- [ ] Search for other clickable divs

**Status**: Pending

---

### A11Y-009: Contrast Violations
**WCAG SC**: 1.4.3 (Contrast Minimum), 1.4.11 (Non-text Contrast)  
**Severity**: MAJOR  
**Affected Routes**: All routes  
**Components**: Various text and UI elements

**Issue**: Low-contrast text and UI components fail 4.5:1 (text) or 3:1 (non-text) requirements.

**Known Violations**:
1. `text-zinc-500` (#71717A) on `bg-zinc-900` (#18181B): ~4.2:1 (FAIL for normal text)
2. `text-zinc-600` (#52525B) on `bg-zinc-800` (#27272A): ~2.8:1 (FAIL)
3. `border-zinc-700` (#3F3F46) on `bg-zinc-900`: ~2.1:1 (FAIL for non-text)

**Fix Plan**:
1. Audit all text color classes
2. Replace `text-zinc-500` with `text-zinc-400` (passes)
3. Replace `text-zinc-600` with `text-zinc-400`
4. Increase input border contrast: `border-zinc-600` or `border-zinc-500`
5. Verify focus ring contrast (amber-500 on dark backgrounds)

**Files to Change**:
- [ ] Global search/replace for contrast violations
- [ ] Update `globals.css` with compliant color tokens
- [ ] Test all color combinations

**Status**: Pending (requires systematic color audit)

---

## MINOR DEFECTS

### A11Y-010: Missing Page Titles
**WCAG SC**: 2.4.2 (Page Titled)  
**Severity**: MINOR  
**Affected Routes**: All routes  

**Issue**: HTML `<title>` likely generic or missing

**Fix Plan**: Verify page title handling in routing, set descriptive titles per route

**Status**: Pending verification

---

### A11Y-011: Charts No Text Alternatives
**WCAG SC**: 1.1.1 (Non-text Content)  
**Severity**: MINOR  
**Affected Routes**: Analytics, Dashboard (chart widgets)  
**Components**: Recharts usage

**Issue**: SVG charts have no text alternative or data table fallback

**Fix Plan**:
1. Add aria-label to chart containers with data summary
2. OR: Provide data table toggle
3. Ensure chart legends have text, not just color

**Status**: Pending (lower priority than forms/tables)

---

### A11Y-012: File Upload Drag-Drop Not Keyboard Accessible
**WCAG SC**: 2.1.1 (Keyboard)  
**Severity**: MINOR  
**Affected Routes**: Documents  
**Component**: DocumentUploadZone

**Issue**: Drag-drop zone may not be keyboard accessible (though file input IS accessible via label)

**Current Code**:
```jsx
<input type="file" id="doc-upload" className="hidden" />
<label htmlFor="doc-upload">Click to upload</label>
```

**Assessment**: ✅ File input IS accessible (label association correct), but drag-drop is supplementary

**Fix**: Add instruction text "Click to upload or drag and drop" (clarifies keyboard users should click)

**Status**: Low priority (workaround exists)

---

### A11Y-013: Pagination Missing ARIA
**WCAG SC**: 4.1.2 (Name, Role, Value)  
**Severity**: MINOR  
**Affected Routes**: Dashboard, RFIHub  
**Component**: `components/ui/Pagination`

**Issue**: Page buttons may lack aria-labels, current page not announced

**Fix Plan**:
1. Read Pagination component
2. Add aria-label to page buttons: "Go to page 1", "Go to page 2"
3. Add aria-current="page" to current page
4. Wrap in `<nav aria-label="Pagination">`

**Status**: Pending (need to read component first)

---

### A11Y-014: Input Autocomplete Missing
**WCAG SC**: 1.3.5 (Identify Input Purpose)  
**Severity**: MINOR  
**Affected Routes**: All forms  

**Issue**: Inputs for common fields (email, name, phone) lack autocomplete attributes

**Fix Plan**: Add autocomplete where applicable:
- email fields: `autocomplete="email"`
- name fields: `autocomplete="name"`
- phone fields: `autocomplete="tel"`

**Status**: Pending

---

### A11Y-015: Focus Not Restored After Dialog Close
**WCAG SC**: 2.4.3 (Focus Order)  
**Severity**: MINOR  
**Components**: Dialog, Sheet, AlertDialog

**Issue**: Unknown if focus returns to trigger after close

**Test Required**: Close dialog with Escape or cancel, verify focus returns to button that opened it

**Expected**: Radix handles this, but must verify

**Status**: Pending verification

---

## FIX IMPLEMENTATION TRACKING

### ✅ Phase 3.1 - Foundation Components Created
- [x] AccessibleDataTable
- [x] FormField
- [x] AccessibleToast
- [x] AccessibleIconButton
- [x] KeyboardReorderList

### [ ] Phase 3.2 - Migrate Critical Forms
**Priority**: BLOCKER  
**Target**: A11Y-002 (Form labels)

Files to migrate:
1. [ ] pages/Projects (ProjectForm)
2. [ ] components/rfi-hub/RFIHubForm
3. [ ] components/change-orders/ChangeOrderForm
4. [ ] components/work-packages/WorkPackageForm
5. [ ] components/documents/DocumentUploadZone

**Strategy**: Wrap each input in `<FormField label="..." error={...}>` with validation state

---

### [ ] Phase 3.3 - Migrate DataTable Usages
**Priority**: BLOCKER  
**Target**: A11Y-001 (Table semantics)

Files to migrate:
1. [ ] components/projects/ProjectsTable
2. [ ] components/rfi-hub/RFIHubTable
3. [ ] pages/ChangeOrders (inline DataTable)
4. [ ] components/sov/InvoiceManager
5. [ ] Search for all `<DataTable` usages

---

### [ ] Phase 3.4 - Migrate Toast Usages
**Priority**: MAJOR  
**Target**: A11Y-005 (Status messages)

Files to migrate:
1. [ ] All files importing from `@/components/ui/notifications`
2. [ ] Replace with `@/components/ui/AccessibleToast`

---

### [ ] Phase 3.5 - Fix Icon Buttons
**Priority**: MAJOR  
**Target**: A11Y-006 (Icon labels)

Strategy:
1. Search for `size="icon"` in codebase
2. Replace with `IconButton` component OR add aria-label

---

### [ ] Phase 3.6 - Fix Clickable Divs
**Priority**: MAJOR  
**Target**: A11Y-008 (Keyboard access)

Files:
1. [ ] pages/WorkPackages (Card onClick)
2. [ ] components/documents/SecureDocumentManager (Card onClick)

---

### [ ] Phase 3.7 - Contrast Fixes
**Priority**: MAJOR  
**Target**: A11Y-009

Strategy:
1. Global search for `text-zinc-500`, `text-zinc-600`
2. Replace with `text-zinc-400` or `text-zinc-300` as needed
3. Update border colors: `border-zinc-700` → `border-zinc-600`

---

### [ ] Phase 3.8 - Minor Fixes
**Priority**: MINOR

Tasks:
- [ ] Add autocomplete attributes
- [ ] Verify page titles
- [ ] Add chart alt text
- [ ] Fix file upload instructions
- [ ] Add Pagination ARIA

---

## TESTING CHECKLIST (Post-Fix)

### Regression Tests
- [ ] All forms submit successfully
- [ ] All tables display data
- [ ] All toasts still show (and now announce)
- [ ] Drag-drop still works (visual)
- [ ] Keyboard reorder works (new feature)

### A11y Validation
- [ ] Screen reader announces labels
- [ ] Screen reader announces errors
- [ ] Screen reader announces status messages
- [ ] Keyboard-only: Can complete project creation
- [ ] Keyboard-only: Can create/edit RFI
- [ ] Keyboard-only: Can reorder dashboard widgets

---

**Current Status**: Foundation components ready, systematic migration in progress