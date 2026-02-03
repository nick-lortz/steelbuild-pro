/**
 * Load & Smoke Tests for SteelBuild Pro
 * Tests critical paths and measures performance
 * Run: base44.functions.invoke('loadSmokeTests', { runType: 'smoke' })
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const Results = {
  tests: [],
  startTime: Date.now(),
  totalDuration: 0,
  passed: 0,
  failed: 0
};

function logTest(name, success, duration, details = '') {
  Results.tests.push({ name, success, duration, details, timestamp: new Date().toISOString() });
  if (success) Results.passed++; else Results.failed++;
  console.log(JSON.stringify({ test: name, success, duration_ms: duration, details }));
}

async function testDashboardData(base44) {
  const start = Date.now();
  try {
    const response = await base44.functions.invoke('getDashboardData', { 
      page: 1, 
      pageSize: 10, 
      search: '', 
      status: 'all', 
      risk: 'all',
      sort: 'risk'
    });
    
    const hasMetrics = response?.data?.metrics && response?.data?.pagination;
    logTest('Dashboard.GetData', hasMetrics, Date.now() - start, hasMetrics ? 'OK' : 'Missing metrics');
    return hasMetrics;
  } catch (e) {
    logTest('Dashboard.GetData', false, Date.now() - start, e.message);
    return false;
  }
}

async function testProjectCRUD(base44) {
  const start = Date.now();
  try {
    // Create
    const createRes = await base44.functions.invoke('createProject', {
      project_number: `TEST-${Date.now()}`,
      name: `Load Test Project ${Date.now()}`,
      client: 'Test Client',
      contract_value: 500000
    });

    const projectId = createRes?.data?.id || createRes?.data?.project?.id;
    if (!projectId) throw new Error('No project ID returned');

    // Read
    const projects = await base44.entities.Project.filter({ id: projectId });
    if (!projects?.[0]) throw new Error('Project not found after create');

    // Update
    const updateRes = await base44.functions.invoke('updateProject', {
      id: projectId,
      name: 'Updated Test Project'
    });

    // Cleanup
    await base44.functions.invoke('deleteProject', { id: projectId });

    const duration = Date.now() - start;
    logTest('Project.CRUD', true, duration, `Create/Read/Update/Delete cycle`);
    return true;
  } catch (e) {
    logTest('Project.CRUD', false, Date.now() - start, e.message);
    return false;
  }
}

async function testRFILifecycle(base44) {
  const start = Date.now();
  try {
    // Get a project
    const projects = await base44.entities.Project.filter({}, '', 1);
    if (!projects?.[0]) {
      logTest('RFI.Lifecycle', false, Date.now() - start, 'No test project available');
      return false;
    }

    const projectId = projects[0].id;

    // Create RFI
    const createRes = await base44.functions.invoke('createRFI', {
      project_id: projectId,
      rfi_number: Math.floor(Math.random() * 10000),
      subject: 'Load Test RFI',
      rfi_type: 'connection_detail',
      category: 'structural',
      question: 'This is a test RFI for load testing purposes',
      priority: 'medium'
    });

    const rfiId = createRes?.data?.rfi?.id || createRes?.data?.id;
    if (!rfiId) throw new Error('No RFI ID returned');

    // Update RFI
    await base44.functions.invoke('updateRFI', {
      id: rfiId,
      status: 'submitted'
    });

    const duration = Date.now() - start;
    logTest('RFI.Lifecycle', true, duration, 'Create/Update cycle');
    return true;
  } catch (e) {
    logTest('RFI.Lifecycle', false, Date.now() - start, e.message);
    return false;
  }
}

async function testFinancialOps(base44) {
  const start = Date.now();
  try {
    // Get a project
    const projects = await base44.entities.Project.filter({}, '', 1);
    if (!projects?.[0]) {
      logTest('Financial.Operations', false, Date.now() - start, 'No test project available');
      return false;
    }

    const projectId = projects[0].id;

    // Get financial summary
    const summaryRes = await base44.functions.invoke('getProjectFinancialSummary', {
      project_id: projectId
    });

    const hasSummary = summaryRes?.data?.total_contract !== undefined;
    if (!hasSummary) throw new Error('No financial summary returned');

    // Forecast ETC
    const forecastRes = await base44.functions.invoke('forecastETC', {
      project_id: projectId
    });

    const hasForecasts = Array.isArray(forecastRes?.data?.forecasts);
    if (!hasForecasts) throw new Error('No forecasts returned');

    const duration = Date.now() - start;
    logTest('Financial.Operations', true, duration, 'Summary + Forecast');
    return true;
  } catch (e) {
    logTest('Financial.Operations', false, Date.now() - start, e.message);
    return false;
  }
}

async function testTaskOps(base44) {
  const start = Date.now();
  try {
    const projects = await base44.entities.Project.filter({}, '', 1);
    if (!projects?.[0]) {
      logTest('Task.Operations', false, Date.now() - start, 'No test project available');
      return false;
    }

    const projectId = projects[0].id;
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // Create task
    const createRes = await base44.functions.invoke('createTask', {
      project_id: projectId,
      name: `Load Test Task ${Date.now()}`,
      phase: 'fabrication',
      start_date: today,
      end_date: tomorrow,
      status: 'not_started',
      estimated_hours: 8
    });

    const taskId = createRes?.data?.task?.id || createRes?.data?.id;
    if (!taskId) throw new Error('No task ID returned');

    // Update task
    await base44.functions.invoke('updateTask', {
      id: taskId,
      status: 'in_progress',
      progress_percent: 50
    });

    const duration = Date.now() - start;
    logTest('Task.Operations', true, duration, 'Create/Update cycle');
    return true;
  } catch (e) {
    logTest('Task.Operations', false, Date.now() - start, e.message);
    return false;
  }
}

async function testAnalytics(base44) {
  const start = Date.now();
  try {
    const projects = await base44.entities.Project.filter({}, '', 1);
    if (!projects?.[0]) {
      logTest('Analytics.GetData', false, Date.now() - start, 'No test project available');
      return false;
    }

    const analyticsRes = await base44.functions.invoke('getAnalyticsData', {
      project_id: projects[0].id
    });

    const hasData = analyticsRes?.data && typeof analyticsRes.data === 'object';
    if (!hasData) throw new Error('No analytics data returned');

    const duration = Date.now() - start;
    logTest('Analytics.GetData', true, duration, 'Data aggregation');
    return true;
  } catch (e) {
    logTest('Analytics.GetData', false, Date.now() - start, e.message);
    return false;
  }
}

// Concurrent load test
async function loadTest(base44, concurrency = 5) {
  const projects = await base44.entities.Project.filter({}, '', 1);
  if (!projects?.[0]) {
    console.log('No projects for load test');
    return;
  }

  const projectId = projects[0].id;
  const promises = [];

  for (let i = 0; i < concurrency; i++) {
    promises.push(
      base44.functions.invoke('getDashboardData', { page: 1, pageSize: 10 })
        .then(() => ({ success: true, i, duration: 0 }))
        .catch(e => ({ success: false, i, error: e.message }))
    );
  }

  const start = Date.now();
  const results = await Promise.all(promises);
  const duration = Date.now() - start;

  const successes = results.filter(r => r.success).length;
  logTest(`Load.Concurrent(${concurrency})`, successes === concurrency, duration, `${successes}/${concurrency} succeeded`);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { runType = 'smoke' } = await req.json();

    Results.startTime = Date.now();

    if (runType === 'smoke') {
      await Promise.all([
        testDashboardData(base44),
        testProjectCRUD(base44),
        testRFILifecycle(base44),
        testFinancialOps(base44),
        testTaskOps(base44),
        testAnalytics(base44)
      ]);
    } else if (runType === 'load') {
      await testDashboardData(base44);
      await loadTest(base44, 10);
    }

    Results.totalDuration = Date.now() - Results.startTime;

    return Response.json({
      runType,
      summary: {
        total: Results.tests.length,
        passed: Results.passed,
        failed: Results.failed,
        duration_ms: Results.totalDuration,
        pass_rate: ((Results.passed / Results.tests.length) * 100).toFixed(1) + '%'
      },
      tests: Results.tests
    });

  } catch (error) {
    console.error('Test suite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});