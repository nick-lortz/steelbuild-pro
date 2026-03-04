import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";

/**
 * Seed test data for data layer audit
 * Creates a complete project with all entity types for integration testing
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }
  
  try {
    // Create test project
    const project = await base44.asServiceRole.entities.Project.create({
      project_number: `TEST-AUDIT-${Date.now()}`,
      name: 'Data Layer Audit Test Project',
      client: 'Test Client',
      location: 'Test Location',
      contract_value: 500000,
      status: 'in_progress',
      created_by: user.email
    });
    
    // Create drawing set
    const drawingSet = await base44.asServiceRole.entities.DrawingSet.create({
      project_id: project.id,
      set_number: 'DS-001',
      title: 'Structural Steel Elevations',
      discipline: 'structural',
      spec_section: '05 12 00',
      status: 'FFF',
      created_by: user.email
    });
    
    // Create work packages
    const wp1 = await base44.asServiceRole.entities.WorkPackage.create({
      wpid: `WP-001-${project.id.substring(0, 8)}`,
      project_id: project.id,
      title: 'Building Frame - Grid A-D / Level 1',
      phase: 'shop',
      status: 'not_started',
      start_date: '2026-03-15',
      end_date: '2026-04-15',
      install_day: '2026-05-01',
      sequence_group: 'RG-01',
      created_by: user.email
    });
    
    const wp2 = await base44.asServiceRole.entities.WorkPackage.create({
      wpid: `WP-002-${project.id.substring(0, 8)}`,
      project_id: project.id,
      title: 'Building Frame - Grid A-D / Level 2',
      phase: 'shop',
      status: 'not_started',
      start_date: '2026-04-01',
      end_date: '2026-05-01',
      install_day: '2026-05-02',
      sequence_group: 'RG-02',
      created_by: user.email
    });
    
    // Create RFI
    const rfi = await base44.asServiceRole.entities.RFI.create({
      project_id: project.id,
      rfi_number: 1,
      subject: 'Column base plate details',
      rfi_type: 'connection_detail',
      category: 'structural',
      question: 'Clarify anchor bolt pattern and base plate thickness per Grid A1?',
      status: 'submitted',
      priority: 'high',
      created_by: user.email
    });
    
    // Create tasks
    const task1 = await base44.asServiceRole.entities.Task.create({
      project_id: project.id,
      work_package_id: wp1.id,
      name: 'Detailing - WP-001',
      type: 'GENERIC',
      phase: 'detailing',
      start_date: '2026-03-15',
      end_date: '2026-03-25',
      status: 'in_progress',
      created_by: user.email
    });
    
    const task2 = await base44.asServiceRole.entities.Task.create({
      project_id: project.id,
      work_package_id: wp1.id,
      name: 'Fabrication Release - WP-001',
      type: 'FAB_COMPLETE',
      phase: 'fabrication',
      start_date: '2026-03-26',
      end_date: '2026-04-10',
      predecessor_ids: [task1.id],
      created_by: user.email
    });
    
    // Create delivery
    const delivery = await base44.asServiceRole.entities.Delivery.create({
      project_id: project.id,
      package_name: 'Load 1 - Frame Package',
      delivery_number: `DELV-001-${project.id.substring(0, 8)}`,
      work_package_ids: [wp1.id],
      scheduled_date: '2026-05-01',
      install_day: '2026-05-01',
      sequence_group: 'RG-01',
      delivery_status: 'draft',
      created_by: user.email
    });
    
    // Create fabrication record
    const fab = await base44.asServiceRole.entities.Fabrication.create({
      project_id: project.id,
      piece_mark: 'C101',
      assembly_number: 'ASM-001',
      area_gridline: 'Grid A-B / Level 1',
      drawing_set_id: drawingSet.id,
      item_type: 'column',
      description: 'Column W12x65',
      weight_tons: 2.5,
      material_spec: 'ASTM A992 Gr. 50',
      status: 'released',
      created_by: user.email
    });
    
    // Create SOV item
    const sovItem = await base44.asServiceRole.entities.SOVItem.create({
      project_id: project.id,
      item_number: '1.1',
      description: 'Structural steel - Fabrication',
      category: 'fabrication',
      scheduled_value: 250000,
      created_by: user.email
    });
    
    return Response.json({
      success: true,
      message: 'Test data seeded successfully',
      data: {
        project_id: project.id,
        project_number: project.project_number,
        workPackages: [wp1.id, wp2.id],
        drawingSet: drawingSet.id,
        rfi: rfi.id,
        tasks: [task1.id, task2.id],
        delivery: delivery.id,
        fabrication: fab.id,
        sovItem: sovItem.id
      }
    });
    
  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});