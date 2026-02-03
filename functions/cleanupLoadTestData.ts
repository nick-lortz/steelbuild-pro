import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAuth } from './utils/auth.js';
import { logger } from './utils/logging.js';

/**
 * Cleanup Load Test Data
 * Removes all LT- prefixed projects and related data
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireAuth(base44);
    
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    logger.info('cleanupLoadTestData', 'Starting cleanup');

    // Find all load test projects
    const allProjects = await base44.asServiceRole.entities.Project.list();
    const loadTestProjects = allProjects.filter(p => p.project_number?.startsWith('LT-'));
    
    let deletedProjects = 0;
    let deletedRFIs = 0;
    let deletedTasks = 0;

    // Delete in batches
    for (const project of loadTestProjects) {
      // Delete related RFIs
      const rfis = await base44.asServiceRole.entities.RFI.filter({ project_id: project.id });
      for (const rfi of rfis) {
        await base44.asServiceRole.entities.RFI.delete(rfi.id);
        deletedRFIs++;
      }

      // Delete related tasks
      const tasks = await base44.asServiceRole.entities.Task.filter({ project_id: project.id });
      for (const task of tasks) {
        await base44.asServiceRole.entities.Task.delete(task.id);
        deletedTasks++;
      }

      // Delete project
      await base44.asServiceRole.entities.Project.delete(project.id);
      deletedProjects++;

      if (deletedProjects % 10 === 0) {
        logger.info('cleanupLoadTestData', `Progress: ${deletedProjects}/${loadTestProjects.length} projects deleted`);
      }
    }

    logger.info('cleanupLoadTestData', 'Cleanup completed', {
      deletedProjects,
      deletedRFIs,
      deletedTasks
    });

    return Response.json({
      success: true,
      deleted: {
        projects: deletedProjects,
        rfis: deletedRFIs,
        tasks: deletedTasks
      }
    });

  } catch (error) {
    logger.error('cleanupLoadTestData', 'Cleanup failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});