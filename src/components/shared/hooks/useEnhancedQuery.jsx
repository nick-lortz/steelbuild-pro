import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from '@/components/ui/notifications';
import rumMonitor from '@/components/monitoring/RUMMonitor';

const TIMEOUT_MS = 10000; // 10s
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

function addJitter(delay) {
  return delay + Math.random() * 1000;
}

export function useEnhancedQuery(queryKey, queryFn, options = {}) {
  const queryClient = useQueryClient();
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = useRef(null);
  const startTimeRef = useRef(0);

  const wrappedQueryFn = useCallback(async (context) => {
    startTimeRef.current = Date.now();
    
    // Create abort controller for timeout
    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => {
      abortControllerRef.current?.abort();
    }, TIMEOUT_MS);

    try {
      // Check cache first (last-known-good)
      const cached = queryClient.getQueryData(queryKey);
      if (cached && options.returnStaleOnError) {
        // Return cached data immediately, fetch in background
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey });
        }, 100);
      }

      const result = await queryFn({
        ...context,
        signal: abortControllerRef.current.signal
      });

      const duration = Date.now() - startTimeRef.current;
      
      // Track successful API call
      if (rumMonitor) {
        rumMonitor.trackApiCall(
          queryKey.join('/'),
          duration,
          200
        );
      }

      clearTimeout(timeoutId);
      setRetryCount(0);
      return result;

    } catch (error) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTimeRef.current;

      // Track failed API call
      if (rumMonitor) {
        rumMonitor.trackApiCall(
          queryKey.join('/'),
          duration,
          error.response?.status || 0,
          error.message
        );
      }

      // If timeout, return stale data if available
      if (error.name === 'AbortError') {
        const stale = queryClient.getQueryData(queryKey);
        if (stale && options.returnStaleOnError) {
          toast.warning('Request timed out, showing cached data');
          return stale;
        }
        throw new Error('Request timeout - please check your connection');
      }

      throw error;
    }
  }, [queryKey, queryFn, queryClient, options.returnStaleOnError]);

  const query = useQuery({
    queryKey,
    queryFn: wrappedQueryFn,
    staleTime: options.staleTime || 5 * 60 * 1000,
    gcTime: options.gcTime || 30 * 60 * 1000,
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      
      // Don't retry mutations (only GET-like queries)
      if (options.method && options.method !== 'GET') {
        return false;
      }

      return failureCount < MAX_RETRIES;
    },
    retryDelay: (attemptIndex) => {
      setRetryCount(attemptIndex);
      const delay = RETRY_DELAYS[attemptIndex - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      return addJitter(delay);
    },
    ...options
  });

  // Cancel on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    ...query,
    retryCount,
    isTimedOut: query.error?.message?.includes('timeout')
  };
}

// Request deduplication & coalescing
const pendingRequests = new Map();
const DEDUPE_WINDOW_MS = 500;

export function useCoalescedQuery(queryKey, queryFn, options = {}) {
  const requestKey = JSON.stringify(queryKey);
  
  const coalescedQueryFn = useCallback(async (context) => {
    // Check if there's a pending request for this key
    const pending = pendingRequests.get(requestKey);
    const now = Date.now();
    
    if (pending && (now - pending.timestamp) < DEDUPE_WINDOW_MS) {
      // Return existing promise
      return pending.promise;
    }

    // Create new request
    const promise = queryFn(context);
    pendingRequests.set(requestKey, {
      promise,
      timestamp: now
    });

    try {
      const result = await promise;
      
      // Clean up after window
      setTimeout(() => {
        pendingRequests.delete(requestKey);
      }, DEDUPE_WINDOW_MS);
      
      return result;
    } catch (error) {
      pendingRequests.delete(requestKey);
      throw error;
    }
  }, [requestKey, queryFn]);

  return useEnhancedQuery(queryKey, coalescedQueryFn, options);
}