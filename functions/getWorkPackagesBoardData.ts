import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await req.json();

    if (!projectId) {
      return Response.json({ 
        error: 'Project ID required',
        snapshot: {},
        packages: [],
        tasksByPackage: {},
        ai: { summary: 'No project selected', packageRisks: [], recommendations: [], confidence: 'low', missingDataReasons: ['No project'] },
        warnings: ['No project selected'],
        lastUpdated: new Date().toISOString()
      }, { status: 400 });
    }

    const project = (await base44.entities.Project.filter({ id: projectId }))[0];
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const [workPackages, tasks, laborHours, expenses] = await Promise.all([
      base44.entities.WorkPackage.filter({ project_id: projectId }),
      base44.entities.Task.filter({ project_id: projectId }),
      base44.entities.LaborHours.filter({ project_id: projectId }),
      base44.entities.Expense.filter({ project_id: projectId })
    ]);

    const warnings = [];
    if (workPackages.length === 0) warnings.push('No work packages created');

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Snapshot metrics
    const inProgress = workPackages.filter(wp => wp.status === 'in_progress').length;
    const completed = workPackages.filter(wp => wp.status === 'completed').length;
    const blocked = workPackages.filter(wp => wp.status === 'blocked').length;
    const atRisk = workPackages.filter(wp => {
      const progress = Number(wp.progress_percent) || 0;
      const targetDate = wp.target_date ? new Date(wp.target_date) : null;
      return progress < 50 && targetDate && targetDate < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }).length;

    const completed7d = workPackages.filter(wp => 
      wp.status === 'completed' && 
      wp.updated_date && 
      new Date(wp.updated_date) >= sevenDaysAgo
    ).length;

    const completed30d = workPackages.filter(wp => 
      wp.status === 'completed' && 
      wp.updated_date && 
      new Date(wp.updated_date) >= thirtyDaysAgo
    ).length;

    const laborHours7d = laborHours
      .filter(lh => new Date(lh.work_date) >= sevenDaysAgo)
      .reduce((sum, lh) => sum + (Number(lh.hours) || 0) + (Number(lh.overtime_hours) || 0), 0);

    const laborHours30d = laborHours
      .filter(lh => new Date(lh.work_date) >= thirtyDaysAgo)
      .reduce((sum, lh) => sum + (Number(lh.hours) || 0) + (Number(lh.overtime_hours) || 0), 0);

    // Build packages with blocker analysis
    const tasksByPackage = {};
    tasks.forEach(t => {
      const wpId = t.work_package_id;
      if (!wpId) return;
      if (!tasksByPackage[wpId]) tasksByPackage[wpId] = [];
      tasksByPackage[wpId].push(t);
    });

    const packages = workPackages.map(wp => {
      const wpTasks = tasksByPackage[wp.id] || [];
      const blockers = [];

      // Overdue tasks
      const overdueTasks = wpTasks.filter(t => 
        t.status !== 'completed' && t.end_date && t.end_date < now.toISOString().split('T')[0]
      ).length;
      if (overdueTasks > 0) blockers.push({ type: 'overdue_tasks', count: overdueTasks, label: `${overdueTasks} overdue tasks` });

      // Missing drawings (linked drawing sets not FFF)
      if (!wp.linked_drawing_set_ids || wp.linked_drawing_set_ids.length === 0) {
        blockers.push({ type: 'missing_drawings', label: 'No drawings linked' });
      }

      // Labor not started (no labor hours logged yet)
      const wpLabor = laborHours.filter(lh => lh.work_package_id === wp.id);
      if (wp.status === 'in_progress' && wpLabor.length === 0) {
        blockers.push({ type: 'labor_not_started', label: 'Labor not started' });
      }

      // Pending approvals (would need RFI/CO linkage)
      // Placeholder for now
      
      const wpExpenses = expenses.filter(e => e.project_id === projectId); // Would filter by cost_code if mapped
      const actual = wpExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const committed = 0; // Would need PO/commitments data
      const budget = Number(wp.budget_amount) || 0;

      return {
        id: wp.id,
        name: wp.name,
        status: wp.status || 'planned',
        progress_pct: Number(wp.progress_percent) || 0,
        target_date: wp.target_date,
        lead: wp.assigned_lead || 'Unassigned',
        budget,
        actual,
        committed,
        blockers,
        updated_date: wp.updated_date,
        description: wp.description,
        phase: wp.phase
      };
    });

    // Needs attention (packages with blockers or at risk)
    const needsAttention = packages
      .filter(p => p.blockers.length > 0 || (p.status === 'in_progress' && p.progress_pct < 50))
      .sort((a, b) => b.blockers.length - a.blockers.length)
      .slice(0, 10);

    // AI analysis
    const packageRisks = needsAttention.slice(0, 5).map(p => ({
      package_id: p.id,
      package_name: p.name,
      risk_level: p.blockers.length > 2 ? 'critical' : p.blockers.length > 0 ? 'high' : 'medium',
      reason: p.blockers.map(b => b.label).join(', ') || 'Progress below target',
      impact: 'Schedule delay risk'
    }));

    const recommendations = [
      blocked > 0 && {
        action: `Unblock ${blocked} packages immediately`,
        priority: 'critical',
        impact: 'Restore production flow',
        affectedPackages: packages.filter(p => p.status === 'blocked').map(p => p.name)
      },
      packages.filter(p => p.blockers.some(b => b.type === 'missing_drawings')).length > 0 && {
        action: 'Link drawings to packages with no references',
        priority: 'high',
        impact: 'Enable fabrication readiness',
        affectedPackages: packages.filter(p => p.blockers.some(b => b.type === 'missing_drawings')).map(p => p.name).slice(0, 5)
      },
      packages.filter(p => p.blockers.some(b => b.type === 'labor_not_started')).length > 0 && {
        action: 'Start labor logging for in-progress packages',
        priority: 'high',
        impact: 'Track actual hours and progress',
        affectedPackages: packages.filter(p => p.blockers.some(b => b.type === 'labor_not_started')).map(p => p.name).slice(0, 5)
      }
    ].filter(Boolean);

    const missingDataReasons = [];
    if (workPackages.length === 0) missingDataReasons.push('No work packages');
    if (tasks.length === 0) missingDataReasons.push('No tasks linked to packages');
    if (laborHours.length === 0) missingDataReasons.push('No labor hours logged');

    return Response.json({
      project: {
        id: project.id,
        name: project.name,
        project_number: project.project_number
      },
      snapshot: {
        inProgress,
        completed,
        blocked,
        atRisk,
        completed7d,
        completed30d,
        laborHours7d,
        laborHours30d
      },
      packages,
      needsAttention,
      tasksByPackage,
      ai: {
        summary: blocked > 0 ? `${blocked} packages blocked - immediate action required` : 
                 atRisk > 0 ? `${atRisk} packages at risk - review schedule` : 
                 'Production pipeline healthy',
        packageRisks,
        recommendations,
        confidence: workPackages.length > 5 && tasks.length > 0 ? 'high' : 'medium',
        missingDataReasons
      },
      warnings,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('getWorkPackagesBoardData error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});