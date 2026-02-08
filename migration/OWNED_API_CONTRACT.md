# Owned API Contract (Adapter-Driven)

This contract is derived from `/src/api/client/ownedAdapter.js` and defines the HTTP interface your owned backend must implement.

## Environment

- `VITE_BACKEND_PROVIDER=owned` enables this contract at runtime.
- `VITE_OWNED_API_BASE_URL` sets the API base URL (default: `/api`).
- Requests are sent with `credentials: include` (cookie/session-based auth expected).

## Error contract

- Non-2xx responses should return JSON when possible:
  - `{ "message": "Human readable error" }`
- Frontend expects thrown errors with:
  - `error.status`
  - `error.response.status`
  - `error.response.data`

## Auth endpoints

### `GET /auth/me`
- Returns current user object.

### `PATCH /auth/me`
- Body: partial user updates (shape varies by page).
- Returns updated user object.

### `POST /auth/logout`
- Invalidates session.
- Returns 200/204.

### Login redirect
- Client redirects browser to: `/login?redirect=<encoded_path>`

## Entity endpoints (generic)

`<Entity>` corresponds to names used in app code (for example `Project`, `Task`, `RFI`, `DrawingSet`).

### `GET /entities/<Entity>?sortBy=<string>&limit=<number>`
- List query.

### `POST /entities/<Entity>`
Two call forms are currently used by adapter:
- Create form: `{ "data": { ...record } }`
- Filter form: `{ "filters": { ... }, "sortBy": "...", "limit": 50 }`

Recommended server behavior:
- If `filters` key is present: treat as filtered query and return array.
- Else if `data` key is present: create and return created record.

### `POST /entities/<Entity>/bulk`
- Body: `{ "records": [ ... ] }`
- Returns created records summary.

### `PATCH /entities/<Entity>/<id>`
- Body: `{ "data": { ...updates } }`
- Returns updated record.

### `DELETE /entities/<Entity>/<id>`
- Deletes by id.
- Returns 200/204.

### Subscriptions
- `subscribe()` is currently a no-op in adapter.
- Realtime transport can be added later without changing page/component APIs.

## Functions endpoints

### `POST /functions/<name>`
- Body: function payload object.
- Returns function result payload.

Compatibility note:
- Existing UI call sites often read either `response` directly or `response.data`.
- During migration, return `{ data: ... }` for compatibility, or normalize in adapter later.

## Integrations endpoints

### `POST /files/upload`
- Multipart form-data:
  - `file` (binary)
- Expected response shape for compatibility:
  - `{ "file_url": "https://..." }`

### `POST /ai/invoke`
- Body: LLM invocation payload.
- Returns LLM result payload.

## Users/Admin endpoint

### `POST /users/invite`
- Body: `{ "email": "user@example.com", "role": "user|admin|..." }`
- Sends invite and returns status.

## App analytics/logging endpoints

### `POST /app-logs/page-view`
- Body: `{ "page": "Dashboard" }`

### `POST /analytics/track`
- Body: analytics event payload.

## Implementation order (recommended)

1. Auth endpoints (`/auth/*`) and session cookie handling
2. Generic entities routes for top entities (`Project`, `Task`, `User`, `WorkPackage`)
3. `POST /functions/<name>` for critical functions
4. File upload and AI invoke routes
5. Users invite + analytics/logging routes
6. Realtime subscription transport

## Quick smoke checks

```bash
# provider should stay base44 unless explicitly testing owned
echo "$VITE_BACKEND_PROVIDER"

# count direct runtime base44 usage (should be 1 CSP domain string only)
grep -RIn "base44\\." src --include='*.js' --include='*.jsx' --include='*.ts' --include='*.tsx' \
  | grep -v "src/api/client/" | grep -v "\\.md\\.jsx"
```
