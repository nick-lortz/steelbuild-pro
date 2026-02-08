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

const TABLE_FILTERABLE_COLUMNS = {
  profiles: new Set(['id', 'email', 'role', 'custom_role', 'full_name']),
  projects: new Set(['id', 'project_number', 'name', 'status', 'phase', 'project_manager', 'superintendent']),
  tasks: new Set(['id', 'project_id', 'name', 'status', 'phase', 'assignee', 'parent_task_id']),
  work_packages: new Set(['id', 'project_id', 'name', 'status', 'phase']),
  financials: new Set(['id', 'project_id', 'status', 'category']),
  expenses: new Set(['id', 'project_id', 'status', 'category', 'payment_status']),
  rfis: new Set(['id', 'project_id', 'status', 'priority', 'subject']),
  change_orders: new Set(['id', 'project_id', 'status', 'title']),
  documents: new Set(['id', 'project_id', 'status', 'title', 'category']),
  drawing_sets: new Set(['id', 'project_id', 'status', 'discipline', 'set_name', 'set_number']),
  drawing_sheets: new Set(['id', 'project_id', 'drawing_set_id', 'status', 'sheet_number', 'file_name']),
  drawing_revisions: new Set(['id', 'project_id', 'drawing_set_id', 'status', 'revision_number']),
  drawing_annotations: new Set(['id', 'project_id', 'drawing_set_id', 'status', 'type']),
  notifications: new Set(['id', 'project_id', 'user_email', 'read', 'type']),
  notification_preferences: new Set(['id', 'user_email']),
  messages: new Set(['id', 'project_id', 'sender_email']),
  meetings: new Set(['id', 'project_id', 'status', 'meeting_date']),
  deliveries: new Set(['id', 'project_id', 'status']),
  resources: new Set(['id', 'project_id', 'status', 'resource_type', 'name']),
  resource_allocations: new Set(['id', 'project_id', 'resource_id', 'task_id', 'status']),
  cost_codes: new Set(['id', 'project_id', 'code', 'status']),
  sov_items: new Set(['id', 'project_id', 'status', 'sov_code']),
  sov_cost_code_maps: new Set(['id', 'project_id', 'sov_item_id', 'cost_code_id']),
  invoices: new Set(['id', 'project_id', 'status']),
  invoice_lines: new Set(['id', 'project_id', 'invoice_id', 'status']),
  labor_hours: new Set(['id', 'project_id', 'task_id', 'user_email']),
  labor_categories: new Set(['id', 'name']),
  labor_entries: new Set(['id', 'project_id', 'task_id', 'user_email']),
  crews: new Set(['id', 'project_id', 'status', 'name']),
  equipment_logs: new Set(['id', 'project_id', 'status']),
  daily_logs: new Set(['id', 'project_id', 'status', 'log_date']),
  submittals: new Set(['id', 'project_id', 'status', 'title']),
  feedback: new Set(['id', 'project_id', 'user_email', 'type', 'status']),
  user_permission_overrides: new Set(['id', 'project_id', 'user_email', 'module', 'permission_type']),
  project_risks: new Set(['id', 'project_id', 'status', 'severity']),
  fabrications: new Set(['id', 'project_id', 'status']),
  fabrication_packages: new Set(['id', 'project_id', 'status', 'package_number'])
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

function getFilterableColumns(table) {
  return TABLE_FILTERABLE_COLUMNS[table] || new Set(['id', 'project_id', 'status', 'name']);
}

function getSortFieldForTable(table, requestedField) {
  const columns = getFilterableColumns(table);
  if (columns.has(requestedField)) return requestedField;
  if (columns.has('updated_at')) return 'updated_at';
  if (columns.has('created_at')) return 'created_at';
  if (columns.has('name')) return 'name';
  return 'id';
}

function normalizeEntityRow(row) {
  if (!row || typeof row !== 'object') return row;
  const normalized = { ...row };
  if (normalized.created_at && !normalized.created_date) {
    normalized.created_date = normalized.created_at;
  }
  if (normalized.updated_at && !normalized.updated_date) {
    normalized.updated_date = normalized.updated_at;
  }
  return normalized;
}

function normalizeEntityRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeEntityRow);
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

function getIdFromPayload(payload) {
  return (
    payload?.id ||
    payload?.invoice_id ||
    payload?.invoiceId ||
    payload?.change_order_id ||
    payload?.changeOrderId ||
    payload?.sovItemId ||
    payload?.mappingId ||
    payload?.data?.id ||
    payload?.data?.invoice_id ||
    payload?.data?.invoiceId ||
    null
  );
}

