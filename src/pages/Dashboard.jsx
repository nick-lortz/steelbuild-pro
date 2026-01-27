import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import PortfolioKPIs from '@/components/dashboard/PortfolioKPIs';
import ProjectHealthTable from '@/components/dashboard/ProjectHealthTable';
import ProjectFiltersBar from '@/components/dashboard/ProjectFiltersBar';
import { differenceInDays, addDays } from 'date-fns';

export default function Dashboard() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('risk');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const { data: allProjects = [], isLoading: projectsLoading, refetch: refetchProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 2 * 60 * 1000
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

  const { data: allTasks = [] } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => base44.entities.Task.list('-updated_date'),
    staleTime: 2 * 60 * 1000
  });

  const { data: allFinancials = [] } = useQuery({
    queryKey: ['all-financials'],
    queryFn: () => base44.entities.Financial.list(),
    staleTime: 2 * 60 * 1000
  });

  const { data: allChangeOrders = [] } = useQuery({
    queryKey: ['all-change-orders'],
    queryFn: () => base44.entities.ChangeOrder.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: allRFIs = [] } = useQuery({
    queryKey: ['all-rfis'],
    queryFn: () => base44.entities.RFI.list(),
    staleTime: 5 * 60 * 1000
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
      const costHealth = budget > 0 ? ((actual - budget) / budget * 100) : 0;

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
      p.costHealth > 5 || p.daysSlip > 3 || p.overdueTasks > 0
    ).length;

    return {
      ...portfolioMetrics,
      atRiskProjects: atRiskCount
    };
  }, [portfolioMetrics, projectsWithHealth]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
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
      filtered = filtered.filter(p => p.costHealth > 5 || p.daysSlip > 3 || p.overdueTasks > 0);
    } else if (riskFilter === 'healthy') {
      filtered = filtered.filter(p => p.costHealth <= 5 && p.daysSlip <= 3 && p.overdueTasks === 0);
    }

    // Sort
    if (sortBy === 'risk') {
      filtered.sort((a, b) => {
        const aRisk = (a.costHealth > 5 || a.daysSlip > 3 || a.overdueTasks > 0) ? 1 : 0;
        const bRisk = (b.costHealth > 5 || b.daysSlip > 3 || b.overdueTasks > 0) ? 1 : 0;
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

    return filtered;
  }, [projectsWithHealth, searchTerm, statusFilter, riskFilter, sortBy]);

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
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground uppercase tracking-wide">Portfolio Dashboard</h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            {currentUser.role === 'admin' ? 'ALL PROJECTS' : 'YOUR PROJECTS'}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => refetchProjects()}
          className="gap-2"
        >
          <RefreshCw size={14} />
          Refresh
        </Button>
      </div>

      {/* Portfolio KPIs */}
      <PortfolioKPIs metrics={enhancedMetrics} />

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
        projects={filteredProjects}
        onProjectClick={(projectId) => setActiveProjectId(projectId)}
      />

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">No projects match your filters</p>
        </div>
      )}
    </div>
  );
}