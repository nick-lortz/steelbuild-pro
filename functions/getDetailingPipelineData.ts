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
        items: [],
        ai: { summary: 'No project selected', risks: [], recommendations: [], confidence: 'low', missingDataReasons: ['No project'] },
        warnings: ['No project selected'],
        lastUpdated: new Date().toISOString()
      }, { status: 400 });
    }

    const project = (await base44.entities.Project.filter({ id: projectId }))[0];
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const [drawingSets, rfis] = await Promise.all([
      base44.entities.DrawingSet.filter({ project_id: projectId }),
      base44.entities.RFI.filter({ project_id: projectId })
    ]);

    const warnings = [];
    if (drawingSets.length === 0) warnings.push('No drawing sets created');

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Map drawing sets to detailing items
    // Status: IFA, BFA, BFS, Revise & Resubmit, FFF, As-Built
    const notStarted = drawingSets.filter(ds => !ds.ifa_date).length;
    const inProgress = drawingSets.filter(ds => ds.ifa_date && !ds.bfa_date).length;
    const submitted = drawingSets.filter(ds => ds.ifa_date && ds.status === 'IFA').length;
    const returned = drawingSets.filter(ds => ds.status === 'Revise & Resubmit').length;
    const approved = drawingSets.filter(ds => ds.status === 'BFA' || ds.status === 'BFS').length;
    const releasedForFab = drawingSets.filter(ds => ds.status === 'FFF').length;

    const overdue = drawingSets.filter(ds => 
      ds.due_date && 
      new Date(ds.due_date) < now && 
      ds.status !== 'FFF' && 
      ds.status !== 'As-Built'
    ).length;

    // Revision pressure: items with multiple resubmits
    const highRevisions = drawingSets.filter(ds => {
      // Count revision events by checking status history or multiple dates
      const revisionCount = (ds.revise_resubmit_date ? 1 : 0);
      return revisionCount > 0 || ds.status === 'Revise & Resubmit';
    }).length;

    // Avg cycle time (IFA to FFF)
    const completedSets = drawingSets.filter(ds => ds.ifa_date && ds.released_for_fab_date);
    const avgCycleTime = completedSets.length > 0 ?
      completedSets.reduce((sum, ds) => {
        const ifa = new Date(ds.ifa_date);
        const fff = new Date(ds.released_for_fab_date);
        return sum + ((fff - ifa) / (24 * 60 * 60 * 1000));
      }, 0) / completedSets.length : 0;

    // Build items with blocker analysis
    const items = drawingSets.map(ds => {
      const blockers = [];

      // Missing info (no reviewer assigned)
      if (!ds.reviewer) blockers.push({ type: 'no_reviewer', label: 'No reviewer assigned' });

      // Pending RFI
      const linkedRFIs = rfis.filter(rfi => 
        (rfi.linked_drawing_set_ids || []).includes(ds.id) &&
        rfi.status !== 'answered' && 
        rfi.status !== 'closed'
      );
      if (linkedRFIs.length > 0) blockers.push({ type: 'pending_rfi', count: linkedRFIs.length, label: `${linkedRFIs.length} pending RFIs` });

      // Client review (status submitted but no response)
      if (ds.status === 'IFA' && ds.ifa_date) {
        const daysSinceSubmit = (now - new Date(ds.ifa_date)) / (24 * 60 * 60 * 1000);
        if (daysSinceSubmit > 14) blockers.push({ type: 'client_review', label: `Submitted ${Math.floor(daysSinceSubmit)}d ago` });
      }

      // Overdue
      if (ds.due_date && new Date(ds.due_date) < now && ds.status !== 'FFF') {
        blockers.push({ type: 'overdue', label: 'Overdue' });
      }

      // Count revisions (simplified)
      const revisions = ds.revise_resubmit_date ? 1 : 0;

      return {
        id: ds.id,
        name: ds.set_name,
        set_number: ds.set_number,
        status: ds.status || 'Not Started',
        assignee: ds.reviewer || 'Unassigned',
        target_submit: ds.ifa_date,
        submitted_date: ds.ifa_date,
        approved_date: ds.bfa_date || ds.bfs_date,
        released_date: ds.released_for_fab_date,
        revisions,
        blockers,
        last_activity: ds.updated_date || ds.created_date,
        current_revision: ds.current_revision,
        discipline: ds.discipline
      };
    });

    // Items needing attention
    const needsAttention = items
      .filter(i => i.blockers.length > 0 || i.status === 'Revise & Resubmit' || (i.target_submit && new Date(i.target_submit) < sevenDaysAgo && i.status !== 'FFF'))
      .sort((a, b) => b.blockers.length - a.blockers.length)
      .slice(0, 10);

    // AI analysis
    const risks = needsAttention.slice(0, 5).map(i => ({
      item_id: i.id,
      item_name: i.name,
      risk_level: i.blockers.some(b => b.type === 'overdue') ? 'critical' : i.blockers.length > 1 ? 'high' : 'medium',
      reason: i.blockers.map(b => b.label).join(', ') || 'Needs resubmittal',
      impact: 'Fabrication delay risk'
    }));

    const recommendations = [
      returned > 0 && {
        action: `Address ${returned} returned drawings immediately`,
        priority: 'critical',
        impact: 'Unblock fabrication pipeline',
        affectedItems: items.filter(i => i.status === 'Revise & Resubmit').map(i => i.set_number)
      },
      overdue > 0 && {
        action: `Escalate ${overdue} overdue submittals`,
        priority: 'high',
        impact: 'Prevent schedule impact',
        affectedItems: items.filter(i => i.blockers.some(b => b.type === 'overdue')).map(i => i.set_number).slice(0, 5)
      },
      items.filter(i => !i.assignee || i.assignee === 'Unassigned').length > 0 && {
        action: 'Assign reviewers to unassigned sets',
        priority: 'medium',
        impact: 'Ensure accountability',
        affectedItems: items.filter(i => !i.assignee || i.assignee === 'Unassigned').map(i => i.set_number).slice(0, 5)
      }
    ].filter(Boolean);

    const missingDataReasons = [];
    if (drawingSets.length === 0) missingDataReasons.push('No drawing sets');
    if (drawingSets.filter(ds => !ds.ifa_date).length === drawingSets.length) {
      missingDataReasons.push('No IFA dates recorded');
    }

    return Response.json({
      project: {
        id: project.id,
        name: project.name,
        project_number: project.project_number
      },
      snapshot: {
        notStarted,
        inProgress,
        submitted,
        returned,
        approved,
        releasedForFab,
        avgCycleTime: Math.round(avgCycleTime),
        overdue,
        highRevisions
      },
      items,
      needsAttention,
      ai: {
        summary: returned > 0 ? `${returned} sets returned - immediate rework required` :
                 overdue > 0 ? `${overdue} sets overdue - escalate approvals` :
                 'Detailing pipeline on track',
        risks,
        recommendations,
        confidence: drawingSets.length > 5 ? 'high' : 'medium',
        missingDataReasons
      },
      warnings,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('getDetailingPipelineData error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});