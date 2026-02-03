/**
 * Authentication & Authorization Utilities for Backend Functions
 * 
 * USAGE in backend functions:
 * import { requireAuth, requireAdmin, requireProjectAccess } from './utils/auth.js';
 * 
 * const { user, error } = await requireAuth(req);
 * if (error) return error;
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Verify user is authenticated
 * @returns {{ user: object|null, error: Response|null, base44: object }}
 */
export async function requireAuth(req) {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    
    if (!user) {
      return {
        user: null,
        error: Response.json({ error: 'Unauthorized' }, { status: 401 }),
        base44: null
      };
    }
    
    return { user, error: null, base44 };
  } catch (error) {
    return {
      user: null,
      error: Response.json({ error: 'Authentication failed' }, { status: 401 }),
      base44: null
    };
  }
}

/**
 * Verify user is admin
 */
export async function requireAdmin(req) {
  const { user, error, base44 } = await requireAuth(req);
  
  if (error) return { user: null, error, base44: null };
  
  if (user.role !== 'admin') {
    return {
      user: null,
      error: Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 }),
      base44: null
    };
  }
  
  return { user, error: null, base44 };
}

/**
 * Verify user has access to project
 * @param {string} projectId - Project ID to check
 * @returns {{ user, project, error, base44 }}
 */
export async function requireProjectAccess(req, projectId) {
  const { user, error, base44 } = await requireAuth(req);
  
  if (error) return { user: null, project: null, error, base44: null };
  
  // Fetch project
  const projects = await base44.entities.Project.filter({ id: projectId });
  const project = projects[0];
  
  if (!project) {
    return {
      user: null,
      project: null,
      error: Response.json({ error: 'Project not found' }, { status: 404 }),
      base44: null
    };
  }
  
  // Admin has access to all projects
  if (user.role === 'admin') {
    return { user, project, error: null, base44 };
  }
  
  // Check if user is assigned to project
  const isAssigned = 
    project.project_manager === user.email ||
    project.superintendent === user.email ||
    (project.assigned_users && project.assigned_users.includes(user.email));
  
  if (!isAssigned) {
    return {
      user: null,
      project: null,
      error: Response.json({ error: 'Forbidden: No access to this project' }, { status: 403 }),
      base44: null
    };
  }
  
  return { user, project, error: null, base44 };
}

/**
 * Filter query results by user's project access
 * Use for list/filter operations to ensure users only see their projects
 */
export async function filterByUserProjects(req, entities, projectIdField = 'project_id') {
  const { user, error, base44 } = await requireAuth(req);
  
  if (error) return { filtered: [], error, base44: null };
  
  // Admin sees all
  if (user.role === 'admin') {
    return { filtered: entities, error: null, base44 };
  }
  
  // Get user's accessible project IDs
  const allProjects = await base44.entities.Project.list();
  const accessibleProjectIds = allProjects
    .filter(p => 
      p.project_manager === user.email ||
      p.superintendent === user.email ||
      (p.assigned_users && p.assigned_users.includes(user.email))
    )
    .map(p => p.id);
  
  // Filter entities
  const filtered = entities.filter(e => 
    accessibleProjectIds.includes(e[projectIdField])
  );
  
  return { filtered, error: null, base44 };
}

/**
 * Get list of project IDs user has access to
 */
export async function getUserAccessibleProjects(req) {
  const { user, error, base44 } = await requireAuth(req);
  
  if (error) return { projectIds: [], error, base44: null };
  
  const allProjects = await base44.entities.Project.list();
  
  if (user.role === 'admin') {
    return { 
      projectIds: allProjects.map(p => p.id), 
      error: null, 
      base44 
    };
  }
  
  const projectIds = allProjects
    .filter(p => 
      p.project_manager === user.email ||
      p.superintendent === user.email ||
      (p.assigned_users && p.assigned_users.includes(user.email))
    )
    .map(p => p.id);
  
  return { projectIds, error: null, base44 };
}