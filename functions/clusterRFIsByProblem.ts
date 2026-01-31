import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Cluster RFIs to identify design problem areas
 * Groups by location, detail type, or recurring themes
 * Surfaces systemic issues vs one-offs
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { project_id } = await req.json();

    const rfis = await base44.entities.RFI.filter({
      project_id,
      status: { $ne: 'closed' }
    });

    // Cluster by location
    const byLocation = {};
    rfis.forEach(r => {
      const loc = r.location_area || 'Unknown';
      if (!byLocation[loc]) byLocation[loc] = [];
      byLocation[loc].push(r);
    });

    // Cluster by detail type
    const byType = {};
    rfis.forEach(r => {
      const type = r.rfi_type || 'other';
      if (!byType[type]) byType[type] = [];
      byType[type].push(r);
    });

    // Identify patterns
    const patterns = [];
    
    // Location with high RFI volume = coordination problem
    Object.entries(byLocation).forEach(([loc, items]) => {
      if (items.length >= 3) {
        patterns.push({
          pattern_type: 'location_concentration',
          location: loc,
          count: items.length,
          severity: items.length >= 5 ? 'high' : 'medium',
          rfi_numbers: items.map(r => r.rfi_number)
        });
      }
    });

    // Type with high impact = design weakness
    Object.entries(byType).forEach(([type, items]) => {
      const costImpact = items.filter(r => r.cost_impact === 'yes').length;
      const scheduleImpact = items.filter(r => r.schedule_impact === 'yes').length;
      
      if (costImpact >= 2 || scheduleImpact >= 2) {
        patterns.push({
          pattern_type: 'high_impact_type',
          rfi_type: type,
          count: items.length,
          cost_impact_count: costImpact,
          schedule_impact_count: scheduleImpact,
          rfi_numbers: items.map(r => r.rfi_number)
        });
      }
    });

    // Use AI to summarize findings
    const findingsSummary = patterns.length > 0 
      ? patterns.map(p => {
          if (p.pattern_type === 'location_concentration') {
            return `${p.location}: ${p.count} RFIs (${p.severity}) - coordination or design issue`;
          } else {
            return `${p.rfi_type}: ${p.count} RFIs with ${p.cost_impact_count} cost + ${p.schedule_impact_count} schedule impacts`;
          }
        }).join('\n')
      : 'No clear patterns detected';

    return Response.json({
      total_rfis: rfis.length,
      patterns: patterns,
      by_location: Object.entries(byLocation).map(([loc, items]) => ({
        location: loc,
        count: items.count,
        open: items.filter(r => r.status !== 'closed').length
      })),
      by_type: Object.entries(byType).map(([type, items]) => ({
        type,
        count: items.length,
        open: items.filter(r => r.status !== 'closed').length
      })),
      summary: findingsSummary
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});