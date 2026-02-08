import React, { useEffect } from 'react';
import { apiClient } from '@/api/client';
import { toast } from '@/components/ui/notifications';

export default function ECCAutoCalculator({ projectId, trigger }) {
  useEffect(() => {
    if (!projectId || !trigger) return;

    const calculateECC = async () => {
      try {
        const response = await apiClient.functions.invoke('autoCalculateECC', { project_id: projectId });
        if (response.data?.updates_count > 0) {
          toast.success(`Updated ECC for ${response.data.updates_count} financial records`);
        }
      } catch (error) {
        console.error('ECC calculation failed:', error);
      }
    };

    calculateECC();
  }, [projectId, trigger]);

  return null;
}