async function insertRow(table, row) {
  if (!hasSupabase()) {
    return normalizeEntityRow({ id: crypto.randomUUID(), ...row });
  }
  const insertUrl = `${SUPABASE_URL}/rest/v1/${table}`;
  const rows = await fetchJson(insertUrl, {
    method: 'POST',
    headers: supabaseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }),
    body: JSON.stringify([row || {}])
  });
  return normalizeEntityRow(rows?.[0] || null);
}

async function updateRowById(table, id, updates) {
  if (!id) throw new Error(`Missing id for ${table} update`);
  if (!hasSupabase()) {
    return normalizeEntityRow({ id, ...(updates || {}) });
  }
  const url = buildSelectUrl(table);
  url.searchParams.set('id', `eq.${id}`);
  const rows = await fetchJson(url, {
    method: 'PATCH',
    headers: supabaseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }),
    body: JSON.stringify(updates || {})
  });
  return normalizeEntityRow(rows?.[0] || null);
}

async function deleteRowById(table, id) {
  if (!id) throw new Error(`Missing id for ${table} delete`);
  if (!hasSupabase()) {
    return { success: true, id };
  }
  const url = buildSelectUrl(table);
  url.searchParams.set('id', `eq.${id}`);
  await fetchJson(url, {
    method: 'DELETE',
    headers: supabaseHeaders({
      Prefer: 'return=minimal'
    })
  });
  return { success: true, id };
}

async function queryRows(table, options = {}) {
  const { filters = {}, order = 'updated_at.desc', limit } = options;
  if (!hasSupabase()) return [];

  const queryUrl = buildSelectUrl(table);
  if (order) queryUrl.searchParams.set('order', order);
  if (limit) queryUrl.searchParams.set('limit', String(limit));

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      queryUrl.searchParams.set(key, `in.(${value.join(',')})`);
      return;
    }
    queryUrl.searchParams.set(key, `eq.${value}`);
  });

  const rows = await fetchJson(queryUrl, { headers: supabaseHeaders() });
  return normalizeEntityRows(rows || []);
}

async function queryCount(table, filters = {}) {
  if (!hasSupabase()) return 0;
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set('select', 'id');
  url.searchParams.set('limit', '1');
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, `eq.${value}`);
  });
  const response = await fetch(url, { headers: supabaseHeaders({ Prefer: 'count=exact' }) });
  if (!response.ok) return 0;
  const contentRange = response.headers.get('content-range') || '';
  const totalPart = contentRange.split('/')[1];
  return Number(totalPart || 0) || 0;
}

function buildStubDashboardData() {
  return {
    projects: [],
    pagination: { page: 1, pageSize: 20, totalFiltered: 0, totalProjects: 0 },
    metrics: {
      totalProjects: 0,
      activeProjects: 0,
      healthyProjects: 0,
      riskProjects: 0,
      avgHealth: 0,
      openRFIs: 0,
      atRiskProjects: 0,
      overdueTasks: 0,
      upcomingMilestones: 0
    }
  };
}

async function handleCrudFunction(table, payload, overrides = {}) {
  const operation = String(payload?.operation || '').toLowerCase();
  const opData = payload?.data || {};
  const createData = operation === 'create' ? { ...opData, ...(overrides.createData || {}) } : null;
  const updateData = operation === 'update' ? { ...(opData?.updates || {}), ...(overrides.updateData || {}) } : null;

  if (operation === 'create') {
    return insertRow(table, createData || {});
  }
  if (operation === 'update') {
    return updateRowById(table, getIdFromPayload(opData), updateData || {});
  }
  if (operation === 'delete') {
    return deleteRowById(table, getIdFromPayload(opData));
  }
  throw new Error(`Unsupported operation "${operation}"`);
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
    const sortField = getSortFieldForTable(table, parsed.field);

    const queryUrl = buildSelectUrl(table);
    queryUrl.searchParams.set('order', `${sortField}.${parsed.ascending ? 'asc' : 'desc'}`);
    if (limit) queryUrl.searchParams.set('limit', String(limit));

    const rows = await fetchJson(queryUrl, { headers: supabaseHeaders() });
    json(res, 200, normalizeEntityRows(rows || []));
  } catch (error) {
    json(res, 500, { message: error.message || 'Entity list failed' });
  }
}

