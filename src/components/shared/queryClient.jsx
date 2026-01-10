import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Avoid burst refetching
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      
      // Smart retry logic
      retry: (failureCount, error) => {
        const msg = String(error?.message || '');
        
        // Don't retry auth errors or not found
        if (msg.includes('401') || msg.includes('403') || msg.includes('404')) {
          return false;
        }
        
        // Don't retry rate limits - handled by http layer
        if (msg.includes('429')) {
          return false;
        }
        
        return failureCount < 3;
      },
      
      // Exponential backoff
      retryDelay: (attempt) => Math.min(2000, 300 * Math.pow(2, attempt)),
      
      // Cache wisely to reduce calls
      staleTime: 30000,        // 30s - data stays fresh
      gcTime: 5 * 60000,       // 5min - cache time (formerly cacheTime)
    },
  },
});