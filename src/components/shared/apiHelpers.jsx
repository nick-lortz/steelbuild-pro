import { toast } from '@/components/ui/notifications';
import { base44 } from '@/api/base44Client';

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

// Utility: Get API key dynamically via base44.auth.me()
export async function getApiKey() {
    try {
        const user = await base44.auth.me();
        if (!user?.api_key) throw new Error('API key not found on user object');
        return user.api_key;
    } catch (err) {
        console.error('Failed to retrieve API key:', err.message);
        throw err;
    }
}

// Utility: Central fetch handler with auth + error handling
export async function apiFetch(endpoint, options = {}) {
    const apiKey = await getApiKey();

    const response = await fetch(endpoint, {
        ...options,
        headers: {
            'api_key': apiKey,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
    }

    return await response.json();
}

// READ: Fetch all Project entities
export async function fetchProjectEntities() {
    try {
        const data = await apiFetch(
            `/api/apps/694bc0dd754d739afc7067e9/entities/Project`
        );
        console.log('Projects fetched:', data);
        return data;
    } catch (err) {
        console.error('fetchProjectEntities failed:', err.message);
        return null;
    }
}

// UPDATE: Update a single Project entity by ID
export async function updateProjectEntity(entityId, updateData) {
    if (!entityId) {
        console.error('updateProjectEntity: entityId is required');
        return null;
    }
    if (!updateData || typeof updateData !== 'object' || Object.keys(updateData).length === 0) {
        console.error('updateProjectEntity: updateData must be a non-empty object');
        return null;
    }

    try {
        const data = await apiFetch(
            `/api/apps/694bc0dd754d739afc7067e9/entities/Project/${entityId}`,
            {
                method: 'PUT',
                body: JSON.stringify(updateData)
            }
        );
        console.log('Project updated:', data);
        return data;
    } catch (err) {
        console.error('updateProjectEntity failed:', err.message);
        return null;
    }
}