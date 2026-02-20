import React from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import LoadingState from '@/components/layout/LoadingState';

/**
 * Route guard component to validate prerequisites before allowing page access
 */
export default function RouteGuard({ 
  children, 
  requireProject = false,
  requireDrawings = false,
  requireRoleAdmin = false 
}) {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  if (userLoading) {
    return <LoadingState message="Checking access..." />;
  }

  // Check admin role requirement
  if (requireRoleAdmin && user?.role !== 'admin') {
    return <Navigate to={createPageUrl('ProjectDashboard')} replace />;
  }

  // Additional guards can be added here
  
  return children;
}

/**
 * Hook to check prerequisites within components
 */
export function usePrerequisiteCheck(type, entityId) {
  const { data, isLoading } = useQuery({
    queryKey: ['prerequisite-check', type, entityId],
    queryFn: async () => {
      if (!entityId) return { valid: false, missing: ['Entity ID required'] };
      
      const missing = [];
      
      if (type === 'work_package') {
        const wp = await base44.entities.WorkPackage.filter({ id: entityId });
        if (!wp[0]) return { valid: false, missing: ['Work package not found'] };
        
        const workPackage = wp[0];
        
        // Check drawings
        if (!workPackage.linked_drawing_set_ids?.length) {
          missing.push('No drawings linked');
        }
        
        // Check RFIs
        const openRFIs = await base44.entities.RFI.filter({
          id: { $in: workPackage.linked_rfi_ids || [] },
          status: { $in: ['draft', 'submitted', 'under_review'] }
        });
        
        if (openRFIs.length > 0) {
          missing.push(`${openRFIs.length} open RFI(s)`);
        }
      }
      
      return {
        valid: missing.length === 0,
        missing
      };
    },
    enabled: !!entityId
  });
  
  return { ...data, isLoading };
}