import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { 
  RefreshCw, TrendingUp, TrendingDown, DollarSign, Users, 
  Building, AlertTriangle, Clock, Flag, Activity, Zap
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import ProjectHealthTable from '@/components/dashboard/ProjectHealthTable';
import ProjectFiltersBar from '@/components/dashboard/ProjectFiltersBar';
import { Card } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { usePagination } from '@/components/shared/hooks/usePagination';
import Pagination from '@/components/ui/Pagination';
import AIRiskPanel from '@/components/dashboard/AIRiskPanel';
import RoleBasedKPIs from '@/components/dashboard/RoleBasedKPIs';

export default function Dashboard() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('risk');
  const [showAIRisk, setShowAIRisk] = useState(false);
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

  const { data: weeklySummary } = useQuery({
    queryKey: ['weekly-executive-summary'],
    queryFn: async () => {
      const response = await base44.functions.invoke('generateWeeklyExecutiveSummary', {});
      return response.data.summary;
    },
    enabled: currentUser?.role === 'admin',
    staleTime: 60 * 60 * 1000
  });

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

      {/* KPI Grid - Role-based */}
      <div className="mb-6">
        <RoleBasedKPIs 
          role={currentUser.role} 
          metrics={enhancedMetrics} 
          projects={paginatedProjects}
        />
      </div>

      {/* AI Risk Panel + Weekly Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {activeProjectId && (
          <AIRiskPanel projectId={activeProjectId} />
        )}
        
        {currentUser.role === 'admin' && weeklySummary && (
          <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base uppercase tracking-wide flex items-center gap-2">
                <Activity size={16} className="text-purple-500" />
                Weekly Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-zinc-800/50 rounded">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold mb-0.5">Tasks Done</p>
                  <p className="text-xl font-black text-green-400">{weeklySummary.activity?.tasks_completed || 0}</p>
                </div>
                <div className="p-2 bg-zinc-800/50 rounded">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold mb-0.5">Labor Hours</p>
                  <p className="text-xl font-black text-white">{weeklySummary.activity?.labor_hours?.toFixed(0) || 0}</p>
                </div>
                <div className="p-2 bg-zinc-800/50 rounded">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold mb-0.5">Weekly Spend</p>
                  <p className="text-xl font-black text-amber-500">${(weeklySummary.portfolio?.weekly_spend / 1000).toFixed(0)}K</p>
                </div>
                <div className="p-2 bg-zinc-800/50 rounded">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold mb-0.5">Avg Health</p>
                  <p className="text-xl font-black text-white">{weeklySummary.portfolio?.avg_health_score?.toFixed(0) || 0}</p>
                </div>
              </div>

              {weeklySummary.concerns?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Top Concerns</p>
                  {weeklySummary.concerns.map((concern, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded">
                      <AlertTriangle size={10} className="text-red-400 mt-0.5" />
                      <p className="text-[10px] text-red-400">{concern}</p>
                    </div>
                  ))}
                </div>
              )}

              {weeklySummary.projects_needing_attention?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Projects Needing Attention</p>
                  {weeklySummary.projects_needing_attention.map((proj, idx) => (
                    <div key={idx} className="p-2 bg-amber-500/10 border border-amber-500/30 rounded">
                      <p className="text-[10px] text-white font-bold">{proj.number} - {proj.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-zinc-800 text-white text-[8px] px-1 py-0">
                          Health: {proj.healthScore?.toFixed(0)}
                        </Badge>
                        {proj.openRFIs > 0 && (
                          <Badge className="bg-red-500/20 text-red-400 text-[8px] px-1 py-0">
                            {proj.openRFIs} RFIs
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
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