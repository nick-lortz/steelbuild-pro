import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, windowWeeks = 4 } = await req.json();

    if (!projectId) {
      return Response.json({ 
        error: 'Project ID required',
        window: {},
        snapshot: {},
        tasks: [],
        constraints: [],
        ai: { summary: 'No project selected', predictions: [], recommendations: [], confidence: 'low', missingDataReasons: ['No project'] },
        warnings: ['No project selected'],
        lastUpdated: new Date().toISOString()
      }, { status: 400 });
    }

    const isPortfolio = projectId === 'all';

    // Get projects
    const projects = isPortfolio 
      ? await base44.entities.Project.filter({ status: 'in_progress' })
      : [(await base44.entities.Project.filter({ id: projectId }))[0]];

    if (!isPortfolio && !projects[0]) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectIds = projects.map(p => p.id);

    // Define window
    const now = new Date();
    const windowStart = now.toISOString().split('T')[0];
    const windowEnd = new Date(now.getTime() + windowWeeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch tasks in window
    const allTasks = await base44.entities.Task.filter({ 
      project_id: isPortfolio ? { $in: projectIds } : projectId,
      start_date: { $lte: windowEnd },
      end_date: { $gte: windowStart }
    }, 'start_date');

    const rfis = await base44.entities.RFI.filter({ 
      project_id: isPortfolio ? { $in: projectIds } : projectId,
      status: { $in: ['submitted', 'under_review'] }
    });

    const drawingSets = await base44.entities.DrawingSet.filter({ 
      project_id: isPortfolio ? { $in: projectIds } : projectId,
      status: { $nin: ['FFF'] }
    });

    const warnings = [];
    if (allTasks.length === 0) warnings.push('No tasks in window');

    // Compute week buckets
    const weekBuckets = [];
    for (let i = 0; i < windowWeeks; i++) {
      const weekStart = new Date(now.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      weekBuckets.push({ start: weekStart.toISOString().split('T')[0], end: weekEnd.toISOString().split('T')[0] });
    }

    // Map tasks to weeks
    const tasksEnhanced = allTasks.map(t => {
      const project = projects.find(p => p.id === t.project_id);
      const taskStart = new Date(t.start_date);
      
      // Find which week bucket
      let weekIndex = -1;
      for (let i = 0; i < weekBuckets.length; i++) {
        if (taskStart >= new Date(weekBuckets[i].start) && taskStart < new Date(weekBuckets[i].end)) {
          weekIndex = i;
          break;
        }
      }

      // Readiness check
      const readinessFlags = [];
      const linkedRFIs = (t.linked_rfi_ids || []).map(rid => rfis.find(r => r.id === rid)).filter(Boolean);
      const linkedDrawings = (t.linked_drawing_set_ids || []).map(did => drawingSets.find(d => d.id === did)).filter(Boolean);

      if (linkedRFIs.length > 0) readinessFlags.push({ type: 'rfi', label: `${linkedRFIs.length} RFIs open` });
      if (linkedDrawings.length > 0) readinessFlags.push({ type: 'drawings', label: `${linkedDrawings.length} drawings pending` });
      if (!t.assigned_resources || t.assigned_resources.length === 0) readinessFlags.push({ type: 'resource', label: 'No crew assigned' });

      const is_ready = readinessFlags.length === 0;

      return {
        id: t.id,
        name: t.name,
        project_id: t.project_id,
        project_number: project?.project_number,
        project_name: project?.name,
        start: t.start_date,
        end: t.end_date,
        status: t.status,
        phase: t.phase,
        owner: t.assigned_resources?.[0] || 'Unassigned',
        weekIndex,
        is_ready,
        readinessFlags
      };
    }).filter(t => t.weekIndex >= 0);

    // Snapshot
    const readyTasks = tasksEnhanced.filter(t => t.is_ready).length;
    const blockedTasks = tasksEnhanced.filter(t => !t.is_ready).length;
    const criticalConstraints = tasksEnhanced.filter(t => t.readinessFlags.length > 1).length;
    const tasksDueThisWeek = tasksEnhanced.filter(t => t.weekIndex === 0).length;

    // Constraints list
    const constraints = [];
    tasksEnhanced.forEach(t => {
      t.readinessFlags.forEach(flag => {
        constraints.push({
          id: `${t.id}-${flag.type}`,
          task_id: t.id,
          task_name: t.name,
          project_number: t.project_number,
          type: flag.type,
          label: flag.label,
          owner: t.owner,
          status: 'open'
        });
      });
    });

    // AI analysis
    const predictions = tasksEnhanced
      .filter(t => !t.is_ready && t.weekIndex < 2)
      .slice(0, 5)
      .map(t => ({
        task_id: t.id,
        task_name: t.name,
        blockers: t.readinessFlags.map(f => f.label).join(', '),
        risk_level: t.weekIndex === 0 ? 'critical' : 'high'
      }));

    const recommendations = [
      blockedTasks > 0 && {
        action: `Clear ${blockedTasks} blocked tasks - resolve constraints ASAP`,
        priority: 'critical',
        impact: 'Unblock crew commitments'
      },
      constraints.filter(c => c.type === 'rfi').length > 0 && {
        action: `Expedite ${constraints.filter(c => c.type === 'rfi').length} open RFIs blocking work`,
        priority: 'high',
        impact: 'Release tasks to field'
      }
    ].filter(Boolean);

    const missingDataReasons = [];
    if (allTasks.length === 0) missingDataReasons.push('No tasks in window');

    return Response.json({
      project: isPortfolio ? { id: 'all', name: 'All Projects', project_number: 'Portfolio' } : { id: projects[0].id, name: projects[0].name, project_number: projects[0].project_number },
      window: {
        start: windowStart,
        end: windowEnd,
        weeks: windowWeeks
      },
      snapshot: {
        readyTasks,
        blockedTasks,
        criticalConstraints,
        tasksDueThisWeek
      },
      tasks: tasksEnhanced,
      constraints,
      ai: {
        summary: blockedTasks === 0 ? `${readyTasks} tasks ready to commit` :
                 blockedTasks > readyTasks ? `${blockedTasks} tasks blocked - clear constraints` :
                 `${readyTasks} ready, ${blockedTasks} blocked`,
        predictions,
        recommendations,
        confidence: allTasks.length > 10 ? 'high' : 'medium',
        missingDataReasons
      },
      warnings,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('getLookAheadData error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});