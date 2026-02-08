import http from 'node:http';

const PORT = Number(process.env.OWNED_GATEWAY_PORT || 8787);
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DEV_USER_EMAIL = process.env.OWNED_DEV_USER_EMAIL || 'owner@steelbuilder.local';
const DEV_USER_ROLE = process.env.OWNED_DEV_USER_ROLE || 'admin';

const ENTITY_TABLE_MAP = {
  Project: 'projects',
  User: 'profiles'
};

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function noContent(res) {
  res.writeHead(204);
  res.end();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function hasSupabase() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra
  };
}

function mapSortField(field) {
  return String(field).replace('updated_date', 'updated_at').replace('created_date', 'created_at');
}

function parseSort(sortBy) {
  const raw = String(sortBy || '-updated_at');
  if (raw.startsWith('-')) {
    return { field: mapSortField(raw.slice(1)), ascending: false };
  }
  return { field: mapSortField(raw), ascending: true };
}

function resolveEntityTable(entityName) {
  const table = ENTITY_TABLE_MAP[entityName];
  if (!table) return null;
  return table;
}

function buildSelectUrl(path) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  url.searchParams.set('select', '*');
  return url;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function getOrCreateDevProfile() {
  if (!hasSupabase()) {
    return {
      id: 'dev-user',
      email: DEV_USER_EMAIL,
      full_name: 'Owned Dev User',
      role: DEV_USER_ROLE
    };
  }

  const findUrl = buildSelectUrl('profiles');
  findUrl.searchParams.set('email', `eq.${DEV_USER_EMAIL}`);
  findUrl.searchParams.set('limit', '1');
  const rows = await fetchJson(findUrl, { headers: supabaseHeaders() });
  if (rows?.[0]) return rows[0];

  const insertUrl = `${SUPABASE_URL}/rest/v1/profiles`;
  const inserted = await fetchJson(insertUrl, {
    method: 'POST',
    headers: supabaseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }),
    body: JSON.stringify([
      {
        id: crypto.randomUUID(),
        email: DEV_USER_EMAIL,
        full_name: 'Owned Dev User',
        role: DEV_USER_ROLE
      }
    ])
  });
  return inserted?.[0];
}

async function handleAuthMe(req, res) {
  try {
    const profile = await getOrCreateDevProfile();
    json(res, 200, profile);
  } catch (error) {
    json(res, 500, { message: error.message || 'Failed to load user' });
  }
}

async function handleAuthUpdateMe(req, res) {
  try {
    const payload = await readBody(req);
    const profile = await getOrCreateDevProfile();

    if (!hasSupabase()) {
      json(res, 200, { ...profile, ...payload });
      return;
    }

    const url = buildSelectUrl('profiles');
    url.searchParams.set('email', `eq.${DEV_USER_EMAIL}`);
    const rows = await fetchJson(url, {
      method: 'PATCH',
      headers: supabaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      }),
      body: JSON.stringify(payload)
    });
    json(res, 200, rows?.[0] || { ...profile, ...payload });
  } catch (error) {
    json(res, 500, { message: error.message || 'Failed to update user' });
  }
}

async function handleEntitiesList(req, res, table, url) {
  try {
    if (!hasSupabase()) {
      json(res, 200, []);
      return;
    }
    const sortBy = url.searchParams.get('sortBy');
    const limit = url.searchParams.get('limit');
    const parsed = parseSort(sortBy);

    const queryUrl = buildSelectUrl(table);
    queryUrl.searchParams.set('order', `${parsed.field}.${parsed.ascending ? 'asc' : 'desc'}`);
    if (limit) queryUrl.searchParams.set('limit', String(limit));

    const rows = await fetchJson(queryUrl, { headers: supabaseHeaders() });
    json(res, 200, rows || []);
  } catch (error) {
    json(res, 500, { message: error.message || 'Entity list failed' });
  }
}

async function handleEntitiesFilterOrCreate(req, res, table) {
  try {
    const body = await readBody(req);
    if (!hasSupabase()) {
      if (body?.data) {
        json(res, 200, { id: crypto.randomUUID(), ...body.data });
      } else {
        json(res, 200, []);
      }
      return;
    }

    if (body && Object.prototype.hasOwnProperty.call(body, 'data')) {
      const insertUrl = `${SUPABASE_URL}/rest/v1/${table}`;
      const rows = await fetchJson(insertUrl, {
        method: 'POST',
        headers: supabaseHeaders({
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        }),
        body: JSON.stringify([body.data || {}])
      });
      json(res, 200, rows?.[0] || null);
      return;
    }

    const filters = body?.filters || {};
    const sortBy = body?.sortBy;
    const limit = body?.limit;
    const parsed = parseSort(sortBy);

    const queryUrl = buildSelectUrl(table);
    queryUrl.searchParams.set('order', `${parsed.field}.${parsed.ascending ? 'asc' : 'desc'}`);
    if (limit) queryUrl.searchParams.set('limit', String(limit));

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (typeof value === 'object' && value && Array.isArray(value.$in)) {
        queryUrl.searchParams.set(key, `in.(${value.$in.join(',')})`);
      } else {
        queryUrl.searchParams.set(key, `eq.${value}`);
      }
    });

    const rows = await fetchJson(queryUrl, { headers: supabaseHeaders() });
    json(res, 200, rows || []);
  } catch (error) {
    json(res, 500, { message: error.message || 'Entity filter/create failed' });
  }
}

