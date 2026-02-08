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
1. `src/lib/**/*.ts`
2. `src/utils/**/*.ts`
3. `src/api/**/*.ts`
4. `src/components/shared/hooks/**/*.js`
5. `src/pages/Dashboard.jsx`
6. Remaining pages/components by domain

## Common fix patterns
- Add JSDoc typedefs for component props and function params.
- Normalize shared UI primitive prop typing first (`button`, `card`, `select`, `tabs`).
- Replace `any` mutation payloads with explicit object shapes.
- Split large components and type-check one extracted module at a time.
