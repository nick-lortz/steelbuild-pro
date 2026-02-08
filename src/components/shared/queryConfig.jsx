/**
 * STANDARDIZED QUERY CONFIGURATION
 * 
 * Consistent staleTime and gcTime across the app
 */

export const QUERY_CONFIG = {
  // Static reference data (rarely changes)
  STATIC: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000     // 1 hour
  },
  
  // Frequently updated data
  DYNAMIC: {
    staleTime: 2 * 60 * 1000,  // 2 minutes
    gcTime: 10 * 60 * 1000     // 10 minutes
  },
  
  // Real-time critical data
  REALTIME: {
    staleTime: 30 * 1000,      // 30 seconds
    gcTime: 5 * 60 * 1000      // 5 minutes
  },
  
  // User session (never stale)
  SESSION: {
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  }
};

/**
 * Usage:
 * 
 * // For static data (cost codes, resources)
 * useQuery({
 *   queryKey: ['cost-codes'],
 *   queryFn: () => apiClient.entities.CostCode.list(),
 *   ...QUERY_CONFIG.STATIC
 * })
 * 
 * // For dynamic data (projects, tasks, RFIs)
 * useQuery({
 *   queryKey: ['projects'],
 *   queryFn: () => apiClient.entities.Project.list(),
 *   ...QUERY_CONFIG.DYNAMIC
 * })
 * 
 * // For real-time data (dashboard KPIs)
 * useQuery({
 *   queryKey: ['dashboard-kpis'],
 *   queryFn: () => calculateKPIs(),
 *   ...QUERY_CONFIG.REALTIME
 * })
 * 
 * // For user session
 * useQuery({
 *   queryKey: ['currentUser'],
 *   queryFn: () => apiClient.auth.me(),
 *   ...QUERY_CONFIG.SESSION
 * })
 */