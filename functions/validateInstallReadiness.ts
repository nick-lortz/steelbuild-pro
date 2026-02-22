import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Install Readiness Validator: Enforces delivery-shipped + staged before marking "installable"
 * Triggered when field marks install area as "ready to install"
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId, deliveryIds, projectId } = await req.json();
    if (!taskId || !deliveryIds || !projectId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const readinessChecks = [];
    const deliveries = await base44.entities.Delivery.filter({ id: { $in: deliveryIds } });

    deliveries.forEach(d => {
      const checks = {
        delivery_number: d.delivery_number,
        shipped: d.delivery_status === 'received',
        staged: d.receiving_report?.received_timestamp ? true : false,
        exceptions_resolved: d.exceptions.every(ex => ex.resolved),
        safe_to_install: null,
        reasons: []
      };

      if (!checks.shipped) {
        checks.reasons.push('Delivery not yet received on site');
      }
      if (!checks.staged) {
        checks.reasons.push('Delivery not yet staged/inspected');
      }
      if (!checks.exceptions_resolved) {
        checks.reasons.push('Open delivery exceptions (damage/missing items)');
      }

      checks.safe_to_install = checks.shipped && checks.staged && checks.exceptions_resolved;
      readinessChecks.push(checks);
    });

    const allSafeToInstall = readinessChecks.every(c => c.safe_to_install);
    const blockers = readinessChecks.filter(c => !c.safe_to_install);

    return Response.json({
      task_id: taskId,
      safe_to_install: allSafeToInstall,
      install_readiness: readinessChecks,
      blockers: blockers.length > 0 ? blockers : [],
      reason: allSafeToInstall ? 'All deliveries shipped, staged, and exceptions resolved' : 'See blockers array',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});