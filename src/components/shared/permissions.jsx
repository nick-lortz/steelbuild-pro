/**
 * Role-based permissions framework
 * Usage: checkPermission(user, 'financials:edit', { project })
 */

export const PERMISSIONS = {
  // Financial permissions
  'financials:view': ['admin', 'user'],
  'financials:edit': ['admin'],
  'financials:delete': ['admin'],
  
  // Project permissions
  'projects:create': ['admin'],
  'projects:edit': ['admin'],
  'projects:delete': ['admin'],
  'projects:view': ['admin', 'user'],
  
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
 * Check if user has permission
 * @param {object} user - Current user object with role property
 * @param {string} permission - Permission key (e.g., 'financials:edit')
 * @param {object} context - Optional context (e.g., { project })
 * @returns {boolean}
 */
export function checkPermission(user, permission, context = {}) {
  if (!user) return false;
  
  // Admin has all permissions
  if (user.role === 'admin') return true;
  
  // Check if permission exists
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) {
    console.warn(`Permission ${permission} not defined`);
    return false;
  }
  
  // Check if user's role is in allowed roles
  if (!allowedRoles.includes(user.role)) return false;
  
  // Context-based checks
  if (context.project && context.project.assigned_users) {
    // Check if user is assigned to project
    const isAssigned = context.project.assigned_users.includes(user.email);
    if (!isAssigned && user.role !== 'admin') return false;
  }
  
  return true;
}

/**
 * Check multiple permissions (user must have ALL)
 */
export function checkAllPermissions(user, permissions, context = {}) {
  return permissions.every(perm => checkPermission(user, perm, context));
}

/**
 * Check multiple permissions (user must have ANY)
 */
export function checkAnyPermission(user, permissions, context = {}) {
  return permissions.some(perm => checkPermission(user, perm, context));
}

/**
 * Get list of permissions for current user
 */
export function getUserPermissions(user) {
  if (!user) return [];
  
  return Object.keys(PERMISSIONS).filter(perm => 
    checkPermission(user, perm)
  );
}

/**
 * Hook for using permissions in React components
 */
export function usePermissions(user) {
  return {
    can: (permission, context) => checkPermission(user, permission, context),
    canAll: (permissions, context) => checkAllPermissions(user, permissions, context),
    canAny: (permissions, context) => checkAnyPermission(user, permissions, context),
    permissions: getUserPermissions(user)
  };
}