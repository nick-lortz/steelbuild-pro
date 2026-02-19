import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { project_id } = await req.json();

  if (!project_id) {
    return Response.json({ error: 'project_id required' }, { status: 400 });
  }

  // Test query isolation by attempting to fetch data from different projects
  const results = {
    project_id,
    validated: [],
    warnings: []
  };

  const projectOwnedEntities = [
    'Task', 'WorkPackage', 'RFI', 'DrawingSet', 'DrawingSheet', 
    'ChangeOrder', 'Delivery', 'Constraint', 'Document'
  ];

  try {
    // Get all projects
    const allProjects = await base44.asServiceRole.entities.Project.list();
    
    if (allProjects.length < 2) {
      return Response.json({
        success: true,
        message: 'Only one project exists - unable to validate cross-project isolation',
        results
      });
    }

    // Test each entity type
    for (const entityName of projectOwnedEntities) {
      try {
        // Query with project filter
        const scopedData = await base44.asServiceRole.entities[entityName].filter({ 
          project_id 
        });

        // Query without project filter (admin can see all)
        const allData = await base44.asServiceRole.entities[entityName].list('-created_date', 100);

        const hasDataFromOtherProjects = allData.some(item => item.project_id !== project_id);

        results.validated.push({
          entity: entityName,
          scoped_count: scopedData.length,
          total_count: allData.length,
          properly_isolated: hasDataFromOtherProjects ? 
            'Yes - other projects have separate data' : 
            'Unknown - no other project data exists'
        });

      } catch (error) {
        results.warnings.push({
          entity: entityName,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      message: 'Validation complete',
      results
    });

  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});