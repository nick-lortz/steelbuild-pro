import { useQuery } from '@tanstack/react-query';

/**
 * Optimized query hook with built-in caching and performance settings
 */
export function useOptimizedQuery(key, queryFn, options = {}) {
  return useQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn,
    staleTime: options.staleTime || 5 * 60 * 1000, // 5 minutes
    gcTime: options.gcTime || options.cacheTime || 10 * 60 * 1000, // 10 minutes
    retry: options.retry !== undefined ? options.retry : 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: options.refetchOnWindowFocus !== undefined ? options.refetchOnWindowFocus : false,
    ...options,
  });
}
