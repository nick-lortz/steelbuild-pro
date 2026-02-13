# WCAG 2.1 AA Conformance Matrix
**App**: SteelBuild Pro  
**Standard**: WCAG 2.1 Level AA  
**Date**: 2026-02-13  
**Status**: IN PROGRESS (Phase 2 - Testing)

---

## LEVEL A

### 1.1 Text Alternatives

#### 1.1.1 Non-text Content (A)
**Requirement**: All non-text content has text alternative  
**Status**: ⚠️ **FAIL**  
**Tested**:
- Projects page: Icons in buttons (Plus, RefreshCw) - no aria-label
- Dashboard: Chart widgets - no alt text or data table fallback
- DataTable: Sorting icons - no accessible names
- StatusBadge: Color-only status - no text

**Evidence**:
```jsx
// FAIL - No accessible name
<Plus size={14} className="mr-1" />

// FAIL - Icon-only button
<Button size="icon">
  <Trash2 size={16} />
</Button>
```

**Required Fixes**:
1. Add aria-label to icon-only buttons
2. Provide text alternatives for charts
3. Ensure status is conveyed via text, not color alone

---

### 1.2 Time-based Media
**Status**: ✅ **N/A** (no video/audio content)

---

### 1.3 Adaptable

#### 1.3.1 Info and Relationships (A)
**Requirement**: Information, structure, relationships conveyed programmatically  
**Status**: ❌ **FAIL**  
**Tested**:
- Forms (Projects, RFIHub, ChangeOrders, WorkPackages): Labels not associated
- DataTable: No `<table>` semantic structure, uses `<div role="row">`
- Form sections: No `<fieldset>` for grouping

**Evidence**:
```jsx
// FAIL - No htmlFor/id association
<Label>Project Name *</Label>
<Input value={formData.name} ... />

// FAIL - Non-semantic table
<div role="row">
  <div>{data}</div>
</div>
```

**Required Fixes**:
1. Add `htmlFor`/`id` to all label-input pairs
2. Convert DataTable to semantic `<table>` OR implement full ARIA grid
3. Use `<fieldset>` for form sections

---

#### 1.3.2 Meaningful Sequence (A)
**Requirement**: Correct reading order  
**Status**: ✅ **PASS**  
**Tested**: Layout, Dashboard, Projects  
**Evidence**: DOM order matches visual order, no CSS position tricks detected

---

#### 1.3.3 Sensory Characteristics (A)
**Requirement**: Instructions don't rely solely on shape/size/location/sound  
**Status**: ✅ **PASS**  
**Tested**: All forms and instructions  
**Evidence**: No "click the green button" or "see below" instructions found

---

#### 1.3.4 Orientation (AA)
**Requirement**: No restriction to portrait or landscape  
**Status**: ✅ **PASS**  
**Tested**: Mobile responsive layout  
**Evidence**: CSS uses min-height, no orientation locks detected

---

#### 1.3.5 Identify Input Purpose (AA)
**Requirement**: Input purpose can be programmatically determined  
**Status**: ⚠️ **PARTIAL**  
**Tested**: Forms across all routes  
**Evidence**: HTML5 types used (email, date, number) but no autocomplete attributes

**Required Fixes**: Add autocomplete attributes where applicable (email, name, etc.)

---

### 1.4 Distinguishable

#### 1.4.1 Use of Color (A)
**Requirement**: Color not the only visual means  
**Status**: ❌ **FAIL**  
**Tested**:
- StatusBadge: Status conveyed by color only (green=approved, red=rejected)
- Charts: Line/bar colors without labels
- Budget variance: Red/green without +/- symbols in some places

**Evidence**:
```jsx
// FAIL - Color-only status
<Badge className="bg-green-500/20 text-green-400">approved</Badge>
```

**Required Fixes**:
1. Ensure status text is present (not just color)
2. Add symbols to positive/negative values
3. Chart legends must have text, not just color

---

