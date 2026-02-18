import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function calculateBusinessDays(startDate, endDate) {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

function calculateCalendarDays(startDate, endDate) {
  const diff = new Date(endDate) - new Date(startDate);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, use_business_days = true } = await req.json();
    
    if (!project_id) {
      return Response.json({ error: 'project_id required' }, { status: 400 });
    }

    // Fetch float consumption model
    const models = await base44.asServiceRole.entities.FloatConsumptionModel?.filter({
      project_id,
      is_active: true
    }) || [];
    
    const model = models[0] || {
      cost_per_float_day: 500,
      critical_path_multiplier: 2.0,
      crew_idle_cost_per_day: 2720
    };

    // Fetch external parties
    const parties = await base44.asServiceRole.entities.ExternalParty?.filter({
      project_id
    }) || [];

    // Fetch RFIs to analyze
    const rfis = await base44.entities.RFI.filter({ project_id });
    const existingLags = await base44.asServiceRole.entities.ResponseLagEvent?.filter({ project_id }) || [];
    
    const lagMap = new Map(existingLags.map(l => [`${l.entity_type}_${l.entity_id}`, l]));
    const newLags = [];

    for (const rfi of rfis) {
      const key = `RFI_${rfi.id}`;
      
      // Skip if already tracked
      if (lagMap.has(key)) continue;

      // Only track submitted RFIs
      if (!rfi.submitted_date) continue;

      const requestedAt = new Date(rfi.submitted_date).toISOString();
      const respondedAt = rfi.response_date ? new Date(rfi.response_date).toISOString() : null;
      const now = new Date().toISOString();

      const businessDays = respondedAt ? 
        calculateBusinessDays(rfi.submitted_date, rfi.response_date) :
        calculateBusinessDays(rfi.submitted_date, new Date());

      const calendarDays = respondedAt ?
        calculateCalendarDays(rfi.submitted_date, rfi.response_date) :
        calculateCalendarDays(rfi.submitted_date, new Date());

      const lagDays = use_business_days ? businessDays : calendarDays;
      const slaDays = rfi.days_to_respond || 5;
      const isOverdue = lagDays > slaDays;

      // Find external party
      const party = parties.find(p => 
        p.party_type === 'GC' || p.party_type === 'EOR' || p.party_type === 'Architect'
      );

      // Calculate float consumption
      let floatConsumed = 0;
      if (isOverdue) {
        floatConsumed = lagDays - slaDays;
      }

      // Calculate cost exposure
      let costExposure = 0;
      if (floatConsumed > 0) {
        const baseCost = floatConsumed * model.cost_per_float_day;
        
        // Check if RFI is blocker
        const isBlocker = rfi.blocker_info?.is_blocker || rfi.fabrication_hold;
        if (isBlocker) {
          costExposure = baseCost * model.critical_path_multiplier;
        } else {
          costExposure = baseCost;
        }
      }

      newLags.push({
        project_id,
        entity_type: 'RFI',
        entity_id: rfi.id,
        external_party_id: party?.id,
        responsible_party: rfi.ball_in_court || 'external',
        requested_at: requestedAt,
        responded_at: respondedAt,
        sla_days: slaDays,
        lag_days: lagDays,
        business_days: businessDays,
        calendar_days: calendarDays,
        is_overdue: isOverdue,
        float_consumed_days: floatConsumed,
        cost_exposure: Math.round(costExposure),
        status: respondedAt ? 'responded' : isOverdue ? 'overdue' : 'pending'
      });
    }

    // Bulk create new lag events
    if (newLags.length > 0) {
      await base44.asServiceRole.entities.ResponseLagEvent.bulkCreate(newLags);
    }

    // Calculate summary metrics
    const allLags = [...existingLags, ...newLags];
    const totalCostExposure = allLags.reduce((sum, l) => sum + (l.cost_exposure || 0), 0);
    const totalFloatConsumed = allLags.reduce((sum, l) => sum + (l.float_consumed_days || 0), 0);
    const overdueCount = allLags.filter(l => l.is_overdue && l.status !== 'responded').length;

    // Group by party
    const partyStats = {};
    for (const lag of allLags) {
      const party = lag.responsible_party || 'unknown';
      if (!partyStats[party]) {
        partyStats[party] = {
          count: 0,
          avg_lag: 0,
          total_lag: 0,
          cost_exposure: 0,
          overdue_count: 0
        };
      }
      partyStats[party].count++;
      partyStats[party].total_lag += lag.lag_days || 0;
      partyStats[party].cost_exposure += lag.cost_exposure || 0;
      if (lag.is_overdue && lag.status !== 'responded') {
        partyStats[party].overdue_count++;
      }
    }

    // Calculate averages
    for (const party in partyStats) {
      partyStats[party].avg_lag = partyStats[party].total_lag / partyStats[party].count;
    }

    return Response.json({
      success: true,
      new_lags_tracked: newLags.length,
      summary: {
        total_cost_exposure: totalCostExposure,
        total_float_consumed: totalFloatConsumed,
        overdue_count: overdueCount,
        total_tracked: allLags.length
      },
      by_party: partyStats
    });

  } catch (error) {
    console.error('Response lag computation error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});