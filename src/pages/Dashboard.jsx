import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  RefreshCw, TrendingUp, TrendingDown, DollarSign, Users, 
  Building, AlertTriangle, Clock, Flag, Activity
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import ProjectHealthTable from '@/components/dashboard/ProjectHealthTable';
import ProjectFiltersBar from '@/components/dashboard/ProjectFiltersBar';
import { differenceInDays, addDays } from 'date-fns';
import { Card } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { usePagination } from '@/components/shared/hooks/usePagination';
import Pagination from '@/components/ui/Pagination';

export default function Dashboard() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('risk');
  const { page, pageSize, skip, limit, goToPage, changePageSize } = usePagination(1, 25);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const { data: allProjects = [], isLoading: projectsLoading, refetch: refetchProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name')
  });

  const userProjects = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return allProjects;
    return allProjects.filter(p => 
      p.project_manager === currentUser.email || 
      p.superintendent === currentUser.email ||
      (p.assigned_users && p.assigned_users.includes(currentUser.email))
    );
  }, [currentUser, allProjects]);

  const { data: allTasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => base44.entities.Task.list('-updated_date')
  });

  const { data: allFinancials = [], refetch: refetchFinancials } = useQuery({
    queryKey: ['all-financials'],
    queryFn: () => base44.entities.Financial.list()
  });

  const { data: allChangeOrders = [], refetch: refetchCOs } = useQuery({
    queryKey: ['all-change-orders'],
    queryFn: () => base44.entities.ChangeOrder.list()
  });

  const { data: allRFIs = [], refetch: refetchRFIs } = useQuery({
    queryKey: ['all-rfis'],
    queryFn: () => base44.entities.RFI.list()
  });

  // Portfolio metrics calculation
  const portfolioMetrics = useMemo(() => {
    const totalProjects = userProjects.length;
    const activeProjects = userProjects.filter(p => p.status === 'in_progress' || p.status === 'awarded').length;

    const projectTasks = allTasks.filter(t => userProjects.some(p => p.id === t.project_id));
    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = projectTasks.filter(t => 
      t.status !== 'completed' && t.end_date && t.end_date < today
    ).length;

    const upcomingMilestones = projectTasks.filter(t => 
      t.is_milestone && 
      t.end_date && 
      t.end_date >= today &&
      t.end_date <= addDays(new Date(), 30).toISOString().split('T')[0]
    ).length;

    return {
      totalProjects,
      activeProjects,
      atRiskProjects: 0, // Calculated below
      overdueTasks,
      upcomingMilestones,
      totalTasks: projectTasks.length,
      riskTrend: 0
    };
  }, [userProjects, allTasks]);

  // Enhanced project data with health metrics
  const projectsWithHealth = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    return userProjects.map(project => {
      const projectTasks = allTasks.filter(t => t.project_id === project.id);
      const projectFinancials = allFinancials.filter(f => f.project_id === project.id);
      const projectRFIs = allRFIs.filter(r => r.project_id === project.id);
      const projectCOs = allChangeOrders.filter(c => c.project_id === project.id);

      // Tasks
      const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
      const overdueTasks = projectTasks.filter(t => 
        t.status !== 'completed' && t.end_date && t.end_date < today
      ).length;

      // Cost Health: % over/under budget
      const budget = projectFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
      const actual = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      const budgetVsActual = budget > 0 ? ((actual / budget) * 100) : 0;
      const costHealth = budget > 0 ? ((budget - actual) / budget * 100) : 0;

      // Schedule health: days slip
      let daysSlip = 0;
      if (project.target_completion) {
        try {
          const targetDate = new Date(project.target_completion + 'T00:00:00');
          const latestTaskEnd = projectTasks
            .filter(t => t.end_date)
            .map(t => new Date(t.end_date + 'T00:00:00'))
            .sort((a, b) => b - a)[0];

          if (latestTaskEnd && latestTaskEnd > targetDate) {
            daysSlip = differenceInDays(latestTaskEnd, targetDate);
          }
        } catch (error) {
          // Skip
        }
      }

      const openRFIs = projectRFIs.filter(r => r.status !== 'answered' && r.status !== 'closed').length;
      const pendingCOs = projectCOs.filter(c => c.status === 'pending' || c.status === 'submitted').length;

      // Progress: % of tasks complete
      const progress = projectTasks.length > 0 ? (completedTasks / projectTasks.length * 100) : 0;

      return {
        id: project.id,
        name: project.name,
        project_number: project.project_number,
        status: project.status,
        progress: Math.round(progress),
        costHealth,
        daysSlip,
        totalTasks: projectTasks.length,
        completedTasks,
        overdueTasks,
        budgetVsActual: Math.round(budgetVsActual),
        openRFIs,
        pendingCOs
      };
    });
  }, [userProjects, allTasks, allFinancials, allRFIs, allChangeOrders]);

  // Update portfolio metrics with actual at-risk count
  const enhancedMetrics = useMemo(() => {
    const atRiskCount = projectsWithHealth.filter(p => 
      p.costHealth < -5 || p.daysSlip > 3 || p.overdueTasks > 0
    ).length;

    return {
      ...portfolioMetrics,
      atRiskProjects: atRiskCount
    };
  }, [portfolioMetrics, projectsWithHealth]);

  // Filtered projects with pagination
  const { filteredProjects, paginatedProjects, totalFiltered } = useMemo(() => {
    let filtered = [...projectsWithHealth];

    // Search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(search) || 
        p.project_number?.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Risk filter
    if (riskFilter === 'at_risk') {
      filtered = filtered.filter(p => p.costHealth < -5 || p.daysSlip > 3 || p.overdueTasks > 0);
    } else if (riskFilter === 'healthy') {
      filtered = filtered.filter(p => p.costHealth >= -5 && p.daysSlip <= 3 && p.overdueTasks === 0);
    }

    // Sort
    if (sortBy === 'risk') {
      filtered.sort((a, b) => {
        const aRisk = (a.costHealth < -5 || a.daysSlip > 3 || a.overdueTasks > 0) ? 1 : 0;
        const bRisk = (b.costHealth < -5 || b.daysSlip > 3 || b.overdueTasks > 0) ? 1 : 0;
        if (bRisk !== aRisk) return bRisk - aRisk;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'progress') {
      filtered.sort((a, b) => b.progress - a.progress);
    } else if (sortBy === 'budget') {
      filtered.sort((a, b) => b.budgetVsActual - a.budgetVsActual);
    } else if (sortBy === 'schedule') {
      filtered.sort((a, b) => b.daysSlip - a.daysSlip);
    }

    const totalFiltered = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    return { filteredProjects: filtered, paginatedProjects: paginated, totalFiltered };
  }, [projectsWithHealth, searchTerm, statusFilter, riskFilter, sortBy, skip, limit]);

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || riskFilter !== 'all';

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setRiskFilter('all');
  };

  if (projectsLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Header */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600/10 via-zinc-900/50 to-amber-600/5 border border-amber-500/20 p-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center shadow-2xl shadow-amber-500/30">
              <Building className="w-8 h-8 text-black" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight">Dashboard</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-zinc-400 font-medium">{enhancedMetrics.totalProjects} Projects</p>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              refetchProjects();
              refetchTasks();
              refetchFinancials();
              refetchCOs();
              refetchRFIs();
            }}
            className="gap-2 bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20 hover:text-amber-400"
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card className="border-zinc-800/50 bg-zinc-900/40 backdrop-blur-xl">
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center ring-1 ring-blue-500/30">
                <Building className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white">{enhancedMetrics.totalProjects}</p>
            </div>
            <p className="text-sm text-zinc-400">Total Projects</p>
          </div>
        </Card>

        <Card className="border-zinc-800/50 bg-zinc-900/40 backdrop-blur-xl">
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center ring-1 ring-green-500/30">
                <Activity className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white">{enhancedMetrics.activeProjects}</p>
            </div>
            <p className="text-sm text-zinc-400">Active Projects</p>
          </div>
        </Card>

        <Card className="border-zinc-800/50 bg-zinc-900/40 backdrop-blur-xl">
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center ring-1",
                enhancedMetrics.atRiskProjects > 0 
                  ? "bg-amber-500/20 ring-amber-500/30" 
                  : "bg-green-500/20 ring-green-500/30"
              )}>
                <AlertTriangle className={cn("w-5 h-5", enhancedMetrics.atRiskProjects > 0 ? "text-amber-400" : "text-green-400")} />
              </div>
              <p className="text-3xl font-bold text-white">{enhancedMetrics.atRiskProjects}</p>
            </div>
            <p className="text-sm text-zinc-400">At Risk</p>
          </div>
        </Card>

        <Card className="border-zinc-800/50 bg-zinc-900/40 backdrop-blur-xl">
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center ring-1",
                enhancedMetrics.overdueTasks > 0 
                  ? "bg-red-500/20 ring-red-500/30" 
                  : "bg-zinc-500/20 ring-zinc-500/30"
              )}>
                <Clock className={cn("w-5 h-5", enhancedMetrics.overdueTasks > 0 ? "text-red-400" : "text-zinc-500")} />
              </div>
              <p className="text-3xl font-bold text-white">{enhancedMetrics.overdueTasks}</p>
            </div>
            <p className="text-sm text-zinc-400">Overdue Tasks</p>
          </div>
        </Card>

        <Card className="border-zinc-800/50 bg-zinc-900/40 backdrop-blur-xl">
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center ring-1 ring-purple-500/30">
                <Flag className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white">{enhancedMetrics.upcomingMilestones}</p>
            </div>
            <p className="text-sm text-zinc-400">Upcoming Milestones</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="my-6">
        <ProjectFiltersBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          riskFilter={riskFilter}
          onRiskChange={setRiskFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      {/* Project Health Table */}
      <ProjectHealthTable 
        projects={paginatedProjects}
        onProjectClick={(projectId) => setActiveProjectId(projectId)}
      />

      {totalFiltered === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">No projects match your filters</p>
        </div>
      )}

      {/* Pagination */}
      {totalFiltered > 0 && (
        <div className="mt-6">
          <Pagination
            total={totalFiltered}
            page={page}
            pageSize={pageSize}
            onPageChange={goToPage}
            onPageSizeChange={changePageSize}
          />
        </div>
      )}
    </div>
  );
}