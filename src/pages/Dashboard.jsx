import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
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
import { useEntitySubscription } from '@/components/shared/hooks/useSubscription';
import { RISK_THRESHOLDS, getBusinessDaysBetween } from '@/components/shared/businessRules';
import { groupBy } from '@/components/shared/arrayUtils';
import { logger, measurePerf } from '@/components/shared/logging';
import { calculateCostHealth, calculateTaskProgress } from '@/components/shared/financialUtils';

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
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

  const { data: dashboardData = { projects: [], metrics: {}, pagination: {} }, isLoading: projectsLoading, isFetching: projectsFetching, refetch: refetchDashboard } = useQuery({
    queryKey: ['dashboard', { page, pageSize, search: searchTerm, status: statusFilter, risk: riskFilter, sort: sortBy }],
    queryFn: async () => {
      const response = await base44.functions.invoke('getDashboardData', {
        page,
        pageSize,
        search: searchTerm,
        status: statusFilter,
        risk: riskFilter,
        sort: sortBy
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  // Data from server (filtering, calc, pagination all server-side)
  const enhancedMetrics = dashboardData.metrics || {};
  const paginatedProjects = dashboardData.projects || [];
  const totalFiltered = dashboardData.pagination?.totalFiltered || 0;

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
    <ErrorBoundary>
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
            onClick={refetchDashboard}
            disabled={projectsFetching}
            className="gap-2 bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20 hover:text-amber-400"
          >
            <RefreshCw size={14} className={projectsFetching ? 'animate-spin' : ''} />
            {projectsFetching ? 'Refreshing...' : 'Refresh'}
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
    </ErrorBoundary>
  );
}