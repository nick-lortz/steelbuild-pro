# Supabase Scaffold (Owned Backend)

This folder bootstraps the first owned-backend slice for Steelbuilder Pro.

## Includes

- `config.toml`: local Supabase config for development.
- `migrations/20260208_0001_core.sql`: initial schema (`profiles`, `projects`, RLS, indexes).
- `functions/getDashboardData/index.ts`: first edge function aligned with `apiClient.functions.invoke('getDashboardData', ...)`.

## Local usage

1. Install Supabase CLI and login.
2. Start owned gateway in a separate terminal:
   - `npm run owned:gateway`
2. Start local stack:
   - `supabase start`
3. Apply migration:
   - `supabase db reset`
4. Serve edge functions:
   - `supabase functions serve getDashboardData --no-verify-jwt`
5. Start frontend in owned mode:
   - `VITE_BACKEND_PROVIDER=owned npm run dev`

## Next steps

- Add additional entity tables required by app pages (`tasks`, `financials`, `rfis`, `change_orders`, etc.).
- Tighten project RLS from broad authenticated access to role/project-based access.
- Expand `ENTITY_TABLE_MAP` and corresponding SQL migrations for every remaining entity used by the UI.
- Implement `/api/auth/me` and `/api/entities/*` gateway endpoints using Supabase service + session context.
