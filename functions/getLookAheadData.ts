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

    const project = (await base44.entities.Project.filter({ id: projectId }))[0];
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const now = new Date();
    const windowStartDate = new Date(now);
    windowStartDate.setHours(0, 0, 0, 0);
    const windowEndDate = new Date(windowStartDate.getTime() + windowWeeks * 7 * 24 * 60 * 60 * 1000);

    const [tasks, drawingSets, rfis, workPackages] = await Promise.all([
      base44.entities.Task.filter({ project_id: projectId }),
      base44.entities.DrawingSet.filter({ project_id: projectId }),
      base44.entities.RFI.filter({ project_id: projectId }),
      base44.entities.WorkPackage.filter({ project_id: projectId })
    ]);

    const warnings = [];
    if (tasks.length === 0) warnings.push('No tasks created');

    // Filter tasks in window
    const tasksInWindow = tasks.filter(t => {
      if (!t.start_date) return false;
      const startDate = new Date(t.start_date);
      return startDate >= windowStartDate && startDate < windowEndDate;
    });

    // Assign to week buckets
    const enhancedTasks = tasksInWindow.map(t => {
      const startDate = new Date(t.start_date);
      const weekIndex = Math.floor((startDate - windowStartDate) / (7 * 24 * 60 * 60 * 1000));

      const readinessFlags = [];

      // Missing predecessor check
      if (t.predecessor_ids && t.predecessor_ids.length > 0) {
        const predecessors = tasks.filter(pt => t.predecessor_ids.includes(pt.id));
        const incompletePreds = predecessors.filter(pt => pt.status !== 'completed');
        if (incompletePreds.length > 0) {
          readinessFlags.push({ type: 'predecessor', label: `${incompletePreds.length} predecessor(s) incomplete` });
        }
      }

      // Missing drawings
      if (t.linked_drawing_set_ids && t.linked_drawing_set_ids.length > 0) {
        const linkedDrawings = drawingSets.filter(ds => t.linked_drawing_set_ids.includes(ds.id));
        const notReleasedDrawings = linkedDrawings.filter(ds => ds.status !== 'FFF' && ds.status !== 'As-Built');
        if (notReleasedDrawings.length > 0) {
          readinessFlags.push({ type: 'drawings', label: `${notReleasedDrawings.length} drawing(s) not FFF` });
        }
      } else if (!t.linked_drawing_set_ids || t.linked_drawing_set_ids.length === 0) {
        readinessFlags.push({ type: 'no_drawings', label: 'No drawings linked' });
      }

      // Pending RFIs
      const linkedRFIs = rfis.filter(rfi => 
        (rfi.linked_task_ids || []).includes(t.id) &&
        !['answered', 'closed'].includes(rfi.status)
      );
      if (linkedRFIs.length > 0) {
        readinessFlags.push({ type: 'rfi', label: `${linkedRFIs.length} pending RFI(s)` });
      }

      // No crew assigned
      if (!t.assigned_resources || t.assigned_resources.length === 0) {
        readinessFlags.push({ type: 'no_crew', label: 'No crew assigned' });
      }

      return {
        id: t.id,
        name: t.name,
        planned_start: t.start_date,
        planned_end: t.end_date,
        weekIndex,
        owner: t.assigned_resources?.[0] || 'Unassigned',
        status: t.status || 'not_started',
        phase: t.phase,
        readinessFlags,
        is_ready: readinessFlags.length === 0
      };
    });

    // Snapshot
    const readyTasks = enhancedTasks.filter(t => t.is_ready).length;
    const blockedTasks = enhancedTasks.filter(t => !t.is_ready).length;
    const criticalConstraints = enhancedTasks.reduce((sum, t) => 
      sum + t.readinessFlags.filter(f => f.type === 'predecessor' || f.type === 'rfi').length, 0
    );
    const tasksDueThisWeek = enhancedTasks.filter(t => t.weekIndex === 0).length;

    // Constraints list (derived from readiness flags)
    const constraintsList = [];
    enhancedTasks.forEach(t => {
      t.readinessFlags.forEach(f => {
        constraintsList.push({
          id: `${t.id}_${f.type}`,
          task_id: t.id,
          task_name: t.name,
          type: f.type,
          label: f.label,
          owner: t.owner,
          status: 'open'
        });
      });
    });

    // AI analysis
    const predictions = enhancedTasks
      .filter(t => !t.is_ready && t.weekIndex <= 1)
      .slice(0, 5)
      .map(t => ({
        task_id: t.id,
        task_name: t.name,
        risk: 'Will slip - constraints unresolved',
        blockers: t.readinessFlags.map(f => f.label).join(', ')
      }));

    const recommendations = [
      blockedTasks > 0 && {
        action: `Clear ${criticalConstraints} critical constraints blocking ${blockedTasks} tasks`,
        priority: 'critical',
        impact: 'Enable on-time execution'
      },
      enhancedTasks.filter(t => t.readinessFlags.some(f => f.type === 'no_drawings')).length > 0 && {
        action: 'Link drawings to tasks with missing references',
        priority: 'high',
        impact: 'Prevent fabrication delays'
      },
      enhancedTasks.filter(t => t.readinessFlags.some(f => f.type === 'no_crew')).length > 0 && {
        action: 'Assign crews to unassigned tasks',
        priority: 'medium',
        impact: 'Ensure resource availability'
      }
    ].filter(Boolean);

    const missingDataReasons = [];
    if (tasksInWindow.length === 0) missingDataReasons.push('No tasks in look-ahead window');
    if (tasksInWindow.filter(t => !t.assigned_resources || t.assigned_resources.length === 0).length > 0) {
      missingDataReasons.push('Some tasks missing crew assignments');
    }

    return Response.json({
      project: {
        id: project.id,
        name: project.name,
        project_number: project.project_number
      },
      window: {
        weeks: windowWeeks,
        start: windowStartDate.toISOString().split('T')[0],
        end: windowEndDate.toISOString().split('T')[0]
      },
      snapshot: {
        readyTasks,
        blockedTasks,
        criticalConstraints,
        tasksDueThisWeek
      },
      tasks: enhancedTasks,
      constraints: constraintsList,
      ai: {
        summary: blockedTasks > 0 ? `${blockedTasks} tasks blocked - clear constraints immediately` :
                 readyTasks === enhancedTasks.length ? 'All tasks ready for execution' :
                 'Look-ahead window partially ready',
        predictions,
        recommendations,
        confidence: tasksInWindow.length > 10 ? 'high' : 'medium',
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