async function handleEntitiesFilterOrCreate(req, res, table) {
  try {
    const body = await readBody(req);
    if (!hasSupabase()) {
      if (body?.data) {
        json(res, 200, normalizeEntityRow({ id: crypto.randomUUID(), ...body.data }));
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
      json(res, 200, normalizeEntityRow(rows?.[0] || null));
      return;
    }

    const filters = body?.filters || {};
    const sortBy = body?.sortBy;
    const limit = body?.limit;
    const parsed = parseSort(sortBy);
    const sortField = getSortFieldForTable(table, parsed.field);
    const filterableColumns = getFilterableColumns(table);

    const queryUrl = buildSelectUrl(table);
    queryUrl.searchParams.set('order', `${sortField}.${parsed.ascending ? 'asc' : 'desc'}`);
    if (limit) queryUrl.searchParams.set('limit', String(limit));

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (!filterableColumns.has(key)) return;
      if (typeof value === 'object' && value && Array.isArray(value.$in)) {
        queryUrl.searchParams.set(key, `in.(${value.$in.join(',')})`);
      } else {
        queryUrl.searchParams.set(key, `eq.${value}`);
      }
    });

    const rows = await fetchJson(queryUrl, { headers: supabaseHeaders() });
    json(res, 200, normalizeEntityRows(rows || []));
  } catch (error) {
    json(res, 500, { message: error.message || 'Entity filter/create failed' });
  }
}

