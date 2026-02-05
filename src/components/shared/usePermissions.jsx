import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Default role permissions
const DEFAULT_PERMISSIONS = {
  admin: {
    projects: { view: true, create: true, edit: true, delete: true },
    schedule: { view: true, create: true, edit: true, delete: true },
    financials: { view: true, create: true, edit: true, delete: true, approve: true },
    rfis: { view: true, create: true, edit: true, delete: true, submit: true },
    change_orders: { view: true, create: true, edit: true, delete: true, approve: true },
    drawings: { view: true, create: true, edit: true, delete: true, approve: true },
    deliveries: { view: true, create: true, edit: true, delete: true },
    labor: { view: true, create: true, edit: true, delete: true, approve: true },
    equipment: { view: true, create: true, edit: true, delete: true },
    documents: { view: true, upload: true, edit: true, delete: true, approve: true },
    reports: { view: true, create: true, export: true },
    users: { view: true, invite: true, edit: true, delete: true },
    settings: { view: true, edit: true }
  },
  executive: {
    projects: { view: true, create: false, edit: false, delete: false },
    schedule: { view: true, create: false, edit: false, delete: false },
    financials: { view: true, create: false, edit: false, delete: false, approve: false },
    rfis: { view: true, create: false, edit: false, delete: false, submit: false },
    change_orders: { view: true, create: false, edit: false, delete: false, approve: true },
    drawings: { view: true, create: false, edit: false, delete: false, approve: false },
    deliveries: { view: true, create: false, edit: false, delete: false },
    labor: { view: true, create: false, edit: false, delete: false, approve: false },
    equipment: { view: true, create: false, edit: false, delete: false },
    documents: { view: true, upload: false, edit: false, delete: false, approve: false },
    reports: { view: true, create: false, export: true },
    users: { view: true, invite: false, edit: false, delete: false },
    settings: { view: true, edit: false }
  },
  project_manager: {
    projects: { view: true, create: true, edit: true, delete: false },
    schedule: { view: true, create: true, edit: true, delete: true },
    financials: { view: true, create: true, edit: true, delete: false, approve: false },
    rfis: { view: true, create: true, edit: true, delete: true, submit: true },
    change_orders: { view: true, create: true, edit: true, delete: false, approve: false },
    drawings: { view: true, create: true, edit: true, delete: false, approve: false },
    deliveries: { view: true, create: true, edit: true, delete: false },
    labor: { view: true, create: true, edit: true, delete: false, approve: true },
    equipment: { view: true, create: true, edit: true, delete: false },
    documents: { view: true, upload: true, edit: true, delete: true, approve: false },
    reports: { view: true, create: true, export: true },
    users: { view: true, invite: false, edit: false, delete: false },
    settings: { view: true, edit: true }
  },
  field_supervisor: {
    projects: { view: true, create: false, edit: false, delete: false },
    schedule: { view: true, create: true, edit: true, delete: false },
    financials: { view: false, create: false, edit: false, delete: false, approve: false },
    rfis: { view: true, create: true, edit: true, delete: false, submit: true },
    change_orders: { view: true, create: false, edit: false, delete: false, approve: false },
    drawings: { view: true, create: false, edit: false, delete: false, approve: false },
    deliveries: { view: true, create: true, edit: true, delete: false },
    labor: { view: true, create: true, edit: true, delete: false, approve: false },
    equipment: { view: true, create: true, edit: true, delete: false },
    documents: { view: true, upload: true, edit: false, delete: false, approve: false },
    reports: { view: true, create: false, export: false },
    users: { view: false, invite: false, edit: false, delete: false },
    settings: { view: true, edit: true }
  },
  field_crew: {
    projects: { view: true, create: false, edit: false, delete: false },
    schedule: { view: true, create: false, edit: false, delete: false },
    financials: { view: false, create: false, edit: false, delete: false, approve: false },
    rfis: { view: true, create: true, edit: false, delete: false, submit: false },
    change_orders: { view: false, create: false, edit: false, delete: false, approve: false },
    drawings: { view: true, create: false, edit: false, delete: false, approve: false },
    deliveries: { view: true, create: false, edit: false, delete: false },
    labor: { view: true, create: true, edit: true, delete: false, approve: false },
    equipment: { view: true, create: true, edit: false, delete: false },
    documents: { view: true, upload: true, edit: false, delete: false, approve: false },
    reports: { view: false, create: false, export: false },
    users: { view: false, invite: false, edit: false, delete: false },
    settings: { view: true, edit: true }
  },
  estimator: {
    projects: { view: true, create: true, edit: true, delete: false },
    schedule: { view: true, create: false, edit: false, delete: false },
    financials: { view: true, create: true, edit: true, delete: false, approve: false },
    rfis: { view: true, create: true, edit: true, delete: false, submit: true },
    change_orders: { view: true, create: true, edit: true, delete: false, approve: false },
    drawings: { view: true, create: false, edit: false, delete: false, approve: false },
    deliveries: { view: true, create: false, edit: false, delete: false },
    labor: { view: true, create: true, edit: true, delete: false, approve: false },
    equipment: { view: true, create: false, edit: false, delete: false },
    documents: { view: true, upload: true, edit: true, delete: false, approve: false },
    reports: { view: true, create: true, export: true },
    users: { view: false, invite: false, edit: false, delete: false },
    settings: { view: true, edit: true }
  },
  detailer: {
    projects: { view: true, create: false, edit: false, delete: false },
    schedule: { view: true, create: false, edit: false, delete: false },
    financials: { view: false, create: false, edit: false, delete: false, approve: false },
    rfis: { view: true, create: true, edit: true, delete: false, submit: true },
    change_orders: { view: true, create: false, edit: false, delete: false, approve: false },
    drawings: { view: true, create: true, edit: true, delete: true, approve: false },
    deliveries: { view: true, create: false, edit: false, delete: false },
    labor: { view: false, create: false, edit: false, delete: false, approve: false },
    equipment: { view: false, create: false, edit: false, delete: false },
    documents: { view: true, upload: true, edit: true, delete: false, approve: false },
    reports: { view: true, create: false, export: false },
    users: { view: false, invite: false, edit: false, delete: false },
    settings: { view: true, edit: true }
  },
  viewer: {
    projects: { view: true, create: false, edit: false, delete: false },
    schedule: { view: true, create: false, edit: false, delete: false },
    financials: { view: false, create: false, edit: false, delete: false, approve: false },
    rfis: { view: true, create: false, edit: false, delete: false, submit: false },
    change_orders: { view: true, create: false, edit: false, delete: false, approve: false },
    drawings: { view: true, create: false, edit: false, delete: false, approve: false },
    deliveries: { view: true, create: false, edit: false, delete: false },
    labor: { view: false, create: false, edit: false, delete: false, approve: false },
    equipment: { view: true, create: false, edit: false, delete: false },
    documents: { view: true, upload: false, edit: false, delete: false, approve: false },
    reports: { view: true, create: false, export: false },
    users: { view: false, invite: false, edit: false, delete: false },
    settings: { view: true, edit: true }
  }
};

