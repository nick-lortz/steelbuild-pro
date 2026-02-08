import process from 'node:process';

const BASE_URL = process.env.OWNED_SMOKE_BASE_URL || 'http://localhost:8787/api';
const TIMEOUT_MS = Number(process.env.OWNED_SMOKE_TIMEOUT_MS || 15000);
const TEST_EMAIL = String(process.env.OWNED_AUTH_TEST_EMAIL || '').trim();
const TEST_PASSWORD = String(process.env.OWNED_AUTH_TEST_PASSWORD || '');

function withTimeout(promise, ms, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await withTimeout(fetch(url, options), TIMEOUT_MS, `${options.method || 'GET'} ${path}`);
  const contentType = response.headers.get('content-type') || '';
  let body = null;
  if (contentType.includes('application/json')) {
    body = await response.json();
  } else {
    body = await response.text();
  }
  return { response, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.log('SKIP owned-auth-smoke: set OWNED_AUTH_TEST_EMAIL and OWNED_AUTH_TEST_PASSWORD to run auth flow checks');
    return;
  }

  const noTokenSession = await request('/auth/session');
  assert(noTokenSession.response.ok, `auth/session (no token) failed with status ${noTokenSession.response.status}`);
  assert(
    noTokenSession.body?.data?.authenticated === false,
    'auth/session without token should return authenticated=false'
  );
  console.log('PASS session_no_token');

  const login = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
  });

  if (login.response.status === 501) {
    console.log('SKIP owned-auth-smoke: gateway auth login not configured (missing Supabase auth env)');
    return;
  }

  assert(login.response.ok, `auth/login failed with status ${login.response.status}`);
  const token = login.body?.data?.access_token;
  assert(token, 'auth/login missing access_token');
  console.log('PASS login_password');

  const tokenSession = await request('/auth/session', {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(tokenSession.response.ok, `auth/session (with token) failed with status ${tokenSession.response.status}`);
  assert(
    tokenSession.body?.data?.authenticated === true,
    'auth/session with token should return authenticated=true'
  );
  assert(tokenSession.body?.data?.user?.email, 'auth/session with token missing user email');
  console.log('PASS session_with_token');

  const logout = await request('/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(logout.response.status === 204, `auth/logout expected 204, got ${logout.response.status}`);
  console.log('PASS logout');

  const postLogoutNoToken = await request('/auth/session');
  assert(postLogoutNoToken.response.ok, `auth/session post-logout failed with status ${postLogoutNoToken.response.status}`);
  assert(
    postLogoutNoToken.body?.data?.authenticated === false,
    'auth/session without token should remain authenticated=false after logout'
  );
  console.log('PASS post_logout_no_token');

  console.log('Owned auth smoke checks passed');
}

run().catch((error) => {
  console.error(`FAIL owned-auth-smoke: ${error.message}`);
  process.exitCode = 1;
});
