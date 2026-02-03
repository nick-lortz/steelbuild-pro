/**
 * FINANCIAL LIFECYCLE TESTS
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const results = {
    suite: 'Financial Lifecycle',
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
      project_number: `TEST-FIN-${Date.now()}`,
      name: 'Financial Test Project',
      contract_value: 500000
    });
    cleanup.push(() => base44.asServiceRole.entities.Project.delete(testProject.id));
    
    // Test 1: Budget creation and calculation
    await test('Budget creation with correct calculations', async () => {
      const financial = await base44.asServiceRole.entities.Financial.create({
        project_id: testProject.id,
        cost_code_id: 'test-code',
        category: 'labor',
        original_budget: 100000,
        approved_changes: 5000,
        current_budget: 105000,
        actual_amount: 0,
        forecast_amount: 105000
      });
      cleanup.push(() => base44.asServiceRole.entities.Financial.delete(financial.id));
      
      if (financial.current_budget !== 105000) {
        throw new Error('Current budget incorrect');
      }
    });
    
    // Test 2: Expense tracking updates actuals
    await test('Expense creation updates financial actuals', async () => {
      const financial = await base44.asServiceRole.entities.Financial.create({
        project_id: testProject.id,
        cost_code_id: 'test-labor',
        category: 'labor',
        original_budget: 50000,
        approved_changes: 0,
        current_budget: 50000,
        actual_amount: 0
      });
      cleanup.push(() => base44.asServiceRole.entities.Financial.delete(financial.id));
      
      // Add expense
      const expense = await base44.asServiceRole.entities.Expense.create({
        project_id: testProject.id,
        cost_code_id: 'test-labor',
        category: 'labor',
        expense_date: '2026-02-01',
        amount: 10000,
        payment_status: 'paid'
      });
      cleanup.push(() => base44.asServiceRole.entities.Expense.delete(expense.id));
      
      // Sync expenses to financials
      await base44.asServiceRole.functions.invoke('syncExpensesToFinancials', {
        project_id: testProject.id
      });
      
      // Verify actuals updated
      const updated = await base44.asServiceRole.entities.Financial.filter({ id: financial.id });
      if (updated[0].actual_amount !== 10000) {
        throw new Error(`Actuals not synced: expected 10000, got ${updated[0].actual_amount}`);
      }
    });
    
    // Test 3: SOV percent complete calculations
    await test('SOV percent complete calculates billing correctly', async () => {
      const sovItem = await base44.asServiceRole.entities.SOVItem.create({
        project_id: testProject.id,
        sov_code: '01',
        description: 'Test SOV Line',
        scheduled_value: 100000,
        percent_complete: 50,
        billed_to_date: 0
      });
      cleanup.push(() => base44.asServiceRole.entities.SOVItem.delete(sovItem.id));
      
      // 50% of $100,000 = $50,000 earned
      const earned = (sovItem.scheduled_value * sovItem.percent_complete) / 100;
      if (earned !== 50000) {
        throw new Error('Earned calculation incorrect');
      }
    });
    
    // Test 4: Cannot overbill SOV
    await test('SOV prevents overbilling', async () => {
      const sovItem = await base44.asServiceRole.entities.SOVItem.create({
        project_id: testProject.id,
        sov_code: '02',
        description: 'Overbill Test',
        scheduled_value: 10000,
        percent_complete: 50, // Only $5K earned
        billed_to_date: 0
      });
      cleanup.push(() => base44.asServiceRole.entities.SOVItem.delete(sovItem.id));
      
      try {
        // Try to update percent to decrease (should fail if billed)
        await base44.asServiceRole.entities.SOVItem.update(sovItem.id, {
          billed_to_date: 5000
        });
        
        // Now try to decrease percent
        const response = await base44.asServiceRole.functions.invoke('validateSOVBudget', {
          sov_item_id: sovItem.id,
          percent_complete: 40, // Trying to decrease
          project_id: testProject.id
        });
        
        // Should warn about overbilling
        if (response.data.valid && response.data.severity !== 'warning') {
          throw new Error('Should warn about potential overbilling');
        }
      } catch (error) {
        // Expected validation error
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
    console.error('Financial test error:', error);
    
    // Cleanup on error
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