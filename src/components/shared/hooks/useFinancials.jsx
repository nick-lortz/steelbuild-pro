import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/notifications';

export function useFinancials() {
  return useQuery({
    queryKey: ['financials'],
    queryFn: () => base44.entities.Financial.list(),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useProjectFinancials(projectId) {
  return useQuery({
    queryKey: ['financials', 'project', projectId],
    queryFn: () => base44.entities.Financial.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function usePortfolioMetrics() {
  return useQuery({
    queryKey: ['portfolio-metrics'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getPortfolioMetrics', {});
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useCreateFinancial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (/** @type {Record<string, any>} */ data) => base44.entities.Financial.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-metrics'] });
      toast.success('Financial record created');
    },
    onError: (/** @type {any} */ error) => {
      toast.error(error.message || 'Failed to create financial record');
    },
  });
}

export function useUpdateFinancial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (/** @type {{id: string, data: Record<string, any>}} */ payload) =>
      base44.entities.Financial.update(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-metrics'] });
      toast.success('Financial record updated');
    },
    onError: (/** @type {any} */ error) => {
      toast.error(error.message || 'Failed to update financial record');
    },
  });
}

export function useExpenses(projectId) {
  return useQuery({
    queryKey: ['expenses', projectId],
    queryFn: () => projectId 
      ? base44.entities.Expense.filter({ project_id: projectId })
      : base44.entities.Expense.list(),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
