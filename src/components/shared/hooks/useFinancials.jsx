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
      const response = await base44.functions.invoke('getPortfolioMetrics');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useCreateFinancial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => base44.entities.Financial.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['financials']);
      queryClient.invalidateQueries(['portfolio-metrics']);
      toast.success('Financial record created');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create financial record');
    },
  });
}

export function useUpdateFinancial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => base44.entities.Financial.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['financials']);
      queryClient.invalidateQueries(['portfolio-metrics']);
      toast.success('Financial record updated');
    },
    onError: (error) => {
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