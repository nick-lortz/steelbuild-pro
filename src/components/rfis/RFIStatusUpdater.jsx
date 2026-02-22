import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function RFIStatusUpdater({ rfi, onStatusChange }) {
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      return await base44.entities.RFI.update(rfi.id, { 
        status: newStatus,
        ...(newStatus === 'closed' && { closed_date: new Date().toISOString() }),
        ...(newStatus === 'answered' && !rfi.response_date && { response_date: new Date().toISOString() })
      });
    },
    onMutate: async (newStatus) => {
      await queryClient.cancelQueries({ queryKey: ['rfis'] });
      
      const previousRFIs = queryClient.getQueryData(['rfis', rfi.project_id]);
      
      queryClient.setQueryData(['rfis', rfi.project_id], (old = []) =>
        old.map(r => r.id === rfi.id ? { 
          ...r, 
          status: newStatus,
          ...(newStatus === 'closed' && { closed_date: new Date().toISOString() }),
          ...(newStatus === 'answered' && !r.response_date && { response_date: new Date().toISOString() })
        } : r)
      );
      
      return { previousRFIs };
    },
    onError: (error, newStatus, context) => {
      queryClient.setQueryData(['rfis', rfi.project_id], context.previousRFIs);
      toast.error('Failed to update status');
    },
    onSuccess: (data, newStatus) => {
      toast.success(`RFI marked as ${newStatus}`);
      if (onStatusChange) onStatusChange(rfi.id, newStatus);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
    }
  });

  return null; // Hook only, consumed by parent component
}

export function useOptimisticRFIStatus(rfi) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newStatus) => {
      return await base44.entities.RFI.update(rfi.id, { 
        status: newStatus,
        ...(newStatus === 'closed' && { closed_date: new Date().toISOString() }),
        ...(newStatus === 'answered' && !rfi.response_date && { response_date: new Date().toISOString() })
      });
    },
    onMutate: async (newStatus) => {
      await queryClient.cancelQueries({ queryKey: ['rfis'] });
      
      const previousRFIs = queryClient.getQueryData(['rfis', rfi.project_id]);
      
      queryClient.setQueryData(['rfis', rfi.project_id], (old = []) =>
        old.map(r => r.id === rfi.id ? { 
          ...r, 
          status: newStatus,
          ...(newStatus === 'closed' && { closed_date: new Date().toISOString() }),
          ...(newStatus === 'answered' && !r.response_date && { response_date: new Date().toISOString() })
        } : r)
      );
      
      return { previousRFIs };
    },
    onError: (error, newStatus, context) => {
      queryClient.setQueryData(['rfis', rfi.project_id], context.previousRFIs);
      toast.error('Failed to update status');
    },
    onSuccess: (data, newStatus) => {
      toast.success(`RFI marked as ${newStatus}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
    }
  });
}