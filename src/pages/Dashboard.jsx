import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { usePagination } from '@/components/shared/hooks/usePagination';
import Pagination from '@/components/ui/Pagination';
import AIRiskPanel from '@/components/dashboard/AIRiskPanel';
import AIForecastPanel from '@/components/dashboard/AIForecastPanel';

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
    queryFn: () => apiClient.auth.me(),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

  const { data: dashboardData = { projects: [], metrics: {}, pagination: {} }, isLoading: projectsLoading, isFetching: projectsFetching, refetch: refetchDashboard } = useQuery({
    queryKey: ['dashboard', { page, pageSize, search: searchTerm, status: statusFilter, risk: riskFilter, sort: sortBy }],
    queryFn: async () => {
      const response = await apiClient.functions.invoke('getDashboardData', {
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
      const response = await apiClient.functions.invoke('generateWeeklyExecutiveSummary', {});
      return response.data.summary;
    },
    enabled: currentUser?.role === 'admin',
    staleTime: 60 * 60 * 1000
  });

  if (projectsLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black">
      {/* Header */}
      <div className="border-b border-zinc-800/50 bg-gradient-to-b from-zinc-900 to-zinc-950/50 backdrop-blur-sm">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-3">
                <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
                <p className="text-sm text-zinc-500 font-mono">{enhancedMetrics.totalProjects} Projects</p>
              </div>
              <p className="text-xs text-zinc-600 mt-2">Portfolio overview and project health</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={refetchDashboard}
              disabled={projectsFetching}
              className="gap-2 bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 rounded-lg"
            >
              <RefreshCw size={14} className={projectsFetching ? 'animate-spin' : ''} />
              {projectsFetching ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="border-b border-zinc-800/50 bg-zinc-950/50">
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <div className="grid grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700/50 rounded-lg">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Total Projects</div>
                <div className="text-3xl font-bold text-blue-400">{enhancedMetrics.totalProjects || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-500/15 to-zinc-900 border-emerald-500/30 rounded-lg">
              <CardContent className="p-4">
                <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold mb-1">Healthy</div>
                <div className="text-3xl font-bold text-emerald-400">{enhancedMetrics.healthyProjects || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500/15 to-zinc-900 border-amber-500/30 rounded-lg">
              <CardContent className="p-4">
                <div className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold mb-1">At Risk</div>
                <div className="text-3xl font-bold text-amber-400">{enhancedMetrics.riskProjects || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700/50 rounded-lg">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Avg Health</div>
                <div className="text-3xl font-bold text-white">{enhancedMetrics.avgHealth?.toFixed(0) || 0}%</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700/50 rounded-lg">
              <CardContent className="p-4">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">Open RFIs</div>
                <div className="text-3xl font-bold text-cyan-400">{enhancedMetrics.openRFIs || 0}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="border-b border-zinc-800/50 bg-zinc-950/30">
        <div className="max-w-[1800px] mx-auto px-8 py-3">
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
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-8 py-6">
        {/* AI Panels + Weekly Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {activeProjectId && (
            <AIForecastPanel projectId={activeProjectId} />
          )}
          
          {activeProjectId && (
            <AIRiskPanel projectId={activeProjectId} />
          )}
          
          {currentUser.role === 'admin' && weeklySummary && (
            <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/30 rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base uppercase tracking-wide flex items-center gap-2">
                  <Activity size={16} className="text-blue-400" />
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

              {weeklySummary.forecasts?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Project Forecasts</p>
                  {weeklySummary.forecasts.map((f, idx) => (
                    <div key={idx} className="p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                      <p className="text-[10px] text-white font-bold">{f.project_number}</p>
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        <div>
                          <p className="text-[8px] text-zinc-600">Completion</p>
                          <p className={cn("text-[9px] font-bold", 
                            f.forecast?.completion_forecast?.variance_days > 0 ? "text-red-400" : "text-green-400"
                          )}>
                            {f.forecast?.completion_forecast?.variance_days > 0 ? '+' : ''}{f.forecast?.completion_forecast?.variance_days} days
                          </p>
                        </div>
                        <div>
                          <p className="text-[8px] text-zinc-600">Budget</p>
                          <p className={cn("text-[9px] font-bold",
                            f.forecast?.budget_forecast?.projected_overrun > 0 ? "text-red-400" : "text-green-400"
                          )}>
                            {f.forecast?.budget_forecast?.projected_overrun > 0 ? '+' : ''}{((f.forecast?.budget_forecast?.projected_overrun || 0) / 1000).toFixed(0)}K
                          </p>
                        </div>
                      </div>
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
    </div>
    </ErrorBoundary>
  );
}