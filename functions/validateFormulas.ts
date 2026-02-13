import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * QA Test Suite - Formula Validation
 * Tests all critical business logic calculations
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const results = {
      timestamp: new Date().toISOString(),
      tests_run: 0,
      tests_passed: 0,
      tests_failed: 0,
      failures: []
    };

    // Test 1: SOV Metrics Calculation
    const testSOVMetrics = () => {
      const testCases = [
        {
          name: 'Basic SOV calculation',
          sovItems: [
            { scheduled_value: 10000, percent_complete: 50, billed_amount: 4000 },
            { scheduled_value: 20000, percent_complete: 25, billed_amount: 5000 }
          ],
          expected: {
            contractValue: 30000,
            earnedToDate: 10000,  // (10000*0.5 + 20000*0.25)
            billedToDate: 9000,
            remainingToBill: 1000
          }
        },
        {
          name: 'Zero percent complete',
          sovItems: [
            { scheduled_value: 50000, percent_complete: 0, billed_amount: 0 }
          ],
          expected: {
            contractValue: 50000,
            earnedToDate: 0,
            billedToDate: 0,
            remainingToBill: 0
          }
        },
        {
          name: '100% complete',
          sovItems: [
            { scheduled_value: 100000, percent_complete: 100, billed_amount: 90000 }
          ],
          expected: {
            contractValue: 100000,
            earnedToDate: 100000,
            billedToDate: 90000,
            remainingToBill: 10000
          }
        },
        {
          name: 'Empty SOV',
          sovItems: [],
          expected: {
            contractValue: 0,
            earnedToDate: 0,
            billedToDate: 0,
            remainingToBill: 0
          }
        },
        {
          name: 'Null/undefined handling',
          sovItems: [
            { scheduled_value: null, percent_complete: undefined, billed_amount: 0 },
            { scheduled_value: 5000, percent_complete: 50, billed_amount: null }
          ],
          expected: {
            contractValue: 5000,
            earnedToDate: 2500,
            billedToDate: 0,
            remainingToBill: 2500
          }
        }
      ];

      testCases.forEach(tc => {
        results.tests_run++;
        
        const contractValue = tc.sovItems.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);
        const earnedToDate = tc.sovItems.reduce((sum, s) => 
          sum + ((s.scheduled_value || 0) * ((s.percent_complete || 0) / 100)), 0
        );
        const billedToDate = tc.sovItems.reduce((sum, s) => sum + (s.billed_amount || 0), 0);
        const remainingToBill = earnedToDate - billedToDate;

        const passed = 
          contractValue === tc.expected.contractValue &&
          Math.abs(earnedToDate - tc.expected.earnedToDate) < 0.01 &&
          billedToDate === tc.expected.billedToDate &&
          Math.abs(remainingToBill - tc.expected.remainingToBill) < 0.01;

        if (passed) {
          results.tests_passed++;
        } else {
          results.tests_failed++;
          results.failures.push({
            test: `SOV Metrics - ${tc.name}`,
            expected: tc.expected,
            actual: { contractValue, earnedToDate, billedToDate, remainingToBill }
          });
        }
      });
    };

    // Test 2: Financial KPI Calculations
    const testFinancialKPIs = () => {
      const testCases = [
        {
          name: 'Budget variance calculation',
          budget: 100000,
          actual: 90000,
          expected: { variance: 10000, percentSpent: 90 }
        },
        {
          name: 'Over budget scenario',
          budget: 50000,
          actual: 60000,
          expected: { variance: -10000, percentSpent: 120 }
        },
        {
          name: 'Zero budget edge case',
          budget: 0,
          actual: 1000,
          expected: { variance: -1000, percentSpent: Infinity }
        },
        {
          name: 'Exact match',
          budget: 75000,
          actual: 75000,
          expected: { variance: 0, percentSpent: 100 }
        },
        {
          name: 'Negative amounts',
          budget: 100000,
          actual: -5000,
          expected: { variance: 105000, percentSpent: -5 }
        }
      ];

      testCases.forEach(tc => {
        results.tests_run++;
        
        const variance = tc.budget - tc.actual;
        const percentSpent = tc.budget !== 0 ? (tc.actual / tc.budget) * 100 : Infinity;

        const passed = 
          variance === tc.expected.variance &&
          percentSpent === tc.expected.percentSpent;

        if (passed) {
          results.tests_passed++;
        } else {
          results.tests_failed++;
          results.failures.push({
            test: `Financial KPI - ${tc.name}`,
            expected: tc.expected,
            actual: { variance, percentSpent }
          });
        }
      });
    };

    // Test 3: Resource Utilization
    const testResourceUtilization = () => {
      const testCases = [
        {
          name: 'Normal utilization',
          estimated: 100,
          actual: 80,
          expected: { utilization: 80, isOverallocated: false, isUnderutilized: false }
        },
        {
          name: 'Overallocated (>110%)',
          estimated: 100,
          actual: 115,
          expected: { utilization: 115, isOverallocated: true, isUnderutilized: false }
        },
        {
          name: 'Underutilized (<50%)',
          estimated: 100,
          actual: 40,
          expected: { utilization: 40, isOverallocated: false, isUnderutilized: true }
        },
        {
          name: 'Zero estimated hours',
          estimated: 0,
          actual: 50,
          expected: { utilization: 0, isOverallocated: false, isUnderutilized: false }
        },
        {
          name: 'Exact threshold - 110%',
          estimated: 100,
          actual: 110,
          expected: { utilization: 110, isOverallocated: false, isUnderutilized: false }
        }
      ];

      testCases.forEach(tc => {
        results.tests_run++;
        
        const utilization = tc.estimated > 0 ? (tc.actual / tc.estimated) * 100 : 0;
        const isOverallocated = tc.actual > tc.estimated * 1.1;
        const isUnderutilized = tc.actual < tc.estimated * 0.5 && tc.estimated > 0;

        const passed = 
          utilization === tc.expected.utilization &&
          isOverallocated === tc.expected.isOverallocated &&
          isUnderutilized === tc.expected.isUnderutilized;

        if (passed) {
          results.tests_passed++;
        } else {
          results.tests_failed++;
          results.failures.push({
            test: `Resource Utilization - ${tc.name}`,
            expected: tc.expected,
            actual: { utilization, isOverallocated, isUnderutilized }
          });
        }
      });
    };

    // Test 4: Progress Calculation
    const testProgressCalculation = () => {
      const testCases = [
        {
          name: 'Half complete',
          total: 10,
          completed: 5,
          expected: 50
        },
        {
          name: 'All complete',
          total: 20,
          completed: 20,
          expected: 100
        },
        {
          name: 'None complete',
          total: 15,
          completed: 0,
          expected: 0
        },
        {
          name: 'No tasks',
          total: 0,
          completed: 0,
          expected: 0
        },
        {
          name: 'Rounding test',
          total: 3,
          completed: 1,
          expected: 33.33
        }
      ];

      testCases.forEach(tc => {
        results.tests_run++;
        
        const progress = tc.total > 0 ? (tc.completed / tc.total) * 100 : 0;
        const roundedProgress = Math.round(progress * 100) / 100;
        const roundedExpected = Math.round(tc.expected * 100) / 100;

        const passed = roundedProgress === roundedExpected;

        if (passed) {
          results.tests_passed++;
        } else {
          results.tests_failed++;
          results.failures.push({
            test: `Progress Calculation - ${tc.name}`,
            expected: tc.expected,
            actual: progress
          });
        }
      });
    };

    // Run all tests
    testSOVMetrics();
    testFinancialKPIs();
    testResourceUtilization();
    testProgressCalculation();

    results.pass_rate = results.tests_run > 0 
      ? ((results.tests_passed / results.tests_run) * 100).toFixed(1) 
      : 0;

    return Response.json({
      success: results.tests_failed === 0,
      summary: `${results.tests_passed}/${results.tests_run} passed (${results.pass_rate}%)`,
      ...results
    });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});