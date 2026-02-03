/**
 * Enforces project access control. Returns {user, base44, project} or throws 401/403.
 * Used by all project-scoped endpoints to prevent IDOR.
 */
export async function requireProjectAccess(base44, user, projectId) {
  if (!user) throw { status: 401, message: 'Unauthorized' };

  const projects = await base44.asServiceRole.entities.Project.filter({ id: projectId });
  if (!projects || projects.length === 0) {
    throw { status: 404, message: 'Project not found' };
  }

  const project = projects[0];

  // Admin can access any project
  if (user.role === 'admin') {
    return { user, base44, project };
  }

  // User must be assigned to project
  const isAssigned = 
    project.project_manager === user.email ||
    project.superintendent === user.email ||
    (project.assigned_users && project.assigned_users.includes(user.email));

  if (!isAssigned) {
    throw { status: 403, message: 'Access denied: not assigned to this project' };
  }

  return { user, base44, project };
}