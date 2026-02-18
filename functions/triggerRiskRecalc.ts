import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();
    
    if (!data?.project_id) {
      return Response.json({ 
        success: false, 
        message: 'No project_id in event data' 
      });
    }

    // Get all work packages for this project
    const workPackages = await base44.asServiceRole.entities.WorkPackage.filter({
      project_id: data.project_id
    });

    if (workPackages.length === 0) {
      return Response.json({ success: true, message: 'No work packages to evaluate' });
    }

    // Re-evaluate and update execution permissions for all WPs
    const results = [];
    for (const wp of workPackages) {
      try {
        // Evaluate risk
        const evalResp = await base44.asServiceRole.functions.invoke('evaluateWorkPackageExecutionRisk', {
          work_package_id: wp.id
        });

        // Set permission
        const permResp = await base44.asServiceRole.functions.invoke('setExecutionPermission', {
          work_package_id: wp.id
        });

        results.push({
          work_package_id: wp.id,
          package_number: wp.package_number,
          risk_level: evalResp.data?.risk_level,
          permission_status: permResp.data?.permission_status
        });
      } catch (error) {
        console.error(`Failed to evaluate WP ${wp.id}:`, error.message);
        results.push({
          work_package_id: wp.id,
          package_number: wp.package_number,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      event_type: event.type,
      entity_name: event.entity_name,
      entity_id: event.entity_id,
      project_id: data.project_id,
      evaluated_count: workPackages.length,
      results
    });

  } catch (error) {
    console.error('Trigger risk recalc error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});