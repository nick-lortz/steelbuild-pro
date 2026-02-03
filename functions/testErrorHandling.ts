/**
 * ERROR HANDLING & FAILURE MODE TESTS
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const results = {
    suite: 'Error Handling',
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
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user.role !== 'admin') {
      throw new Error('Admin only');
    }
    
    // Test 1: Missing required fields rejected
    await test('Entity creation rejects missing required fields', async () => {
      try {
        await base44.asServiceRole.entities.Project.create({
          name: 'Test' // Missing project_number
        });
        throw new Error('Should reject missing required field');
      } catch (error) {
        if (error.message.includes('Should reject')) throw error;
        // Expected validation error
      }
    });
    
    // Test 2: Invalid enum values rejected
    await test('Invalid enum values rejected', async () => {
      try {
        await base44.asServiceRole.entities.Project.create({
          project_number: `ENUM-${Date.now()}`,
          name: 'Enum Test',
          status: 'invalid_status' // Not in enum
        });
        throw new Error('Should reject invalid enum');
      } catch (error) {
        if (error.message.includes('Should reject')) throw error;
        // Expected validation error
      }
    });
    
    // Test 3: Invalid date format rejected
    await test('Invalid date format rejected', async () => {
      try {
        await base44.asServiceRole.entities.Task.create({
          project_id: 'test',
          name: 'Date Test',
          start_date: 'not-a-date',
          end_date: '2026-02-01'
        });
        throw new Error('Should reject invalid date');
      } catch (error) {
        if (error.message.includes('Should reject')) throw error;
        // Expected validation error
      }
    });
    
    // Test 4: Negative financial values rejected
    await test('Negative budget values rejected', async () => {
      try {
        await base44.asServiceRole.entities.Financial.create({
          project_id: 'test',
          cost_code_id: 'test',
          original_budget: -1000 // Negative!
        });
        throw new Error('Should reject negative budget');
      } catch (error) {
        if (error.message.includes('Should reject')) throw error;
        // Expected validation error
      }
    });
    
    // Test 5: Percent out of range rejected
    await test('Percent complete out of range rejected', async () => {
      try {
        await base44.asServiceRole.entities.Task.create({
          project_id: 'test',
          name: 'Percent Test',
          start_date: '2026-02-01',
          end_date: '2026-02-05',
          progress_percent: 150 // Invalid!
        });
        throw new Error('Should reject invalid percent');
      } catch (error) {
        if (error.message.includes('Should reject')) throw error;
        // Expected validation error
      }
    });
    
    // Test 6: Circular dependency prevented
    await test('Circular dependencies prevented', async () => {
      const project = await base44.asServiceRole.entities.Project.create({
        project_number: `CIRC-${Date.now()}`,
        name: 'Circular Test'
      });
      
      try {
        const t1 = await base44.asServiceRole.entities.Task.create({
          project_id: project.id,
          name: 'Task 1',
          start_date: '2026-02-01',
          end_date: '2026-02-05'
        });
        
        const t2 = await base44.asServiceRole.entities.Task.create({
          project_id: project.id,
          name: 'Task 2',
          start_date: '2026-02-06',
          end_date: '2026-02-10',
          predecessor_ids: [t1.id]
        });
        
        // Try to create circular dependency: t1 depends on t2
        await base44.asServiceRole.entities.Task.update(t1.id, {
          predecessor_ids: [t2.id]
        });
        
        // Validate should detect circle
        const validation = await base44.asServiceRole.functions.invoke('validateSchedule', {
          project_id: project.id,
          auto_adjust: false
        });
        
        if (validation.data.circular_dependencies.length === 0) {
          throw new Error('Should detect circular dependency');
        }
        
      } finally {
        await base44.asServiceRole.entities.Project.delete(project.id);
      }
    });
    
    // Test 7: Cascade delete
    await test('Cascade delete removes all related records', async () => {
      const project = await base44.asServiceRole.entities.Project.create({
        project_number: `CASCADE-${Date.now()}`,
        name: 'Cascade Test'
      });
      
      const task = await base44.asServiceRole.entities.Task.create({
        project_id: project.id,
        name: 'Task',
        start_date: '2026-02-01',
        end_date: '2026-02-05'
      });
      
      const rfi = await base44.asServiceRole.entities.RFI.create({
        project_id: project.id,
        rfi_number: 1,
        subject: 'Test RFI'
      });
      
      // Delete project (should cascade)
      await base44.asServiceRole.functions.invoke('cascadeDeleteProject', {
        project_id: project.id
      });
      
      // Verify all deleted
      const remainingTasks = await base44.asServiceRole.entities.Task.filter({ project_id: project.id });
      const remainingRFIs = await base44.asServiceRole.entities.RFI.filter({ project_id: project.id });
      
      if (remainingTasks.length > 0 || remainingRFIs.length > 0) {
        throw new Error('Cascade delete incomplete');
      }
    });
    
    // Test 8: Transaction rollback on error
    await test('Failed operations do not leave partial data', async () => {
      const project = await base44.asServiceRole.entities.Project.create({
        project_number: `ROLLBACK-${Date.now()}`,
        name: 'Rollback Test'
      });
      
      try {
        // Try to create task with invalid data
        try {
          await base44.asServiceRole.entities.Task.create({
            project_id: project.id,
            name: 'Invalid Task',
            start_date: '2026-02-10',
            end_date: '2026-02-05' // End before start!
          });
        } catch (error) {
          // Expected to fail
        }
        
        // Verify no partial task created
        const tasks = await base44.asServiceRole.entities.Task.filter({ project_id: project.id });
        if (tasks.length > 0) {
          throw new Error('Partial data created on failed operation');
        }
        
      } finally {
        await base44.asServiceRole.entities.Project.delete(project.id);
      }
    });
    
    return Response.json(results);
    
  } catch (error) {
    console.error('Error handling test error:', error);
    return Response.json({
      ...results,
      error: error.message
    }, { status: 500 });
  }
});