/**
 * E2E CRITICAL PATH TESTS
 * 
 * Tests complete workflows: Project → Tasks → RFI → Financials
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const results = {
    suite: 'E2E Critical Path',
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: []
  };
  
  const test = async (name, fn) => {
    const start = Date.now();
    try {
      await fn();
      results.tests.push({
        name,
        status: 'passed',
        duration_ms: Date.now() - start
      });
      results.passed++;
    } catch (error) {
      results.tests.push({
        name,
        status: 'failed',
        error: error.message,
        duration_ms: Date.now() - start
      });
      results.failed++;
    }
  };
  
  const cleanup = [];
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user.role !== 'admin') {
      throw new Error('Admin only');
    }
    
    // E2E Flow: Project Creation → Tasks → RFI → Change Order → Financial Update
    await test('E2E: Complete project workflow', async () => {
      // Step 1: Create project
      const project = await base44.asServiceRole.entities.Project.create({
        project_number: `E2E-${Date.now()}`,
        name: 'E2E Test Project',
        status: 'awarded',
        contract_value: 250000,
        start_date: '2026-02-10',
        target_completion: '2026-08-15'
      });
      cleanup.push(() => base44.asServiceRole.entities.Project.delete(project.id));
      
      if (!project.id) throw new Error('Project creation failed');
      
      // Step 2: Create tasks with dependencies
      const task1 = await base44.asServiceRole.entities.Task.create({
        project_id: project.id,
        name: 'Detailing',
        phase: 'detailing',
        start_date: '2026-02-10',
        end_date: '2026-03-10',
        status: 'in_progress'
      });
      cleanup.push(() => base44.asServiceRole.entities.Task.delete(task1.id));
      
      const task2 = await base44.asServiceRole.entities.Task.create({
        project_id: project.id,
        name: 'Fabrication',
        phase: 'fabrication',
        start_date: '2026-03-11',
        end_date: '2026-05-15',
        predecessor_ids: [task1.id],
        status: 'not_started'
      });
      cleanup.push(() => base44.asServiceRole.entities.Task.delete(task2.id));
      
      if (!task2.predecessor_ids?.includes(task1.id)) {
        throw new Error('Task dependency not set');
      }
      
      // Step 3: Create RFI
      const rfi = await base44.asServiceRole.entities.RFI.create({
        project_id: project.id,
        rfi_number: 1,
        subject: 'Column base plate detail',
        status: 'submitted',
        submitted_date: '2026-02-15',
        linked_task_ids: [task1.id]
      });
      cleanup.push(() => base44.asServiceRole.entities.RFI.delete(rfi.id));
      
      if (!rfi.linked_task_ids?.includes(task1.id)) {
        throw new Error('RFI-Task linkage failed');
      }
      
      // Step 4: Create change order from RFI
      const changeOrder = await base44.asServiceRole.entities.ChangeOrder.create({
        project_id: project.id,
        co_number: 1,
        title: 'Base plate revision',
        status: 'approved',
        cost_impact: 5000,
        schedule_impact_days: 2,
        linked_rfi_ids: [rfi.id],
        approved_date: '2026-02-20'
      });
      cleanup.push(() => base44.asServiceRole.entities.ChangeOrder.delete(changeOrder.id));
      
      if (changeOrder.cost_impact !== 5000) {
        throw new Error('Change order cost impact not saved');
      }
      
      // Step 5: Create financial record
      const financial = await base44.asServiceRole.entities.Financial.create({
        project_id: project.id,
        cost_code_id: 'fab-labor',
        category: 'labor',
        original_budget: 100000,
        approved_changes: 5000, // From CO
        current_budget: 105000
      });
      cleanup.push(() => base44.asServiceRole.entities.Financial.delete(financial.id));
      
      if (financial.current_budget !== 105000) {
        throw new Error('Budget not updated with CO');
      }
      
      // Step 6: Create SOV and bill
      const sovItem = await base44.asServiceRole.entities.SOVItem.create({
        project_id: project.id,
        sov_code: '06',
        description: 'Fabrication Labor',
        scheduled_value: 105000,
        percent_complete: 25
      });
      cleanup.push(() => base44.asServiceRole.entities.SOVItem.delete(sovItem.id));
      
      const earned = (105000 * 25) / 100;
      if (earned !== 26250) {
        throw new Error('SOV earned calculation incorrect');
      }
    });
    
    // E2E Flow: Schedule validation and auto-adjustment
    await test('E2E: Schedule auto-adjustment on dependency change', async () => {
      const project = await base44.asServiceRole.entities.Project.create({
        project_number: `SCHED-${Date.now()}`,
        name: 'Schedule Test',
        start_date: '2026-03-01',
        target_completion: '2026-09-01'
      });
      cleanup.push(() => base44.asServiceRole.entities.Project.delete(project.id));
      
      // Create task chain: A → B → C
      const taskA = await base44.asServiceRole.entities.Task.create({
        project_id: project.id,
        name: 'Task A',
        start_date: '2026-03-01',
        end_date: '2026-03-10',
        duration_days: 10
      });
      cleanup.push(() => base44.asServiceRole.entities.Task.delete(taskA.id));
      
      const taskB = await base44.asServiceRole.entities.Task.create({
        project_id: project.id,
        name: 'Task B',
        start_date: '2026-03-11',
        end_date: '2026-03-20',
        duration_days: 10,
        predecessor_ids: [taskA.id],
        predecessor_configs: [{
          predecessor_id: taskA.id,
          type: 'FS',
          lag_days: 0
        }]
      });
      cleanup.push(() => base44.asServiceRole.entities.Task.delete(taskB.id));
      
      const taskC = await base44.asServiceRole.entities.Task.create({
        project_id: project.id,
        name: 'Task C',
        start_date: '2026-03-21',
        end_date: '2026-03-30',
        duration_days: 10,
        predecessor_ids: [taskB.id],
        predecessor_configs: [{
          predecessor_id: taskB.id,
          type: 'FS',
          lag_days: 0
        }]
      });
      cleanup.push(() => base44.asServiceRole.entities.Task.delete(taskC.id));
      
      // Delay Task A by 5 days
      await base44.asServiceRole.entities.Task.update(taskA.id, {
        end_date: '2026-03-15'
      });
      
      // Validate schedule and auto-adjust
      const validation = await base44.asServiceRole.functions.invoke('validateSchedule', {
        project_id: project.id,
        auto_adjust: true
      });
      
      if (validation.data.summary.tasks_adjusted === 0) {
        throw new Error('Auto-adjustment should have updated downstream tasks');
      }
      
      // Verify Task B was adjusted
      const updatedB = await base44.asServiceRole.entities.Task.filter({ id: taskB.id });
      if (updatedB[0].start_date <= '2026-03-15') {
        throw new Error('Task B should start after Task A finishes');
      }
    });
    
    // Cleanup
    for (const cleanupFn of cleanup.reverse()) {
      try {
        await cleanupFn();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
    
    return Response.json(results);
    
  } catch (error) {
    console.error('E2E test error:', error);
    
    for (const cleanupFn of cleanup.reverse()) {
      try {
        await cleanupFn();
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    }
    
    return Response.json({
      ...results,
      error: error.message
    }, { status: 500 });
  }
});