/**
 * Persistence React hooks
 * =======================
 * useAutosave    - debounced auto-save of form state to IndexedDB
 * useDraftRestore - check for & restore saved drafts
 * useActionQueue  - access pending queue + enqueue new actions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  saveDraft, getDraft, deleteDraft, listDrafts,
  enqueueAction, listPendingQueue, listAllQueue,
  removeQueueItem, updateQueueItem,
} from './db';

// ─── useAutosave ──────────────────────────────────────────────────────────────

/**
 * Auto-saves formData to IndexedDB after `debounceMs` of inactivity.
 *
 * @param {object} params
 * @param {string}  params.userId
 * @param {string}  params.projectId
 * @param {string}  params.entityType  e.g. 'Task'
 * @param {string}  [params.entityId]  'new' for create forms
 * @param {object}  params.formData    current form state
 * @param {boolean} [params.enabled]   default true
 * @param {number}  [params.debounceMs] default 1500
 *
 * @returns {{ lastSaved: Date|null, clearDraft: fn }}
 */
export function useAutosave({
  userId,
  projectId,
  entityType,
  entityId = 'new',
  formData,
  enabled = true,
  debounceMs = 1500,
}) {
  const [lastSaved, setLastSaved] = useState(null);
  const timerRef  = useRef(null);
  const versionRef = useRef(1);

  useEffect(() => {
    if (!enabled || !userId || !entityType || !formData) return;

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await saveDraft({ userId, projectId, entityType, entityId, data: formData, version: ++versionRef.current });
      setLastSaved(new Date());
    }, debounceMs);

    return () => clearTimeout(timerRef.current);
  }, [formData, enabled, userId, projectId, entityType, entityId, debounceMs]);

  const clearDraft = useCallback(async () => {
    await deleteDraft(userId, projectId, entityType, entityId);
    setLastSaved(null);
  }, [userId, projectId, entityType, entityId]);

  return { lastSaved, clearDraft };
}

// ─── useDraftRestore ──────────────────────────────────────────────────────────

/**
 * Checks IndexedDB for a saved draft on mount.
 * Returns { hasDraft, draft, restore, dismiss }.
 */
export function useDraftRestore({
  userId,
  projectId,
  entityType,
  entityId = 'new',
  onRestore,  // (draftData) => void — caller applies draft to form state
}) {
  const [hasDraft, setHasDraft]   = useState(false);
  const [draft,    setDraft]      = useState(null);
  const [checked,  setChecked]    = useState(false);

  useEffect(() => {
    if (!userId || !entityType) return;
    getDraft(userId, projectId, entityType, entityId).then(d => {
      if (d) { setDraft(d); setHasDraft(true); }
      setChecked(true);
    });
  }, [userId, projectId, entityType, entityId]);

  const restore = useCallback(async () => {
    if (draft) {
      onRestore?.(draft.data);
      setHasDraft(false);
    }
  }, [draft, onRestore]);

  const dismiss = useCallback(async () => {
    await deleteDraft(userId, projectId, entityType, entityId);
    setHasDraft(false);
    setDraft(null);
  }, [userId, projectId, entityType, entityId]);

  return { hasDraft, draft, restore, dismiss, checked };
}

// ─── useProjectDrafts ─────────────────────────────────────────────────────────

/**
 * Lists all drafts for a project — used by the "Restore Drafts" panel.
 */
export function useProjectDrafts(userId, projectId) {
  const [drafts,  setDrafts]  = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const all = await listDrafts(userId, projectId);
    // Sort newest first
    setDrafts(all.sort((a, b) => b.savedAt - a.savedAt));
    setLoading(false);
  }, [userId, projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { drafts, loading, refresh };
}

// ─── useActionQueue ───────────────────────────────────────────────────────────

/**
 * Provides access to the pending action queue and an enqueue helper.
 *
 * @param {string} userId
 * @param {object} entityAPI  - { [entityType]: { create, update, delete } }
 */
export function useActionQueue(userId, entityAPI) {
  const queryClient          = useQueryClient();
  const [queue, setQueue]    = useState([]);
  const [processing, setProcessing] = useState(false);

  const refreshQueue = useCallback(async () => {
    if (!userId) return;
    const pending = await listPendingQueue(userId);
    setQueue(pending);
  }, [userId]);

  useEffect(() => { refreshQueue(); }, [refreshQueue]);

  // Keep queue in sync via polling (lightweight, 3s)
  useEffect(() => {
    const t = setInterval(refreshQueue, 3000);
    return () => clearInterval(t);
  }, [refreshQueue]);

  const enqueue = useCallback(async (action) => {
    const item = await enqueueAction({ userId, ...action });
    await refreshQueue();
    return item;
  }, [userId, refreshQueue]);

  const retryAll = useCallback(async () => {
    const { flushQueue } = await import('./actionQueue');
    setProcessing(true);
    await flushQueue(queryClient, entityAPI, userId, refreshQueue);
    setProcessing(false);
  }, [queryClient, entityAPI, userId, refreshQueue]);

  const dismissFailed = useCallback(async (localId) => {
    await removeQueueItem(localId);
    await refreshQueue();
  }, [refreshQueue]);

  const pendingCount  = queue.filter(i => i.status === 'pending' || i.status === 'retrying').length;
  const failedCount   = queue.filter(i => i.status === 'failed').length;

  return { queue, pendingCount, failedCount, enqueue, retryAll, dismissFailed, processing, refreshQueue };
}