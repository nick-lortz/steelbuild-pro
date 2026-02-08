const OWNED_ACCESS_TOKEN_KEY = 'owned_access_token';
const OWNED_REFRESH_TOKEN_KEY = 'owned_refresh_token';

function isBrowser() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function getOwnedAccessToken() {
  if (!isBrowser()) return '';
  return window.localStorage.getItem(OWNED_ACCESS_TOKEN_KEY) || '';
}

export function getOwnedRefreshToken() {
  if (!isBrowser()) return '';
  return window.localStorage.getItem(OWNED_REFRESH_TOKEN_KEY) || '';
}

export function setOwnedSession(session = {}) {
  if (!isBrowser()) return;
  const accessToken = session.access_token || '';
  const refreshToken = session.refresh_token || '';
  if (accessToken) {
    window.localStorage.setItem(OWNED_ACCESS_TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    window.localStorage.setItem(OWNED_REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearOwnedSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(OWNED_ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(OWNED_REFRESH_TOKEN_KEY);
}

export function parseSupabaseHashTokens(hash = '') {
  const trimmed = String(hash || '').replace(/^#/, '');
  const params = new URLSearchParams(trimmed);
  const accessToken = params.get('access_token') || '';
  const refreshToken = params.get('refresh_token') || '';
  return {
    access_token: accessToken,
    refresh_token: refreshToken
  };
}