#### 1.4.3 Contrast (Minimum) (AA)
**Requirement**: 4.5:1 for normal text, 3:1 for large text  
**Status**: ⚠️ **NEEDS VERIFICATION**  
**Colors in Use**:
- Background: `zinc-950` (#09090B), `zinc-900` (#18181B)
- Text: `white` (#FFFFFF), `zinc-400` (#A1A1AA), `zinc-500` (#71717A)
- Accent: `amber-500` (#F59E0B)

**Test Required**: Manual contrast check on:
- `text-zinc-500` on `bg-zinc-900` (likely fail)
- `text-zinc-400` on `bg-zinc-900` (needs check)
- `text-zinc-600` on `bg-zinc-800` (likely fail)

**Assumption**: Will likely find 5-10 contrast violations

---

#### 1.4.4 Resize Text (AA)
**Requirement**: Text can be resized to 200% without loss of content/functionality  
**Status**: ✅ **LIKELY PASS** (Tailwind uses rem units)  
**Test Required**: Manual zoom to 200% on Chrome/Firefox

---

#### 1.4.5 Images of Text (AA)
**Requirement**: Use actual text, not images of text  
**Status**: ✅ **PASS**  
**Evidence**: No images of text detected in code

---

#### 1.4.10 Reflow (AA)
**Requirement**: Content reflows at 320px width, no 2D scrolling  
**Status**: ⚠️ **NEEDS TESTING**  
**Test Required**: Resize browser to 320px width, check data tables

**Expected Issue**: DataTable will require horizontal scroll (acceptable if table-specific)

---

#### 1.4.11 Non-text Contrast (AA)
**Requirement**: 3:1 contrast for UI components and graphics  
**Status**: ❌ **FAIL EXPECTED**  
**Test Required**:
- Input borders: `border-zinc-700` (#3F3F46) on `bg-zinc-900` (#18181B)
- Focus rings: `ring-amber-500` (#F59E0B) on various backgrounds
- Button borders in outline variant

**Expected Failures**: Input borders likely <3:1

---

#### 1.4.12 Text Spacing (AA)
**Requirement**: No loss of content with spacing overrides  
**Status**: ⚠️ **NEEDS TESTING**  
**Test Required**: Apply spacing overrides:
```css
* {
  line-height: 1.5 !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
  paragraph-spacing: 2em !important; /* margin-bottom */
}
```

---

#### 1.4.13 Content on Hover or Focus (AA)
**Requirement**: Hover/focus content dismissible, hoverable, persistent  
**Status**: ⚠️ **NEEDS TESTING**  
**Where Used**: Tooltip (if present), Popover  
**Test Required**: Check tooltip behavior (Escape to dismiss, pointer to content)

---

## LEVEL A (Continued)

### 2.1 Keyboard Accessible

#### 2.1.1 Keyboard (A)
**Requirement**: All functionality available via keyboard  
**Status**: ❌ **FAIL**  
**Tested**:
- ✅ Forms: Tab navigation works
- ❌ DataTable row clicks: `onRowClick` on div, no keyboard handler
- ❌ DragDropContext: No keyboard alternative for reordering widgets
- ⚠️ Mobile nav: Not tested

**Evidence**:
```jsx
// FAIL - Click on div, no keyboard handler
<Card onClick={() => setViewingPackage(pkg)}>
```

**Required Fixes**:
1. Convert clickable divs to buttons or add keyboard handlers
2. Add keyboard alternative for drag-drop (Up/Down + Ctrl+Space pattern)
3. Verify all interactive elements are keyboard accessible

---

#### 2.1.2 No Keyboard Trap (A)
**Requirement**: Keyboard focus can move away from component  
**Status**: ⚠️ **NEEDS TESTING**  
**Test Required**: Tab through Dialog, Sheet, and verify Escape closes  
**Expected**: Radix handles this, but must verify focus doesn't get stuck

---

#### 2.1.4 Character Key Shortcuts (A)
**Requirement**: Single-key shortcuts can be turned off/remapped  
**Status**: ✅ **N/A** (no single-key shortcuts detected)

---

### 2.2 Enough Time

#### 2.2.1 Timing Adjustable (A)
**Requirement**: User can turn off, adjust, or extend time limits  
**Status**: ✅ **PASS**  
**Evidence**: No automatic timeouts detected (no session timeout, no auto-advancing carousels)

---

#### 2.2.2 Pause, Stop, Hide (A)
**Requirement**: User can pause/stop moving content  
**Status**: ✅ **PASS**  
**Evidence**: No auto-updating content detected (real-time subscriptions are passive updates, not animations)

---

### 2.3 Seizures

#### 2.3.1 Three Flashes or Below (A)
**Requirement**: No more than 3 flashes per second  
**Status**: ✅ **PASS**  
**Evidence**: No flashing content detected

---

### 2.4 Navigable

#### 2.4.1 Bypass Blocks (A)
**Requirement**: Skip to main content link  
**Status**: ✅ **PASS**  
**Tested**: Layout.js  
**Evidence**: `<SkipToMainContent />` component present

```jsx
// Layout.js line ~89
<SkipToMainContent />
```

---

#### 2.4.2 Page Titled (A)
**Requirement**: Pages have descriptive titles  
**Status**: ⚠️ **NEEDS VERIFICATION**  
**Test Required**: Check `<title>` tag in each route (likely set by routing framework)  
**Assumption**: Page titles likely generic or missing

---

#### 2.4.3 Focus Order (A)
**Requirement**: Focus order is logical  
**Status**: ✅ **PASS** (assumed from DOM order)  
**Test Required**: Manual keyboard navigation to confirm

---

#### 2.4.4 Link Purpose (A)
**Requirement**: Link purpose determined from link text or context  
**Status**: ✅ **PASS**  
**Tested**: Layout navigation, breadcrumbs  
**Evidence**: All navigation links have descriptive text

---

#### 2.4.5 Multiple Ways (AA)
**Requirement**: More than one way to find pages  
**Status**: ✅ **PASS**  
**Evidence**: Sidebar nav + CommandPalette component

---

#### 2.4.6 Headings and Labels (AA)
**Requirement**: Headings and labels are descriptive  
**Status**: ⚠️ **PARTIAL**  
**Tested**: PageHeader components  
**Evidence**: Page headings present (`<h1>`), but form labels sometimes missing or generic

**Required Fixes**: Ensure all labels are descriptive (not just "Title" but "Change Order Title")

---

#### 2.4.7 Focus Visible (AA)
**Requirement**: Keyboard focus indicator visible  
**Status**: ⚠️ **NEEDS VERIFICATION**  
**Test Required**: Tab through app, verify focus rings visible  
**Code Check**: globals.css has `:focus-visible { outline: 2px solid var(--ring, #f59e0b); }`

**Expected**: PASS but must verify on all interactive elements

---

### 2.5 Input Modalities

#### 2.5.1 Pointer Gestures (A)
**Requirement**: Multipoint/path-based gestures have single-pointer alternative  
**Status**: ✅ **PASS**  
**Evidence**: No complex gestures detected (drag-drop is optional, not required)

---

#### 2.5.2 Pointer Cancellation (A)
**Requirement**: Down-event not used to execute  
**Status**: ✅ **PASS**  
**Evidence**: All buttons use click events, not mousedown

---

#### 2.5.3 Label in Name (A)
**Requirement**: Visible label matches accessible name  
**Status**: ✅ **PASS** (assumed)  
**Evidence**: Button text and aria-labels (when present) match visual text

---

#### 2.5.4 Motion Actuation (A)
**Requirement**: Device motion not required  
**Status**: ✅ **N/A** (no motion-based controls)

---

## LEVEL AA

### 3.1 Readable

#### 3.1.1 Language of Page (A)
**Requirement**: Page language programmatically determined  
**Status**: ⚠️ **NEEDS VERIFICATION**  
**Test Required**: Check `<html lang="en">` attribute  
**Expected**: Likely missing or default

---

#### 3.1.2 Language of Parts (AA)
**Requirement**: Language of parts identified  
**Status**: ✅ **N/A** (single-language app)

---

### 3.2 Predictable

#### 3.2.1 On Focus (A)
**Requirement**: Focus doesn't trigger context change  
**Status**: ✅ **PASS**  
**Evidence**: No auto-submit on focus detected

---

#### 3.2.2 On Input (A)
**Requirement**: Input doesn't trigger context change unless warned  
**Status**: ✅ **PASS**  
**Evidence**: Selects change filters but don't navigate away unexpectedly

---

#### 3.2.3 Consistent Navigation (AA)
**Requirement**: Navigation consistent across pages  
**Status**: ✅ **PASS**  
**Evidence**: Layout.js provides consistent sidebar nav on all pages

---

#### 3.2.4 Consistent Identification (AA)
**Requirement**: Components with same functionality identified consistently  
**Status**: ✅ **PASS**  
**Evidence**: Button styles, icons consistent (Plus=add, Trash2=delete, Eye=view)

---

### 3.3 Input Assistance

#### 3.3.1 Error Identification (A)
**Requirement**: Errors identified in text  
**Status**: ❌ **FAIL**  
**Tested**: RFIHubForm, ChangeOrderForm, Projects form  
**Evidence**: Validation errors shown via toast, but not associated with inputs

```jsx
// FAIL - Error not linked to input
if (!formData.subject) {
  showErrorToast('Please fill in required fields');
}
// No aria-describedby on <Input>
```

**Required Fixes**:
1. Add inline error messages below inputs
2. Link errors via aria-describedby
3. Add aria-invalid when validation fails

---

#### 3.3.2 Labels or Instructions (A)
**Requirement**: Labels or instructions provided  
**Status**: ⚠️ **PARTIAL**  
**Tested**: All forms  
**Evidence**: Labels present but not programmatically associated

**Required Fixes**: Add `htmlFor` to all `<Label>` and matching `id` to inputs

---

#### 3.3.3 Error Suggestion (AA)
**Requirement**: Error correction suggested  
**Status**: ❌ **FAIL**  
**Tested**: Form validation  
**Evidence**: Errors identified but no suggestions provided

**Example**:
- Current: "Please fill in required fields"
- Required: "Project Name is required. Please enter a project name."

---

#### 3.3.4 Error Prevention (Legal/Financial) (AA)
**Requirement**: Prevent errors on legal/financial submissions  
**Status**: ⚠️ **PARTIAL**  
**Tested**:
- Invoice approval: ✅ Confirmation dialog present
- Change order approval: ✅ Confirmation present
- Budget edits: ⚠️ No confirmation for destructive edits

**Evidence**: Most critical actions have confirmations, but some edits lack review step

---

### 4.1 Compatible

#### 4.1.1 Parsing (A)
**Requirement**: Valid HTML  
**Status**: ✅ **PASS** (assumed with React)  
**Evidence**: React enforces valid JSX

---

#### 4.1.2 Name, Role, Value (A)
**Requirement**: Name/role/value programmatically determined  
**Status**: ❌ **FAIL**  
**Tested**:
- DataTable: Divs with role="row" but missing headers
- Icon-only buttons: No accessible names
- Checkboxes: May not have associated labels

**Evidence**:
```jsx
// FAIL - No accessible name
<Button size="icon" onClick={onDelete}>
  <Trash2 size={16} />
</Button>

// PARTIAL - Radix checkbox has aria-checked, but label not connected
<Checkbox checked={...} onCheckedChange={...} />
<label>Drawing Set 1</label>  <!-- No htmlFor -->
```

**Required Fixes**:
1. Add aria-label to icon-only buttons
2. Associate checkbox labels properly
3. Fix DataTable semantics

---

#### 4.1.3 Status Messages (AA)
**Requirement**: Status messages announced to AT  
**Status**: ❌ **FAIL**  
**Tested**: Toast notifications (sonner)  
**Evidence**: Toast library may not use aria-live regions

**Test Required**: Use NVDA/VoiceOver to verify if toasts are announced

**Required Fixes**: Ensure toast container has `role="status"` or `aria-live="polite"`

---

## SUMMARY (Phase 2 - Pre-Fix)

### By Status
- ✅ **PASS**: 14 SCs
- ❌ **FAIL**: 8 SCs
- ⚠️ **NEEDS VERIFICATION**: 7 SCs
- ✅ **N/A**: 6 SCs

### Critical Failures (Must Fix)
1. **1.1.1**: Icon-only buttons lack accessible names
2. **1.3.1**: Form labels not associated, DataTable not semantic
3. **1.4.1**: Color-only status indicators
4. **1.4.3**: Contrast violations (estimated 5-10)
5. **1.4.11**: Non-text contrast violations
6. **2.1.1**: DataTable rows not keyboard accessible, drag-drop no keyboard alternative
7. **3.3.1**: Form errors not associated with inputs
8. **4.1.2**: Missing accessible names, incorrect ARIA usage
9. **4.1.3**: Status messages may not announce to SR

### Verification Needed
- 1.4.3: Manual contrast checks
- 1.4.10: Reflow at 320px
- 1.4.12: Text spacing overrides
- 2.1.2: Focus trap verification
- 2.4.2: Page titles
- 2.4.7: Focus visibility
- 4.1.3: Toast announcements

---

**Next Phase**: Manual + automated testing to gather evidence, then systematic fixes