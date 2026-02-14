import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { z } from 'npm:zod@3.24.2';
import { validateInput, PaginationSchema } from './utils/validation.js';
import { handleFunctionError } from './utils/errorHandler.js';

const DashboardQuerySchema = PaginationSchema.extend({
  search: z.string().default(''),
  status: z.enum(['all', 'bidding', 'awarded', 'in_progress', 'on_hold', 'completed', 'closed']).default('all'),
  risk: z.enum(['all', 'at_risk', 'healthy']).default('all'),
  sort: z.enum(['risk', 'name', 'progress', 'budget', 'schedule']).default('risk')
});

/**
 * Server-side dashboard aggregation
 * Returns only the projects visible to the user + aggregated metrics
 * Filters & calculations happen here, not in the browser
 */
Deno.serve(async (req) => {
  const startTime = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const validation = validateInput(DashboardQuerySchema, payload);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const { page, pageSize, search, status, risk, sort } = validation.data;
    const skip = (page - 1) * pageSize;

    // === LOAD ONLY USER'S PROJECTS ===
    let projectQuery = {};
    if (user.role !== 'admin') {
      // Filter by user email in project_manager, superintendent, or assigned_users
      projectQuery = {
        $or: [
          { project_manager: user.email },
          { superintendent: user.email },
          { assigned_users: user.email }
        ]
      };
    }

    const allUserProjects = await base44.entities.Project.filter(projectQuery);
    // Sort alphabetically by name
    allUserProjects.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (allUserProjects.length === 0) {
      return Response.json({ 
        projects: [], 
        totalProjects: 0,
        activeProjects: 0,
        atRiskProjects: 0,
        overdueTasks: 0,
        upcomingMilestones: 0,
        totalFiltered: 0
      });
    }

    const projectIds = allUserProjects.map(p => p.id);

    // === LOAD ONLY RELEVANT CHILD ENTITIES ===
    const [tasks, financials, rfis, changeOrders] = await Promise.all([
      base44.entities.Task.filter({ project_id: { $in: projectIds } }),
      base44.entities.Financial.filter({ project_id: { $in: projectIds } }),
      base44.entities.RFI.filter({ project_id: { $in: projectIds } }),
      base44.entities.ChangeOrder.filter({ project_id: { $in: projectIds } })
    ]);

    // === INDEX BY PROJECT ID (O(n) instead of O(n²)) ===
    const indexByProject = (arr, key) => {
      const idx = {};
      arr.forEach(item => {
        const projId = item[key];
        if (!idx[projId]) idx[projId] = [];
        idx[projId].push(item);
      });
      return idx;
    };

    const tasksByProject = indexByProject(tasks, 'project_id');
    const financialsByProject = indexByProject(financials, 'project_id');
    const rfisByProject = indexByProject(rfis, 'project_id');
    const cosByProject = indexByProject(changeOrders, 'project_id');

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // === CALCULATE HEALTH FOR EACH PROJECT ===
    const projectsWithHealth = allUserProjects.map(project => {
      const pTasks = tasksByProject[project.id] || [];
      const pFinancials = financialsByProject[project.id] || [];
      const pRFIs = rfisByProject[project.id] || [];
      const pCOs = cosByProject[project.id] || [];

      const completedTasks = pTasks.filter(t => t.status === 'completed').length;
      const overdueTasks = pTasks.filter(t => t.status !== 'completed' && t.end_date && t.end_date < today).length;

      const budget = pFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
      const actual = pFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      const costHealth = budget > 0 ? Math.round((actual / budget) * 100) : 0;

      // Simple schedule slip (days, not business days for perf)
      let daysSlip = 0;
      if (project.target_completion && pTasks.length > 0) {
        const targetMs = new Date(project.target_completion).getTime();
        const latestEndMs = Math.max(...pTasks.map(t => new Date(t.end_date || project.target_completion).getTime()));
        daysSlip = Math.max(0, Math.ceil((latestEndMs - targetMs) / (1000 * 60 * 60 * 24)));
      }

      const openRFIs = pRFIs.filter(r => r.status !== 'answered' && r.status !== 'closed').length;
      const pendingCOs = pCOs.filter(c => c.status === 'submitted' || c.status === 'under_review').length;
      const progress = pTasks.length > 0 ? Math.round((completedTasks / pTasks.length) * 100) : 0;

      // Risk calculation (simple thresholds)
      const isAtRisk = costHealth > 90 || daysSlip > 5 || overdueTasks > 0;

      return {
        id: project.id,
        name: project.name,
        project_number: project.project_number,
        status: project.status,
        phase: project.phase || 'fabrication',
        progress,
        costHealth: 100 - costHealth, // Invert so lower is worse
        daysSlip,
        completedTasks,
        overdueTasks,
        openRFIs,
        pendingCOs,
        isAtRisk,
        riskScore: (costHealth > 90 ? 3 : 0) + (daysSlip > 5 ? 2 : 0) + (overdueTasks > 0 ? 1 : 0)
      };
    });

    // === APPLY FILTERS ===
    let filtered = [...projectsWithHealth];

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.project_number.toLowerCase().includes(q));
    }

    if (status !== 'all') {
      filtered = filtered.filter(p => p.status === status);
    }

    if (risk === 'at_risk') {
      filtered = filtered.filter(p => p.isAtRisk);
    } else if (risk === 'healthy') {
      filtered = filtered.filter(p => !p.isAtRisk);
    }

    // === SORT ===
    if (sort === 'risk') {
      filtered.sort((a, b) => b.riskScore - a.riskScore || (a.name || '').localeCompare(b.name || ''));
    } else if (sort === 'name') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sort === 'progress') {
      filtered.sort((a, b) => b.progress - a.progress);
    } else if (sort === 'budget') {
      filtered.sort((a, b) => b.costHealth - a.costHealth);
    } else if (sort === 'schedule') {
      filtered.sort((a, b) => b.daysSlip - a.daysSlip);
    }

    const totalFiltered = filtered.length;
    const paginated = filtered.slice(skip, skip + pageSize);

    // === PORTFOLIO METRICS ===
    const activeProjects = projectsWithHealth.filter(p => p.status === 'in_progress' || p.status === 'awarded').length;
    const atRiskProjects = projectsWithHealth.filter(p => p.isAtRisk).length;
    const healthyProjects = projectsWithHealth.filter(p => !p.isAtRisk).length;
    const overdueTasks = projectsWithHealth.reduce((sum, p) => sum + p.overdueTasks, 0);
    const upcomingMilestones = tasks.filter(t => 
      t.is_milestone && t.end_date >= today && t.end_date <= thirtyDaysFromNow
    ).length;

    // Portfolio-level RFI metrics
    const openRFIs = rfis.filter(r => r.status !== 'answered' && r.status !== 'closed').length;
    
    // RFI avg response days (answered RFIs only, submitted_date to response_date)
    const answeredRFIs = rfis.filter(r => r.submitted_date && r.response_date);
    const avgRFIResponseDays = answeredRFIs.length > 0
      ? Math.round(
          answeredRFIs.reduce((sum, r) => {
            const submitted = new Date(r.submitted_date).getTime();
            const responded = new Date(r.response_date).getTime();
            const days = Math.max(0, (responded - submitted) / (1000 * 60 * 60 * 24));
            return sum + days;
          }, 0) / answeredRFIs.length
        )
      : 0;

    // Change Order metrics
    const pendingCOs = changeOrders.filter(c => c.status === 'submitted' || c.status === 'under_review').length;

    // Total contract value across all projects
    const totalContractValue = allUserProjects.reduce((sum, p) => sum + (p.contract_value || 0), 0);

    // Average health score across all projects
    const avgHealth = projectsWithHealth.length > 0
      ? Math.round(projectsWithHealth.reduce((sum, p) => sum + p.costHealth, 0) / projectsWithHealth.length)
      : 0;

    const duration = Date.now() - startTime;
    if (duration > 1000) console.warn(JSON.stringify({ fn: 'getDashboardData', duration_ms: duration }));

    return Response.json({
      projects: paginated,
      pagination: { page, pageSize, totalFiltered, totalProjects: projectsWithHealth.length },
      metrics: {
        totalProjects: projectsWithHealth.length,
        activeProjects,
        healthyProjects,
        riskProjects: atRiskProjects,
        overdueTasks,
        upcomingMilestones,
        openRFIs,
        avgRFIResponseDays,
        avgHealth,
        pendingCOs,
        totalContractValue
      }
    });

  } catch (error) {
    const { status, body } = handleFunctionError(error, 'getDashboardData');
    return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
  }
});