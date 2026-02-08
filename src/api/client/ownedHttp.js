function getBaseUrl() {
  const env = /** @type {any} */ (import.meta).env || {};
  return env.VITE_OWNED_API_BASE_URL || '/api';
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch (_err) {
    return null;
  }
}

function getSupabaseAccessToken() {
  if (typeof window === 'undefined' || !window.localStorage) return '';
  const storage = window.localStorage;
  const keys = Object.keys(storage);

  const candidates = keys.filter((key) =>
    (key.startsWith('sb-') && key.endsWith('-auth-token')) || key.includes('supabase.auth.token')
  );

  for (const key of candidates) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    const parsed = tryParseJson(raw);
    const token =
      parsed?.access_token ||
      parsed?.currentSession?.access_token ||
      parsed?.session?.access_token ||
      '';
    if (token) return token;
  }
  return '';
}

function buildUrl(path, query) {
  const baseUrl = getBaseUrl().replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${baseUrl}${cleanPath}`, window.location.origin);

  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

export async function ownedRequest(path, options = {}) {
  const { method = 'GET', query, body, headers = {}, raw = false } = options;
  const url = buildUrl(path, query);

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const token = getSupabaseAccessToken();
  const authHeader = headers.Authorization || headers.authorization;
  const response = await fetch(url, {
    method,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(authHeader || !token ? {} : { Authorization: `Bearer ${token}` }),
      ...headers
    },
    body: body == null ? undefined : isFormData ? body : JSON.stringify(body)
  });

  if (!response.ok) {
    let errorBody = null;
    try {
      errorBody = await response.json();
    } catch (_err) {
      // ignore parse failures and use status text fallback
    }
    const error = new Error(errorBody?.message || response.statusText || 'Request failed');
    /** @type {any} */ (error).status = response.status;
    /** @type {any} */ (error).response = { status: response.status, data: errorBody };
    throw error;
  }

  if (raw) {
    return response;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}
