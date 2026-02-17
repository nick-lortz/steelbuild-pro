import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const CREW_HOURLY_RATE = 85; // Average crew composite rate
const CRANE_HOURLY_RATE = 175;
const SHOP_LABOR_RATE = 65;
const AVG_SHOP_REWORK_HOURS = 8;
const MATERIAL_HANDLING_HOURS = 4;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id } = await req.json();
    
    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    // Fetch all relevant data
    const [
      rfis,
      fieldIssues,
      installStatuses,
      deliveries,
      fabrications,
      existingRisks,
      sovItems,
      expenses
    ] = await Promise.all([
      base44.entities.RFI.filter({ project_id }),
      base44.asServiceRole.entities.FieldIssue?.filter({ project_id }) || [],
      base44.asServiceRole.entities.InstallableWorkStatus?.filter({ project_id }) || [],
      base44.asServiceRole.entities.Delivery?.filter({ project_id }) || [],
      base44.asServiceRole.entities.Fabrication?.filter({ project_id }) || [],
      base44.asServiceRole.entities.MarginRiskEvent?.filter({ project_id, risk_status: 'Active' }) || [],
      base44.entities.SOVItem.filter({ project_id }),
      base44.entities.Expense.filter({ project_id })
    ]);

    const newRisks = [];
    const riskMap = new Map(existingRisks.map(r => [`${r.linked_entity_type}_${r.linked_entity_id}`, r]));

    // RFI-Driven Risk Detection
    const openRFIs = rfis.filter(rfi => rfi.status !== 'closed' && rfi.status !== 'answered');
    for (const rfi of openRFIs) {
      const key = `RFI_${rfi.id}`;
      if (!riskMap.has(key)) {
        const relatedFab = fabrications.find(f => 
          rfi.linked_drawing_set_ids?.includes(f.drawing_set_id) || 
          rfi.fabrication_hold
        );

        if (relatedFab && relatedFab.status === 'released') {
          const costImpact = AVG_SHOP_REWORK_HOURS * SHOP_LABOR_RATE;
          newRisks.push({
            project_id,
            linked_entity_type: 'RFI',
            linked_entity_id: rfi.id,
            impact_category: 'Rework',
            risk_status: 'Active',
            estimated_cost_impact: costImpact,
            risk_score: 85,
            description: `Open RFI ${rfi.rfi_number}: ${rfi.subject}`,
            area_id: rfi.location_area || 'General'
          });
        }
      }
    }

    // Install Blocking Detection
    for (const status of installStatuses) {
      if (status.install_blocked_tons > 0 && status.blocking_reason && status.blocking_reason !== 'None') {
        const key = `InstallableWorkStatus_${status.id}`;
        if (!riskMap.has(key)) {
          const crewCost = (status.crew_hours_idle || 4) * CREW_HOURLY_RATE;
          const craneCost = (status.crane_hours_idle || 2) * CRANE_HOURLY_RATE;
          const totalImpact = crewCost + craneCost;

          newRisks.push({
            project_id,
            linked_entity_type: 'ErectionActivity',
            linked_entity_id: status.id,
            impact_category: 'InstallBlocked',
            risk_status: 'Active',
            estimated_cost_impact: totalImpact,
            install_tons_affected: status.install_blocked_tons,
            risk_score: 75,
            description: `${status.blocking_reason} blocking ${status.install_blocked_tons}T in ${status.area_id}`,
            area_id: status.area_id
          });
        }
      }
    }

    // Delivery Waste Detection
    for (const delivery of deliveries) {
      if (delivery.arrival_date) {
        const installStatus = installStatuses.find(s => s.area_id === delivery.area);
        const actualInstallDate = installStatus?.created_date;
        
        if (actualInstallDate && new Date(delivery.arrival_date) < new Date(actualInstallDate)) {
          const daysDiff = Math.floor((new Date(actualInstallDate) - new Date(delivery.arrival_date)) / (1000 * 60 * 60 * 24));
          if (daysDiff > 7) {
            const key = `DeliveryLog_${delivery.id}`;
            if (!riskMap.has(key)) {
              const handlingCost = MATERIAL_HANDLING_HOURS * CREW_HOURLY_RATE;
              newRisks.push({
                project_id,
                linked_entity_type: 'DeliveryLog',
                linked_entity_id: delivery.id,
                impact_category: 'DeliveryWaste',
                risk_status: 'Active',
                estimated_cost_impact: handlingCost,
                estimated_schedule_impact_days: daysDiff,
                risk_score: 50,
                description: `Early delivery ${daysDiff} days before install ready`,
                area_id: delivery.area || 'General'
              });
            }
          }
        }
      }
    }

    // Field Issue Risk Detection
    const activeIssues = fieldIssues.filter(fi => fi.status === 'open' || fi.status === 'in_progress');
    for (const issue of activeIssues) {
      const key = `FieldIssue_${issue.id}`;
      if (!riskMap.has(key)) {
        const severity = issue.severity || 'medium';
        const costImpact = severity === 'critical' ? 2000 : severity === 'high' ? 1000 : 500;
        
        newRisks.push({
          project_id,
          linked_entity_type: 'FieldIssue',
          linked_entity_id: issue.id,
          impact_category: issue.issue_type === 'fitup' ? 'InstallBlocked' : 'Rework',
          risk_status: 'Active',
          estimated_cost_impact: costImpact,
          risk_score: severity === 'critical' ? 90 : severity === 'high' ? 70 : 50,
          description: `${issue.issue_type}: ${issue.description}`,
          area_id: issue.location || 'General'
        });
      }
    }

    // Create new risk events
    if (newRisks.length > 0) {
      await base44.asServiceRole.entities.MarginRiskEvent.bulkCreate(newRisks);
    }

    // Calculate margin snapshot
    const allActiveRisks = [...existingRisks, ...newRisks];
    const totalRiskDollars = allActiveRisks.reduce((sum, r) => sum + (r.estimated_cost_impact || 0), 0);

    // Calculate actual install costs from expenses
    const installExpenses = expenses.filter(e => 
      e.category === 'labor' || e.category === 'equipment'
    );
    const actualInstallCost = installExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate earned revenue from SOV
    const earnedRevenue = sovItems.reduce((sum, item) => sum + (item.earned_to_date || 0), 0);

    // Calculate estimated install cost from SOV erection items
    const erectionSOV = sovItems.filter(item => 
      item.description?.toLowerCase().includes('erection') ||
      item.description?.toLowerCase().includes('install')
    );
    const estimatedInstallCost = erectionSOV.reduce((sum, item) => sum + (item.scheduled_value || 0), 0);

    // Calculate margins
    const currentMargin = earnedRevenue > 0 
      ? ((earnedRevenue - actualInstallCost) / earnedRevenue) * 100 
      : 0;

    const projectedTotalCost = actualInstallCost + totalRiskDollars;
    const projectedMargin = earnedRevenue > 0 
      ? ((earnedRevenue - projectedTotalCost) / earnedRevenue) * 100 
      : 0;

    // Build top drivers
    const topDrivers = allActiveRisks
      .sort((a, b) => (b.estimated_cost_impact || 0) - (a.estimated_cost_impact || 0))
      .slice(0, 5)
      .map(r => ({
        description: r.description || `${r.impact_category} - ${r.linked_entity_type}`,
        impact: r.estimated_cost_impact || 0,
        category: r.impact_category
      }));

    // Create or update snapshot
    const snapshotDate = new Date().toISOString().split('T')[0];
    const existingSnapshot = await base44.asServiceRole.entities.InstallMarginSnapshot?.filter({
      project_id,
      snapshot_date: snapshotDate
    }) || [];

    const snapshotData = {
      project_id,
      snapshot_date: snapshotDate,
      estimated_install_cost: estimatedInstallCost,
      actual_install_cost: actualInstallCost,
      earned_revenue: earnedRevenue,
      current_margin_percent: parseFloat(currentMargin.toFixed(2)),
      projected_margin_percent: parseFloat(projectedMargin.toFixed(2)),
      margin_at_risk_dollars: totalRiskDollars,
      risk_event_count: allActiveRisks.length,
      top_drivers: topDrivers
    };

    if (existingSnapshot.length > 0) {
      await base44.asServiceRole.entities.InstallMarginSnapshot.update(
        existingSnapshot[0].id,
        snapshotData
      );
    } else {
      await base44.asServiceRole.entities.InstallMarginSnapshot.create(snapshotData);
    }

    return Response.json({
      success: true,
      new_risks_created: newRisks.length,
      snapshot: snapshotData
    });

  } catch (error) {
    console.error('Margin risk calculation error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});