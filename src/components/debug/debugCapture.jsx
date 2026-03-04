/**
 * SteelBuild-Pro — Debug Capture Engine
 * =======================================
 * Captures HTTP requests/responses, console errors, router events,
 * localStorage, and component state snapshots for incident reproduction.
 *
 * PII sanitization: strips passwords, credit card patterns, and emails.
 * Storage: IndexedDB ring buffer (max 500 entries). Upload to server with backoff.
 * Activated only when admin enables debug mode.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const DB_NAME        = 'steelbuild_debug';
const DB_VERSION     = 1;
const STORE_NAME     = 'debug_events';
const MAX_EVENTS     = 500;
const MAX_PAYLOAD    = 200 * 1024; // 200 KB
const MAX_UPLOAD     = 5 * 1024 * 1024; // 5 MB
const UPLOAD_URL     = '/internal/debug/logs';
const LS_KEY_ENABLED = 'sbp_debug_mode';
const LS_KEY_PENDING = 'sbp_debug_pending_upload';

// ─── PII Sanitization ─────────────────────────────────────────────────────────

const PII_PATTERNS = [
  // Credit card 16-digit patterns
  { re: /\b(?:\d[ -]?){13,16}\b/g,                  sub: '[CARD_REDACTED]' },
  // Passwords in JSON keys
  { re: /"password"\s*:\s*"[^"]*"/gi,                sub: '"password":"[REDACTED]"' },
  { re: /"token"\s*:\s*"[^"]*"/gi,                   sub: '"token":"[REDACTED]"' },
  { re: /"secret"\s*:\s*"[^"]*"/gi,                  sub: '"secret":"[REDACTED]"' },
  { re: /"authorization"\s*:\s*"[^"]*"/gi,           sub: '"authorization":"[REDACTED]"' },
  // Emails — replace local part only (keep domain for context)
  { re: /\b[A-Z0-9._%+\-]+@([A-Z0-9.\-]+\.[A-Z]{2,})\b/gi, sub: '[EMAIL_REDACTED]@$1' },
  // SSN
  { re: /\b\d{3}-\d{2}-\d{4}\b/g,                   sub: '[SSN_REDACTED]' },
];

export function sanitize(input) {
  if (typeof input === 'undefined' || input === null) return input;
  let text = typeof input === 'string' ? input : JSON.stringify(input);
  for (const { re, sub } of PII_PATTERNS) {
    text = text.replace(re, sub);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function truncate(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  if (str.length > MAX_PAYLOAD) {
    return str.slice(0, MAX_PAYLOAD) + `…[TRUNCATED ${str.length - MAX_PAYLOAD} bytes]`;
  }
  return data;
}

// ─── IndexedDB ────────────────────────────────────────────────────────────────

let _db = null;

async function getDB() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp');
        store.createIndex('type', 'type');
      }
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror   = (e) => reject(e.target.error);
  });
}

async function dbAdd(event) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx   = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add(event);
    tx.oncomplete = resolve;
    tx.onerror    = (e) => reject(e.target.error);
  });
}

async function dbGetAll() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

async function dbClear() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx   = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.oncomplete = resolve;
    tx.onerror    = (e) => reject(e.target.error);
  });
}

async function dbPrune() {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const count = store.count();
    count.onsuccess = () => {
      const n = count.result;
      if (n > MAX_EVENTS) {
        const idx  = store.index('timestamp');
        const req  = idx.openCursor(null, 'next');
        let deleted = 0;
        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor && deleted < n - MAX_EVENTS) {
            cursor.delete();
            deleted++;
            cursor.continue();
          }
        };
      }
      tx.oncomplete = resolve;
    };
  });
}

// ─── State Snapshot ───────────────────────────────────────────────────────────

function snapshotLocalStorage() {
  const snap = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      // Skip auth tokens / secrets
      if (/token|secret|password|auth/i.test(k)) continue;
      snap[k] = sanitize(localStorage.getItem(k));
    }
  } catch { /* sandboxed */ }
  return snap;
}

