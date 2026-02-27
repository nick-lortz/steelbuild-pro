import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from './useAuth';
import { useActiveProject } from './useActiveProject';

/**
 * Project-scoped role hierarchy (higher index = more access)
 */
export const PROJECT_ROLE_HIERARCHY = [
  'gc_readonly',       // External GC: read-only views
  'fabricator_ext',    // External fab partner: fab-phase visibility
  'field',             // Field crew: field tools, daily logs, erection tasks
  'shop',              // Shop: fabrication, work packages, delivery
  'detailer',          // Detailer: drawings, RFIs, submittals
  'apm',               // APM: most PM actions, no financial approval
  'pm',                // PM: full project control
  'admin',             // System admin: everything
];

/**
 * Project-scoped permission definitions
 * Each key maps to the MINIMUM project role required
 */
export const PROJECT_PERMISSIONS = {
  // View permissions
  'project:view':           'gc_readonly',
  'schedule:view':          'gc_readonly',
  'drawings:view':          'gc_readonly',
  'rfis:view':              'gc_readonly',
  'deliveries:view':        'gc_readonly',

  // Field permissions
  'dailylogs:create':       'field',
  'dailylogs:edit':         'field',
  'photos:upload':          'field',
  'fieldtools:use':         'field',
  'tasks:update_status':    'field',

  // Shop permissions
  'fabrication:view':       'shop',
  'fabrication:edit':       'shop',
  'workpackages:view':      'shop',
  'workpackages:edit':      'shop',
  'deliveries:edit':        'shop',

  // Detailer permissions
  'drawings:edit':          'detailer',
  'drawings:upload':        'detailer',
  'submittals:create':      'detailer',
  'submittals:edit':        'detailer',
  'rfis:create':            'detailer',
  'rfis:edit':              'detailer',

  // APM permissions
  'tasks:create':           'apm',
  'tasks:edit':             'apm',
  'tasks:delete':           'apm',
  'schedule:edit':          'apm',
  'changeorders:create':    'apm',
  'meetings:create':        'apm',
  'notes:create':           'apm',

  // PM permissions
  'financials:view':        'pm',
  'financials:edit':        'pm',
  'changeorders:approve':   'pm',
  'sov:edit':               'pm',
  'rfis:approve':           'pm',
  'members:manage':         'pm',
  'invoices:approve':       'pm',

  // Admin only
  'project:delete':         'admin',
  'costcodes:edit':         'admin',
  'settings:manage':        'admin',
};

/**
 * Returns true if roleA >= roleB in the hierarchy
 */
export function roleAtLeast(roleA, roleB) {
  const idxA = PROJECT_ROLE_HIERARCHY.indexOf(roleA);
  const idxB = PROJECT_ROLE_HIERARCHY.indexOf(roleB);
  if (idxA === -1 || idxB === -1) return false;
  return idxA >= idxB;
}

/**
 * Hook: fetches the current user's project-scoped role for the active project.
 * Falls back to system role for admins.
 */
export function useProjectRole(projectId) {
  const { user } = useAuth();
  const { activeProjectId } = useActiveProject();
  const pid = projectId || activeProjectId;

  const { data: membership, isLoading } = useQuery({
    queryKey: ['projectMembership', pid, user?.email],
    queryFn: async () => {
      if (!pid || !user?.email) return null;
      const results = await base44.entities.ProjectMember.filter({
        project_id: pid,
        user_email: user.email,
        is_active: true,
      });
      return results?.[0] || null;
    },
    enabled: !!pid && !!user?.email && user?.role !== 'admin',
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // System admins always get 'admin' project role
  const projectRole = user?.role === 'admin' ? 'admin' : (membership?.role || null);

  /**
   * Check if user has a specific project-scoped permission
   */
  function can(permission) {
    if (!projectRole) return false;
    if (projectRole === 'admin') return true;
    const minRole = PROJECT_PERMISSIONS[permission];
    if (!minRole) return false;
    return roleAtLeast(projectRole, minRole);
  }

  return {
    projectRole,
    membership,
    isLoading,
    can,
    isMember: !!membership || user?.role === 'admin',
    // Convenience role checks
    isAdmin: projectRole === 'admin',
    isPM: roleAtLeast(projectRole, 'pm'),
    isAPM: roleAtLeast(projectRole, 'apm'),
    isDetailer: roleAtLeast(projectRole, 'detailer'),
    isShop: roleAtLeast(projectRole, 'shop'),
    isField: roleAtLeast(projectRole, 'field'),
    isReadOnly: projectRole === 'gc_readonly' || projectRole === 'fabricator_ext',
  };
}