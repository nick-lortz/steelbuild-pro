# ErrorBanner — UI Test Plan
> Verifies no destructive navigation on 404, no state wipe, accessible contrast.

---

## Test 1 — Banner appears on 404, no navigation
**Setup:** Mount a page component whose query fetcher rejects with `{ status: 404 }`.
**Steps:**
1. Confirm `ErrorBanner` renders with text "Resource missing (404). Your changes are safe."
2. Confirm `window.location.href` has NOT changed.
3. Confirm `window.location.reload` was NOT called.
4. Confirm other query cache entries (e.g., Project list) are still intact.
**Pass criteria:** Banner visible, URL unchanged, cache untouched.

---

## Test 2 — Dismiss hides banner without state reset
**Steps:**
1. Trigger 404 → banner appears.
2. Click × Dismiss button.
3. Confirm banner is hidden.
4. Confirm form state / React Query cache is unmodified.
**Pass criteria:** Banner hidden; no re-render of parent with cleared data.

---

## Test 3 — Retry calls the retry function, not a page reload
**Steps:**
1. Trigger 404 → banner appears.
2. Click Retry.
3. Confirm the registered `onRetry` callback was called.
4. Confirm `window.location.reload` was NOT called.
**Pass criteria:** `onRetry` invoked once; no hard reload.

---

## Test 4 — Save Locally triggers draft save
**Steps:**
1. Trigger 404 → banner appears.
2. Click Save Locally.
3. Confirm `onSaveLocally` callback was called.
4. Confirm IndexedDB `drafts` store has a new entry.
**Pass criteria:** Draft written; no navigation.

---

## Test 5 — Report Issue opens modal without navigating
**Steps:**
1. Click Report Issue.
2. Confirm `ReportIssueModal` is rendered (aria-modal=true dialog present in DOM).
3. Confirm URL did not change.
4. Confirm modal contains editable textarea with pre-filled repro steps.
5. Confirm "Attach debug log" checkbox is shown when `window.__SBP_LAST_INCIDENT__` is set.
**Pass criteria:** Modal open, URL unchanged.

---

## Test 6 — Report Issue submits and modal closes cleanly
**Steps:**
1. Open modal → edit repro steps → click Submit Report.
2. Mock `POST /internal/debug/logs` → 200.
3. Confirm success state ("Report submitted") is shown.
4. Click Close → modal unmounts.
5. Confirm banner still visible (error not automatically cleared).
**Pass criteria:** POST fired; modal closes; banner persists until user explicitly dismisses.

---

## Test 7 — MissingResourceInline (card mode) shows without disappearing
**Steps:**
1. Render a `TaskCard` whose resource query returns 404.
2. Confirm `MissingResourceInline` renders inside the card.
3. Confirm card is still in the DOM (not removed from list).
4. Confirm surrounding list components are unaffected.
**Pass criteria:** Card present in DOM; inline message visible; sibling cards unaffected.

---

## Test 8 — MissingResourceInline (compact/table mode)
**Steps:**
1. Render a table row with `compact={true}`.
2. Confirm inline text "Task missing" + Retry link is visible.
3. Click Retry → confirm `onRetry` called.
**Pass criteria:** Compact inline renders; retry fires; no navigation.

---

## Test 9 — Accessible contrast (automated)
**Tool:** axe-core or jest-axe
**Checks:**
- ErrorBanner: all text meets WCAG AA (4.5:1) against `#0D1117` background.
- Action buttons have `:focus-visible` outlines.
- `role="alert"` and `aria-live="assertive"` present on banner.
- `role="dialog"` and `aria-modal="true"` present on modal.
- All buttons have `aria-label` attributes.
**Pass criteria:** 0 axe violations on color-contrast, aria-required-attr, button-name rules.

---

## Test 10 — No global state loss on rapid 404 → retry cycle
**Steps:**
1. Set query to alternate: fail(404), succeed, fail(404), succeed.
2. Trigger 4 fetches with Retry between each.
3. After each success, confirm React Query cache has correct data.
4. Confirm banner appears on fail, disappears (via dismiss) after success.
5. Confirm no `window.location` calls throughout.
**Pass criteria:** Cache consistent through all cycles; zero hard navigations.