import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const STATUS_SCORES = {
  'ok': 1.0,
  'pending': 0.5,
  'failed': 0.0
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { release_group_id } = await req.json();
    
    if (!release_group_id) {
      return Response.json({ error: 'release_group_id required' }, { status: 400 });
    }

    // Fetch release group
    const groups = await base44.asServiceRole.entities.FabReleaseGroup.filter({ id: release_group_id });
    const group = groups[0];
    
    if (!group) {
      return Response.json({ error: 'Release group not found' }, { status: 404 });
    }

    // Fetch all readiness items
    const items = await base44.asServiceRole.entities.FabReadinessItem.filter({
      release_group_id
    }) || [];

    if (items.length === 0) {
      return Response.json({
        success: true,
        readiness_score: 0,
        message: 'No items in release group'
      });
    }

    const ran_at = new Date().toISOString();
    
    // Calculate weighted score
    let totalWeight = 0;
    let weightedSum = 0;
    const itemBreakdown = [];
    let hasBlockerFailed = false;

    for (const item of items) {
      const weight = item.weight || 1.0;
      const statusScore = STATUS_SCORES[item.status] || 0;
      const contribution = weight * statusScore;

      totalWeight += weight;
      weightedSum += contribution;

      itemBreakdown.push({
        item_type: item.item_type,
        item_name: item.item_name,
        weight,
        status: item.status,
        status_score: statusScore,
        contribution,
        is_blocker: item.is_blocker
      });

      // Check for blocker failures
      if (item.is_blocker && item.status === 'failed') {
        hasBlockerFailed = true;
      }
    }

    // Normalize to 0-100
    let readinessScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;

    // Hard blocker rule: cap at 49 if any blocker failed
    if (hasBlockerFailed) {
      readinessScore = Math.min(readinessScore, 49);
    }

    readinessScore = Math.round(readinessScore * 10) / 10;

    // Sort breakdown by contribution (descending)
    itemBreakdown.sort((a, b) => b.contribution - a.contribution);

    // Build explanation
    const explain = {
      total_items: items.length,
      total_weight: totalWeight,
      weighted_sum: weightedSum,
      raw_score: totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0,
      blocker_applied: hasBlockerFailed,
      final_score: readinessScore,
      item_breakdown: itemBreakdown,
      blockers: items.filter(i => i.is_blocker && i.status === 'failed').map(i => ({
        item_type: i.item_type,
        item_name: i.item_name,
        reason: i.status_reason
      }))
    };

    const inputs = {
      items: items.map(i => ({
        id: i.id,
        type: i.item_type,
        name: i.item_name,
        weight: i.weight,
        status: i.status,
        is_blocker: i.is_blocker
      }))
    };

    const outputs = {
      readiness_score: readinessScore,
      blockers_detected: hasBlockerFailed,
      total_items: items.length,
      ok_count: items.filter(i => i.status === 'ok').length,
      pending_count: items.filter(i => i.status === 'pending').length,
      failed_count: items.filter(i => i.status === 'failed').length
    };

    // Store computation run
    await base44.asServiceRole.entities.FabReadinessComputationRun.create({
      project_id: group.project_id,
      release_group_id,
      version: 'v1',
      ran_at,
      inputs_json: JSON.stringify(inputs),
      outputs_json: JSON.stringify(outputs),
      explain_json: JSON.stringify(explain),
      blockers_detected: hasBlockerFailed
    });

    // Update release group
    await base44.asServiceRole.entities.FabReleaseGroup.update(release_group_id, {
      readiness_score: readinessScore,
      last_computed_at: ran_at
    });

    return Response.json({
      success: true,
      readiness_score: readinessScore,
      outputs,
      explain
    });

  } catch (error) {
    console.error('Readiness computation error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});