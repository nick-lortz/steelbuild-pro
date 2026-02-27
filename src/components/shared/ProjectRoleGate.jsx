import React from 'react';
import { useProjectRole, roleAtLeast } from './hooks/useProjectRole';
import { Lock } from 'lucide-react';

/**
 * ProjectRoleGate - Conditionally renders children based on project-scoped role.
 *
 * Props:
 *   permission  - string key from PROJECT_PERMISSIONS (e.g. 'financials:edit')
 *   minRole     - minimum role string (e.g. 'apm') — used if no permission key
 *   projectId   - override active project (optional)
 *   fallback    - rendered when access denied (default: null)
 *   showLock    - render a lock icon instead of null when denied
 *
 * Examples:
 *   <ProjectRoleGate permission="financials:edit">...</ProjectRoleGate>
 *   <ProjectRoleGate minRole="pm" fallback={<ReadOnlyBanner />}>...</ProjectRoleGate>
 */
export default function ProjectRoleGate({
  permission,
  minRole,
  projectId,
  children,
  fallback = null,
  showLock = false,
}) {
  const { can, projectRole, isLoading } = useProjectRole(projectId);

  if (isLoading) return null;

  let allowed = false;
  if (permission) {
    allowed = can(permission);
  } else if (minRole) {
    allowed = roleAtLeast(projectRole, minRole);
  } else {
    allowed = !!projectRole;
  }

  if (allowed) return <>{children}</>;

  if (showLock) {
    return (
      <span className="inline-flex items-center gap-1 opacity-40 cursor-not-allowed" title="Insufficient project role">
        <Lock size={14} className="text-zinc-500" />
        <span className="text-xs text-zinc-500">Restricted</span>
      </span>
    );
  }

  return fallback;
}