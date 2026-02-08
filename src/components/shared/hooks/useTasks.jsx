import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { toast } from '@/components/ui/notifications';

export function useTasks(sortBy = '-updated_date') {
  return useQuery({
    queryKey: ['tasks', sortBy],
    queryFn: () => apiClient.entities.Task.list(sortBy),
    staleTime: 2 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useProjectTasks(projectId, sortBy = '-updated_date') {
  return useQuery({
    queryKey: ['tasks', 'project', projectId, sortBy],
    queryFn: () => apiClient.entities.Task.filter({ project_id: projectId }, sortBy),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
}

export function useTask(taskId) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const tasks = await apiClient.entities.Task.filter({ id: taskId });
      return tasks[0] || null;
    },
    enabled: !!taskId,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (/** @type {Record<string, any>} */ data) => apiClient.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created');
    },
    onError: (/** @type {any} */ error) => {
      toast.error(error.message || 'Failed to create task');
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (/** @type {{id: string, data: Record<string, any>}} */ payload) =>
      apiClient.entities.Task.update(payload.id, payload.data),
    onSuccess: (_, /** @type {{id: string}} */ variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
      toast.success('Task updated');
    },
    onError: (/** @type {any} */ error) => {
      toast.error(error.message || 'Failed to update task');
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (/** @type {string} */ id) => apiClient.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
    },
    onError: (/** @type {any} */ error) => {
      toast.error(error.message || 'Failed to delete task');
    },
  });
}
