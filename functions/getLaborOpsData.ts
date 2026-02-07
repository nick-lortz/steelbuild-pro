import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, startDate, endDate } = await req.json();

    if (!projectId) {
      return Response.json({ 
        error: 'Project ID required',
        snapshot: {},
        entries: [],
        ai: { summary: 'No project selected', flags: [], recommendations: [], confidence: 'low', missingDataReasons: ['No project'] },
        warnings: ['No project selected'],
        lastUpdated: new Date().toISOString()
      }, { status: 400 });
    }

    const project = (await base44.entities.Project.filter({ id: projectId }))[0];
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const rangeStart = startDate || new Date().toISOString().split('T')[0];
    const rangeEnd = endDate || new Date().toISOString().split('T')[0];

    const [laborHours, workPackages, tasks, costCodes] = await Promise.all([
      base44.entities.LaborHours.filter({ project_id: projectId }),
      base44.entities.WorkPackage.filter({ project_id: projectId }),
      base44.entities.Task.filter({ project_id: projectId }),
      base44.entities.CostCode.list()
    ]);

    // Filter by date range
    const entriesInRange = laborHours.filter(lh => 
      lh.work_date >= rangeStart && lh.work_date <= rangeEnd
    );

    const warnings = [];
    if (entriesInRange.length === 0) warnings.push('No labor entries in selected range');

    // Snapshot
    const totalHours = entriesInRange.reduce((sum, lh) => sum + (Number(lh.hours) || 0), 0);
    const totalOT = entriesInRange.reduce((sum, lh) => sum + (Number(lh.overtime_hours) || 0), 0);
    const entriesCount = entriesInRange.length;

    // Rough cost (if cost codes have rates)
    let totalCost = 0;
    entriesInRange.forEach(lh => {
      const cc = costCodes.find(c => c.id === lh.cost_code_id);
      if (cc?.rate) {
        totalCost += (Number(lh.hours) || 0) * (Number(cc.rate) || 0);
        totalCost += (Number(lh.overtime_hours) || 0) * (Number(cc.rate) || 0) * 1.5;
      }
    });

    // Build entries
    const entries = entriesInRange.map(lh => {
      const wp = workPackages.find(w => w.id === lh.work_package_id);
      const task = tasks.find(t => t.id === lh.task_id);
      const cc = costCodes.find(c => c.id === lh.cost_code_id);

      const cost = cc?.rate ? 
        ((Number(lh.hours) || 0) * (Number(cc.rate) || 0)) + 
        ((Number(lh.overtime_hours) || 0) * (Number(cc.rate) || 0) * 1.5) : 0;

      return {
        id: lh.id,
        date: lh.work_date,
        crew: lh.crew_employee || 'Unknown',
        shift: lh.shift || 'day',
        task_id: lh.task_id,
        task_name: task?.name || null,
        work_package_id: lh.work_package_id,
        work_package_name: wp?.title || null,
        hours: Number(lh.hours) || 0,
        ot_hours: Number(lh.overtime_hours) || 0,
        qty: lh.quantity_installed || null,
        cost,
        cost_code: cc?.code || null,
        notes: lh.description,
        status: lh.status
      };
    });

    // Exceptions
    const missingWP = entries.filter(e => !e.work_package_id).length;
    const missingQty = entries.filter(e => !e.qty).length;
    const extremeOT = entries.filter(e => e.ot_hours > e.hours).length;

    // AI analysis
    const flags = [];
    if (missingWP > 0) flags.push({ type: 'missing_wp', message: `${missingWP} entries not linked to work packages` });
    if (extremeOT > 0) flags.push({ type: 'extreme_ot', message: `${extremeOT} entries with OT > regular hours` });
    if (missingQty > 0) flags.push({ type: 'missing_qty', message: `${missingQty} entries missing quantity (productivity unknown)` });

    const recommendations = [
      missingWP > 0 && {
        action: `Link ${missingWP} labor entries to work packages`,
        priority: 'high',
        impact: 'Enable productivity and cost tracking'
      },
      missingQty > 0 && {
        action: 'Record quantities installed for productivity analysis',
        priority: 'medium',
        impact: 'Track tons/hour or units/hour'
      }
    ].filter(Boolean);

    const missingDataReasons = [];
    if (entriesInRange.length === 0) missingDataReasons.push('No labor entries in date range');

    return Response.json({
      project: {
        id: project.id,
        name: project.name,
        project_number: project.project_number
      },
      range: {
        start: rangeStart,
        end: rangeEnd
      },
      snapshot: {
        totalHours: Math.round(totalHours),
        totalOT: Math.round(totalOT),
        totalCost: Math.round(totalCost),
        entriesCount,
        avgHoursPerEntry: entriesCount > 0 ? Math.round(totalHours / entriesCount * 10) / 10 : 0
      },
      entries,
      ai: {
        summary: extremeOT > 0 ? `${extremeOT} entries with extreme OT - review staffing` :
                 missingWP > 0 ? `${missingWP} entries unlinked - link to WPs for tracking` :
                 'Labor logging on track',
        flags,
        recommendations,
        confidence: entriesInRange.length > 20 ? 'high' : 'medium',
        missingDataReasons
      },
      warnings,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('getLaborOpsData error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});