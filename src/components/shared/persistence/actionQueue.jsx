/**
 * Action Queue Processor
 * ======================
 * Retries enqueued create/update/delete actions with exponential backoff.
 * On success: removes from queue, reconciles temp localId → server ID in React Query cache.
 * On 404: marks as 'failed' (resource gone), does NOT retry further.
 * On network error: retries indefinitely with backoff (max 5 min).
 *
 * Start the processor once in the app root: startQueueProcessor(queryClient, entityAPI)
 */

import {
  listPendingQueue,
  updateQueueItem,
  removeQueueItem,
  getQueueItem,
} from './db';

const BACKOFF_BASE_MS  = 2000;   // 2s first retry
const BACKOFF_MAX_MS   = 300000; // 5 min cap
const MAX_ATTEMPTS     = 10;     // give up after 10 tries (non-404)

function backoffDelay(attempts) {
  const delay = Math.min(BACKOFF_BASE_MS * Math.pow(2, attempts), BACKOFF_MAX_MS);
  return delay + Math.random() * 1000; // jitter
}

// ─── ID Reconciliation ────────────────────────────────────────────────────────

/**
 * After a 'create' succeeds, server returns a real ID.
 * Replace all references to tempId with serverId in the React Query cache.
 */
function reconcileIds(queryClient, entityType, tempId, serverId) {
  if (!queryClient || tempId === serverId) return;
  const cache = queryClient.getQueryCache().getAll();
  for (const query of cache) {
    const data = query.state.data;
    if (!data) continue;
    // Arrays (list queries)
    if (Array.isArray(data)) {
      const updated = data.map(item =>
        item?.id === tempId ? { ...item, id: serverId, _wasLocal: false } : item
      );
      if (updated !== data) queryClient.setQueryData(query.queryKey, updated);
    }
    // Single-entity queries keyed by tempId
    if (data?.id === tempId) {
      queryClient.setQueryData(query.queryKey, { ...data, id: serverId, _wasLocal: false });
    }
  }
}

// ─── Processor ────────────────────────────────────────────────────────────────

let _processorTimer = null;
let _isProcessing   = false;

/**
 * @param {object} queryClient   - React Query client
 * @param {object} entityAPI     - { [entityType]: { create, update, delete } }
 * @param {string} userId
 * @param {Function} onQueueChange  - () => void  — called when queue mutates (for UI refresh)
 */
export function startQueueProcessor(queryClient, entityAPI, userId, onQueueChange) {
  if (_processorTimer) return; // already running

  async function tick() {
    if (_isProcessing) return;
    _isProcessing = true;
    try {
      const pending = await listPendingQueue(userId);
      const now     = Date.now();
      const ready   = pending.filter(i => i.nextRetry <= now && i.attempts < MAX_ATTEMPTS);

      for (const item of ready) {
        await processItem(item, queryClient, entityAPI, onQueueChange);
      }
    } finally {
      _isProcessing = false;
    }
    _processorTimer = setTimeout(tick, 3000); // poll every 3s
  }

  _processorTimer = setTimeout(tick, 1000);
}

export function stopQueueProcessor() {
  if (_processorTimer) { clearTimeout(_processorTimer); _processorTimer = null; }
}

async function processItem(item, queryClient, entityAPI, onQueueChange) {
  const api = entityAPI?.[item.entityType];
  if (!api) return; // no handler registered for this entity

  // Mark as retrying
  await updateQueueItem(item.localId, { status: 'retrying' });
  onQueueChange?.();

  try {
    let result;
    if (item.operation === 'create') {
      result = await api.create(item.payload);
      // Reconcile temp ID → server ID
      if (result?.id && result.id !== item.entityId) {
        reconcileIds(queryClient, item.entityType, item.entityId, result.id);
      }
    } else if (item.operation === 'update') {
      result = await api.update(item.entityId, item.payload);
    } else if (item.operation === 'delete') {
      result = await api.delete(item.entityId);
    }

    // Success
    await removeQueueItem(item.localId);
    // Invalidate so UI re-fetches the confirmed server state
    queryClient?.invalidateQueries({ queryKey: [item.entityType] });
    onQueueChange?.();

  } catch (err) {
    const status = err?.response?.status || err?.status;
    const is404  = status === 404 || String(err?.message).includes('not found');

    if (is404) {
      // Resource gone — mark permanently failed, stop retrying
      await updateQueueItem(item.localId, {
        status:    'failed',
        error:     '404 — resource no longer exists on server',
        failedAt:  Date.now(),
      });
    } else {
      const attempts  = item.attempts + 1;
      const giveUp    = attempts >= MAX_ATTEMPTS;
      await updateQueueItem(item.localId, {
        status:    giveUp ? 'failed' : 'pending',
        attempts,
        nextRetry: Date.now() + backoffDelay(attempts),
        error:     err?.message || 'Network error',
        failedAt:  giveUp ? Date.now() : undefined,
      });
    }
    onQueueChange?.();
  }
}

// ─── Expose manual flush (for tests / "Retry Now" button) ────────────────────

export async function flushQueue(queryClient, entityAPI, userId, onQueueChange) {
  const pending = await listPendingQueue(userId);
  // Reset nextRetry so all fire immediately
  await Promise.all(pending.map(i => updateQueueItem(i.localId, { nextRetry: 0, status: 'pending' })));
  for (const item of pending) {
    await processItem({ ...item, nextRetry: 0 }, queryClient, entityAPI, onQueueChange);
  }
}