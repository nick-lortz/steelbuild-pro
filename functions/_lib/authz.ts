// Authorization helpers for role-based access control

export function requireAuth(user) {
  if (!user?.email) {
    throw new Error("Unauthorized: Authentication required");
  }
  return user;
}

export function requireRole(user, allowedRoles) {
  requireAuth(user);
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  if (!roles.includes(user.role)) {
    throw new Error(`Forbidden: Requires one of these roles: ${roles.join(", ")}`);
  }
  return user;
}

export function requireAdmin(user) {
  return requireRole(user, "admin");
}

export function requireConfirm(input, message = "This operation requires explicit confirmation") {
  if (!input || input.confirm !== true) {
    throw new Error(`${message}. Pass { confirm: true } to proceed.`);
  }
}

export async function requireProjectMember(base44, userId, projectId) {
  const membership = await base44.entities.ProjectMember.filter({
    project_id: projectId,
    user_email: userId,
    is_active: true
  });
  
  if (!membership || membership.length === 0) {
    throw new Error("Forbidden: Not a member of this project");
  }
  
  return membership[0];
}

export async function requireProjectRole(base44, userId, projectId, allowedRoles) {
  const member = await requireProjectMember(base44, userId, projectId);
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  if (!roles.includes(member.role)) {
    throw new Error(`Forbidden: Requires project role: ${roles.join(" or ")}`);
  }
  
  return member;
}