import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await req.json();

    // Fetch projects first
    const allProjects = await base44.entities.Project.list();
    const projects = user.role === 'admin' ? allProjects : 
      allProjects.filter(p => 
        p.project_manager === user.email || 
        p.superintendent === user.email ||
        (p.assigned_users && p.assigned_users.includes(user.email))
      );

    const projectMap = new Map(projects.map(p => [p.id, p]));
    const projectIds = projects.map(p => p.id);

    if (projectIds.length === 0) {
      return Response.json({
        summary: { openCount: 0, pendingCount: 0, avgAgeDays: 0, pendingValue: 0, approvedValuePeriod: 0, pendingScheduleImpactDays: 0 },
        items: [],
        ai: { pipelineSummary: 'No projects assigned', bottlenecks: [], recommendations: [], confidence: 'low', missingDataReasons: ['No projects'] },
        warnings: ['No projects assigned to user'],
        lastUpdated: new Date().toISOString()
      });
    }

    // Filter by project if provided
    const targetProjectIds = projectId ? [projectId] : projectIds;

    // Fetch all change orders for accessible projects
    const allCOs = await base44.entities.ChangeOrder.list('-submitted_date');
    const changeOrders = allCOs.filter(co => targetProjectIds.includes(co.project_id));

    const warnings = [];
    if (changeOrders.length === 0) warnings.push('No change orders found');

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate summary metrics
    const openCOs = changeOrders.filter(co => 
      co.status !== 'approved' && co.status !== 'rejected' && co.status !== 'void'
    );
    const pendingCOs = changeOrders.filter(co => 
      co.status === 'submitted' || co.status === 'under_review'
    );

    const pendingValue = pendingCOs.reduce((sum, co) => sum + (Number(co.cost_impact) || 0), 0);
    const approvedThisPeriod = changeOrders.filter(co => 
      co.status === 'approved' && 
      co.approved_date && 
      new Date(co.approved_date) >= thirtyDaysAgo
    );
    const approvedValuePeriod = approvedThisPeriod.reduce((sum, co) => sum + (Number(co.cost_impact) || 0), 0);

    const pendingScheduleImpactDays = pendingCOs.reduce((sum, co) => 
      sum + (Number(co.schedule_impact_days) || 0), 0
    );

    // Calculate age for each CO
    const ageDays = openCOs.map(co => {
      const submitDate = co.submitted_date ? new Date(co.submitted_date) : new Date(co.created_date);
      const ageMs = now.getTime() - submitDate.getTime();
      return ageMs / (24 * 60 * 60 * 1000);
    });
    const avgAgeDays = ageDays.length > 0 ? ageDays.reduce((a, b) => a + b, 0) / ageDays.length : 0;

    // Build detailed items
    const items = changeOrders.map(co => {
      const project = projectMap.get(co.project_id);
      const submitDate = co.submitted_date ? new Date(co.submitted_date) : new Date(co.created_date);
      const ageDays = (now.getTime() - submitDate.getTime()) / (24 * 60 * 60 * 1000);
      
      const missingDocs = [];
      if (!co.description || co.description.trim().length < 20) missingDocs.push('scope_narrative');
      if (!co.attachments || co.attachments.length === 0) missingDocs.push('backup_docs');
      if ((co.linked_rfi_ids || []).length === 0 && (co.linked_drawing_set_ids || []).length === 0) {
        missingDocs.push('references');
      }

      let nextStep = 'Review';
      if (co.status === 'draft') nextStep = 'Submit for approval';
      else if (co.status === 'submitted') nextStep = 'Awaiting GC review';
      else if (co.status === 'under_review') nextStep = 'Follow up';
      else if (co.status === 'approved') nextStep = 'Execute';
      else if (co.status === 'rejected') nextStep = 'Revise and resubmit';

      let agingReason = null;
      if (ageDays > 30) agingReason = 'critical_age';
      else if (ageDays > 14) agingReason = 'high_age';
      else if (ageDays > 7) agingReason = 'warning_age';
      
      if (missingDocs.length > 0 && co.status === 'draft') agingReason = 'missing_backup';
      if (co.status === 'submitted' && ageDays > 7) agingReason = 'awaiting_gc';

      return {
        id: co.id,
        co_number: co.co_number,
        project_id: co.project_id,
        project_name: project?.name || 'Unknown',
        project_number: project?.project_number || '?',
        title: co.title,
        description: co.description,
        status: co.status,
        value: Number(co.cost_impact) || 0,
        schedule_impact_days: Number(co.schedule_impact_days) || 0,
        age_days: Math.floor(ageDays),
        owner: co.approved_by || project?.project_manager || 'Unassigned',
        last_activity: co.updated_date || co.created_date,
        next_step: nextStep,
        missing_docs: missingDocs,
        aging_reason: agingReason,
        submitted_date: co.submitted_date,
        approved_date: co.approved_date
      };
    });

    // Identify bottlenecks
    const agingCOs = items
      .filter(co => co.status !== 'approved' && co.status !== 'rejected' && co.status !== 'void')
      .sort((a, b) => b.age_days - a.age_days)
      .slice(0, 10);

    const bottlenecks = agingCOs.map(co => ({
      co_number: co.co_number,
      project_name: co.project_name,
      title: co.title,
      age_days: co.age_days,
      reason: co.aging_reason,
      value: co.value
    }));

    // AI analysis
    const criticalCount = agingCOs.filter(co => co.age_days > 30).length;
    const highCount = agingCOs.filter(co => co.age_days > 14 && co.age_days <= 30).length;

    const pipelineSummary = criticalCount > 0 
      ? `${criticalCount} COs critically aged (>30 days) - immediate action required`
      : highCount > 0
      ? `${highCount} COs aging beyond 14 days - review pipeline`
      : 'CO pipeline healthy';

    const aiBottlenecks = [
      ...agingCOs.slice(0, 3).map(co => ({
        type: 'aging',
        message: `CO-${co.co_number} (${co.project_name}) aged ${co.age_days} days`,
        severity: co.age_days > 30 ? 'critical' : co.age_days > 14 ? 'high' : 'medium',
        action: co.aging_reason === 'awaiting_gc' ? 'Send follow-up reminder to GC' : 
                co.aging_reason === 'missing_backup' ? 'Complete backup documentation' :
                'Escalate to project leadership'
      })),
      pendingValue > 1000000 && {
        type: 'pipeline_value',
        message: `$${(pendingValue / 1000000).toFixed(1)}M pending approval - cashflow impact`,
        severity: 'high',
        action: 'Accelerate approval process'
      }
    ].filter(Boolean);

    const recommendations = [
      criticalCount > 0 && {
        action: `Escalate ${criticalCount} critically aged COs immediately`,
        priority: 'critical',
        impact: 'Prevent further delays and claim risk',
        affectedCOs: agingCOs.filter(co => co.age_days > 30).map(co => co.co_number)
      },
      items.filter(co => co.missing_docs.length > 0).length > 0 && {
        action: `Complete documentation for ${items.filter(co => co.missing_docs.length > 0).length} draft COs`,
        priority: 'high',
        impact: 'Enable submission and approval',
        affectedCOs: items.filter(co => co.missing_docs.length > 0).slice(0, 5).map(co => co.co_number)
      },
      pendingScheduleImpactDays > 30 && {
        action: 'Review schedule risk - pending COs total significant delay',
        priority: 'high',
        impact: `${pendingScheduleImpactDays} days schedule exposure pending approval`
      },
      pendingCOs.length > 10 && {
        action: 'CO pipeline congested - review submission pacing',
        priority: 'medium',
        impact: 'Optimize approval workflow'
      }
    ].filter(Boolean);

    const missingDataReasons = [];
    if (changeOrders.length === 0) missingDataReasons.push('No change orders recorded');
    if (items.filter(co => !co.submitted_date && co.status !== 'draft').length > 0) {
      missingDataReasons.push('Some COs missing submission dates');
    }

    return Response.json({
      summary: {
        openCount: openCOs.length,
        pendingCount: pendingCOs.length,
        avgAgeDays: Math.floor(avgAgeDays),
        pendingValue,
        approvedValuePeriod,
        pendingScheduleImpactDays
      },
      items: items.sort((a, b) => b.age_days - a.age_days),
      bottlenecks,
      ai: {
        pipelineSummary,
        bottlenecks: aiBottlenecks,
        recommendations,
        confidence: changeOrders.length > 5 ? 'high' : changeOrders.length > 0 ? 'medium' : 'low',
        missingDataReasons
      },
      warnings,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('getChangeOrdersRollup error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});