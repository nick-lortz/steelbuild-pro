# Typecheck Ramp Plan

## Current state
- `npm run typecheck` validates project parsing/JSX compatibility without full JS semantic checks.
- `npm run typecheck:strict` runs full semantic checking on a curated set (`src/utils/index.ts`).

## How to expand strict coverage safely
1. Add one folder at a time to `jsconfig.strict.json` `include` list.
2. Run `npm run typecheck:strict`.
3. Fix that folder's errors, commit, and keep strict green.
4. Repeat.

## Recommended order
1. `src/lib/**/*.ts` and `src/utils/**/*.ts` (Completed)
2. `src/api/**/*.ts` (Completed)
3. `src/components/shared/hooks/**/*.jsx` (Completed)
4. `src/pages/Dashboard.jsx` (Completed)
5. Remaining pages/components by domain (In Progress)
First burn-down complete: removed `@ts-nocheck` from `button`, `badge`, `card`, `input`, `progress`, and `Pagination` UI primitives.
Second burn-down complete: removed `@ts-nocheck` from `drawer`, `select`, and `ErrorBoundary` UI files.
Third burn-down complete: removed `@ts-nocheck` from dashboard files (`Dashboard`, `AIForecastPanel`, `AIRiskPanel`, `ProjectFiltersBar`, `ProjectHealthTable`).
Expanded strict scope: added `src/components/activity/**/*.jsx` and fixed `ScrollArea` primitive typing.

## Common fix patterns
- Add JSDoc typedefs for component props and function params.
- Normalize shared UI primitive prop typing first (`button`, `card`, `select`, `tabs`).
- Replace `any` mutation payloads with explicit object shapes.
- Split large components and type-check one extracted module at a time.
