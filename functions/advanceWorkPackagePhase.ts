import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const PHASE_ORDER = ['fabrication', 'delivery', 'erection', 'complete'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { work_package_id, target_phase } = await req.json();

    if (!work_package_id || !target_phase) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!PHASE_ORDER.includes(target_phase)) {
      return Response.json({ error: 'Invalid phase' }, { status: 400 });
    }

    // Get work package
    const workPackages = await base44.asServiceRole.entities.WorkPackage.filter({ id: work_package_id });
    if (!workPackages.length) {
      return Response.json({ error: 'Work package not found' }, { status: 404 });
    }

    const workPackage = workPackages[0];

    // Reject if already complete
    if (workPackage.status === 'complete') {
      return Response.json({ error: 'Work Package already complete' }, { status: 400 });
    }

    const currentIndex = PHASE_ORDER.indexOf(workPackage.phase);
    const targetIndex = PHASE_ORDER.indexOf(target_phase);

    // Enforce sequential progression only
    if (targetIndex !== currentIndex + 1) {
      return Response.json({ 
        error: 'Invalid phase transition. Can only advance one phase at a time.' 
      }, { status: 400 });
    }

    // Close all tasks in current phase
    const closedTasks = await base44.asServiceRole.entities.Task.filter({
      work_package_id,
      phase: workPackage.phase
    });

    for (const task of closedTasks) {
      await base44.asServiceRole.entities.Task.update(task.id, {
        status: 'completed',
        progress_percent: 100
      });
    }

    // Create tasks for next phase (from templates if available)
    const createdTasks = [];
    if (target_phase !== 'complete') {
      // Check for TaskTemplate entity
      const templates = await base44.asServiceRole.entities.TaskTemplate.filter({ 
        phase: target_phase 
      }).catch(() => []);

      if (templates.length > 0) {
        // Use templates if available
        for (const tpl of templates) {
          const task = await base44.asServiceRole.entities.Task.create({
            project_id: workPackage.project_id,
            work_package_id,
            name: tpl.name,
            phase: target_phase,
            status: 'not_started',
            start_date: tpl.start_date,
            end_date: tpl.end_date,
            duration_days: tpl.duration_days,
            estimated_hours: tpl.estimated_hours
          });
          createdTasks.push(task);
        }
      } else {
        // Fallback: create basic placeholder tasks
        const phaseTaskTemplates = {
          fabrication: ['Material procurement', 'Shop fabrication', 'QC inspection'],
          delivery: ['Load planning', 'Transportation', 'Site delivery'],
          erection: ['Site prep', 'Crane setup', 'Steel erection', 'Final inspection']
        };

        const taskNames = phaseTaskTemplates[target_phase] || [];
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        for (const taskName of taskNames) {
          const task = await base44.asServiceRole.entities.Task.create({
            project_id: workPackage.project_id,
            work_package_id,
            name: taskName,
            phase: target_phase,
            status: 'not_started',
            start_date: startDate,
            end_date: endDate
          });
          createdTasks.push(task);
        }
      }
    }

    // Update work package phase
    const updatedWorkPackage = await base44.asServiceRole.entities.WorkPackage.update(work_package_id, {
      phase: target_phase,
      status: target_phase === 'complete' ? 'complete' : 'active'
    });

    return Response.json({
      success: true,
      work_package: updatedWorkPackage,
      closed_tasks: closedTasks,
      created_tasks: createdTasks,
      message: `Work package advanced to ${target_phase}`
    });

  } catch (error) {
    console.error('Error advancing work package phase:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});