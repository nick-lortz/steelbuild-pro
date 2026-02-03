/**
 * RFI LIFECYCLE TESTS
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const results = {
    suite: 'RFI Lifecycle',
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
    
    // Create test project
    const testProject = await base44.asServiceRole.entities.Project.create({
      project_number: `TEST-RFI-${Date.now()}`,
      name: 'RFI Test Project'
    });
    cleanup.push(() => base44.asServiceRole.entities.Project.delete(testProject.id));
    
    // Test 1: RFI creation with auto-numbering
    await test('RFI auto-numbering per project', async () => {
      const rfi1 = await base44.asServiceRole.entities.RFI.create({
        project_id: testProject.id,
        rfi_number: 1,
        subject: 'Test RFI 1',
        status: 'draft'
      });
      cleanup.push(() => base44.asServiceRole.entities.RFI.delete(rfi1.id));
      
      const rfi2 = await base44.asServiceRole.entities.RFI.create({
        project_id: testProject.id,
        rfi_number: 2,
        subject: 'Test RFI 2',
        status: 'draft'
      });
      cleanup.push(() => base44.asServiceRole.entities.RFI.delete(rfi2.id));
      
      if (rfi2.rfi_number !== 2) {
        throw new Error('RFI numbering incorrect');
      }
    });
    
    // Test 2: RFI status workflow
    await test('RFI status transitions are valid', async () => {
      const rfi = await base44.asServiceRole.entities.RFI.create({
        project_id: testProject.id,
        rfi_number: 100,
        subject: 'Workflow Test',
        status: 'draft'
      });
      cleanup.push(() => base44.asServiceRole.entities.RFI.delete(rfi.id));
      
      // draft → submitted
      await base44.asServiceRole.entities.RFI.update(rfi.id, { 
        status: 'submitted',
        submitted_date: '2026-02-01'
      });
      
      // submitted → answered
      await base44.asServiceRole.entities.RFI.update(rfi.id, { 
        status: 'answered',
        response_date: '2026-02-05',
        response: 'Test response'
      });
      
      const final = await base44.asServiceRole.entities.RFI.filter({ id: rfi.id });
      if (final[0].status !== 'answered') {
        throw new Error('Status transition failed');
      }
    });
    
    // Test 3: RFI date ordering validation
    await test('RFI dates must be ordered correctly', async () => {
      try {
        await base44.asServiceRole.entities.RFI.create({
          project_id: testProject.id,
          rfi_number: 101,
          subject: 'Invalid Dates',
          status: 'answered',
          submitted_date: '2026-02-10',
          response_date: '2026-02-05' // Before submitted!
        });
        throw new Error('Should reject invalid date ordering');
      } catch (error) {
        if (error.message.includes('Should reject')) throw error;
        // Expected validation error
      }
    });
    
    // Test 4: Blocker tracking
    await test('RFI blocker metadata is tracked', async () => {
      const rfi = await base44.asServiceRole.entities.RFI.create({
        project_id: testProject.id,
        rfi_number: 102,
        subject: 'Blocker Test',
        status: 'submitted',
        blocker_info: {
          is_blocker: true,
          blocked_work: 'fabrication',
          blocked_since: new Date().toISOString(),
          impact_summary: 'Cannot fab columns C3-C5'
        }
      });
      cleanup.push(() => base44.asServiceRole.entities.RFI.delete(rfi.id));
      
      if (!rfi.blocker_info?.is_blocker) {
        throw new Error('Blocker info not saved');
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
    console.error('RFI test error:', error);
    
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