async function handleEntitiesBulkCreate(req, res, table) {
  try {
    const body = await readBody(req);
    const records = Array.isArray(body?.records) ? body.records : [];
    if (!hasSupabase()) {
      json(res, 200, records.map((r) => normalizeEntityRow({ id: crypto.randomUUID(), ...r })));
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
    json(res, 200, normalizeEntityRows(rows || []));
  } catch (error) {
    json(res, 500, { message: error.message || 'Bulk create failed' });
  }
}

async function handleEntityUpdate(req, res, table, id) {
  try {
    const body = await readBody(req);
    const data = body?.data || {};
    if (!hasSupabase()) {
      json(res, 200, normalizeEntityRow({ id, ...data }));
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
    json(res, 200, normalizeEntityRow(rows?.[0] || null));
  } catch (error) {
    json(res, 500, { message: error.message || 'Update failed' });
  }
}

async function handleEntityDelete(res) {
  noContent(res);
}

async function invokeLocalFunction(name, payload) {
  if (name === 'getDashboardData') {
    const page = Math.max(1, Number(payload?.page || 1));
    const pageSize = Math.max(1, Math.min(Number(payload?.pageSize || 20), 100));
    const search = String(payload?.search || '').trim().toLowerCase();
    const status = String(payload?.status || 'all');
    const from = (page - 1) * pageSize;

    if (!hasSupabase()) {
      return buildStubDashboardData();
    }

    const queryUrl = buildSelectUrl('projects');
    queryUrl.searchParams.set('archived', 'eq.false');
    if (status !== 'all') queryUrl.searchParams.set('status', `eq.${status}`);
    queryUrl.searchParams.set('order', 'updated_at.desc');
    queryUrl.searchParams.set('limit', String(pageSize));
    queryUrl.searchParams.set('offset', String(from));
    if (search) {
      queryUrl.searchParams.set('or', `name.ilike.%${search}%,project_number.ilike.%${search}%`);
    }

    const projects = normalizeEntityRows(await fetchJson(queryUrl, { headers: supabaseHeaders() }));
    const totalProjects = await queryCount('projects', { archived: 'false' });
    const totalFiltered = search || status !== 'all' ? projects.length : totalProjects;

    const openRFIs = await queryCount('rfis', { status: 'open' });
    const projected = projects.map((p) => {
      const risky = p.status === 'delayed' || p.status === 'on_hold';
      const riskScore = risky ? 75 : 20;
      return {
        ...p,
        progress: Number(p.progress || 0),
        costHealth: risky ? 70 : 90,
        daysSlip: risky ? 5 : 0,
        completedTasks: 0,
        overdueTasks: 0,
        openRFIs: 0,
        pendingCOs: 0,
        isAtRisk: risky,
        riskScore
      };
    });

    const riskProjects = projected.filter((p) => p.isAtRisk).length;
    const totalHealth = projected.reduce((sum, p) => sum + Math.max(0, 100 - Number(p.riskScore || 0)), 0);
    const avgHealth = projected.length ? totalHealth / projected.length : 0;
    const activeProjects = projected.filter((p) => p.status === 'in_progress' || p.status === 'awarded').length;

    return {
      projects: projected,
      pagination: {
        page,
        pageSize,
        totalFiltered,
        totalProjects
      },
      metrics: {
        totalProjects,
        activeProjects,
        healthyProjects: Math.max(0, projected.length - riskProjects),
        riskProjects,
        avgHealth,
        openRFIs,
        atRiskProjects: riskProjects,
        overdueTasks: 0,
        upcomingMilestones: 0
      }
    };
  }

  if (name === 'updateUserProfile') {
    const profile = await getOrCreateDevProfile();
    const updates = payload || {};
    if (!hasSupabase()) {
      return { success: true, profile: { ...profile, ...updates } };
    }
    const updated = await updateRowById('profiles', profile.id, updates);
    return { success: true, profile: updated || { ...profile, ...updates } };
  }

  if (name === 'listProjects') {
    const rows = await queryRows('projects', { order: 'updated_at.desc', limit: 200 });
    return rows;
  }

  if (name === 'getIntegrationStatus') {
    return {
      google_drive: { connected: false, last_sync: null },
      slack: { connected: false, channel: null },
      teams: { connected: false },
      quickbooks: { connected: false }
    };
  }

  if (name === 'sendSlackNotification') {
    return { success: true, channel: payload?.channel || null, queued: true };
  }

  if (name === 'sendTeamsNotification') {
    return { success: true, queued: true };
  }

  if (name === 'syncGoogleDrive') {
    return { success: true, synced_count: 0, folder_id: payload?.folder_id || null };
  }

  if (name === 'notifyStatusChange') {
    return { success: true };
  }

  if (name === 'generateWeeklyExecutiveSummary') {
    const projects = await queryRows('projects', { order: 'updated_at.desc', limit: 50 });
    const expenses = await queryRows('expenses', { order: 'updated_at.desc', limit: 200 });
    const tasks = await queryRows('tasks', { order: 'updated_at.desc', limit: 500 });

    const weeklySpend = expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const laborHours = 0;
    const avgHealth = projects.length
      ? projects.reduce((sum, p) => sum + (p.status === 'delayed' ? 65 : 88), 0) / projects.length
      : 0;

    const forecasts = projects.slice(0, 5).map((p) => ({
      project_number: p.project_number || p.name || 'Project',
      forecast: {
        completion_forecast: {
          variance_days: p.status === 'delayed' ? 14 : 0
        }
      }
    }));

    return {
      summary: {
        activity: {
          tasks_completed: completedTasks,
          labor_hours: laborHours
        },
        portfolio: {
          weekly_spend: weeklySpend,
          avg_health_score: avgHealth
        },
        concerns: [],
        forecasts
      }
    };
  }

  if (name === 'getPortfolioMetrics' || name === 'getPortfolioMetricsOptimized') {
    const projectIds = Array.isArray(payload?.project_ids) && payload.project_ids.length ? payload.project_ids : null;
    const projectFilters = projectIds ? { id: projectIds } : {};
    const projects = await queryRows('projects', { filters: projectFilters, order: 'updated_at.desc', limit: 500 });
    const financialFilters = projectIds ? { project_id: projectIds } : {};
    const taskFilters = projectIds ? { project_id: projectIds } : {};
    const financials = await queryRows('financials', { filters: financialFilters, order: 'updated_at.desc', limit: 1000 });
    const tasks = await queryRows('tasks', { filters: taskFilters, order: 'updated_at.desc', limit: 2000 });

    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === 'in_progress' || p.status === 'awarded').length;
    const totalBudget = financials.reduce((sum, row) => sum + Number(row.current_budget || row.budget_amount || 0), 0);
    const totalActual = financials.reduce((sum, row) => sum + Number(row.actual_amount || 0), 0);
    const budgetUtilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;

    return {
      metrics: {
        total_projects: totalProjects,
        active_projects: activeProjects,
        total_budget: totalBudget,
        total_actual: totalActual,
        budget_utilization: budgetUtilization,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        completion_rate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
      },
      projects
    };
  }

  if (name === 'getCostRiskSignal') {
    const projectId = payload?.project_id || payload?.projectId;
    if (!projectId) {
      return {
        risk_level: 'green',
        status_label: 'Low Risk',
        message: 'Project ID missing',
        planned_margin_percent: 0,
        projected_margin_percent: 0,
        margin_variance: 0,
        total_contract: 0,
        actual_cost: 0,
        estimated_cost_at_completion: 0,
        projected_margin: 0,
        drivers: []
      };
    }

    const projects = await queryRows('projects', { filters: { id: projectId }, limit: 1 });
    const financials = await queryRows('financials', { filters: { project_id: projectId }, limit: 500 });
    const expenses = await queryRows('expenses', { filters: { project_id: projectId }, limit: 1000 });

    const totalContract = Number(projects?.[0]?.contract_value || 0);
    const budget = financials.reduce((sum, row) => sum + Number(row.current_budget || 0), 0);
    const financialActual = financials.reduce((sum, row) => sum + Number(row.actual_amount || 0), 0);
    const expenseActual = expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const actualCost = financialActual + expenseActual;
    const estimateDelta = Math.max(0, budget - financialActual) * 0.25;
    const estimatedCostAtCompletion = actualCost + estimateDelta;
    const plannedMargin = totalContract - budget;
    const projectedMargin = totalContract - estimatedCostAtCompletion;
    const plannedMarginPercent = totalContract > 0 ? (plannedMargin / totalContract) * 100 : 0;
    const projectedMarginPercent = totalContract > 0 ? (projectedMargin / totalContract) * 100 : 0;
    const marginVariance = projectedMarginPercent - plannedMarginPercent;

    const riskLevel = projectedMarginPercent < 5 ? 'red' : projectedMarginPercent < 12 ? 'yellow' : 'green';
    const statusLabel = riskLevel === 'red' ? 'High Risk' : riskLevel === 'yellow' ? 'Watch' : 'Healthy';

    return {
      risk_level: riskLevel,
      status_label: statusLabel,
      message: `Projected margin variance is ${marginVariance >= 0 ? '+' : ''}${marginVariance.toFixed(1)}%.`,
      planned_margin_percent: plannedMarginPercent,
      projected_margin_percent: projectedMarginPercent,
      margin_variance: marginVariance,
      total_contract: totalContract,
      actual_cost: actualCost,
      estimated_cost_at_completion: estimatedCostAtCompletion,
      projected_margin: projectedMargin,
      drivers: []
    };
  }

  if (name === 'expenseOperations') {
    return handleCrudFunction('expenses', payload);
  }

  if (name === 'sovOperations') {
    return handleCrudFunction('sov_items', payload);
  }

  if (name === 'invoiceOperations') {
    return handleCrudFunction('invoices', payload);
  }

  if (name === 'budgetOperations') {
    return handleCrudFunction('financials', payload, { createData: { category: 'budget' }, updateData: { category: 'budget' } });
  }

  if (name === 'etcOperations') {
    return handleCrudFunction('financials', payload, { createData: { category: 'etc' }, updateData: { category: 'etc' } });
  }

  if (name === 'updateSOVPercentComplete') {
    const sovItemId = payload?.sovItemId || payload?.sov_item_id || payload?.sov_itemId;
    const percentComplete = Number(payload?.percentComplete ?? payload?.percent_complete ?? 0);
    if (!sovItemId) return { success: false, message: 'Missing SOV item id' };
    await updateRowById('sov_items', sovItemId, { data: { percent_complete: percentComplete } });
    return { success: true, sov_item_id: sovItemId, percent_complete: percentComplete };
  }

  if (name === 'generateInvoice') {
    const projectId = payload?.project_id || payload?.projectId;
    const periodStart = payload?.period_start || payload?.periodStart || null;
    const periodEnd = payload?.period_end || payload?.periodEnd || null;
    const created = await insertRow('invoices', {
      project_id: projectId || null,
      status: 'draft',
      period_start: periodStart,
      period_end: periodEnd,
      data: payload?.data || {}
    });
    return created;
  }

  if (name === 'approveInvoice') {
    const id = getIdFromPayload(payload);
    if (!id) return { success: false, message: 'Missing invoice id' };
    const invoice = await updateRowById('invoices', id, { status: 'approved' });
    return { success: true, invoice };
  }

  if (name === 'deleteInvoice') {
    const id = getIdFromPayload(payload);
    if (!id) return { success: false, message: 'Missing invoice id' };
    return deleteRowById('invoices', id);
  }

  return null;
}

async function handleFunctionInvoke(req, res, name) {
  try {
    const payload = await readBody(req);
    const localResult = await invokeLocalFunction(name, payload);
    if (localResult !== null && localResult !== undefined) {
      json(res, 200, { data: localResult });
      return;
    }

    if (!hasSupabase()) {
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
      // During migration, tolerate missing edge functions and keep UI interactions moving.
      if (response.status === 404 || response.status === 405) {
        json(res, 200, { data: { success: true, name, message: 'Function fallback in owned gateway', payload } });
        return;
      }
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
    if (url.pathname === '/api/health' && method === 'GET') {
      json(res, 200, {
        ok: true,
        mode: hasSupabase() ? 'supabase' : 'stub',
        port: PORT
      });
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
