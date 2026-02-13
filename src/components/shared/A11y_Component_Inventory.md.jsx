# Accessibility Component Inventory
**App**: SteelBuild Pro  
**Date**: 2026-02-13  
**Purpose**: Comprehensive map of routes, reusable primitives, and accessibility responsibilities

---

## ROUTE MAP

| Route | Auth | Roles | Purpose | Main Primitives Used | A11y Notes |
|-------|------|-------|---------|----------------------|------------|
| `/` | No | Public | Landing page | Button, Link | Entry point |
| `/Dashboard` | Yes | admin, user | Portfolio overview | Card, Button, Select, Table, Badge | Complex data visualization |
| `/Projects` | Yes | admin, user | Project CRUD | Dialog, Sheet, Button, Input, Select, Table | Form + table interaction |
| `/ProjectDashboard` | Yes | admin, user | Single project KPIs | DragDropContext, Card, Button, GripVertical | Drag-drop accessibility critical |
| `/RFIHub` | Yes | admin, user | RFI tracking | Tabs, Dialog, Button, Select, Input, Table, Pagination | Tab keyboard nav |
| `/ChangeOrders` | Yes | admin, user | CO management | Dialog, Sheet, AlertDialog, Button, Table, Select | Multi-step forms |
| `/WorkPackages` | Yes | admin, user | Work package execution | Sheet, Select, Card, Button, AlertDialog, Checkbox | Complex nested forms |
| `/Financials` | Yes | admin, user | Budget & SOV | Tabs, Select, Card, Dialog, Input, Table | Financial data tables |
| `/Schedule` | Yes | admin, user | Task scheduling | Calendar, Gantt, Forms | Date pickers, timeline viz |
| `/Documents` | Yes | admin, user | Document vault | Sheet, Dialog, Upload, Table, Badge | File upload accessibility |
| `/Detailing` | Yes | admin, user | Drawing sets | Table, Dialog, Tabs, Badge | Status tracking |
| `/Fabrication` | Yes | admin, user | Fab tracking | Card, Button, Select, Progress | Progress indicators |
| `/Deliveries` | Yes | admin, user | Delivery logistics | Table, Card, Dialog, Map | Map accessibility |
| `/FieldTools` | Yes | admin, user | Field issue logging | Form, Upload, Camera | Mobile camera access |
| `/ResourceManagement` | Yes | admin, user | Resource allocation | Dialog, Table, Select, Checkbox | Complex filtering |
| `/CostCodes` | Yes | admin, user | Cost code library | Table, Dialog, Select | CRUD table |
| `/Analytics` | Yes | admin, user | Analytics | Chart, Card, Select | Chart accessibility |
| `/AdvancedReporting` | Yes | admin | Custom reports | DashboardBuilder, Chart, Export | Admin-only |
| `/Admin` | Yes | admin | Admin panel | Tabs, Table, Forms | Admin-only |

**Total Routes**: 19  
**Auth Required**: 18/19  
**Admin-Only**: 2/19

---

## REUSABLE UI PRIMITIVES

### 1. Button
**Source**: `@/components/ui/button` (shadcn/Radix)  
**Variants**: default, destructive, outline, secondary, ghost, link  
**Sizes**: default, sm, lg, icon  
**Where Used**: All routes, all forms  
**A11y Baseline**: ✅ Native `<button>`, keyboard accessible  
**Potential Issues**:
- Icon-only buttons may lack accessible names
- Loading states may not announce to SR

---

### 2. Dialog / AlertDialog
**Source**: `@/components/ui/dialog`, `@/components/ui/alert-dialog` (Radix)  
**Where Used**: Projects, RFIHub, ChangeOrders, WorkPackages, Documents  
**A11y Baseline**: ✅ Radix handles aria-modal, focus trap  
**Potential Issues**:
- ❌ Focus may not restore to trigger on close (not verified)
- ⚠️ DialogTitle must be present for aria-labelledby

---

### 3. Sheet (Side Panel)
**Source**: `@/components/ui/sheet` (Radix Drawer/Sheet)  
**Where Used**: Projects (edit), ChangeOrders (detail), WorkPackages, Documents  
**A11y Baseline**: ✅ Radix handles role="dialog"  
**Potential Issues**:
- ❌ Focus trap behavior not confirmed
- ❌ Escape key behavior not tested

---

### 4. Input
**Source**: `@/components/ui/input` (custom)  
**Where Used**: All forms  
**A11y Baseline**: ✅ Native `<input>`  
**Potential Issues**:
- ❌ Labels not always associated via `htmlFor`/`id`
- ❌ No aria-describedby for error messages
- ❌ No aria-invalid when validation fails

---

### 5. Select / Combobox
**Source**: `@/components/ui/select` (Radix)  
**Where Used**: All filters, all forms  
**A11y Baseline**: ✅ Radix implements select pattern  
**Potential Issues**:
- ⚠️ Mobile detection changes behavior (drawer vs popover)
- ❌ Label association not verified in all instances

---

### 6. Tabs
**Source**: `@/components/ui/tabs` (Radix)  
**Where Used**: RFIHub, Financials, ChangeOrderForm  
**A11y Baseline**: ✅ Radix implements tab pattern (arrow keys, etc.)  
**Potential Issues**:
- ✅ Keyboard nav should work (Radix handles)
- ⚠️ Tab panel focus management not tested

---

### 7. DataTable
**Source**: `@/components/ui/DataTable` (custom)  
**Where Used**: Projects, RFIHub, ChangeOrders, Documents  
**A11y Baseline**: ❌ Uses generic `<div role="row">` instead of `<table>`  
**Critical Issues**:
- ❌ **BLOCKER**: No `<table>`, `<thead>`, `<tbody>`, `<th scope>`
- ❌ No row headers associations
- ❌ Row click handlers on divs (should be buttons or links)
- ❌ Sorting controls not keyboard accessible
- ❌ Mobile card view loses table semantics

