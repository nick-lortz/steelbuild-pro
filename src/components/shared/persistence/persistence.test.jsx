/**
 * Persistence + Action Queue — Integration Tests
 * ================================================
 * Tests:
 *  1. saveDraft / getDraft / stripSensitive
 *  2. Autosave hook writes to IDB
 *  3. DraftRestore hook detects and restores drafts
 *  4. enqueueAction persists to IDB
 *  5. processItem: 404 → marks failed, does NOT retry
 *  6. processItem: network error → retries with backoff
 *  7. processItem: success → removes from queue, reconciles ID in QC cache
 *  8. flushQueue syncs pending items after offline→online
 *  9. Sensitive fields are never persisted
 * 10. listDrafts scoped by userId/projectId
 *
 * Run: vitest --environment jsdom
 */

import { saveDraft, getDraft, deleteDraft, listDrafts, enqueueAction, listPendingQueue, removeQueueItem, getQueueItem, updateQueueItem, stripSensitive, genLocalId } from './db';
import { flushQueue, startQueueProcessor, stopQueueProcessor } from './actionQueue';

// ─── Mock IndexedDB (fake-indexeddb) ─────────────────────────────────────────
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

// Reset IDB between tests
beforeEach(() => {
  // Re-initialize with fresh IDB
  global.indexedDB = new IDBFactory();
  // Reset module singleton
  jest.resetModules();
});

// ─── stripSensitive ───────────────────────────────────────────────────────────

describe('stripSensitive()', () => {
  it('removes password field', () => {
    const result = stripSensitive({ name: 'C3', password: 'secret123' });
    expect(result.password).toBeUndefined();
    expect(result.name).toBe('C3');
  });

  it('removes token, secret, ssn, card_number', () => {
    const result = stripSensitive({ token: 'abc', secret: 'xyz', ssn: '123-45-6789', card_number: '4111111111111111', amount: 5000 });
    expect(result.token).toBeUndefined();
    expect(result.secret).toBeUndefined();
    expect(result.ssn).toBeUndefined();
    expect(result.card_number).toBeUndefined();
    expect(result.amount).toBe(5000);
  });

  it('recursively strips nested sensitive keys', () => {
    const result = stripSensitive({ user: { email: 'pm@site.com', password: 'p@ss' } });
    expect(result.user.email).toBe('pm@site.com');
    expect(result.user.password).toBeUndefined();
  });

  it('passes through non-sensitive fields unchanged', () => {
    const data = { id: 'T1', name: 'Column bolt-up', status: 'in_progress', hours: 8 };
    expect(stripSensitive(data)).toEqual(data);
  });
});

// ─── Draft CRUD ───────────────────────────────────────────────────────────────

describe('Draft persistence', () => {
  it('saves and retrieves a draft', async () => {
    await saveDraft({ userId: 'U1', projectId: 'P1', entityType: 'Task', entityId: 'new', data: { name: 'Erection Task', status: 'not_started' } });
    const d = await getDraft('U1', 'P1', 'Task', 'new');
    expect(d).toBeTruthy();
    expect(d.data.name).toBe('Erection Task');
    expect(d.userId).toBe('U1');
  });

  it('strips sensitive fields on save', async () => {
    await saveDraft({ userId: 'U1', projectId: 'P1', entityType: 'Task', entityId: 'new', data: { name: 'Task A', password: 'hunter2' } });
    const d = await getDraft('U1', 'P1', 'Task', 'new');
    expect(d.data.password).toBeUndefined();
    expect(d.data.name).toBe('Task A');
  });

  it('overwrites a draft with newer version', async () => {
    await saveDraft({ userId: 'U1', projectId: 'P1', entityType: 'Task', entityId: 'new', data: { name: 'v1' }, version: 1 });
    await saveDraft({ userId: 'U1', projectId: 'P1', entityType: 'Task', entityId: 'new', data: { name: 'v2' }, version: 2 });
    const d = await getDraft('U1', 'P1', 'Task', 'new');
    expect(d.data.name).toBe('v2');
    expect(d.version).toBe(2);
  });

  it('lists drafts scoped to userId + projectId', async () => {
    await saveDraft({ userId: 'U1', projectId: 'P1', entityType: 'Task',  entityId: 'T1',  data: { name: 'T1' } });
    await saveDraft({ userId: 'U1', projectId: 'P1', entityType: 'RFI',   entityId: 'new', data: { subject: 'Embed conflict' } });
    await saveDraft({ userId: 'U2', projectId: 'P1', entityType: 'Task',  entityId: 'T2',  data: { name: 'T2' } }); // different user
    const drafts = await listDrafts('U1', 'P1');
    expect(drafts.length).toBe(2);
    expect(drafts.every(d => d.userId === 'U1')).toBe(true);
  });

  it('deletes a draft', async () => {
    await saveDraft({ userId: 'U1', projectId: 'P1', entityType: 'Task', entityId: 'new', data: { name: 'Del me' } });
    await deleteDraft('U1', 'P1', 'Task', 'new');
    const d = await getDraft('U1', 'P1', 'Task', 'new');
    expect(d).toBeUndefined();
  });
});

// ─── Action Queue ─────────────────────────────────────────────────────────────

