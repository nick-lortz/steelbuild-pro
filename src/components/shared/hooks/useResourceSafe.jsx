/**
 * useResourceSafe — Unit / Integration Tests
 * ===========================================
 * Simulates API 404 responses and verifies:
 *  1. No window.location / hard navigation occurs.
 *  2. Query cache is NOT wiped — other queries untouched.
 *  3. isMissing flag is set; data is preserved from last-known-good.
 *  4. pendingEdits survive the 404.
 *  5. useSafeMutation: 404 calls onMissing, does NOT throw to caller.
 *
 * Run with: vitest (or jest with jsdom) — no DOM dependencies beyond jsdom.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useResourceSafe, useSafeMutation, is404Error } from './useResourceSafe';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const wrapper = (qc) => ({ children }) => (
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>
);

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });
}

const err404 = Object.assign(new Error('Not Found'), { status: 404 });
const err500 = Object.assign(new Error('Server Error'), { status: 500 });

const GOOD_DATA = { id: 'T1', name: 'Column C3 bolt-up', status: 'in_progress' };

// ─── is404Error ───────────────────────────────────────────────────────────────

describe('is404Error()', () => {
  it('detects response.status 404', () => {
    expect(is404Error({ response: { status: 404 } })).toBe(true);
  });
  it('detects .status 404', () => {
    expect(is404Error({ status: 404 })).toBe(true);
  });
  it('detects "Not Found" message', () => {
    expect(is404Error(new Error('Resource not found'))).toBe(true);
  });
  it('does NOT flag 500 as 404', () => {
    expect(is404Error(err500)).toBe(false);
  });
  it('does NOT flag null', () => {
    expect(is404Error(null)).toBe(false);
  });
});

// ─── useResourceSafe ─────────────────────────────────────────────────────────

describe('useResourceSafe()', () => {
  // Spy: ensure navigate / window.location is never called
  const origLocation = window.location;

  beforeEach(() => {
    delete window.location;
    window.location = { ...origLocation, href: '/', assign: jest.fn(), replace: jest.fn(), reload: jest.fn() };
    localStorage.clear();
  });

  afterEach(() => {
    window.location = origLocation;
  });

  it('returns data on success — no isMissing', async () => {
    const qc = makeClient();
    const fetcher = jest.fn().mockResolvedValue(GOOD_DATA);
    const { result } = renderHook(
      () => useResourceSafe('Task', 'T1', fetcher),
      { wrapper: wrapper(qc) }
    );
    await waitFor(() => expect(result.current.data).toEqual(GOOD_DATA));
    expect(result.current.isMissing).toBe(false);
    expect(window.location.assign).not.toHaveBeenCalled();
    expect(window.location.replace).not.toHaveBeenCalled();
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('sets isMissing=true on 404 — does NOT navigate', async () => {
    const qc = makeClient();
    const fetcher = jest.fn().mockRejectedValue(err404);
    const { result } = renderHook(
      () => useResourceSafe('Task', 'T1', fetcher),
      { wrapper: wrapper(qc) }
    );
    await waitFor(() => expect(result.current.isMissing).toBe(true));
    // Critical: no hard nav
    expect(window.location.assign).not.toHaveBeenCalled();
    expect(window.location.replace).not.toHaveBeenCalled();
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('preserves last-known data as pendingEdits on 404', async () => {
    const qc = makeClient();
    let callCount = 0;
    const fetcher = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve(GOOD_DATA);
      return Promise.reject(err404);
    });

    const { result, rerender } = renderHook(
      () => useResourceSafe('Task', 'T1', fetcher, { staleTime: 0 }),
      { wrapper: wrapper(qc) }
    );
    // First fetch succeeds
    await waitFor(() => expect(result.current.data).toEqual(GOOD_DATA));

    // Simulate cache invalidation → 404
    await act(async () => {
      qc.invalidateQueries(['Task', 'T1']);
    });
    await waitFor(() => expect(result.current.isMissing).toBe(true));

    // pendingEdits holds the last good data
    expect(result.current.pendingEdits).toEqual(GOOD_DATA);
    expect(result.current.data).toEqual(GOOD_DATA); // still visible to user
  });

  it('does NOT wipe OTHER queries in the cache on 404', async () => {
    const qc = makeClient();
    // Seed an unrelated query
    qc.setQueryData(['Project', 'P1'], { id: 'P1', name: 'Mill St. Steel' });

    const fetcher = jest.fn().mockRejectedValue(err404);
    const { result } = renderHook(
      () => useResourceSafe('Task', 'T1', fetcher),
      { wrapper: wrapper(qc) }
    );
    await waitFor(() => expect(result.current.isMissing).toBe(true));

    // Unrelated project query must still be intact
    expect(qc.getQueryData(['Project', 'P1'])).toEqual({ id: 'P1', name: 'Mill St. Steel' });
  });

  it('retry() re-fetches and clears missing flag on success', async () => {
    const qc = makeClient();
    let fail = true;
    const fetcher = jest.fn().mockImplementation(() => {
      if (fail) return Promise.reject(err404);
      return Promise.resolve(GOOD_DATA);
    });

    const { result } = renderHook(
      () => useResourceSafe('Task', 'T1', fetcher),
      { wrapper: wrapper(qc) }
    );
    await waitFor(() => expect(result.current.isMissing).toBe(true));

    fail = false;
    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.isMissing).toBe(false));
    expect(result.current.data).toEqual(GOOD_DATA);
  });

  it('restore() puts pendingEdits back into cache without fetching', async () => {
    const qc = makeClient();
    qc.setQueryData(['Task', 'T1'], GOOD_DATA); // seed cache as if already loaded

    // Simulate a 404 mid-flight by setting isMissing via markMissing
    const fetcher = jest.fn().mockRejectedValue(err404);
    const { result } = renderHook(
      () => useResourceSafe('Task', 'T1', fetcher),
      { wrapper: wrapper(qc) }
    );
    await waitFor(() => expect(result.current.isMissing).toBe(true));

    await act(async () => result.current.restore());
    expect(result.current.isMissing).toBe(false);
    // Cache now has the restored data
    expect(qc.getQueryData(['Task', 'T1'])).toBeTruthy();
  });
});

// ─── useSafeMutation ─────────────────────────────────────────────────────────

describe('useSafeMutation()', () => {
  it('calls onMissing on 404 — does NOT throw', async () => {
    const onMissing = jest.fn();
    const onError   = jest.fn();
    const mutateFn  = jest.fn().mockRejectedValue(err404);

    const { result } = renderHook(() => useSafeMutation(mutateFn, { onMissing, onError }));

    await act(async () => {
      await result.current.mutate({ id: 'T1' }, GOOD_DATA);
    });

    expect(result.current.isMissing).toBe(true);
    expect(result.current.missingData).toEqual(GOOD_DATA);
    expect(onMissing).toHaveBeenCalledWith(GOOD_DATA);
    expect(onError).not.toHaveBeenCalled();
  });

  it('throws on non-404 so React Query handles it normally', async () => {
    const onMissing = jest.fn();
    const mutateFn  = jest.fn().mockRejectedValue(err500);

    const { result } = renderHook(() => useSafeMutation(mutateFn, { onMissing }));

    await expect(
      act(async () => { await result.current.mutate({ id: 'T1' }); })
    ).rejects.toThrow('Server Error');

    expect(result.current.isMissing).toBe(false);
    expect(onMissing).not.toHaveBeenCalled();
  });

  it('sets status=success and calls onSuccess on happy path', async () => {
    const onSuccess = jest.fn();
    const mutateFn  = jest.fn().mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useSafeMutation(mutateFn, { onSuccess }));

    await act(async () => { await result.current.mutate({}); });

    expect(result.current.status).toBe('success');
    expect(onSuccess).toHaveBeenCalledWith({ ok: true });
  });
});