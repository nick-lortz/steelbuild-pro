/**
 * microInteractions.js — SteelBuild-Pro Motion + A11y System
 *
 * Import:
 *   import { motion as mx, variants, a11y, formA11y } from '@/components/shared/microInteractions'
 *   import { useReducedMotion } from '@/components/shared/microInteractions'
 *
 * All timings respect prefers-reduced-motion via useReducedMotion().
 */

// ─────────────────────────────────────────────────────────────
// TIMING & EASING CONSTANTS
// ─────────────────────────────────────────────────────────────
export const EASING = {
  // Snappy UI interactions — buttons, toggles, chips
  snap:     [0.65, 0, 0.35, 1],        // cubic-bezier — fast out
  // Smooth enter/exit — panels, dropdowns, modals
  smooth:   [0.22, 1, 0.36, 1],        // ease-out-quint
  // Spring-feel for drawers, bottom sheets
  spring:   [0.34, 1.56, 0.64, 1],     // slight overshoot
  // Standard ease for hover states (CSS only)
  standard: 'cubic-bezier(0.65, 0, 0.35, 1)',
};

export const DURATION = {
  instant:  80,   // ms — pressed/active state
  fast:     150,  // ms — hover, focus ring, color transitions
  normal:   200,  // ms — dropdown open, tooltip show
  medium:   250,  // ms — modal enter, panel slide
  slow:     350,  // ms — page transition, toast enter
  toast:    300,  // ms — toast enter; exit uses 200ms
};

// ─────────────────────────────────────────────────────────────
// FRAMER-MOTION VARIANTS
// ─────────────────────────────────────────────────────────────

/** Fade + scale — modals, dialogs */
export const modalVariants = {
  hidden:  { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1,    y: 0, transition: { duration: DURATION.medium / 1000, ease: EASING.smooth } },
  exit:    { opacity: 0, scale: 0.97, y: 4, transition: { duration: DURATION.fast / 1000,   ease: EASING.snap } },
};

/** Slide down — dropdowns, command palette */
export const dropdownVariants = {
  hidden:  { opacity: 0, scaleY: 0.95, y: -4, transformOrigin: 'top' },
  visible: { opacity: 1, scaleY: 1,    y: 0,  transformOrigin: 'top', transition: { duration: DURATION.normal / 1000, ease: EASING.smooth } },
  exit:    { opacity: 0, scaleY: 0.97, y: -2, transformOrigin: 'top', transition: { duration: DURATION.fast / 1000,   ease: EASING.snap } },
};

/** Slide up — bottom sheets, mobile drawers */
export const sheetVariants = {
  hidden:  { y: '100%', opacity: 0 },
  visible: { y: 0,      opacity: 1, transition: { duration: DURATION.medium / 1000, ease: EASING.spring } },
  exit:    { y: '100%', opacity: 0, transition: { duration: DURATION.normal / 1000, ease: EASING.snap } },
};

/** Fade in — toasts, notifications */
export const toastVariants = {
  hidden:  { opacity: 0, x: 24,  scale: 0.97 },
  visible: { opacity: 1, x: 0,   scale: 1,    transition: { duration: DURATION.slow / 1000,   ease: EASING.smooth } },
  exit:    { opacity: 0, x: 16,  scale: 0.97, transition: { duration: DURATION.normal / 1000, ease: EASING.snap } },
};

/** Slide in from left — sidebar panels */
export const sidebarVariants = {
  hidden:  { x: -16, opacity: 0 },
  visible: { x: 0,   opacity: 1, transition: { duration: DURATION.medium / 1000, ease: EASING.smooth } },
  exit:    { x: -8,  opacity: 0, transition: { duration: DURATION.fast / 1000,   ease: EASING.snap } },
};

/** Page transition */
export const pageVariants = {
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: EASING.smooth } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.14, ease: EASING.snap } },
};

/** Stagger children — lists, card grids */
export const staggerContainer = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};
export const staggerItem = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.normal / 1000, ease: EASING.smooth } },
};

/** Inline error reveal — form validation */
export const errorVariants = {
  hidden:  { opacity: 0, y: -4, height: 0 },
  visible: { opacity: 1, y: 0,  height: 'auto', transition: { duration: DURATION.fast / 1000, ease: EASING.smooth } },
  exit:    { opacity: 0, y: -2, height: 0,      transition: { duration: DURATION.fast / 1000, ease: EASING.snap } },
};

