import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";

/**
 * Smoke test for referential integrity
 * Validates that all foreign key references are valid
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }
  
  const { project_id } = await req.json();
  
  if (!project_id) {
    return Response.json({ error: 'project_id required' }, { status: 400 });
  }
  
  const checks = {
    passed: 0,
    failed: 0,
    results: []
  };
  
  try {
    // Check 1: All Tasks reference valid WorkPackages or null
    const tasks = await base44.asServiceRole.entities.Task.filter({ project_id });
    let taskWPPass = true;
    for (const task of tasks) {
      if (task.work_package_id) {
        const wps = await base44.asServiceRole.entities.WorkPackage.filter({ 
          wpid: task.work_package_id,
          project_id 
        });
        if (!wps || wps.length === 0) {
          checks.results.push({
            check: 'Task WorkPackage FK',
            status: 'FAIL',
            message: `Task ${task.id} references non-existent WorkPackage ${task.work_package_id}`
          });
          taskWPPass = false;
          checks.failed++;
        }
      }
    }
    if (taskWPPass) {
      checks.results.push({
        check: 'Task WorkPackage FK',
        status: 'PASS',
        count: tasks.length
      });
      checks.passed++;
    }
    
    // Check 2: All SOVItems reference valid Projects
    const sovItems = await base44.asServiceRole.entities.SOVItem.filter({ project_id });
    let sovFKPass = true;
    for (const item of sovItems) {
      const projects = await base44.asServiceRole.entities.Project.filter({ id: item.project_id });
      if (!projects || projects.length === 0) {
        checks.results.push({
          check: 'SOVItem Project FK',
          status: 'FAIL',
          message: `SOVItem ${item.id} references non-existent Project ${item.project_id}`
        });
        sovFKPass = false;
        checks.failed++;
      }
    }
    if (sovFKPass) {
      checks.results.push({
        check: 'SOVItem Project FK',
        status: 'PASS',
        count: sovItems.length
      });
      checks.passed++;
    }
    
    // Check 3: All Deliveries reference valid WorkPackages
    const deliveries = await base44.asServiceRole.entities.Delivery.filter({ project_id });
    let deliveryWPPass = true;
    for (const delv of deliveries) {
      if (delv.work_package_ids && Array.isArray(delv.work_package_ids)) {
        for (const wpid of delv.work_package_ids) {
          const wps = await base44.asServiceRole.entities.WorkPackage.filter({ wpid, project_id });
          if (!wps || wps.length === 0) {
            checks.results.push({
              check: 'Delivery WorkPackage FK',
              status: 'FAIL',
              message: `Delivery ${delv.id} references non-existent WorkPackage ${wpid}`
            });
            deliveryWPPass = false;
            checks.failed++;
          }
        }
      }
    }
    if (deliveryWPPass) {
      checks.results.push({
        check: 'Delivery WorkPackage FK',
        status: 'PASS',
        count: deliveries.length
      });
      checks.passed++;
    }
    
    // Check 4: All Fabrications reference valid DrawingSets
    const fabs = await base44.asServiceRole.entities.Fabrication.filter({ project_id });
    let fabDSPass = true;
    for (const fab of fabs) {
      if (fab.drawing_set_id) {
        const sets = await base44.asServiceRole.entities.DrawingSet.filter({ 
          id: fab.drawing_set_id,
          project_id
        });
        if (!sets || sets.length === 0) {
          checks.results.push({
            check: 'Fabrication DrawingSet FK',
            status: 'FAIL',
            message: `Fabrication ${fab.id} references non-existent DrawingSet ${fab.drawing_set_id}`
          });
          fabDSPass = false;
          checks.failed++;
        }
      }
    }
    if (fabDSPass) {
      checks.results.push({
        check: 'Fabrication DrawingSet FK',
        status: 'PASS',
        count: fabs.length
      });
      checks.passed++;
    }
    
    // Check 5: All Fabrications reference valid (or null) RFIs
    let fabRFIPass = true;
    for (const fab of fabs) {
      if (fab.linked_rfi_ids && Array.isArray(fab.linked_rfi_ids)) {
        for (const rfi_id of fab.linked_rfi_ids) {
          const rfis = await base44.asServiceRole.entities.RFI.filter({ 
            id: rfi_id,
            project_id
          });
          if (!rfis || rfis.length === 0) {
            checks.results.push({
              check: 'Fabrication RFI FK',
              status: 'FAIL',
              message: `Fabrication ${fab.id} references non-existent RFI ${rfi_id}`
            });
            fabRFIPass = false;
            checks.failed++;
          }
        }
      }
    }
    if (fabRFIPass) {
      checks.results.push({
        check: 'Fabrication RFI FK',
        status: 'PASS',
        count: fabs.length
      });
      checks.passed++;
    }
    
    // Summary
    checks.summary = {
      total_checks: checks.results.length,
      passed: checks.passed,
      failed: checks.failed,
      project_id,
      timestamp: new Date().toISOString(),
      overall_status: checks.failed === 0 ? 'PASS' : 'FAIL'
    };
    
    return Response.json(checks);
    
  } catch (error) {
    console.error('Smoke test error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});