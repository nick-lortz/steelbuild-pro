import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Test harness for work package state machine
 * Tests common scenarios and validates gate logic
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { scenario, project_id } = await req.json();

    // Import state machine
    const { WorkPackageStateMachine, WP_STATES } = await import('../components/work-packages/WorkPackageStateMachine.js');
    const stateMachine = new WorkPackageStateMachine(base44);

    const testResults = [];

    // ========================================
    // TEST SCENARIOS
    // ========================================

    if (!scenario || scenario === 'planning_to_detailing') {
      testResults.push(await test_planning_to_detailing(base44, stateMachine, project_id));
    }

    if (!scenario || scenario === 'detailing_to_fabrication') {
      testResults.push(await test_detailing_to_fabrication(base44, stateMachine, project_id));
    }

    if (!scenario || scenario === 'fabrication_to_delivery') {
      testResults.push(await test_fabrication_to_delivery(base44, stateMachine, project_id));
    }

    if (!scenario || scenario === 'delivery_to_erection') {
      testResults.push(await test_delivery_to_erection(base44, stateMachine, project_id));
    }

    if (!scenario || scenario === 'erection_to_closeout') {
      testResults.push(await test_erection_to_closeout(base44, stateMachine, project_id));
    }

    // Summary
    const passed = testResults.filter(r => r.passed).length;
    const failed = testResults.filter(r => !r.passed).length;

    return Response.json({
      success: true,
      summary: {
        total: testResults.length,
        passed,
        failed,
        pass_rate: ((passed / testResults.length) * 100).toFixed(1) + '%',
      },
      results: testResults,
    });
  } catch (error) {
    console.error('[testWorkPackageStateMachine] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ========================================
// TEST FUNCTIONS
// ========================================

async function test_planning_to_detailing(base44, stateMachine, projectId) {
  const testName = 'Planning → Detailing';
  
  try {
    // Create test work package
    const wp = await base44.asServiceRole.entities.WorkPackage.create({
      project_id: projectId,
      name: 'Test WP - Planning',
      phase: 'planning',
      scope_description: 'Test scope',
    });

    // Evaluate transition
    const trace = await stateMachine.evaluateTransition(wp, 'detailing');

    // Cleanup
    await base44.asServiceRole.entities.WorkPackage.delete(wp.id);

    return {
      test: testName,
      passed: trace.overall_pass === true,
      trace,
      notes: 'Should pass with scope defined',
    };
  } catch (error) {
    return {
      test: testName,
      passed: false,
      error: error.message,
    };
  }
}

async function test_detailing_to_fabrication(base44, stateMachine, projectId) {
  const testName = 'Detailing → Fabrication (Blocking RFI)';
  
  try {
    // Create work package
    const wp = await base44.asServiceRole.entities.WorkPackage.create({
      project_id: projectId,
      name: 'Test WP - Detailing',
      phase: 'detailing',
      scope_description: 'Test scope',
      fab_release_group_id: 'test-group-1',
    });

    // Create blocking RFI
    const rfi = await base44.asServiceRole.entities.RFI.create({
      project_id: projectId,
      rfi_number: 9999,
      subject: 'Test Blocking RFI',
      status: 'submitted',
      fab_blocker: true,
      affects_release_group_id: 'test-group-1',
    });

    // Evaluate transition (should fail)
    const trace = await stateMachine.evaluateTransition(wp, 'fabrication');

    // Cleanup
    await base44.asServiceRole.entities.WorkPackage.delete(wp.id);
    await base44.asServiceRole.entities.RFI.delete(rfi.id);

    return {
      test: testName,
      passed: trace.overall_pass === false && trace.blocking_reasons.some(r => r.includes('blocking RFIs')),
      trace,
      notes: 'Should fail with blocking RFI',
    };
  } catch (error) {
    return {
      test: testName,
      passed: false,
      error: error.message,
    };
  }
}

async function test_fabrication_to_delivery(base44, stateMachine, projectId) {
  const testName = 'Fabrication → Delivery (No Fab Packages)';
  
  try {
    const wp = await base44.asServiceRole.entities.WorkPackage.create({
      project_id: projectId,
      name: 'Test WP - Fabrication',
      phase: 'fabrication',
      scope_description: 'Test scope',
    });

    // Evaluate without fabrication packages (should fail)
    const trace = await stateMachine.evaluateTransition(wp, 'delivery');

    // Cleanup
    await base44.asServiceRole.entities.WorkPackage.delete(wp.id);

    return {
      test: testName,
      passed: trace.overall_pass === false && trace.blocking_reasons.some(r => r.includes('fabrication packages')),
      trace,
      notes: 'Should fail without fabrication packages',
    };
  } catch (error) {
    return {
      test: testName,
      passed: false,
      error: error.message,
    };
  }
}

async function test_delivery_to_erection(base44, stateMachine, projectId) {
  const testName = 'Delivery → Erection (No Delivery)';
  
  try {
    const wp = await base44.asServiceRole.entities.WorkPackage.create({
      project_id: projectId,
      name: 'Test WP - Delivery',
      phase: 'delivery',
      scope_description: 'Test scope',
    });

    // Evaluate without delivery (should fail)
    const trace = await stateMachine.evaluateTransition(wp, 'erection');

    // Cleanup
    await base44.asServiceRole.entities.WorkPackage.delete(wp.id);

    return {
      test: testName,
      passed: trace.overall_pass === false && trace.blocking_reasons.some(r => r.includes('deliveries')),
      trace,
      notes: 'Should fail without delivery',
    };
  } catch (error) {
    return {
      test: testName,
      passed: false,
      error: error.message,
    };
  }
}

async function test_erection_to_closeout(base44, stateMachine, projectId) {
  const testName = 'Erection → Closeout (Open Punch)';
  
  try {
    const wp = await base44.asServiceRole.entities.WorkPackage.create({
      project_id: projectId,
      name: 'Test WP - Erection',
      phase: 'erection',
      scope_description: 'Test scope',
    });

    // Create open punch item
    const punch = await base44.asServiceRole.entities.PunchItem.create({
      project_id: projectId,
      work_package_id: wp.id,
      description: 'Test punch item',
      status: 'open',
    });

    // Evaluate with open punch (should fail)
    const trace = await stateMachine.evaluateTransition(wp, 'closeout');

    // Cleanup
    await base44.asServiceRole.entities.WorkPackage.delete(wp.id);
    await base44.asServiceRole.entities.PunchItem.delete(punch.id);

    return {
      test: testName,
      passed: trace.overall_pass === false && trace.blocking_reasons.some(r => r.includes('punch items')),
      trace,
      notes: 'Should fail with open punch items',
    };
  } catch (error) {
    return {
      test: testName,
      passed: false,
      error: error.message,
    };
  }
}