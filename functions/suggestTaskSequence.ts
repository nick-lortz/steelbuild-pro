import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, existing_tasks = [], tonnage, phases_to_sequence } = await req.json();

    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    // Fetch project details
    const projects = await base44.asServiceRole.entities.Project.filter({ id: project_id });
    const project = projects[0];

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Steel erection workflow logic
    const phaseSequence = ['detailing', 'fabrication', 'delivery', 'erection', 'closeout'];
    const suggestedTasks = [];
    const dependencies = [];

    // Standard steel erection task templates per phase
    const taskTemplates = {
      detailing: [
        { name: 'Design & Approval', duration_days: 10, requires_approval: true },
        { name: 'Shop Drawing Preparation', duration_days: 8 },
        { name: 'Coordination Review', duration_days: 5 }
      ],
      fabrication: [
        { name: 'Material Procurement', duration_days: 14, depends_on_phase: 'detailing' },
        { name: 'Layout & Cutting', duration_days: 7 },
        { name: 'Welding & Assembly', duration_days: 14, tonnage_factor: true },
        { name: 'QC Inspection', duration_days: 3 },
        { name: 'Painting & Prep', duration_days: 5 },
        { name: 'Packing & Shipping Prep', duration_days: 2 }
      ],
      delivery: [
        { name: 'Arrange Transportation', duration_days: 3, depends_on_phase: 'fabrication' },
        { name: 'In-Transit', duration_days: 5, tonnage_factor: true },
        { name: 'Receiving & Inspection', duration_days: 2 }
      ],
      erection: [
        { name: 'Erection Planning & Safety', duration_days: 3, depends_on_phase: 'delivery' },
        { name: 'Foundation Prep', duration_days: 5 },
        { name: 'Column Erection', duration_days: 10, tonnage_factor: true },
        { name: 'Beam Installation', duration_days: 10, tonnage_factor: true },
        { name: 'Connections & Bolting', duration_days: 8 },
        { name: 'Final Alignment & Check', duration_days: 3 }
      ],
      closeout: [
        { name: 'Field Touch-ups & Inspection', duration_days: 5, depends_on_phase: 'erection' },
        { name: 'Documentation & As-Builts', duration_days: 3 },
        { name: 'Final Walkthrough', duration_days: 1 }
      ]
    };

    // Calculate tonnage factor (larger tonnage = longer durations)
    const tonnageFactor = tonnage ? Math.ceil(tonnage / 50) : 1;

    // Generate task sequence
    let lastPhaseEnd = null;
    let taskCounter = 0;

    for (const phase of phaseSequence) {
      if (phases_to_sequence && !phases_to_sequence.includes(phase)) continue;

      const templates = taskTemplates[phase] || [];
      const phaseTasks = [];

      for (const template of templates) {
        taskCounter++;
        const duration = template.tonnage_factor 
          ? template.duration_days * tonnageFactor 
          : template.duration_days;

        const task = {
          name: template.name,
          phase,
          status: 'not_started',
          duration_days: duration,
          estimated_hours: duration * 8,
          is_milestone: template.name.includes('Inspection') || template.name.includes('Approval'),
          description: `Auto-sequenced task for ${project.name} - ${template.name} (${duration} days)`
        };

        // Set dependency on previous phase if needed
        if (template.depends_on_phase) {
          const depPhaseIndex = phaseSequence.indexOf(template.depends_on_phase);
          task.depends_on_phase = template.depends_on_phase;
        }

        suggestedTasks.push(task);
        phaseTasks.push(task);
      }

      lastPhaseEnd = phase;
    }

    // Link dependencies between phases
    for (let i = 0; i < suggestedTasks.length; i++) {
      const task = suggestedTasks[i];
      if (task.depends_on_phase) {
        // Find last task of dependency phase
        const depPhaseTasks = suggestedTasks.filter(t => t.phase === task.depends_on_phase);
        if (depPhaseTasks.length > 0) {
          const lastDepTask = depPhaseTasks[depPhaseTasks.length - 1];
          dependencies.push({
            task_index: i,
            predecessor_index: suggestedTasks.indexOf(lastDepTask),
            type: 'FS',
            lag_days: 1
          });
        }
      }
    }

    return Response.json({
      suggested_tasks: suggestedTasks,
      task_count: suggestedTasks.length,
      estimated_duration_days: suggestedTasks.reduce((sum, t) => sum + t.duration_days, 0),
      dependencies,
      tonnage_factor: tonnageFactor,
      project_name: project.name,
      message: `Generated ${suggestedTasks.length} tasks for ${project.name} (${tonnage}T, ${tonnageFactor}x factor)`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});