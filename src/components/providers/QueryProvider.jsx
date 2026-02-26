import React from 'react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { showErrorToast } from '@/components/shared/errorHandling';

// Create QueryClient exactly once
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes – don't re-fetch unless stale
      gcTime: 1000 * 60 * 30,    // 30 minutes in cache
      retry: 1,
      refetchOnWindowFocus: false, // kills the #1 lag source: re-fetching all queries on tab switch
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 0,
    },
  },
  // Global error handling
  queryCache: new QueryCache({
    onError: (error) => {
      // Only show toast for actual errors, not cancellations
      if (error?.message !== 'canceled') {
        showErrorToast(error);
      }
    },
  }),
});

/**
 * QueryProvider wraps the entire app tree.
 * CRITICAL: This component MUST wrap Router and all page content.
 * There must be exactly ONE QueryClientProvider in the app tree.
 *
 * Usage: <QueryProvider><Router>...</Router></QueryProvider>
 */
export function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export { queryClient };