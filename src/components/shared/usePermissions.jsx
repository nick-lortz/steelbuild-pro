import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function usePermissions() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
  });

  const isAdmin = currentUser?.role === 'admin';
  const isUser = currentUser?.role === 'user';

  return {
    currentUser,
    isAdmin,
    isUser,
    can: {
      // Project permissions
      createProject: true,
      editProject: true,
      deleteProject: true,
      viewProject: true,

      // Financial permissions
      editFinancials: isAdmin,
      deleteFinancials: isAdmin,
      
      // Drawing permissions
      approveDrawings: isAdmin,
      deleteDrawings: isAdmin,

      // RFI permissions
      deleteRFI: isAdmin,
      
      // Change Order permissions
      approveChangeOrder: isAdmin,
      deleteChangeOrder: isAdmin,

      // Resource permissions
      editResources: isAdmin,
      deleteResources: isAdmin,

      // User management
      inviteUsers: isAdmin,
      editUsers: isAdmin,
      deleteUsers: isAdmin,

      // Settings
      accessSettings: isAdmin,

      // General
      viewReports: true,
      exportData: true,
    },
  };
}