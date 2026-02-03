/**
 * AUTOMATED TEST RUNNER
 * 
 * Runs all P0 tests and returns results
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAuth } from './utils/auth.js';

Deno.serve(async (req) => {
  try {
    const { user, base44, error } = await requireAuth(req);
    if (error) return error;
    
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }
    
    const { test_suite = 'all' } = await req.json();
    
    const results = {
      timestamp: new Date().toISOString(),
      test_suite,
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
    
    const suites = {
      auth: 'testAuth',
      authorization: 'testAuthorization',
      data_integrity: 'testDataIntegrity',
      financial: 'testFinancialLifecycle',
      rfi: 'testRFILifecycle',
      e2e: 'testE2ECriticalPath',
      error_handling: 'testErrorHandling'
    };
    
    const toRun = test_suite === 'all' ? Object.values(suites) : [suites[test_suite]];
    
    for (const testFunction of toRun) {
      try {
        const response = await base44.asServiceRole.functions.invoke(testFunction, {});
        
        if (response.data?.tests) {
          results.tests.push(...response.data.tests);
          results.passed += response.data.passed || 0;
          results.failed += response.data.failed || 0;
          results.skipped += response.data.skipped || 0;
        }
      } catch (error) {
        results.tests.push({
          suite: testFunction,
          name: 'Suite Execution',
          status: 'failed',
          error: error.message,
          duration_ms: 0
        });
        results.failed++;
      }
    }
    
    results.total = results.passed + results.failed + results.skipped;
    results.success_rate = results.total > 0 ? (results.passed / results.total * 100).toFixed(2) : 0;
    
    return Response.json(results);
    
  } catch (error) {
    console.error('Test runner error:', error);
    return Response.json({
      error: 'Test runner failed',
      message: error.message
    }, { status: 500 });
  }
});