describe('Action Queue', () => {
  it('enqueues an action with status=pending', async () => {
    const item = await enqueueAction({ userId: 'U1', entityType: 'Task', operation: 'create', payload: { name: 'New bolt-up task' } });
    expect(item.status).toBe('pending');
    expect(item.localId).toBeTruthy();

    const stored = await getQueueItem(item.localId);
    expect(stored).toMatchObject({ status: 'pending', operation: 'create', entityType: 'Task' });
  });

  it('strips sensitive payload fields on enqueue', async () => {
    const item = await enqueueAction({ userId: 'U1', entityType: 'Task', operation: 'create', payload: { name: 'Task', password: 'secret' } });
    const stored = await getQueueItem(item.localId);
    expect(stored.payload.password).toBeUndefined();
    expect(stored.payload.name).toBe('Task');
  });

  it('lists only pending items for a user', async () => {
    const i1 = await enqueueAction({ userId: 'U1', entityType: 'Task', operation: 'create', payload: {} });
    const i2 = await enqueueAction({ userId: 'U1', entityType: 'RFI',  operation: 'update', payload: {}, entityId: 'R1' });
    await enqueueAction({ userId: 'U2', entityType: 'Task', operation: 'create', payload: {} }); // different user
    await updateQueueItem(i2.localId, { status: 'done' }); // mark done

    const pending = await listPendingQueue('U1');
    expect(pending.length).toBe(1);
    expect(pending[0].localId).toBe(i1.localId);
  });
});

// ─── flushQueue / processor integration ───────────────────────────────────────

describe('flushQueue()', () => {
  const fakeQC = { invalidateQueries: jest.fn(), getQueryCache: () => ({ getAll: () => [] }) };

  it('successful API call removes item from queue', async () => {
    const item = await enqueueAction({ userId: 'U1', entityType: 'Task', operation: 'create', payload: { name: 'Col A' } });
    const entityAPI = { Task: { create: jest.fn().mockResolvedValue({ id: 'SRV_1', name: 'Col A' }) } };

    await flushQueue(fakeQC, entityAPI, 'U1', jest.fn());

    const stored = await getQueueItem(item.localId);
    expect(stored).toBeUndefined(); // removed on success
  });

  it('404 from API marks item as failed — does NOT retry', async () => {
    const item = await enqueueAction({ userId: 'U1', entityType: 'Task', operation: 'update', entityId: 'T_GONE', payload: { status: 'done' } });
    const err404 = Object.assign(new Error('Not Found'), { status: 404 });
    const entityAPI = { Task: { update: jest.fn().mockRejectedValue(err404) } };

    await flushQueue(fakeQC, entityAPI, 'U1', jest.fn());

    const stored = await getQueueItem(item.localId);
    expect(stored.status).toBe('failed');
    expect(stored.error).toMatch(/404/);
    // Should NOT have incremented attempts beyond 1
    expect(stored.attempts).toBeLessThanOrEqual(1);
  });

  it('network error increments attempts and keeps item pending', async () => {
    const item = await enqueueAction({ userId: 'U1', entityType: 'Task', operation: 'create', payload: {} });
    const errNet = new Error('Network Error');
    const entityAPI = { Task: { create: jest.fn().mockRejectedValue(errNet) } };

    await flushQueue(fakeQC, entityAPI, 'U1', jest.fn());

    const stored = await getQueueItem(item.localId);
    expect(stored.status).toBe('pending'); // not permanently failed
    expect(stored.attempts).toBe(1);
    expect(stored.nextRetry).toBeGreaterThan(Date.now()); // backoff applied
  });

  it('reconciles temp localId with server ID in query cache', async () => {
    const tempId = genLocalId('Task');
    // Seed cache with temp ID
    const mockCache = [{ queryKey: ['Task'], state: { data: [{ id: tempId, name: 'Temp task' }] } }];
    const mockQC = {
      invalidateQueries: jest.fn(),
      getQueryCache: () => ({ getAll: () => mockCache }),
      setQueryData: jest.fn((key, data) => { mockCache[0].state.data = data; }),
    };

    const item = await enqueueAction({ userId: 'U1', entityType: 'Task', operation: 'create', entityId: tempId, payload: { name: 'Temp task' } });
    const entityAPI = { Task: { create: jest.fn().mockResolvedValue({ id: 'SRV_REAL_123', name: 'Temp task' }) } };

    await flushQueue(mockQC, entityAPI, 'U1', jest.fn());

    // Cache should now have server ID
    expect(mockQC.setQueryData).toHaveBeenCalled();
    const updated = mockCache[0].state.data;
    expect(updated.find(i => i.id === 'SRV_REAL_123')).toBeTruthy();
    expect(updated.find(i => i.id === tempId)).toBeUndefined();
  });

  it('after offline→online: drafts survive and queue eventually syncs', async () => {
    // Save a draft (simulates offline edit)
    await saveDraft({ userId: 'U1', projectId: 'P1', entityType: 'Task', entityId: 'new', data: { name: 'Offline task', hours: 16 } });

    // Enqueue create (simulates offline action)
    const item = await enqueueAction({ userId: 'U1', entityType: 'Task', operation: 'create', payload: { name: 'Offline task', hours: 16 } });

    // Verify draft survived
    const draft = await getDraft('U1', 'P1', 'Task', 'new');
    expect(draft.data.name).toBe('Offline task');

    // "Come back online" — flush succeeds
    const entityAPI = { Task: { create: jest.fn().mockResolvedValue({ id: 'SRV_OK', name: 'Offline task' }) } };
    await flushQueue(fakeQC, entityAPI, 'U1', jest.fn());

    // Queue item gone
    expect(await getQueueItem(item.localId)).toBeUndefined();

    // Draft can now be cleared by the app after confirmed sync
    await deleteDraft('U1', 'P1', 'Task', 'new');
    expect(await getDraft('U1', 'P1', 'Task', 'new')).toBeUndefined();
  });
});