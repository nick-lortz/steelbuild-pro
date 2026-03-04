/**
 * SteelBuild-Pro — Local Persistence Layer
 * =========================================
 * IndexedDB schema:
 *   - drafts    : versioned form/edit state per user+project+entity
 *   - queue     : action queue for create/update/delete calls
 *
 * Sensitive fields that are NEVER persisted:
 *   passwords, auth tokens, credit card numbers, SSNs
 *
 * Fields persisted (documented):
 *   All entity fields EXCEPT: password, token, secret, authorization, ssn, card_number
 */

const DB_NAME    = 'sbp_persistence';
const DB_VERSION = 1;

let _db = null;

export async function getDB() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('drafts')) {
        const drafts = db.createObjectStore('drafts', { keyPath: 'key' });
        drafts.createIndex('userId',    'userId');
        drafts.createIndex('projectId', 'projectId');
        drafts.createIndex('savedAt',   'savedAt');
      }
      if (!db.objectStoreNames.contains('queue')) {
        const queue = db.createObjectStore('queue', { keyPath: 'localId' });
        queue.createIndex('status',     'status');
        queue.createIndex('userId',     'userId');
        queue.createIndex('createdAt',  'createdAt');
        queue.createIndex('entityType', 'entityType');
      }
    };
    req.onsuccess  = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror    = (e) => reject(e.target.error);
  });
}

// ─── Generic helpers ──────────────────────────────────────────────────────────

async function idbGet(storeName, key) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

async function idbPut(storeName, value) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

async function idbDelete(storeName, key) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

async function idbGetAllByIndex(storeName, indexName, value) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(storeName, 'readonly');
    const index = tx.objectStore(storeName).index(indexName);
    const req   = index.getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

async function idbGetAll(storeName) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

// ─── PII strip before persist ─────────────────────────────────────────────────

const SENSITIVE_KEYS = /^(password|token|secret|authorization|ssn|card_number|cvv|pin)$/i;

export function stripSensitive(data) {
  if (!data || typeof data !== 'object') return data;
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (SENSITIVE_KEYS.test(k)) continue;
    out[k] = typeof v === 'object' && v !== null ? stripSensitive(v) : v;
  }
  return out;
}

// ─── Draft API ────────────────────────────────────────────────────────────────

/**
 * Draft key format: `draft:{userId}:{projectId}:{entityType}:{entityId}`
 * entityId may be 'new' for unsaved forms.
 */
export function makeDraftKey(userId, projectId, entityType, entityId = 'new') {
  return `draft:${userId}:${projectId}:${entityType}:${entityId}`;
}

export async function saveDraft({ userId, projectId, entityType, entityId = 'new', data, version = 1 }) {
  const key = makeDraftKey(userId, projectId, entityType, entityId);
  await idbPut('drafts', {
    key,
    userId,
    projectId,
    entityType,
    entityId,
    data: stripSensitive(data),
    version,
    savedAt: Date.now(),
  });
  return key;
}

export async function getDraft(userId, projectId, entityType, entityId = 'new') {
  return idbGet('drafts', makeDraftKey(userId, projectId, entityType, entityId));
}

export async function listDrafts(userId, projectId) {
  const all = await idbGetAllByIndex('drafts', 'userId', userId);
  return projectId ? all.filter(d => d.projectId === projectId) : all;
}

export async function deleteDraft(userId, projectId, entityType, entityId = 'new') {
  return idbDelete('drafts', makeDraftKey(userId, projectId, entityType, entityId));
}

export async function clearProjectDrafts(userId, projectId) {
  const drafts = await listDrafts(userId, projectId);
  await Promise.all(drafts.map(d => idbDelete('drafts', d.key)));
}

// ─── Action Queue API ─────────────────────────────────────────────────────────

let _localIdCounter = Date.now();
export function genLocalId(entityType) {
  return `local_${entityType}_${++_localIdCounter}`;
}

/**
 * Enqueue an action.
 * @param {object} p
 * @param {string} p.userId
 * @param {string} p.entityType   - 'Task' | 'RFI' | 'WorkPackage' | ...
 * @param {string} p.operation    - 'create' | 'update' | 'delete'
 * @param {string} [p.entityId]   - real server ID (for update/delete) or temp localId
 * @param {object} [p.payload]    - data to send
 * @param {string} [p.projectId]
 */
export async function enqueueAction({ userId, entityType, operation, entityId, payload, projectId }) {
  const localId = genLocalId(entityType);
  const item = {
    localId,
    userId,
    projectId,
    entityType,
    operation,
    entityId: entityId || localId,
    payload:  stripSensitive(payload || {}),
    status:   'pending',   // pending | retrying | done | failed
    attempts: 0,
    nextRetry: Date.now(),
    createdAt: Date.now(),
    error: null,
  };
  await idbPut('queue', item);
  return item;
}

export async function getQueueItem(localId) {
  return idbGet('queue', localId);
}

export async function updateQueueItem(localId, updates) {
  const item = await idbGet('queue', localId);
  if (!item) return;
  await idbPut('queue', { ...item, ...updates });
}

export async function removeQueueItem(localId) {
  return idbDelete('queue', localId);
}

export async function listPendingQueue(userId) {
  const all = await idbGetAll('queue');
  return all.filter(i => i.userId === userId && i.status !== 'done');
}

export async function listAllQueue(userId) {
  return idbGetAllByIndex('queue', 'userId', userId);
}