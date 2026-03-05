import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Health Check Endpoint
 * 
 * Returns system health status. Use for uptime monitoring (e.g., UptimeRobot, Pingdom).
 * Checks: auth service, entity read, timestamp.
 */

Deno.serve(async (req) => {
  const start = Date.now();
  const checks = {};

  try {
    const base44 = createClientFromRequest(req);

    // Check 1: Auth service responds
    try {
      const user = await base44.auth.me();
      checks.auth = { status: 'ok', user_id: user?.id ? 'present' : 'missing' };
    } catch (e) {
      checks.auth = { status: 'degraded', error: e.message?.substring(0, 100) };
    }

    // Check 2: Entity read (lightweight)
    try {
      const projects = await base44.entities.Project.list('name', 1);
      checks.database = { status: 'ok', sample_count: projects.length };
    } catch (e) {
      checks.database = { status: 'error', error: e.message?.substring(0, 100) };
    }

    // Check 3: Environment
    checks.environment = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      app_id: Deno.env.get('BASE44_APP_ID') ? 'configured' : 'missing',
    };

    const duration = Date.now() - start;
    const allOk = Object.values(checks).every(c => c.status === 'ok');

    return Response.json({
      status: allOk ? 'healthy' : 'degraded',
      duration_ms: duration,
      checks,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    }, { status: allOk ? 200 : 503 });

  } catch (error) {
    return Response.json({
      status: 'error',
      duration_ms: Date.now() - start,
      error: error.message?.substring(0, 200),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
});