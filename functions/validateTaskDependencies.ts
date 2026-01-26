import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Validates task dependencies and checks for circular references
 * Input: { task_id, predecessor_ids }
 * Returns: { valid: boolean, error?: string, circularPath?: string[] }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { task_id, predecessor_ids, project_id } = await req.json();

    if (!predecessor_ids || predecessor_ids.length === 0) {
      return Response.json({ valid: true });
    }

    // Verify user has access to the project
    const projects = await base44.asServiceRole.entities.Project.filter({ id: project_id });
    if (!projects.length) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = projects[0];
    const hasAccess = user.role === 'admin' || 
      project.project_manager === user.email || 
      project.superintendent === user.email ||
      (project.assigned_users && project.assigned_users.includes(user.email));

    if (!hasAccess) {
      return Response.json({ error: 'Access denied to this project' }, { status: 403 });
    }

    // Fetch all project tasks for dependency graph
    const allTasks = await base44.asServiceRole.entities.Task.filter({ 
      project_id 
    });

    // Build adjacency map
    const taskMap = new Map();
    allTasks.forEach(t => {
      taskMap.set(t.id, {
        id: t.id,
        name: t.name,
        predecessors: t.predecessor_ids || []
      });
    });

    // Check each proposed predecessor for circular dependency
    for (const predId of predecessor_ids) {
      const circularPath = detectCircular(task_id, predId, taskMap, []);
      if (circularPath) {
        const pathNames = circularPath.map(id => {
          const task = taskMap.get(id);
          return task ? task.name : id;
        });
        
        return Response.json({
          valid: false,
          error: 'Circular dependency detected',
          circularPath: pathNames
        });
      }
    }

    return Response.json({ valid: true });

  } catch (error) {
    console.error('Validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Detects circular dependency using DFS
 * Returns the circular path if found, null otherwise
 */
function detectCircular(targetId, currentId, taskMap, visited) {
  // If we've reached the target, we have a cycle
  if (currentId === targetId) {
    return [...visited, currentId];
  }

  // If already visited in this path, skip (but not a cycle to target)
  if (visited.includes(currentId)) {
    return null;
  }

  const currentTask = taskMap.get(currentId);
  if (!currentTask || !currentTask.predecessors) {
    return null;
  }

  // Explore predecessors
  const newPath = [...visited, currentId];
  for (const predId of currentTask.predecessors) {
    const result = detectCircular(targetId, predId, taskMap, newPath);
    if (result) {
      return result;
    }
  }

  return null;
}