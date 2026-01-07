import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const PHASE_ORDER = ['detailing', 'fabrication', 'delivery', 'erection', 'complete'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { work_package_id, next_phase } = await req.json();

    if (!work_package_id || !next_phase) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!PHASE_ORDER.includes(next_phase)) {
      return Response.json({ error: 'Invalid phase' }, { status: 400 });
    }

    // Get work package
    const workPackages = await base44.asServiceRole.entities.WorkPackage.filter({ id: work_package_id });
    if (!workPackages.length) {
      return Response.json({ error: 'Work package not found' }, { status: 404 });
    }

    const workPackage = workPackages[0];
    const currentPhaseIndex = PHASE_ORDER.indexOf(workPackage.phase);
    const nextPhaseIndex = PHASE_ORDER.indexOf(next_phase);

    // Validate phase progression (can only advance forward or set to complete)
    if (nextPhaseIndex < currentPhaseIndex && next_phase !== 'complete') {
      return Response.json({ error: 'Cannot move backwards through phases' }, { status: 400 });
    }

    // Close all tasks in current phase
    const currentPhaseTasks = await base44.asServiceRole.entities.Task.filter({
      work_package_id,
      phase: workPackage.phase
    });

    for (const task of currentPhaseTasks) {
      if (task.status !== 'completed' && task.status !== 'cancelled') {
        await base44.asServiceRole.entities.Task.update(task.id, {
          status: 'completed',
          progress_percent: 100
        });
      }
    }

    // Update work package phase
    const updatedWorkPackage = await base44.asServiceRole.entities.WorkPackage.update(work_package_id, {
      phase: next_phase,
      status: next_phase === 'complete' ? 'complete' : 'active'
    });

    // Create default tasks for next phase if not complete
    if (next_phase !== 'complete') {
      const phaseTaskTemplates = {
        detailing: ['Review drawings', 'Coordinate shop drawings', 'Submit for approval'],
        fabrication: ['Material procurement', 'Shop fabrication', 'QC inspection'],
        delivery: ['Load planning', 'Transportation', 'Site delivery'],
        erection: ['Site prep', 'Crane setup', 'Steel erection', 'Final inspection']
      };

      const templates = phaseTaskTemplates[next_phase] || [];
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      for (const taskName of templates) {
        await base44.asServiceRole.entities.Task.create({
          project_id: workPackage.project_id,
          work_package_id,
          name: taskName,
          phase: next_phase,
          status: 'not_started',
          start_date: startDate,
          end_date: endDate,
          progress_percent: 0
        });
      }
    }

    // Get updated tasks
    const updatedTasks = await base44.asServiceRole.entities.Task.filter({ work_package_id });

    return Response.json({
      success: true,
      work_package: updatedWorkPackage,
      tasks: updatedTasks,
      message: `Work package advanced to ${next_phase}`
    });

  } catch (error) {
    console.error('Error advancing work package phase:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});