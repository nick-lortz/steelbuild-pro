import { toast } from '@/components/ui/notifications';

/**
 * Creates a standardized mutation configuration with error handling
 * @param {Object} config - Mutation configuration
 * @param {Function} config.mutationFn - The mutation function to execute
 * @param {Function} [config.onSuccess] - Optional success callback
 * @param {Function} [config.onError] - Optional error callback
 * @param {string} [config.successMessage] - Optional success toast message
 * @param {string} [config.errorMessage] - Optional error toast message prefix
 * @returns {Object} Mutation configuration with standardized error handling
 */
export function createMutationConfig({
  mutationFn,
  onSuccess,
  onError,
  successMessage,
  errorMessage = 'Operation failed'
}) {
  return {
    mutationFn,
    onSuccess: (...args) => {
      if (successMessage) {
        toast.success(successMessage);
      }
      if (onSuccess) {
        onSuccess(...args);
      }
    },
    onError: (error, ...args) => {
      const message = error?.response?.data?.error || error?.message || errorMessage;
      toast.error(message);
      if (onError) {
        onError(error, ...args);
      }
    }
  };
}

/**
 * Creates a standardized query configuration with caching
 * @param {Object} config - Query configuration
 * @param {Array<string>} config.queryKey - React Query key
 * @param {Function} config.queryFn - The query function to execute
 * @param {number} [config.staleTime] - Time in ms before data is considered stale (default: 5 min)
 * @param {number} [config.gcTime] - Time in ms before inactive queries are garbage collected (default: 10 min)
 * @returns {Object} Query configuration with caching defaults
 */
export function createQueryConfig({
  queryKey,
  queryFn,
  staleTime = 5 * 60 * 1000, // 5 minutes default
  gcTime = 10 * 60 * 1000, // 10 minutes default
  ...rest
}) {
  return {
    queryKey,
    queryFn,
    staleTime,
    gcTime,
    ...rest
  };
}