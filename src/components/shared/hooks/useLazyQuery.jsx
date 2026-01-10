import { useQuery } from '@tanstack/react-query';
import { useApiWithRetry } from './useApiWithRetry';
import { useState, useEffect, useRef } from 'react';

export function useLazyQuery(queryKey, queryFn, options = {}) {
  const { executeWithRetry } = useApiWithRetry();
  const [enabled, setEnabled] = useState(false);
  const hasExecutedRef = useRef(false);

  const query = useQuery({
    queryKey,
    queryFn: () => executeWithRetry(queryFn, {
      maxRetries: options.maxRetries,
      showToast: options.showToast
    }),
    enabled: enabled && !hasExecutedRef.current,
    staleTime: options.staleTime || 5 * 60 * 1000,
    gcTime: options.gcTime || 10 * 60 * 1000,
    retry: false,
    ...options
  });

  useEffect(() => {
    if (query.isSuccess && enabled) {
      hasExecutedRef.current = true;
    }
  }, [query.isSuccess, enabled]);

  const execute = () => {
    if (!hasExecutedRef.current) {
      setEnabled(true);
    }
  };

  const reset = () => {
    hasExecutedRef.current = false;
    setEnabled(false);
  };

  return {
    ...query,
    execute,
    reset,
    isIdle: !enabled
  };
}