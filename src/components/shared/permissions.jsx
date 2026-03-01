/**
 * Global (system-level) role-based permissions framework
 * For project-scoped permissions, use useProjectRole + ProjectRoleGate.
 *
 * Usage: checkPermission(user, 'financials:edit', { project })
 */

export const PERMISSIONS = {
  // Financial permissions
  'financials:view': ['admin', 'user'],
  'financials:edit': ['admin'],
  'financials:delete': ['admin'],
  
  // Project permissions
  'projects:create': ['admin', 'project_manager', 'user'],
  'projects:edit': ['admin', 'project_manager', 'user'],
  'projects:delete': ['admin'],
  'projects:view': ['admin', 'project_manager', 'user'],
  
  // User management
  'users:invite': ['admin'],
  'users:manage': ['admin'],
  
  // Cost codes
  'costcodes:edit': ['admin'],
  
  // SOV
  'sov:edit': ['admin'],
  'sov:approve': ['admin'],
  
  // Change orders
  'changeorders:create': ['admin', 'user'],
  'changeorders:approve': ['admin'],
  
  // Tasks & Schedule
  'tasks:create': ['admin', 'user'],
  'tasks:edit': ['admin', 'user'],
  'tasks:delete': ['admin'],
  
  // Resources
  'resources:manage': ['admin'],
  
  // Settings
  'settings:manage': ['admin'],
  
  // Reports
  'reports:view': ['admin', 'user'],
  'reports:export': ['admin', 'user']
};

/**
 * Check if user has system-level permission.
 * For project-scoped checks, use useProjectRole().can(permission) instead.
 */
export function checkPermission(user, permission, context = {}) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) {
    console.warn(`Permission ${permission} not defined`);
    return false;
  }
  
  if (!allowedRoles.includes(user.role)) return false;
  
  if (context.project && context.project.assigned_users) {
    const isAssigned = context.project.assigned_users.includes(user.email);
    if (!isAssigned && user.role !== 'admin') return false;
  }
  
  return true;
}

export function checkAllPermissions(user, permissions, context = {}) {
  return permissions.every(perm => checkPermission(user, perm, context));
}

export function checkAnyPermission(user, permissions, context = {}) {
  return permissions.some(perm => checkPermission(user, perm, context));
}

export function getUserPermissions(user) {
  if (!user) return [];
  return Object.keys(PERMISSIONS).filter(perm => checkPermission(user, perm));
}

export function usePermissions(user) {
  return {
    can: (permission, context) => checkPermission(user, permission, context),
    canAll: (permissions, context) => checkAllPermissions(user, permissions, context),
    canAny: (permissions, context) => checkAnyPermission(user, permissions, context),
    permissions: getUserPermissions(user)
  };
}