---

### 8. Badge
**Source**: `@/components/ui/badge` (cva)  
**Where Used**: Status indicators across app  
**A11y Baseline**: ✅ Presentational, no interaction  
**Potential Issues**: None (decorative)

---

### 9. Pagination
**Source**: `@/components/ui/Pagination` (custom)  
**Where Used**: Dashboard, RFIHub, WorkPackages  
**A11y Baseline**: ⚠️ Not yet inspected  
**Potential Issues**:
- ❌ Page buttons may lack aria-labels
- ❌ Current page not announced to SR

---

### 10. Toast / Status Messages
**Source**: `sonner` (via `@/components/ui/notifications`)  
**Where Used**: All mutations, error handling  
**A11y Baseline**: ⚠️ Unknown if aria-live regions used  
**Critical Issues**:
- ❌ **MAJOR**: May not announce to screen readers (WCAG 4.1.3)
- ❌ No role="status" or aria-live visible in code

---

### 11. Charts (Recharts)
**Source**: `recharts` library  
**Where Used**: Analytics, Dashboard, AdvancedReporting  
**A11y Baseline**: ❌ SVG charts typically inaccessible  
**Potential Issues**:
- ❌ No text alternatives for charts
- ❌ No data tables as fallback
- ❌ Color-only differentiation (WCAG 1.4.1)

---

### 12. File Upload
**Source**: Custom (DocumentUploadZone, CSVUpload)  
**Where Used**: Documents, ChangeOrders  
**A11y Baseline**: ⚠️ Not yet inspected  
**Potential Issues**:
- ❌ `<input type="file">` may be hidden without accessible alternative
- ❌ Drag-drop zones may not be keyboard accessible
- ❌ Upload progress not announced

---

### 13. Checkbox
**Source**: `@/components/ui/checkbox` (Radix)  
**Where Used**: WorkPackageForm (drawing/delivery linking), Projects (user assignment)  
**A11y Baseline**: ✅ Radix handles aria-checked  
**Potential Issues**:
- ❌ Labels may not be properly associated

---

### 14. Textarea
**Source**: `@/components/ui/textarea` (custom)  
**Where Used**: All description/notes fields  
**A11y Baseline**: ✅ Native `<textarea>`  
**Potential Issues**:
- ❌ Same label/error association issues as Input

---

### 15. Drag-and-Drop (DnD)
**Source**: `@hello-pangea/dnd`  
**Where Used**: ProjectDashboard (widget reordering)  
**A11y Baseline**: ❌ Most DnD libraries are not keyboard accessible  
**Critical Issues**:
- ❌ **BLOCKER**: No keyboard alternative for reordering
- ❌ No screen reader announcements for drag/drop actions

---

## ACCESSIBILITY RESPONSIBILITY BREAKDOWN

### Radix-Provided (Generally Compliant)
- Dialog (focus trap, aria-modal)
- AlertDialog (focus trap, aria-modal)
- Select (combobox pattern, keyboard nav)
- Tabs (tab panel pattern, arrow keys)
- Checkbox (aria-checked)

**Assumption**: Radix components are WCAG-compliant by default, but we must verify:
1. Focus is restored to trigger on close
2. Labels are properly associated
3. Error states are announced

---

### Custom Components (Need Audit)
- **DataTable** ❌ CRITICAL - No semantic table markup
- **Pagination** ⚠️ Unknown keyboard/SR support
- **FileUpload** ⚠️ Hidden inputs, drag-drop zones
- **DragDropContext** ❌ CRITICAL - No keyboard alternative
- **Toast** ❌ MAJOR - No confirmed aria-live regions
- **Charts** ❌ MAJOR - No text alternatives

---

### Form Patterns (Need Label/Error Fixes)
- Input fields: ❌ Missing `htmlFor`/`id` associations
- Error messages: ❌ Not associated via aria-describedby
- Required fields: ⚠️ No aria-required (using HTML5 `required`)
- Validation: ❌ No aria-invalid on error state

---

## PRIORITY FIX AREAS

### P0 - Blockers (Must Fix)
1. **DataTable**: Convert to semantic `<table>` or add full ARIA grid role
2. **DragDropContext**: Add keyboard alternative for widget reordering
3. **Form Labels**: Add `htmlFor`/`id` to all label-input pairs
4. **Form Errors**: Add aria-describedby + aria-invalid
5. **Toast**: Verify/implement aria-live regions

### P1 - Major (Should Fix)
6. **Dialog Focus Restore**: Verify focus returns to trigger
7. **Charts**: Add text alternatives or data tables
8. **File Upload**: Ensure keyboard accessibility
9. **Pagination**: Add aria-labels, current page announcement

### P2 - Minor (Nice to Have)
10. **Icon Buttons**: Add aria-label where text missing
11. **Loading States**: Announce to SR via aria-live
12. **Empty States**: Ensure focus management

---

## NOTES & ASSUMPTIONS

1. **Radix Assumption**: Radix UI components are assumed WCAG-compliant out-of-box, but must verify integration (e.g., labels passed correctly)
2. **Color Scheme**: Dark theme (zinc/amber) - must verify contrast ratios
3. **Mobile**: Responsive design present - must verify reflow at 320px, text spacing
4. **No Video/Audio**: No media content = many WCAG 1.2.x SCs N/A
5. **No Captcha**: No captcha = 1.1.1 (non-text) partially N/A

---

**Next Step**: Create WCAG 2.1 AA Conformance Matrix with evidence-based testing