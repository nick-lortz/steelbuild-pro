import process from 'node:process';

const BASE_URL = process.env.OWNED_SMOKE_BASE_URL || 'http://localhost:8787/api';
const TIMEOUT_MS = Number(process.env.OWNED_SMOKE_TIMEOUT_MS || 15000);

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
  const checks = [
    {
      name: 'health',
      run: async () => {
        const { response, body } = await request('/health');
        assert(response.ok, `health failed with status ${response.status}`);
        assert(body?.ok === true, 'health response missing ok=true');
      }
    },
    {
      name: 'auth_me',
      run: async () => {
        const { response, body } = await request('/auth/me');
        assert(response.ok, `auth/me failed with status ${response.status}`);
        assert(body?.email, 'auth/me response missing email');
      }
    },
    {
      name: 'projects_list',
      run: async () => {
        const { response, body } = await request('/entities/Project?limit=5&sortBy=-updated_date');
        assert(response.ok, `entities/Project failed with status ${response.status}`);
        assert(Array.isArray(body), 'entities/Project should return an array');
      }
    },
    {
      name: 'dashboard_function',
      run: async () => {
        const { response, body } = await request('/functions/getDashboardData', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page: 1, pageSize: 10 })
        });
        assert(response.ok, `functions/getDashboardData failed with status ${response.status}`);
        const payload = body?.data || body;
        assert(payload?.metrics, 'dashboard payload missing metrics');
        assert(Array.isArray(payload?.projects), 'dashboard payload missing projects array');
      }
    },
    {
      name: 'entity_create_delete',
      run: async () => {
        const createPayload = {
          data: {
            name: `smoke-task-${Date.now()}`,
            status: 'open'
          }
        };
        const { response: createResponse, body: created } = await request('/entities/Task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createPayload)
        });
        assert(createResponse.ok, `entities/Task create failed with status ${createResponse.status}`);
        const id = created?.id;
        assert(id, 'entities/Task create missing id');

        const { response: deleteResponse } = await request(`/entities/Task/${id}`, { method: 'DELETE' });
        assert(
          deleteResponse.status === 204,
          `entities/Task delete expected 204, got ${deleteResponse.status}`
        );
      }
    }
  ];

  let passed = 0;
  for (const check of checks) {
    try {
      await check.run();
      passed += 1;
      console.log(`PASS ${check.name}`);
    } catch (error) {
      console.error(`FAIL ${check.name}: ${error.message}`);
      process.exitCode = 1;
      break;
    }
  }

  if (process.exitCode !== 1) {
    console.log(`Owned smoke checks passed (${passed}/${checks.length})`);
  }
}

run().catch((error) => {
  console.error(`FAIL smoke_runner: ${error.message}`);
  process.exitCode = 1;
});
