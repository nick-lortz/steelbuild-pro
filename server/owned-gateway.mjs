import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.OWNED_GATEWAY_PORT || 8787);
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DEV_USER_EMAIL = process.env.OWNED_DEV_USER_EMAIL || 'owner@steelbuilder.local';
const DEV_USER_ROLE = process.env.OWNED_DEV_USER_ROLE || 'admin';
const STORAGE_BUCKET = process.env.OWNED_STORAGE_BUCKET || 'uploads';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const ENTITY_TABLE_MAP = {
  Project: 'projects',
  User: 'profiles',
  Task: 'tasks',
  WorkPackage: 'work_packages',
  Financial: 'financials',
  Expense: 'expenses',
  RFI: 'rfis',
  ChangeOrder: 'change_orders',
  Document: 'documents',
  DrawingSet: 'drawing_sets',
  DrawingSheet: 'drawing_sheets',
  DrawingRevision: 'drawing_revisions',
  DrawingAnnotation: 'drawing_annotations',
  Notification: 'notifications',
  NotificationPreference: 'notification_preferences',
  Message: 'messages',
  Meeting: 'meetings',
  Delivery: 'deliveries',
  Resource: 'resources',
  ResourceAllocation: 'resource_allocations',
  CostCode: 'cost_codes',
  SOVItem: 'sov_items',
  SOVCostCodeMap: 'sov_cost_code_maps',
  Invoice: 'invoices',
  InvoiceLine: 'invoice_lines',
  LaborHours: 'labor_hours',
  LaborCategory: 'labor_categories',
  LaborEntry: 'labor_entries',
  Crew: 'crews',
  EquipmentLog: 'equipment_logs',
  DailyLog: 'daily_logs',
  Submittal: 'submittals',
  Feedback: 'feedback',
  UserPermissionOverride: 'user_permission_overrides',
  ProjectRisk: 'project_risks',
  Fabrication: 'fabrications',
  FabricationPackage: 'fabrication_packages'
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
  const table = ENTITY_TABLE_MAP[String(entityName)];
  if (!table) return null;
  return table;
}

function createDevLlmResponse(payload) {
  const schema = payload?.response_json_schema;
  if (!schema) {
    return `Owned AI stub: received prompt (${String(payload?.prompt || '').slice(0, 180)}...)`;
  }

  const fromSchema = (node) => {
    if (!node || typeof node !== 'object') return null;
    if (node.type === 'string') return '';
    if (node.type === 'number' || node.type === 'integer') return 0;
    if (node.type === 'boolean') return false;
    if (node.type === 'array') return [];
    if (node.type === 'object') {
      const result = {};
      const props = node.properties || {};
      Object.entries(props).forEach(([key, value]) => {
        result[key] = fromSchema(value);
      });
      return result;
    }
    return null;
  };

  return fromSchema(schema);
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

let uploadsBucketEnsured = false;
async function ensureUploadsBucket() {
  if (!hasSupabase() || uploadsBucketEnsured) return;

  const listResponse = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: supabaseHeaders()
  });
  if (listResponse.ok) {
    const buckets = await listResponse.json();
    const hasBucket = Array.isArray(buckets) && buckets.some((b) => b.id === STORAGE_BUCKET);
    if (hasBucket) {
      uploadsBucketEnsured = true;
      return;
    }
  }

  const createResponse = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: supabaseHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id: STORAGE_BUCKET, name: STORAGE_BUCKET, public: true })
  });
  if (!createResponse.ok) {
    const text = await createResponse.text();
    throw new Error(text || 'Failed to ensure uploads bucket');
  }
  uploadsBucketEnsured = true;
}

async function handleFileUpload(req, res) {
  try {
    const request = new Request(`http://localhost${req.url || '/'}`, {
      method: req.method,
      headers: req.headers,
      body: req,
      duplex: 'half'
    });
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      json(res, 400, { message: 'Missing file in form-data payload' });
      return;
    }

    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;

    if (!hasSupabase()) {
      const fileUrl = `https://owned.local/${STORAGE_BUCKET}/${path}`;
      json(res, 200, { file_url: fileUrl, data: { file_url: fileUrl } });
      return;
    }

    await ensureUploadsBucket();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const uploadResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`,
      {
        method: 'POST',
        headers: supabaseHeaders({
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'true'
        }),
        body: bytes
      }
    );
    if (!uploadResponse.ok) {
      const text = await uploadResponse.text();
      json(res, 500, { message: text || 'Failed to upload file' });
      return;
    }

    const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
    json(res, 200, { file_url: fileUrl, data: { file_url: fileUrl } });
  } catch (error) {
    json(res, 500, { message: error.message || 'File upload failed' });
  }
}

async function handleAiInvoke(req, res) {
  try {
    const payload = await readBody(req);

    if (!OPENAI_API_KEY) {
      json(res, 200, createDevLlmResponse(payload));
      return;
    }

    const prompt = String(payload?.prompt || '');
    if (!prompt) {
      json(res, 400, { message: 'Missing prompt' });
      return;
    }

    const responseFormat = payload?.response_json_schema
      ? {
          type: 'json_schema',
          json_schema: {
            name: 'owned_response',
            schema: payload.response_json_schema
          }
        }
      : { type: 'text' };

    const completion = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: prompt,
        response_format: responseFormat
      })
    });

    if (!completion.ok) {
      const text = await completion.text();
      json(res, 500, { message: text || 'AI invoke failed' });
      return;
    }

    const data = await completion.json();
    const text = data?.output_text || '';
    if (payload?.response_json_schema) {
      try {
        json(res, 200, JSON.parse(text));
      } catch (_err) {
        json(res, 200, createDevLlmResponse(payload));
      }
      return;
    }
    json(res, 200, text || createDevLlmResponse(payload));
  } catch (error) {
    json(res, 500, { message: error.message || 'AI invoke failed' });
  }
}

async function handleUsersInvite(req, res) {
  try {
    const body = await readBody(req);
    const email = String(body?.email || '').trim().toLowerCase();
    const role = String(body?.role || 'user');

    if (!email) {
      json(res, 400, { message: 'Email is required' });
      return;
    }

    if (!hasSupabase()) {
      json(res, 200, { success: true, invited: { email, role, source: 'dev-stub' } });
      return;
    }

    const inviteResponse = await fetch(`${SUPABASE_URL}/auth/v1/invite`, {
      method: 'POST',
      headers: supabaseHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        email,
        data: { role },
        redirect_to: process.env.OWNED_INVITE_REDIRECT_TO || 'http://localhost:5173'
      })
    });
    if (!inviteResponse.ok) {
      const text = await inviteResponse.text();
      json(res, 500, { message: text || 'Invite failed' });
      return;
    }

    // Upsert profile role for visibility in admin pages.
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: supabaseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation'
      }),
      body: JSON.stringify([{ email, role }])
    });

    json(res, 200, { success: true, invited: { email, role } });
  } catch (error) {
    json(res, 500, { message: error.message || 'Invite failed' });
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
      await handleFileUpload(req, res);
      return;
    }
    if (url.pathname === '/api/ai/invoke' && method === 'POST') {
      await handleAiInvoke(req, res);
      return;
    }
    if (url.pathname === '/api/users/invite' && method === 'POST') {
      await handleUsersInvite(req, res);
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
