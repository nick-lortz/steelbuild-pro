/**
 * AUTHENTICATION TESTS
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const results = {
    suite: 'Authentication',
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
    
    // Test 1: Valid authentication
    await test('Valid user authentication', async () => {
      const user = await base44.auth.me();
      if (!user || !user.email) throw new Error('User not authenticated');
      if (!user.role || !['admin', 'user'].includes(user.role)) {
        throw new Error('Invalid user role');
      }
    });
    
    // Test 2: Session validation
    await test('Session validation', async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) throw new Error('Session invalid');
    });
    
    // Test 3: User data persistence
    await test('User data access', async () => {
      const user = await base44.auth.me();
      
      // Update user data
      await base44.auth.updateMe({ test_field: 'test_value' });
      
      // Verify
      const updated = await base44.auth.me();
      if (updated.test_field !== 'test_value') {
        throw new Error('User data not persisted');
      }
      
      // Cleanup
      await base44.auth.updateMe({ test_field: null });
    });
    
    // Test 4: Invalid token rejection
    await test('Invalid token rejection', async () => {
      try {
        // Create client with no auth
        const invalidClient = createClientFromRequest(
          new Request('http://localhost', { headers: {} })
        );
        await invalidClient.auth.me();
        throw new Error('Should have rejected invalid token');
      } catch (error) {
        if (error.message.includes('Should have rejected')) throw error;
        // Expected to fail - auth should reject
      }
    });
    
    return Response.json(results);
    
  } catch (error) {
    console.error('Auth test suite error:', error);
    return Response.json({
      ...results,
      error: error.message
    }, { status: 500 });
  }
});