async function handleEntitiesBulkCreate(req, res, table) {
  try {
    const body = await readBody(req);
    const records = Array.isArray(body?.records) ? body.records : [];
    if (!hasSupabase()) {
      json(res, 200, records.map((r) => ({ id: crypto.randomUUID(), ...r })));
      return;
    }
    const insertUrl = `${SUPABASE_URL}/rest/v1/${table}`;
    const rows = await fetchJson(insertUrl, {
      method: 'POST',
      headers: supabaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      }),
      body: JSON.stringify(records)
    });
    json(res, 200, rows || []);
  } catch (error) {
    json(res, 500, { message: error.message || 'Bulk create failed' });
  }
}

async function handleEntityUpdate(req, res, table, id) {
  try {
    const body = await readBody(req);
    const data = body?.data || {};
    if (!hasSupabase()) {
      json(res, 200, { id, ...data });
      return;
    }
    const url = buildSelectUrl(table);
    url.searchParams.set('id', `eq.${id}`);
    const rows = await fetchJson(url, {
      method: 'PATCH',
      headers: supabaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      }),
      body: JSON.stringify(data)
    });
    json(res, 200, rows?.[0] || null);
  } catch (error) {
    json(res, 500, { message: error.message || 'Update failed' });
  }
}

async function handleEntityDelete(res) {
  noContent(res);
}

async function handleFunctionInvoke(req, res, name) {
  try {
    const payload = await readBody(req);
    if (!hasSupabase()) {
      if (name === 'getDashboardData') {
        json(res, 200, {
          data: {
            projects: [],
            pagination: { page: 1, pageSize: 20, totalFiltered: 0, totalProjects: 0 },
            metrics: {
              totalProjects: 0,
              activeProjects: 0,
              atRiskProjects: 0,
              overdueTasks: 0,
              upcomingMilestones: 0
            }
          }
        });
        return;
      }
      json(res, 200, { data: { success: true, name, message: 'Stubbed in owned gateway', payload } });
      return;
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: supabaseHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload || {})
    });
    const contentType = response.headers.get('content-type') || '';
    const result = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      json(res, response.status, { message: typeof result === 'string' ? result : result?.error || 'Function failed' });
      return;
    }
    json(res, 200, Object.prototype.hasOwnProperty.call(result || {}, 'data') ? result : { data: result });
  } catch (error) {
    json(res, 500, { message: error.message || 'Function invoke failed' });
  }
}

async function handleNotImplemented(res, route) {
  json(res, 501, { message: `${route} is not implemented yet in owned gateway` });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const method = req.method || 'GET';

    if (method === 'OPTIONS') {
      noContent(res);
      return;
    }

    if (url.pathname === '/api/auth/me' && method === 'GET') {
      await handleAuthMe(req, res);
      return;
    }
    if (url.pathname === '/api/auth/me' && method === 'PATCH') {
      await handleAuthUpdateMe(req, res);
      return;
    }
    if (url.pathname === '/api/auth/logout' && method === 'POST') {
      noContent(res);
      return;
    }

    const entitiesMatch = url.pathname.match(/^\/api\/entities\/([^/]+)$/);
    if (entitiesMatch) {
      const entity = entitiesMatch[1];
      const table = resolveEntityTable(entity);
      if (!table) {
        await handleNotImplemented(res, `entities/${entity}`);
        return;
      }
      if (method === 'GET') {
        await handleEntitiesList(req, res, table, url);
        return;
      }
      if (method === 'POST') {
        await handleEntitiesFilterOrCreate(req, res, table);
        return;
      }
    }

    const entitiesBulkMatch = url.pathname.match(/^\/api\/entities\/([^/]+)\/bulk$/);
    if (entitiesBulkMatch && method === 'POST') {
      const table = resolveEntityTable(entitiesBulkMatch[1]);
      if (!table) {
        await handleNotImplemented(res, `entities/${entitiesBulkMatch[1]}/bulk`);
        return;
      }
      await handleEntitiesBulkCreate(req, res, table);
      return;
    }

    const entitiesIdMatch = url.pathname.match(/^\/api\/entities\/([^/]+)\/([^/]+)$/);
    if (entitiesIdMatch) {
      const table = resolveEntityTable(entitiesIdMatch[1]);
      const id = entitiesIdMatch[2];
      if (!table) {
        await handleNotImplemented(res, `entities/${entitiesIdMatch[1]}/${id}`);
        return;
      }
      if (method === 'PATCH') {
        await handleEntityUpdate(req, res, table, id);
        return;
      }
      if (method === 'DELETE') {
        await handleEntityDelete(res);
        return;
      }
    }

    const functionMatch = url.pathname.match(/^\/api\/functions\/([^/]+)$/);
    if (functionMatch && method === 'POST') {
      await handleFunctionInvoke(req, res, functionMatch[1]);
      return;
    }

    if (url.pathname === '/api/files/upload' && method === 'POST') {
      await handleNotImplemented(res, 'files/upload');
      return;
    }
    if (url.pathname === '/api/ai/invoke' && method === 'POST') {
      await handleNotImplemented(res, 'ai/invoke');
      return;
    }
    if (url.pathname === '/api/users/invite' && method === 'POST') {
      await handleNotImplemented(res, 'users/invite');
      return;
    }
    if (url.pathname === '/api/app-logs/page-view' && method === 'POST') {
      noContent(res);
      return;
    }
    if (url.pathname === '/api/analytics/track' && method === 'POST') {
      noContent(res);
      return;
    }

    json(res, 404, { message: 'Not found' });
  } catch (error) {
    json(res, 500, { message: error.message || 'Unexpected gateway error' });
  }
});

server.listen(PORT, () => {
  console.log(`[owned-gateway] listening on http://localhost:${PORT}`);
});
