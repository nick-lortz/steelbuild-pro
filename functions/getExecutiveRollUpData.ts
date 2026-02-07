import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { timeWindow = '30d' } = await req.json();

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    if (timeWindow === '7d') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeWindow === 'lastWeek') {
      startDate.setDate(now.getDate() - 14);
    } else if (timeWindow === '30d') {
      startDate.setDate(now.getDate() - 30);
    } else if (timeWindow === 'quarter') {
      startDate.setMonth(now.getMonth() - 3);
    }

    // Fetch data
    const projects = await base44.asServiceRole.entities.Project.filter({
      status: ['awarded', 'in_progress', 'on_hold']
    });

    const tasks = await base44.asServiceRole.entities.Task.list();
    const rfis = await base44.asServiceRole.entities.RFI.list();
    const changeOrders = await base44.asServiceRole.entities.ChangeOrder.list();
    const financials = await base44.asServiceRole.entities.Financial.list();
    const expenses = await base44.asServiceRole.entities.Expense.list();

    // Calculate rollup scorecards
    const scheduleExposure = projects.reduce((sum, p) => {
      const slipDays = Number(p.scheduleSlipDays) || 0;
      return sum + (slipDays > 0 ? slipDays : 0);
    }, 0);

    const costExposure = projects.reduce((sum, p) => {
      const variance = Number(p.budgetVariance) || 0;
      return sum + (variance < 0 ? Math.abs(variance) : 0);
    }, 0);

    const openCOs = changeOrders.filter(co => ['draft', 'submitted', 'under_review'].includes(co.status));
    const approvedCOs = changeOrders.filter(co => co.status === 'approved');
    const changePipeline = {
      pending: openCOs.length,
      pendingValue: openCOs.reduce((sum, co) => sum + (Number(co.cost_impact) || 0), 0),
      approved: approvedCOs.length,
      approvedValue: approvedCOs.reduce((sum, co) => sum + (Number(co.cost_impact) || 0), 0)
    };

    const overdueRFIs = rfis.filter(r => {
      if (!r.due_date || r.status === 'closed') return false;
      return new Date(r.due_date) < now;
    });

    const avgRFIAge = rfis.length > 0 
      ? rfis.reduce((sum, r) => {
          if (!r.submitted_date || r.status === 'closed') return sum;
          const age = Math.floor((now - new Date(r.submitted_date)) / (1000 * 60 * 60 * 24));
          return sum + age;
        }, 0) / rfis.filter(r => r.submitted_date && r.status !== 'closed').length
      : 0;

    const completedTasksInWindow = tasks.filter(t => 
      t.status === 'completed' && 
      t.updated_date && 
      new Date(t.updated_date) >= startDate
    ).length;

    const forecastConfidence = {
      low: projects.filter(p => (p.forecastConfidence || 'medium') === 'low').length,
      medium: projects.filter(p => (p.forecastConfidence || 'medium') === 'medium').length,
      high: projects.filter(p => (p.forecastConfidence || 'medium') === 'high').length
    };

    // Calculate portfolio drivers
    const drivers = [];

    // Overdue RFIs driver
    if (overdueRFIs.length > 0) {
      drivers.push({
        driver: 'Overdue RFIs',
        projectsImpacted: [...new Set(overdueRFIs.map(r => r.project_id))].length,
        impactType: 'Schedule + Cost',
        severity: overdueRFIs.length > 10 ? 'critical' : overdueRFIs.length > 5 ? 'high' : 'medium',
        trend: 'stable',
        count: overdueRFIs.length
      });
    }

    // Pending approvals
    const pendingApprovals = openCOs.length;
    if (pendingApprovals > 0) {
      drivers.push({
        driver: 'Pending Approvals',
        projectsImpacted: [...new Set(openCOs.map(co => co.project_id))].length,
        impactType: 'Schedule',
        severity: pendingApprovals > 5 ? 'high' : 'medium',
        trend: 'stable',
        count: pendingApprovals
      });
    }

    // Budget variances
    const projectsOverBudget = projects.filter(p => (Number(p.budgetVariancePct) || 0) < -10);
    if (projectsOverBudget.length > 0) {
      drivers.push({
        driver: 'Budget Variance',
        projectsImpacted: projectsOverBudget.length,
        impactType: 'Cost',
        severity: projectsOverBudget.length > 3 ? 'critical' : 'high',
        trend: 'worsening',
        count: projectsOverBudget.length
      });
    }

    // Schedule variance
    const projectsDelayed = projects.filter(p => (Number(p.scheduleSlipDays) || 0) > 5);
    if (projectsDelayed.length > 0) {
      drivers.push({
        driver: 'Schedule Slippage',
        projectsImpacted: projectsDelayed.length,
        impactType: 'Schedule',
        severity: projectsDelayed.length > 3 ? 'critical' : 'high',
        trend: 'worsening',
        count: projectsDelayed.length
      });
    }

    // No activity
    const projectsInactive = projects.filter(p => (Number(p.daysSinceLastActivity) || 0) > 14);
    if (projectsInactive.length > 0) {
      drivers.push({
        driver: 'No Recent Activity',
        projectsImpacted: projectsInactive.length,
        impactType: 'Execution',
        severity: 'medium',
        trend: 'stable',
        count: projectsInactive.length
      });
    }

    // Sort drivers by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    drivers.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Calculate exceptions (outliers)
    const scheduleOutliers = projects
      .map(p => ({ ...p, scheduleSlip: Number(p.scheduleSlipDays) || 0 }))
      .filter(p => p.scheduleSlip > 0)
      .sort((a, b) => b.scheduleSlip - a.scheduleSlip)
      .slice(0, 5);

    const costOutliers = projects
      .map(p => ({ ...p, variance: Number(p.budgetVariance) || 0 }))
      .filter(p => p.variance < 0)
      .sort((a, b) => a.variance - b.variance)
      .slice(0, 5);

    const approvalOutliers = projects
      .map(p => {
        const projectRFIs = rfis.filter(r => r.project_id === p.id && ['submitted', 'under_review'].includes(r.status));
        const projectCOs = openCOs.filter(co => co.project_id === p.id);
        return { ...p, pendingCount: projectRFIs.length + projectCOs.length };
      })
      .filter(p => p.pendingCount > 0)
      .sort((a, b) => b.pendingCount - a.pendingCount)
      .slice(0, 5);

    // Generate AI executive summary
    const portfolioDirection = costExposure < 50000 && scheduleExposure < 20 ? 'improving' : 
                               costExposure > 200000 || scheduleExposure > 50 ? 'declining' : 'stable';
    
    const topDrivers = drivers.slice(0, 3).map(d => d.driver);
    
    const biggestRisk = drivers.length > 0 ? drivers[0].driver : 'None identified';
    
    const aiSummary = {
      direction: portfolioDirection,
      topDrivers,
      biggestRisk,
      opportunity: completedTasksInWindow > 50 ? 'Strong execution momentum' : 
                   overdueRFIs.length < 5 ? 'Clean communication pipeline' : 'Opportunity to close pending items',
      decisions: [
        overdueRFIs.length > 10 ? 'Expedite RFI closures - assign dedicated resources' : null,
        pendingApprovals > 5 ? 'Fast-track pending change order approvals' : null,
        projectsOverBudget.length > 2 ? 'Review cost control measures on at-risk projects' : null
      ].filter(Boolean)
    };

    // AI risk clusters
    const clusters = [
      {
        name: 'RFI Gridlock',
        projects: overdueRFIs.length > 0 ? [...new Set(overdueRFIs.map(r => r.project_id))].slice(0, 5) : [],
        severity: overdueRFIs.length > 10 ? 'critical' : 'medium',
        recommendation: 'Assign dedicated PM hours to RFI follow-up'
      },
      {
        name: 'Budget Pressure',
        projects: projectsOverBudget.map(p => p.id).slice(0, 5),
        severity: projectsOverBudget.length > 3 ? 'critical' : 'medium',
        recommendation: 'Weekly cost review meetings for red projects'
      },
      {
        name: 'Execution Stalls',
        projects: projectsInactive.map(p => p.id).slice(0, 5),
        severity: 'medium',
        recommendation: 'Verify resource availability and schedule constraints'
      }
    ].filter(c => c.projects.length > 0);

    // AI recommended decisions
    const recommendations = [
      {
        decision: 'Accelerate RFI resolution process',
        owner: 'Project Management Team',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        impact: 'Reduce schedule risk by 20-30%',
        priority: overdueRFIs.length > 10 ? 'critical' : 'high'
      },
      {
        decision: 'Implement weekly cost variance reviews',
        owner: 'Finance + Operations',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        impact: 'Early detection of overruns',
        priority: projectsOverBudget.length > 2 ? 'high' : 'medium'
      },
      {
        decision: 'Resource reallocation for stalled projects',
        owner: 'Operations Manager',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        impact: 'Restart momentum on inactive work',
        priority: projectsInactive.length > 2 ? 'high' : 'medium'
      }
    ].filter((r, i) => i < 5);

    // Data completeness check
    const missingData = [];
    if (!projects || projects.length === 0) missingData.push('projects');
    if (!tasks || tasks.length === 0) missingData.push('tasks');
    if (!rfis || rfis.length === 0) missingData.push('rfis');

    return Response.json({
      summary: {
        portfolioDirection,
        topDrivers,
        biggestRisk,
        opportunity: aiSummary.opportunity,
        decisions: aiSummary.decisions
      },
      scorecards: {
        scheduleExposure,
        costExposure,
        changePipeline,
        rfiAging: { avg: Math.round(avgRFIAge), overdue: overdueRFIs.length },
        executionThroughput: completedTasksInWindow,
        forecastConfidence
      },
      drivers,
      exceptions: {
        scheduleOutliers,
        costOutliers,
        approvalOutliers
      },
      ai: {
        summary: aiSummary,
        clusters,
        recommendations,
        confidence: 'medium',
        assumptions: [
          'Schedule slip calculated from baseline dates',
          'Cost exposure based on current financials',
          missingData.length > 0 ? `Missing data: ${missingData.join(', ')}` : null
        ].filter(Boolean)
      },
      metadata: {
        timeWindow,
        generatedAt: new Date().toISOString(),
        missingData,
        dataComplete: missingData.length === 0
      }
    });

  } catch (error) {
    console.error('getExecutiveRollUpData error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});