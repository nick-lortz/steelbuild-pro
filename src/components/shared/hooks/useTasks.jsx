import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/notifications';

export function useTasks(sortBy = '-updated_date') {
  return useQuery({
    queryKey: ['tasks', sortBy],
    queryFn: () => base44.entities.Task.list(sortBy),
    staleTime: 2 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useProjectTasks(projectId, sortBy = '-updated_date') {
  return useQuery({
    queryKey: ['tasks', 'project', projectId, sortBy],
    queryFn: () => base44.entities.Task.filter({ project_id: projectId }, sortBy),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
}

export function useTask(taskId) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const tasks = await base44.entities.Task.filter({ id: taskId });
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
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      toast.success('Task created');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create task');
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['task', variables.id]);
      toast.success('Task updated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update task');
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      toast.success('Task deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete task');
    },
  });
}