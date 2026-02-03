/**
 * DATA INTEGRITY TESTS
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { validateTaskDates, detectCircularDependencies } from './utils/scheduleValidation.js';
import { validateBudgetActuals, validateSOVItem } from './utils/financialValidation.js';

Deno.serve(async (req) => {
  const results = {
    suite: 'Data Integrity',
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
    
    // Test 1: No orphaned tasks
    await test('No orphaned tasks (invalid project_id)', async () => {
      const tasks = await base44.asServiceRole.entities.Task.list();
      const projects = await base44.asServiceRole.entities.Project.list();
      const projectIds = new Set(projects.map(p => p.id));
      
      const orphaned = tasks.filter(t => !projectIds.has(t.project_id));
      if (orphaned.length > 0) {
        throw new Error(`Found ${orphaned.length} orphaned tasks: ${orphaned.map(t => t.id).join(', ')}`);
      }
    });
    
    // Test 2: No orphaned RFIs
    await test('No orphaned RFIs', async () => {
      const rfis = await base44.asServiceRole.entities.RFI.list();
      const projects = await base44.asServiceRole.entities.Project.list();
      const projectIds = new Set(projects.map(p => p.id));
      
      const orphaned = rfis.filter(r => !projectIds.has(r.project_id));
      if (orphaned.length > 0) {
        throw new Error(`Found ${orphaned.length} orphaned RFIs`);
      }
    });
    
    // Test 3: Task date ordering
    await test('All tasks have valid date ordering', async () => {
      const tasks = await base44.asServiceRole.entities.Task.list();
      const errors = [];
      
      for (const task of tasks) {
        const validation = validateTaskDates(task);
        if (!validation.valid) {
          errors.push(`Task ${task.name}: ${validation.errors.join(', ')}`);
        }
      }
      
      if (errors.length > 0) {
        throw new Error(`${errors.length} tasks with invalid dates: ${errors.slice(0, 3).join('; ')}`);
      }
    });
    
    // Test 4: No circular dependencies
    await test('No circular task dependencies', async () => {
      const projects = await base44.asServiceRole.entities.Project.list();
      
      for (const project of projects.slice(0, 10)) { // Check first 10 projects
        const tasks = await base44.asServiceRole.entities.Task.filter({ project_id: project.id });
        const validation = detectCircularDependencies(tasks);
        
        if (!validation.valid) {
          throw new Error(`Circular deps in ${project.name}: ${validation.errors.map(e => e.message).join('; ')}`);
        }
      }
    });
    
    // Test 5: Unique constraints
    await test('Project numbers are unique', async () => {
      const projects = await base44.asServiceRole.entities.Project.list();
      const numbers = projects.map(p => p.project_number).filter(Boolean);
      const unique = new Set(numbers);
      
      if (numbers.length !== unique.size) {
        throw new Error(`Duplicate project numbers found: ${numbers.length} total, ${unique.size} unique`);
      }
    });
    
    // Test 6: RFI numbering per project
    await test('RFI numbers unique per project', async () => {
      const projects = await base44.asServiceRole.entities.Project.list();
      
      for (const project of projects.slice(0, 10)) {
        const rfis = await base44.asServiceRole.entities.RFI.filter({ project_id: project.id });
        const numbers = rfis.map(r => r.rfi_number).filter(n => n !== null && n !== undefined);
        const unique = new Set(numbers);
        
        if (numbers.length !== unique.size) {
          throw new Error(`Duplicate RFI numbers in ${project.name}`);
        }
      }
    });
    
    // Test 7: Financial calculations valid
    await test('Financial budget equations valid', async () => {
      const financials = await base44.asServiceRole.entities.Financial.list();
      const errors = [];
      
      for (const financial of financials.slice(0, 50)) {
        const validation = validateBudgetActuals(financial);
        if (!validation.valid) {
          errors.push(validation.errors[0]);
        }
      }
      
      if (errors.length > 0) {
        throw new Error(`${errors.length} financial records with invalid calculations`);
      }
    });
    
    // Test 8: SOV calculations valid
    await test('SOV calculations valid', async () => {
      const sovItems = await base44.asServiceRole.entities.SOVItem.list();
      const errors = [];
      
      for (const item of sovItems.slice(0, 50)) {
        const validation = validateSOVItem(item);
        if (!validation.valid) {
          errors.push(validation.errors[0]);
        }
      }
      
      if (errors.length > 0) {
        throw new Error(`${errors.length} SOV items with invalid calculations`);
      }
    });
    
    return Response.json(results);
    
  } catch (error) {
    console.error('Data integrity test error:', error);
    return Response.json({
      ...results,
      error: error.message
    }, { status: 500 });
  }
});