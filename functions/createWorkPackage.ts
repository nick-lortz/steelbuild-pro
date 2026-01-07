import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, name, start_date, end_date } = await req.json();

    if (!project_id || !name) {
      return Response.json({ error: 'project_id and name are required' }, { status: 400 });
    }

    // Get project
    const projects = await base44.asServiceRole.entities.Project.filter({ id: project_id });
    if (!projects.length) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = projects[0];

    // Block creation during detailing phase
    if (project.phase === 'detailing') {
      return Response.json({ 
        error: 'Cannot create work packages during detailing phase' 
      }, { status: 400 });
    }

    // Create work package
    const workPackage = await base44.asServiceRole.entities.WorkPackage.create({
      project_id,
      name,
      phase: project.phase,
      status: 'active',
      start_date,
      end_date
    });

    return Response.json({
      success: true,
      work_package: workPackage
    });

  } catch (error) {
    console.error('Error creating work package:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});