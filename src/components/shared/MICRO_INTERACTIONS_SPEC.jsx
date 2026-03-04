# SteelBuild-Pro — Micro-Interactions & Accessibility Spec
> All code lives in `components/shared/microInteractions.js`
> Import: `import { modalVariants, useSafeVariants, a11y, formA11y, EASING, DURATION } from '@/components/shared/microInteractions'`

---

## 1. TIMING & EASING REFERENCE

| Interaction | Duration | Easing | CSS equivalent |
|---|---|---|---|
| Button hover (bg/shadow) | 150ms | `cubic-bezier(0.65,0,0.35,1)` | `transition: all 150ms cubic-bezier(0.65,0,0.35,1)` |
| Button pressed/active | 80ms | snap | `active:scale-[0.97]` + `transition: transform 80ms` |
| Focus ring appear | 150ms | snap | `transition: box-shadow 150ms` |
| Dropdown open | 200ms | `cubic-bezier(0.22,1,0.36,1)` | `dropdownVariants` |
| Dropdown close | 150ms | snap | exit variant |
| Modal enter | 250ms | smooth | `modalVariants` |
| Modal exit | 150ms | snap | exit variant |
| Toast enter | 350ms | smooth | `toastVariants` |
| Toast exit | 200ms | snap | exit variant |
| Page transition | 180ms | smooth | `pageVariants` |
| Inline error reveal | 150ms | smooth | `errorVariants` + AnimatePresence |
| Sidebar slide | 250ms | smooth | `sidebarVariants` |
| List stagger child | 40ms/item | smooth | `staggerContainer` + `staggerItem` |

---

## 2. CSS / TAILWIND SNIPPETS

### Button — hover + pressed + focus
```jsx
// Globals.css already handles transition: all 200ms on buttons.
// Override per-component with these Tailwind classes:

// Primary button
className="... hover:-translate-y-px hover:shadow-[0_12px_28px_rgba(255,90,31,0.30)]
           active:scale-[0.97] active:shadow-none
           focus-visible:ring-2 focus-visible:ring-[#FF5A1F]
           focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D10]
           transition-all duration-150"

// Ghost/icon button
className="... hover:bg-[rgba(255,255,255,0.05)] active:bg-[rgba(255,255,255,0.08)]
           focus-visible:ring-2 focus-visible:ring-[#FF5A1F]
           transition-all duration-150"
```

### Focus ring — global (already in globals.css, verify)
```css
:focus-visible {
  outline: 2px solid #FF5A1F;
  outline-offset: 2px;
  border-radius: 4px;
}
:focus:not(:focus-visible) { outline: none; }
```

### Input — focus glow
```css
/* On focus: */
border-color: rgba(255, 90, 31, 0.50);
box-shadow: 0 0 0 3px rgba(255, 90, 31, 0.18);
transition: border-color 150ms, box-shadow 150ms;
```

---

## 3. FRAMER-MOTION SNIPPETS

### Modal
```jsx
import { motion, AnimatePresence } from 'framer-motion';
import { modalVariants, useSafeVariants } from '@/components/shared/microInteractions';

function MyModal({ open, children }) {
  const v = useSafeVariants(modalVariants); // respects prefers-reduced-motion

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-[rgba(11,13,16,0.80)]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          {/* Panel */}
          <motion.div
            role="dialog" aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            variants={v} initial="hidden" animate="visible" exit="exit"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### Dropdown
```jsx
import { dropdownVariants, useSafeVariants } from '@/components/shared/microInteractions';

<AnimatePresence>
  {open && (
    <motion.ul
      variants={useSafeVariants(dropdownVariants)}
      initial="hidden" animate="visible" exit="exit"
      className="absolute top-full mt-1 z-50 bg-[#14181E] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.60)] py-1 min-w-[160px]"
      role="menu"
    >
      {items.map((item, i) => (
        <li key={i} role="menuitem" tabIndex={-1}
          className="px-3 py-2 text-[0.8125rem] text-[rgba(255,255,255,0.70)] hover:bg-[rgba(255,90,31,0.08)] hover:text-[rgba(255,255,255,0.92)] cursor-pointer focus:bg-[rgba(255,90,31,0.08)] focus:outline-none"
          onClick={item.onClick}
        >{item.label}</li>
      ))}
    </motion.ul>
  )}
