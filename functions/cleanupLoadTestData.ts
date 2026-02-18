import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin, requireConfirm } from './_lib/authz.js';
import { auditLog } from './_lib/utils.js';

/**
 * Cleanup Load Test Data
 * Removes all LT- prefixed projects and related data
 * REQUIRES: admin role + explicit confirm=true
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    requireAdmin(user);
    
    const body = await req.json();
    requireConfirm(body, "Cleanup requires explicit confirmation { confirm: true }");

    // Hard limit to prevent accidental mass deletion
    const MAX_DELETE_PER_RUN = 1000;
    
    console.log('[INFO] cleanupLoadTestData: Starting cleanup');
    
    // Audit log before deletion
    await auditLog(base44, 'cleanup_load_test_data_initiated', user, {
      timestamp: new Date().toISOString(),
      confirm: body.confirm
    });

    // Find all load test projects
    const allProjects = await base44.asServiceRole.entities.Project.list();
    const loadTestProjects = allProjects.filter(p => p.project_number?.startsWith('LT-'));
    
    if (loadTestProjects.length > MAX_DELETE_PER_RUN) {
      return Response.json({
        error: `Safety limit: Found ${loadTestProjects.length} projects. Max ${MAX_DELETE_PER_RUN} per run.`,
        hint: "Run multiple times or increase MAX_DELETE_PER_RUN in code"
      }, { status: 400 });
    }
    
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
        console.log(`[INFO] Progress: ${deletedProjects}/${loadTestProjects.length} projects deleted`);
      }
    }
    
    // Audit log after deletion
    await auditLog(base44, 'cleanup_load_test_data_completed', user, {
      deleted_count: deletedProjects,
      deleted_rfis: deletedRFIs,
      deleted_tasks: deletedTasks,
      timestamp: new Date().toISOString()
    });

    console.log('[INFO] cleanupLoadTestData: Cleanup completed', {
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
    console.error('[ERROR] cleanupLoadTestData: Cleanup failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});