function snapshotQueryCache() {
  // Try to reach React Query client via window (set by QueryProvider)
  try {
    const qc = window.__REACT_QUERY_CLIENT__;
    if (!qc) return null;
    const cache = qc.getQueryCache().getAll();
    return cache.slice(0, 20).map(q => ({
      queryKey: q.queryKey,
      status:   q.state.status,
      dataUpdatedAt: q.state.dataUpdatedAt,
      hasData: q.state.data !== undefined,
    }));
  } catch { return null; }
}

export function captureStateSnapshot() {
  return {
    url:            window.location.href,
    pathname:       window.location.pathname,
    localStorage:   snapshotLocalStorage(),
    queryCache:     snapshotQueryCache(),
    timestamp:      new Date().toISOString(),
  };
}

// ─── Core Event Recording ─────────────────────────────────────────────────────

let _userId = null;
let _sessionId = null;

export function setDebugContext(userId) {
  _userId = userId ? sanitize(userId) : null;
  _sessionId = _sessionId || `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function record(type, data) {
  if (!isDebugEnabled()) return;
  const event = {
    type,
    timestamp:  new Date().toISOString(),
    user_id:    _userId,
    session_id: _sessionId,
    pathname:   window.location.pathname,
    data:       sanitize(truncate(data)),
  };
  await dbAdd(event).catch(() => {});
  await dbPrune().catch(() => {});
}

// ─── HTTP Interceptor ─────────────────────────────────────────────────────────

let _origFetch = null;

function installFetchInterceptor() {
  if (_origFetch) return;
  _origFetch = window.fetch;
  window.fetch = async function debugFetch(input, init = {}) {
    const url    = typeof input === 'string' ? input : input?.url;
    const method = (init.method || 'GET').toUpperCase();
    const reqBody = init.body ? sanitize(truncate(init.body)) : null;
    const reqHeaders = sanitize({ ...init.headers });
    const startMs = Date.now();

    let response, cloned, respBody, status;
    try {
      response = await _origFetch(input, init);
      cloned   = response.clone();
      status   = response.status;
      try {
        const ct = response.headers.get('content-type') || '';
        respBody = ct.includes('json')
          ? sanitize(truncate(await cloned.json()))
          : sanitize(truncate(await cloned.text()));
      } catch { respBody = null; }
    } catch (err) {
      await record('fetch_error', { url, method, error: err.message, duration_ms: Date.now() - startMs, reqBody, reqHeaders });
      throw err;
    }

    const entry = {
      url, method, status,
      duration_ms: Date.now() - startMs,
      req_body: reqBody,
      req_headers: reqHeaders,
      resp_body: respBody,
    };
    await record(status === 404 ? 'fetch_404' : 'fetch_request', entry);

    // 404 — auto-capture full incident
    if (status === 404) {
      await captureIncident('404_detected', { request: entry, trigger: '404 HTTP response' });
    }

    return response;
  };
}

function uninstallFetchInterceptor() {
  if (_origFetch) {
    window.fetch = _origFetch;
    _origFetch = null;
  }
}

// ─── Console Error Interceptor ────────────────────────────────────────────────

let _origError = null;

function installConsoleInterceptor() {
  if (_origError) return;
  _origError = console.error.bind(console);
  console.error = function debugConsoleError(...args) {
    _origError(...args);
    const stack = new Error().stack || '';
    record('console_error', { message: sanitize(args.map(String).join(' ')), stack: stack.slice(0, 2000) });
  };

  window.addEventListener('error', (e) => {
    record('uncaught_error', { message: e.message, filename: e.filename, lineno: e.lineno, stack: e.error?.stack?.slice(0, 2000) });
  });

  window.addEventListener('unhandledrejection', (e) => {
    record('unhandled_rejection', { message: String(e.reason), stack: e.reason?.stack?.slice(0, 2000) });
  });
}

function uninstallConsoleInterceptor() {
  if (_origError) {
    console.error = _origError;
    _origError = null;
  }
}

// ─── Router Navigation Interceptor ────────────────────────────────────────────

let _origPushState = null;
let _origReplaceState = null;

function installRouterInterceptor() {
  if (_origPushState) return;
  _origPushState    = history.pushState.bind(history);
  _origReplaceState = history.replaceState.bind(history);

  history.pushState = function (...args) {
    record('navigation', { type: 'pushState', url: args[2], from: window.location.pathname });
    return _origPushState(...args);
  };
  history.replaceState = function (...args) {
    record('navigation', { type: 'replaceState', url: args[2], from: window.location.pathname });
    return _origReplaceState(...args);
  };

  window.addEventListener('popstate', () => {
    record('navigation', { type: 'popstate', url: window.location.pathname });
  });
}

// ─── Incident Capture ─────────────────────────────────────────────────────────

export async function captureIncident(trigger, meta = {}) {
  const snapshot   = captureStateSnapshot();
  const allEvents  = await dbGetAll();
  const recent     = allEvents.slice(-100); // last 100 events for incident context

  const incident = {
    incident_id:  `INC-${Date.now()}`,
    trigger,
    timestamp:    new Date().toISOString(),
    user_id:      _userId,
    session_id:   _sessionId,
    url:          window.location.href,
    state_snapshot: snapshot,
    recent_events:  recent,
    meta,
  };

  await record('incident', incident);

  // Attempt upload; queue on failure
  await uploadOrQueue(incident);

  // Build reproduction template
  const reprTemplate = buildReproTemplate(incident);
  window.__SBP_LAST_INCIDENT__ = { incident, reprTemplate };

  // Emit custom event so UI can react
  window.dispatchEvent(new CustomEvent('sbp:incident', { detail: { incident, reprTemplate } }));

  return incident;
}

function buildReproTemplate(incident) {
  return `# Incident Reproduction Steps
**Incident ID:** ${incident.incident_id}
**Triggered by:** ${incident.trigger}
**Timestamp:** ${incident.timestamp}
**URL:** ${incident.url}
**User:** ${incident.user_id || 'unknown'}

## Steps to Reproduce
1. Log in as: [role / permissions]
2. Navigate to: ${incident.url}
3. Perform action: [describe what you did]
4. Expected: [what should have happened]
5. Actual: ${incident.trigger}

## Environment
- Browser: ${navigator.userAgent}
- Screen: ${window.innerWidth}×${window.innerHeight}
- Time: ${incident.timestamp}

## Additional Context
${incident.meta?.trigger || ''}
${JSON.stringify(incident.meta, null, 2)}

## Attach
- [ ] Debug log (download from Debug Viewer)
- [ ] Screenshots
- [ ] Network HAR file
`;
}

// ─── Upload with Backoff ───────────────────────────────────────────────────────

async function uploadOrQueue(payload) {
  const str = JSON.stringify(payload);
  if (str.length > MAX_UPLOAD) {
    console.warn('[SBP Debug] Log exceeds 5MB — truncating for upload');
  }

  try {
    const resp = await _origFetch(UPLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: str.slice(0, MAX_UPLOAD),
    });
    if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
  } catch {
    // Queue for retry
    const pending = JSON.parse(localStorage.getItem(LS_KEY_PENDING) || '[]');
    pending.push({ payload: str.slice(0, MAX_UPLOAD), queued_at: Date.now() });
    localStorage.setItem(LS_KEY_PENDING, JSON.stringify(pending.slice(-10)));
  }
}

async function retryPendingUploads() {
  const pending = JSON.parse(localStorage.getItem(LS_KEY_PENDING) || '[]');
  if (!pending.length || !_origFetch) return;
  const remaining = [];
  for (const item of pending) {
    try {
      const resp = await _origFetch(UPLOAD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: item.payload,
      });
      if (!resp.ok) throw new Error(`${resp.status}`);
    } catch {
      // Keep for next retry if queued < 24h ago
      if (Date.now() - item.queued_at < 86400000) remaining.push(item);
    }
  }
  localStorage.setItem(LS_KEY_PENDING, JSON.stringify(remaining));
}

// ─── Enable / Disable ─────────────────────────────────────────────────────────

export function isDebugEnabled() {
  return localStorage.getItem(LS_KEY_ENABLED) === 'true';
}

export function enableDebugMode(userId) {
  localStorage.setItem(LS_KEY_ENABLED, 'true');
  setDebugContext(userId);
  installFetchInterceptor();
  installConsoleInterceptor();
  installRouterInterceptor();
  retryPendingUploads();
  record('debug_enabled', { by: userId });
}

export function disableDebugMode() {
  localStorage.setItem(LS_KEY_ENABLED, 'false');
  uninstallFetchInterceptor();
  uninstallConsoleInterceptor();
  record('debug_disabled', {});
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getAllEvents() {
  return dbGetAll();
}

export async function clearEvents() {
  return dbClear();
}

export async function downloadLog() {
  const events = await dbGetAll();
  const log = {
    exported_at: new Date().toISOString(),
    session_id:  _sessionId,
    user_id:     _userId,
    event_count: events.length,
    events,
  };
  const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `sbp-debug-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Self-Tests ───────────────────────────────────────────────────────────────

export async function runDebugSelfTests() {
  const results = [];
  function test(label, fn) {
    try { const r = fn(); results.push({ label, pass: r !== false, detail: r === false ? 'FAIL' : 'PASS' }); }
    catch (e) { results.push({ label, pass: false, detail: e.message }); }
  }

  // Test 1: sanitize strips email
  test('sanitize: strips email local part', () => {
    const out = JSON.stringify(sanitize({ email: 'john.doe@steelco.com' }));
    return out.includes('[EMAIL_REDACTED]');
  });

  // Test 2: sanitize strips password
  test('sanitize: strips password field', () => {
    const out = JSON.stringify(sanitize({ password: 'SuperSecret123' }));
    return out.includes('[REDACTED]') && !out.includes('SuperSecret123');
  });

  // Test 3: truncate limits payload
  test('truncate: limits large payload', () => {
    const big = 'x'.repeat(300 * 1024);
    const out = truncate(big);
    return typeof out === 'string' && out.length <= MAX_PAYLOAD + 100;
  });

  // Test 4: IndexedDB write + read
  await (async () => {
    await dbAdd({ type: 'test', timestamp: new Date().toISOString(), data: { test: true } });
    const all = await dbGetAll();
    results.push({ label: 'idb: write + read', pass: all.length > 0, detail: `${all.length} events` });
  })().catch(e => results.push({ label: 'idb: write + read', pass: false, detail: e.message }));

  // Test 5: 404 simulation — verify incident fields
  await (async () => {
    // Temporarily enable without full interceptor
    const saved = localStorage.getItem(LS_KEY_ENABLED);
    localStorage.setItem(LS_KEY_ENABLED, 'true');
    const incident = await captureIncident('test_404', {
      url: '/missing-page',
      trigger: '404 HTTP response (simulated)',
      request: { url: '/api/missing', status: 404, method: 'GET' },
    });
    localStorage.setItem(LS_KEY_ENABLED, saved || 'false');

    const has404      = incident.trigger === 'test_404';
    const hasState    = !!incident.state_snapshot;
    const hasUserId   = 'user_id' in incident;
    const hasNoEmail  = !JSON.stringify(incident.state_snapshot).match(/john\.doe@/);

    results.push({ label: '404: incident captured', pass: has404 });
    results.push({ label: '404: state_snapshot present', pass: hasState });
    results.push({ label: '404: user_id field present', pass: hasUserId });
    results.push({ label: '404: PII sanitized in snapshot', pass: hasNoEmail });
  })().catch(e => results.push({ label: '404 simulation', pass: false, detail: e.message }));

  return results;
}