// ─────────────────────────────────────────────────────────────
// REDUCED MOTION HOOK
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = e => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

/**
 * Returns safe variants: if reduced motion, collapses all transitions to instant opacity-only.
 * Usage: const v = useSafeVariants(modalVariants);  <motion.div variants={v} />
 */
export function useSafeVariants(variants) {
  const reduced = useReducedMotion();
  if (!reduced) return variants;
  // Strip transform/scale/y/x — keep only opacity
  const safe = {};
  for (const [key, val] of Object.entries(variants)) {
    safe[key] = {
      opacity: val.opacity ?? 1,
      transition: { duration: 0 },
    };
  }
  return safe;
}

// ─────────────────────────────────────────────────────────────
// ARIA ATTRIBUTE HELPERS
// ─────────────────────────────────────────────────────────────
export const a11y = {
  /** Modal/Dialog */
  modal: (titleId, descId) => ({
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': titleId,
    'aria-describedby': descId,
  }),

  /** Dropdown menu trigger */
  dropdownTrigger: (expanded, controlsId) => ({
    'aria-haspopup': 'menu',
    'aria-expanded': expanded,
    'aria-controls': controlsId,
  }),

  /** Dropdown menu list */
  dropdownMenu: (labelId) => ({
    role: 'menu',
    'aria-labelledby': labelId,
  }),
  dropdownItem: () => ({
    role: 'menuitem',
    tabIndex: -1,
  }),

  /** Combobox / Select */
  combobox: (expanded, activeDescendant) => ({
    role: 'combobox',
    'aria-expanded': expanded,
    'aria-haspopup': 'listbox',
    'aria-autocomplete': 'list',
    'aria-activedescendant': activeDescendant,
  }),
  listbox: () => ({ role: 'listbox' }),
  option:  (selected) => ({ role: 'option', 'aria-selected': selected }),

  /** Tabs */
  tabList: () => ({ role: 'tablist' }),
  tab:     (selected, controls) => ({ role: 'tab', 'aria-selected': selected, 'aria-controls': controls, tabIndex: selected ? 0 : -1 }),
  tabPanel: (labelId) => ({ role: 'tabpanel', 'aria-labelledby': labelId, tabIndex: 0 }),

  /** Status / live region */
  livePolite:   () => ({ role: 'status',  'aria-live': 'polite',    'aria-atomic': true }),
  liveAssertive:() => ({ role: 'alert',   'aria-live': 'assertive', 'aria-atomic': true }),

  /** Loading state */
  loading: (label = 'Loading') => ({ 'aria-busy': true, 'aria-label': label }),

  /** Drawing viewer (custom canvas) */
  drawingViewer: (label) => ({
    role: 'img',
    'aria-label': label,
    tabIndex: 0,
    // Keyboard: use onKeyDown to handle zoom/pan with arrows
  }),

  /** Button with icon only */
  iconButton: (label) => ({ 'aria-label': label, type: 'button' }),

  /** Status badge */
  statusBadge: (status) => ({ 'aria-label': `Status: ${status}` }),

  /** Progress bar */
  progressBar: (value, max = 100, label) => ({
    role: 'progressbar',
    'aria-valuenow': value,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-label': label,
  }),
};

// ─────────────────────────────────────────────────────────────
// FORM VALIDATION / ERROR A11Y
// ─────────────────────────────────────────────────────────────
export const formA11y = {
  /**
   * Props for a form field with validation.
   * @param {string} id   — field id
   * @param {string|null} error — error message or null
   * @param {string} desc — optional hint text id
   */
  field: (id, error, desc) => ({
    id,
    'aria-invalid': !!error,
    'aria-describedby': [error ? `${id}-err` : null, desc || null].filter(Boolean).join(' ') || undefined,
  }),

  /** Error message element */
  errorMsg: (id) => ({
    id: `${id}-err`,
    role: 'alert',              // assertive — fires immediately on inject
    'aria-live': 'assertive',
    'aria-atomic': true,
  }),

  /** Form-level error summary (shown at top after failed submit) */
  errorSummary: () => ({
    role: 'alert',
    'aria-live': 'assertive',
    'aria-atomic': true,
    tabIndex: -1,               // programmatically focus on submit failure
  }),
};