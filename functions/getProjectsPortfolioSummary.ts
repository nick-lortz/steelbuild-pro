import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [allProjects, tasks, financials] = await Promise.all([
      base44.entities.Project.list('name'),
      base44.entities.Task.list(),
      base44.entities.Financial.list()
    ]);

    // Filter by user permissions
    const projects = user.role === 'admin' ? allProjects : 
      allProjects.filter(p => 
        p.project_manager === user.email ||
        p.superintendent === user.email ||
        (p.assigned_users && p.assigned_users.includes(user.email))
      );

    const activeProjects = projects.filter(p => 
      p.status && !['closed', 'completed'].includes(p.status)
    ).length;

    const totalContractValue = projects
      .filter(p => p.status && !['closed', 'completed'].includes(p.status))
      .reduce((sum, p) => sum + (Number(p.contract_value) || 0), 0);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const updatedRecently = projects.filter(p => 
      p.updated_date && new Date(p.updated_date) >= sevenDaysAgo
    ).length;

    // Data completeness check
    const requiredFields = ['project_manager', 'target_completion', 'contract_value'];
    const projectsWithMissingData = projects.filter(p => {
      return requiredFields.some(field => !p[field] || p[field] === 0);
    });

    const completenessScore = projects.length > 0 ? 
      ((projects.length - projectsWithMissingData.length) / projects.length * 100) : 100;

    // Segment counts
    const byStatus = {};
    ['bidding', 'awarded', 'in_progress', 'on_hold', 'completed', 'closed'].forEach(s => {
      byStatus[s] = projects.filter(p => p.status === s).length;
    });

    const byPM = {};
    projects.forEach(p => {
      const pm = p.project_manager || 'Unassigned';
      byPM[pm] = (byPM[pm] || 0) + 1;
    });

    const topPMs = Object.entries(byPM)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([pm, count]) => ({ pm, count }));

    // AI anomalies
    const anomalies = [];
    
    if (projectsWithMissingData.length > 0) {
      anomalies.push({
        type: 'missing_setup',
        severity: 'high',
        message: `${projectsWithMissingData.length} projects missing critical setup (PM, target date, or contract value)`,
        affectedProjects: projectsWithMissingData.slice(0, 5).map(p => p.project_number)
      });
    }

    const projectsNoPM = projects.filter(p => !p.project_manager && p.status !== 'closed');
    if (projectsNoPM.length > 0) {
      anomalies.push({
        type: 'no_pm',
        severity: 'critical',
        message: `${projectsNoPM.length} active projects have no PM assigned`,
        affectedProjects: projectsNoPM.map(p => p.project_number)
      });
    }

    const projectsNoTarget = projects.filter(p => !p.target_completion && p.status === 'in_progress');
    if (projectsNoTarget.length > 0) {
      anomalies.push({
        type: 'no_target',
        severity: 'medium',
        message: `${projectsNoTarget.length} in-progress projects missing target completion dates`,
        affectedProjects: projectsNoTarget.map(p => p.project_number)
      });
    }

    return Response.json({
      summary: {
        totalProjects: projects.length,
        activeProjects,
        totalContractValue,
        updatedRecently,
        completenessScore: Math.round(completenessScore),
        projectsWithMissingData: projectsWithMissingData.length
      },
      segments: {
        byStatus,
        topPMs
      },
      anomalies,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('getProjectsPortfolioSummary error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});