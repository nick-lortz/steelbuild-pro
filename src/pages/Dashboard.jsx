import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import ProjectHealthTable from '@/components/dashboard/ProjectHealthTable';
import ProjectFiltersBar from '@/components/dashboard/ProjectFiltersBar';
import { differenceInDays, addDays } from 'date-fns';
import { Card } from "@/components/ui/card";
import { Building2, AlertTriangle, Clock, Flag, Activity, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
    <div className="min-h-screen pb-8 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Hero Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/10 border border-amber-500/20 p-8"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Sparkles className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Portfolio Command</h1>
                <p className="text-sm text-zinc-400 font-medium">
                  {currentUser.role === 'admin' ? 'All Projects Overview' : 'Your Projects Overview'}
                </p>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetchProjects()}
            className="gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10 backdrop-blur-xl"
          >
            <RefreshCw size={14} />
            Refresh Data
          </Button>
        </div>
      </motion.div>

      {/* Portfolio KPIs - Modern Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="relative overflow-hidden border-zinc-800/50 bg-gradient-to-br from-blue-500/5 to-blue-500/0 backdrop-blur-xl hover:shadow-lg hover:shadow-blue-500/10 transition-all group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center ring-1 ring-blue-500/30">
                  <Building2 className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 font-medium mb-1">TOTAL</p>
                  <p className="text-3xl font-bold text-white">{enhancedMetrics.totalProjects}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                <p className="text-sm text-zinc-400">Projects</p>
                <span className="text-xs text-blue-400 font-semibold">{enhancedMetrics.activeProjects} active</span>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="relative overflow-hidden border-zinc-800/50 bg-gradient-to-br from-green-500/5 to-green-500/0 backdrop-blur-xl hover:shadow-lg hover:shadow-green-500/10 transition-all group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center ring-1 ring-green-500/30">
                  <Activity className="w-6 h-6 text-green-400" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 font-medium mb-1">ACTIVE</p>
                  <p className="text-3xl font-bold text-white">{enhancedMetrics.activeProjects}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                <p className="text-sm text-zinc-400">In Progress</p>
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className={cn(
            "relative overflow-hidden border-zinc-800/50 backdrop-blur-xl hover:shadow-lg transition-all group",
            enhancedMetrics.atRiskProjects > 0 
              ? "bg-gradient-to-br from-amber-500/5 to-amber-500/0 hover:shadow-amber-500/10" 
              : "bg-gradient-to-br from-green-500/5 to-green-500/0 hover:shadow-green-500/10"
          )}>
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br to-transparent opacity-0 group-hover:opacity-100 transition-opacity",
              enhancedMetrics.atRiskProjects > 0 ? "from-amber-500/10" : "from-green-500/10"
            )}></div>
            <div className="relative p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center ring-1",
                  enhancedMetrics.atRiskProjects > 0 
                    ? "from-amber-500/20 to-amber-600/10 ring-amber-500/30" 
                    : "from-green-500/20 to-green-600/10 ring-green-500/30"
                )}>
                  <AlertTriangle className={cn("w-6 h-6", enhancedMetrics.atRiskProjects > 0 ? "text-amber-400" : "text-green-400")} />
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 font-medium mb-1">AT RISK</p>
                  <p className="text-3xl font-bold text-white">{enhancedMetrics.atRiskProjects}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                <p className="text-sm text-zinc-400">{enhancedMetrics.atRiskProjects > 0 ? 'Needs Attention' : 'All Healthy'}</p>
                {enhancedMetrics.atRiskProjects > 0 ? (
                  <TrendingDown className="w-4 h-4 text-amber-400" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className={cn(
            "relative overflow-hidden border-zinc-800/50 backdrop-blur-xl hover:shadow-lg transition-all group",
            enhancedMetrics.overdueTasks > 0 
              ? "bg-gradient-to-br from-red-500/5 to-red-500/0 hover:shadow-red-500/10" 
              : "bg-gradient-to-br from-zinc-500/5 to-zinc-500/0"
          )}>
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br to-transparent opacity-0 group-hover:opacity-100 transition-opacity",
              enhancedMetrics.overdueTasks > 0 ? "from-red-500/10" : "from-zinc-500/10"
            )}></div>
            <div className="relative p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center ring-1",
                  enhancedMetrics.overdueTasks > 0 
                    ? "from-red-500/20 to-red-600/10 ring-red-500/30" 
                    : "from-zinc-500/20 to-zinc-600/10 ring-zinc-500/30"
                )}>
                  <Clock className={cn("w-6 h-6", enhancedMetrics.overdueTasks > 0 ? "text-red-400" : "text-zinc-500")} />
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 font-medium mb-1">OVERDUE</p>
                  <p className="text-3xl font-bold text-white">{enhancedMetrics.overdueTasks}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                <p className="text-sm text-zinc-400">Total Tasks</p>
                <span className="text-xs text-zinc-500 font-semibold">{enhancedMetrics.totalTasks}</span>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="relative overflow-hidden border-zinc-800/50 bg-gradient-to-br from-purple-500/5 to-purple-500/0 backdrop-blur-xl hover:shadow-lg hover:shadow-purple-500/10 transition-all group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center ring-1 ring-purple-500/30">
                  <Flag className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 font-medium mb-1">UPCOMING</p>
                  <p className="text-3xl font-bold text-white">{enhancedMetrics.upcomingMilestones}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                <p className="text-sm text-zinc-400">Milestones</p>
                <span className="text-xs text-purple-400 font-semibold">30 days</span>
              </div>
            </div>
          </Card>
        </motion.div>
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