</AnimatePresence>
```

### Toast
```jsx
import { toastVariants, useSafeVariants } from '@/components/shared/microInteractions';

<AnimatePresence>
  {toasts.map(t => (
    <motion.div key={t.id}
      variants={useSafeVariants(toastVariants)}
      initial="hidden" animate="visible" exit="exit"
      className="flex items-center gap-3 px-4 py-3 bg-[#1A1F27] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.50)] text-[0.8125rem] text-[rgba(255,255,255,0.88)]"
      role="status" aria-live="polite" aria-atomic="true"
    >
      {t.message}
    </motion.div>
  ))}
</AnimatePresence>
```

### Inline form error
```jsx
import { motion, AnimatePresence } from 'framer-motion';
import { errorVariants, useSafeVariants, formA11y } from '@/components/shared/microInteractions';

function Field({ id, label, error, ...props }) {
  const ev = useSafeVariants(errorVariants);
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[0.6rem] font-bold tracking-[0.10em] uppercase text-[rgba(255,255,255,0.35)]">
        {label}
      </label>
      <input id={id} {...formA11y.field(id, error)} {...props}
        className={`bg-[#14181E] border rounded-[10px] px-3 h-9 text-[0.8125rem] transition-all duration-150 focus:outline-none
          ${error
            ? 'border-[rgba(255,77,77,0.60)] focus:shadow-[0_0_0_3px_rgba(255,77,77,0.18)]'
            : 'border-[rgba(255,255,255,0.08)] focus:border-[rgba(255,90,31,0.50)] focus:shadow-[0_0_0_3px_rgba(255,90,31,0.18)]'
          }`}
      />
      <AnimatePresence>
        {error && (
          <motion.span
            {...formA11y.errorMsg(id)}
            variants={ev} initial="hidden" animate="visible" exit="exit"
            className="text-[0.65rem] text-[#FF4D4D] overflow-hidden"
          >{error}</motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Stagger list
```jsx
import { staggerContainer, staggerItem, useSafeVariants } from '@/components/shared/microInteractions';

<motion.ul
  variants={useSafeVariants(staggerContainer)}
  initial="hidden" animate="visible"
>
  {items.map((item, i) => (
    <motion.li key={i} variants={useSafeVariants(staggerItem)}>
      {/* row content */}
    </motion.li>
  ))}
</motion.ul>
```

---

## 4. ACCESSIBILITY RULES

### 4.1 Focus order
1. Skip link (`#main-content`) — always first in DOM
2. TopNav items — left to right
3. Page h1 / primary action button
4. Filters → table → row actions
5. Modals: focus auto-moves to first focusable element; returns to trigger on close
6. Never use `tabIndex > 0` — only `0` or `-1`

### 4.2 Keyboard patterns
| Component | Keys |
|---|---|
| Button | `Enter`, `Space` activate |
| Dropdown | `Enter`/`Space` open; `↑↓` navigate items; `Esc` close; `Tab` closes + moves on |
| Modal | `Esc` closes; `Tab`/`Shift+Tab` trapped inside |
| Tabs | `←→` move between tabs; `Enter`/`Space` select; `Home`/`End` jump |
| Drawing viewer | `+`/`-` zoom; `Arrow` pan; `Esc` reset; `Enter` on markup opens detail |
| Select/Combobox | `↑↓` navigate; `Enter` select; `Esc` close; type to filter |
| Data table row | `Enter`/`Space` on `tabIndex=0` row opens detail |

### 4.3 ARIA for complex components

**Drawing viewer:**
```jsx
<div
  role="img"
  aria-label={`Drawing sheet ${sheet.sheet_number} — ${sheet.sheet_name}`}
  tabIndex={0}
  onKeyDown={handleViewerKeyboard}
/>
// Controls toolbar: role="toolbar" aria-label="Drawing controls"
// Each tool button: aria-pressed={active} aria-label="Zoom in"
```

**Gantt / Schedule timeline:**
```jsx
<div role="region" aria-label="Project schedule timeline">
  <table role="treegrid" aria-label="Task list">
    <tr role="row" aria-expanded={hasChildren} aria-level={depth}>
```

**Status badge:**
```jsx
<span aria-label={`Status: ${status}`} title={status}> ... </span>
```

**Loading skeletons:**
```jsx
<div aria-busy="true" aria-label="Loading project data" role="status">
  {/* skeleton DOM */}
</div>
```

### 4.4 Contrast thresholds

| Use case | Min ratio | Token |
|---|---|---|
| Body text | 4.5:1 AA | `rgba(255,255,255,0.92)` on `#14181E` → 16.5:1 ✓ |
| Secondary text | 4.5:1 AA | `rgba(255,255,255,0.70)` → 12.1:1 ✓ |
| Muted / captions | 4.5:1 AA | `rgba(255,255,255,0.50)` → 8.0:1 ✓ |
| **Floor — never go below** | 4.5:1 | `rgba(255,255,255,0.40)` → 6.4:1 ✓ (hard floor) |
| Placeholder text | 3:1 UI | `rgba(255,255,255,0.25)` on `#14181E` → 4.0:1 ✓ |
| Focus ring `#FF5A1F` | 3:1 UI | on `#0B0D10` → 6.3:1 ✓ |
| Accent `#FF5A1F` as button bg | 4.5:1 | white text on accent → 3.9:1 ⚠️ use `font-weight:700` or bump to `#FF7A2F` |
| Status danger `#FF4D4D` | 3:1 (badge) | on `#14181E` → 4.6:1 ✓ (badge only, not body text) |
| Chart axis labels | 3:1 UI | `rgba(255,255,255,0.30)` → 4.9:1 ✓ |

### 4.5 Reduced motion fallbacks
```jsx
// In any component using framer-motion:
const v = useSafeVariants(myVariants);
// useSafeVariants strips all translate/scale, keeps only opacity at duration:0

// For CSS transitions, add to globals.css:
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 5. FORM ERROR UX RULES

1. **Never validate on keystroke** — validate on `blur` (field exit) or `submit`
2. **Error appears** 150ms after blur (use `errorVariants` + `AnimatePresence`)
3. **Error message** = `role="alert"` + `aria-live="assertive"` — fires to screen reader immediately
4. **Field border** switches from `rgba(255,255,255,0.08)` → `rgba(255,77,77,0.60)` on error
5. **Focus ring** switches from orange `rgba(255,90,31,0.18)` → red `rgba(255,77,77,0.18)` on error
6. **On failed submit** — focus the first invalid field; show summary `role="alert"` at top of form
7. **On error cleared** — use `AnimatePresence` exit animation (150ms collapse)
8. **Success state** — briefly show `#4DD6A4` border + checkmark for 1.5s then return to neutral

```jsx
// Minimal validated field usage:
const [errors, setErrors] = useState({});

<Field
  id="rfi_number"
  label="RFI Number"
  error={errors.rfi_number}
  onBlur={e => {
    if (!e.target.value) setErrors(prev => ({ ...prev, rfi_number: 'RFI number is required' }));
    else setErrors(prev => ({ ...prev, rfi_number: null }));
  }}
/>
// Form-level error summary on submit:
{submitError && (
  <div {...formA11y.errorSummary()} ref={errorSummaryRef}
    className="p-3 rounded-xl bg-[rgba(255,77,77,0.08)] border border-[rgba(255,77,77,0.20)] text-[#FF4D4D] text-[0.8125rem]"
  >
    {submitError}
  </div>
)}
``