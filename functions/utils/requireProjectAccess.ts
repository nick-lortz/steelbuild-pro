/**
 * Authorization utility for project-scoped operations
 * Permission levels: view, edit, admin
 */

export async function requireProjectAccess(base44, user, projectId, permission = 'view') {
  if (!user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  // Admin always has access
  if (user.role === 'admin') {
    return true;
  }

  // Fetch project
  const projects = await base44.asServiceRole.entities.Project.filter({ id: projectId });
  const project = projects[0];

  if (!project) {
    throw new Error('Project not found');
  }

  // Check user assignment
  const isAssigned = 
    project.project_manager === user.email ||
    project.superintendent === user.email ||
    (project.assigned_users && project.assigned_users.includes(user.email));

  if (!isAssigned) {
    throw new Error(`Forbidden: User not assigned to project`);
  }

  // Check permission level
  if (permission === 'admin') {
    const isAdmin = project.project_manager === user.email || user.role === 'admin';
    if (!isAdmin) {
      throw new Error('Forbidden: Admin access required');
    }
  }

  if (permission === 'edit') {
    // All assigned users can edit (view-only users would not be in assigned_users)
    return true;
  }

  return true;
}