export function usePermissions(projectId = null) {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ['permission-overrides', currentUser?.email, projectId],
    queryFn: () => base44.entities.UserPermissionOverride.filter({ 
      user_email: currentUser?.email 
    }),
    enabled: !!currentUser?.email,
    staleTime: 5 * 60 * 1000
  });

  const permissions = useMemo(() => {
    if (!currentUser) {
      return { can: {}, cannot: {}, hasRole: () => false, isAdmin: false };
    }

    // Determine effective role
    const effectiveRole = currentUser.custom_role || 
                          (currentUser.role === 'admin' ? 'admin' : 'project_manager');

    // Get base permissions for role
    let basePerms = DEFAULT_PERMISSIONS[effectiveRole] || DEFAULT_PERMISSIONS.viewer;

    // Apply overrides
    const effectivePerms = JSON.parse(JSON.stringify(basePerms));
    
    overrides.forEach(override => {
      // Skip if project-specific override doesn't match current project
      if (override.project_id && override.project_id !== projectId) return;
      
      // Skip if expired
      if (override.expires_at && new Date(override.expires_at) < new Date()) return;

      // Apply override
      if (effectivePerms[override.module]) {
        effectivePerms[override.module][override.permission_type] = override.granted;
      }
    });

    // Build convenience methods
    const can = {};
    const cannot = {};

    Object.keys(effectivePerms).forEach(module => {
      Object.keys(effectivePerms[module]).forEach(action => {
        const key = `${action}${module.charAt(0).toUpperCase() + module.slice(1)}`;
        can[key] = effectivePerms[module][action];
        cannot[key] = !effectivePerms[module][action];
      });
    });

    // Legacy compatibility
    can.editProject = can.editProjects;
    can.viewFinancials = can.viewFinancials;
    can.editFinancials = can.editFinancials;

    return {
      can,
      cannot,
      raw: effectivePerms,
      hasRole: (role) => effectiveRole === role,
      isAdmin: currentUser.role === 'admin',
      effectiveRole,
      baseRole: currentUser.role
    };
  }, [currentUser, overrides, projectId]);

  return permissions;
}