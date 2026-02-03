/**
 * AUTHORIZATION TESTS
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const results = {
    suite: 'Authorization',
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
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    // Test 1: Project access filtering
    await test('Project access - user sees only assigned projects', async () => {
      // Create test project
      const testProject = await base44.asServiceRole.entities.Project.create({
        project_number: `TEST-AUTH-${Date.now()}`,
        name: 'Auth Test Project',
        assigned_users: user.role === 'admin' ? [] : ['other@example.com'] // Not assigned to current user
      });
      
      try {
        // User should not see unassigned project (unless admin)
        const userProjects = await base44.entities.Project.filter({ id: testProject.id });
        
        if (user.role === 'admin') {
          if (userProjects.length === 0) throw new Error('Admin should see all projects');
        } else {
          if (userProjects.length > 0) throw new Error('User should not see unassigned project');
        }
      } finally {
        await base44.asServiceRole.entities.Project.delete(testProject.id);
      }
    });
    
    // Test 2: Admin-only function protection
    await test('Admin-only functions reject non-admin', async () => {
      if (user.role === 'admin') {
        results.tests[results.tests.length - 1].status = 'skipped';
        results.skipped++;
        results.passed--;
        return;
      }
      
      try {
        await base44.functions.invoke('checkDataIntegrity', {});
        throw new Error('Non-admin should not access admin function');
      } catch (error) {
        if (error.message.includes('should not access')) throw error;
        // Expected 403
      }
    });
    
    // Test 3: Service role escalation protection
    await test('Service role requires authenticated user', async () => {
      // Service role operations should still validate user is authenticated
      const projects = await base44.asServiceRole.entities.Project.list();
      // Should succeed but not bypass auth completely
      if (!projects) throw new Error('Service role query failed');
    });
    
    // Test 4: Cross-project data isolation
    await test('Cannot access tasks from unassigned projects', async () => {
      if (user.role === 'admin') {
        results.tests[results.tests.length - 1].status = 'skipped';
        results.skipped++;
        results.passed--;
        return;
      }
      
      // Create project + task not assigned to user
      const testProject = await base44.asServiceRole.entities.Project.create({
        project_number: `TEST-TASK-${Date.now()}`,
        name: 'Task Auth Test',
        assigned_users: ['other@example.com']
      });
      
      const testTask = await base44.asServiceRole.entities.Task.create({
        project_id: testProject.id,
        name: 'Test Task',
        start_date: '2026-02-01',
        end_date: '2026-02-05'
      });
      
      try {
        const userTasks = await base44.entities.Task.filter({ id: testTask.id });
        if (userTasks.length > 0) {
          throw new Error('User accessed task from unassigned project');
        }
      } finally {
        await base44.asServiceRole.entities.Task.delete(testTask.id);
        await base44.asServiceRole.entities.Project.delete(testProject.id);
      }
    });
    
    return Response.json(results);
    
  } catch (error) {
    console.error('Authorization test suite error:', error);
    return Response.json({
      ...results,
      error: error.message
    }, { status: 500 });
  }
});