import React from 'react';
import { useProjectRole } from './hooks/useProjectRole';
import { Lock } from 'lucide-react';

/**
 * ProjectRoleGate - Conditionally renders children based on project-scoped role.
 *
 * Usage:
 *   <ProjectRoleGate permission="financials:edit">
 *     <EditFinancialsButton />
 *   </ProjectRoleGate>
 *
 *   <ProjectRoleGate minRole="apm">
 *     <ScheduleEditor />
 *   </ProjectRoleGate>
 *
 *   <ProjectRoleGate permission="changeorders:approve" fallback={<ReadOnlyView />}>
 *     <ApproveButton />
 *   </ProjectRoleGate>
 */
export default function ProjectRoleGate({
  permission,
  minRole,
  projectId,
  children,
  fallback = null,
  showLock = false,
}) {
  const { can, projectRole, isLoading, roleAtLeast: checkRole } = useProjectRoleWithHelper(projectId);

  if (isLoading) return null;

  let allowed = false;
  if (permission) {
    allowed = can(permission);
  } else if (minRole) {
    const { roleAtLeast } = require('./hooks/useProjectRole');
    allowed = roleAtLeast(projectRole, minRole);
  } else {
    allowed = !!projectRole;
  }

  if (allowed) return <>{children}</>;

  if (showLock) {
    return (
      <div className="inline-flex items-center gap-1 opacity-40 cursor-not-allowed" title="Insufficient project role">
        <Lock size={14} className="text-zinc-500" />
        <span className="text-xs text-zinc-500">Restricted</span>
      </div>
    );
  }

  return fallback;
}

// Internal helper to also expose roleAtLeast via the hook result
function useProjectRoleWithHelper(projectId) {
  const result = useProjectRole(projectId);
  const { roleAtLeast } = require('./hooks/useProjectRole');
  return { ...result, roleAtLeast };
}