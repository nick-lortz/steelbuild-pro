import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { addDays, format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { work_package_id, phase_completed } = await req.json();

    if (!work_package_id || !phase_completed) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get work package
    const workPackage = await base44.asServiceRole.entities.WorkPackage.filter({ id: work_package_id });
    if (!workPackage || workPackage.length === 0) {
      return Response.json({ error: 'Work package not found' }, { status: 404 });
    }

    const pkg = workPackage[0];
    const today = format(new Date(), 'yyyy-MM-dd');

    // Define phase order
    const phaseOrder = ['detailing', 'fabrication', 'delivery', 'erection'];
    const currentPhaseIndex = phaseOrder.indexOf(pkg.current_phase);
    const completedPhaseIndex = phaseOrder.indexOf(phase_completed);

    // Validate phase completion order
    if (completedPhaseIndex > currentPhaseIndex) {
      return Response.json({ 
        error: `Cannot complete ${phase_completed} - current phase is ${pkg.current_phase}` 
      }, { status: 400 });
    }

    // Update work package
    const updates = {
      [`${phase_completed}_complete`]: true,
      [`${phase_completed}_complete_date`]: today,
    };

    // Advance to next phase if completing current phase
    if (phase_completed === pkg.current_phase) {
      const nextPhaseIndex = currentPhaseIndex + 1;
      if (nextPhaseIndex < phaseOrder.length) {
        updates.current_phase = phaseOrder[nextPhaseIndex];
      } else {
        updates.current_phase = 'completed';
      }
    }

    await base44.asServiceRole.entities.WorkPackage.update(work_package_id, updates);

    // Lock tasks in completed phase
    const phaseTasks = await base44.asServiceRole.entities.Task.filter({
      work_package_id: work_package_id,
      phase: phase_completed
    });

    for (const task of phaseTasks) {
      await base44.asServiceRole.entities.Task.update(task.id, {
        is_phase_locked: true
      });
    }

    // Generate next phase tasks ONLY for delivery and erection phases
    const nextPhase = updates.current_phase;
    if (nextPhase && nextPhase !== 'completed') {
      // Auto-generate tasks for delivery and erection when fabrication is complete
      if (phase_completed === 'fabrication' && (nextPhase === 'delivery' || nextPhase === 'erection')) {
        const newTasks = await generatePhaseTasks(base44, pkg, nextPhase, phaseTasks);
        
        return Response.json({
          success: true,
          work_package: { ...pkg, ...updates },
          locked_tasks: phaseTasks.length,
          new_tasks: newTasks.length,
          next_phase: nextPhase,
          auto_generated: true
        });
      }
      
      // For other phase transitions, just update status without auto-generating tasks
      return Response.json({
        success: true,
        work_package: { ...pkg, ...updates },
        locked_tasks: phaseTasks.length,
        next_phase: nextPhase
      });
    }

    return Response.json({
      success: true,
      work_package: { ...pkg, ...updates },
      locked_tasks: phaseTasks.length,
      completed: true
    });

  } catch (error) {
    console.error('Work package lifecycle error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function generatePhaseTasks(base44, workPackage, phase, previousTasks) {
  const tasks = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);

  // Get last task end date from previous phase
  let phaseStartDate = startDate;
  if (previousTasks.length > 0) {
    const latestEndDate = previousTasks.reduce((latest, task) => {
      const taskEnd = new Date(task.end_date);
      return taskEnd > latest ? taskEnd : latest;
    }, new Date(0));
    
    if (latestEndDate > startDate) {
      phaseStartDate = addDays(latestEndDate, 1);
    }
  }

  // Define standard tasks for delivery and erection phases only
  const phaseTemplates = {
    delivery: [
      { name: 'Load Planning', duration: 2, estimated_hours: 8 },
      { name: 'Loading & Securing', duration: 1, estimated_hours: 12 },
      { name: 'Transport to Site', duration: 1, estimated_hours: 8 },
      { name: 'Offloading & Staging', duration: 1, estimated_hours: 8 }
    ],
    erection: [
      { name: 'Site Preparation', duration: 2, estimated_hours: 16 },
      { name: 'Crane Setup', duration: 1, estimated_hours: 8 },
      { name: 'Erection Operations', duration: 10, estimated_hours: 120 },
      { name: 'Bolting & Connections', duration: 5, estimated_hours: 60 },
      { name: 'Final Inspection', duration: 2, estimated_hours: 8 }
    ]
  };

  const templates = phaseTemplates[phase] || [];
  let currentStart = phaseStartDate;
  let previousTaskId = null;

  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];
    const endDate = addDays(currentStart, template.duration);
    
    const taskData = {
      project_id: workPackage.project_id,
      work_package_id: workPackage.id,
      name: `${workPackage.package_number} - ${template.name}`,
      phase: phase,
      start_date: format(currentStart, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      duration_days: template.duration,
      estimated_hours: template.estimated_hours || 0,
      status: 'not_started',
      progress_percent: 0,
      is_phase_locked: false,
      // Add FS (Finish-Start) dependency to previous task
      predecessor_ids: previousTaskId ? [previousTaskId] : [],
      predecessor_configs: previousTaskId ? [{
        predecessor_id: previousTaskId,
        type: 'FS',
        lag_days: 0
      }] : []
    };

    const created = await base44.asServiceRole.entities.Task.create(taskData);
    tasks.push(created);
    
    previousTaskId = created.id;
    currentStart = addDays(endDate, 1);
  }

  return tasks;
}