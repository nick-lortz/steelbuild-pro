import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  RefreshCw, 
  DollarSign, 
  Building, 
  AlertTriangle, 
  Clock, 
  Flag, 
  Activity,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import ProjectHealthTable from '@/components/dashboard/ProjectHealthTable';
import ProjectFiltersBar from '@/components/dashboard/ProjectFiltersBar';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { usePagination } from '@/components/shared/hooks/usePagination';
import Pagination from '@/components/ui/Pagination';

export default function Dashboard() {
  const { setActiveProjectId } = useActiveProject();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('risk');
  const { page, pageSize, goToPage, changePageSize } = usePagination(1, 25);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const { data: dashboardData = { projects: [], metrics: {}, pagination: {} }, isLoading, isFetching, refetch } = useQuery({
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
    staleTime: 2 * 60 * 1000
  });

  const metrics = dashboardData.metrics || {};
  const projects = dashboardData.projects || [];
  const totalFiltered = dashboardData.pagination?.totalFiltered || 0;
  const hasFilters = searchTerm || statusFilter !== 'all' || riskFilter !== 'all';

  if (isLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Executive Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground tracking-tight">Portfolio Overview</h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                {metrics.totalProjects || 0} Active Projects • Last updated {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={refetch}
              disabled={isFetching}
              className="gap-2"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Executive KPI Strip */}
      <div className="border-b border-border bg-card/30">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="grid grid-cols-6 gap-4">
            {/* Total Contract Value */}
            <Card className="bg-card border-border card-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <DollarSign size={18} className="text-blue-400" />
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Contract Value
                  </div>
                </div>
                <div className="text-2xl font-semibold text-foreground tabular-nums">
                  ${((metrics.totalContractValue || 0) / 1000000).toFixed(1)}M
                </div>
              </CardContent>
            </Card>

            {/* Active Projects */}
            <Card className="bg-card border-border card-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Activity size={18} className="text-green-400" />
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Active
                  </div>
                </div>
                <div className="text-2xl font-semibold text-foreground tabular-nums">
                  {metrics.activeProjects || 0}
                </div>
              </CardContent>
            </Card>

            {/* On Track */}
            <Card className="bg-card border-border card-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 size={18} className="text-green-400" />
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    On Track
                  </div>
                </div>
                <div className="text-2xl font-semibold text-foreground tabular-nums">
                  {metrics.onTrackProjects || 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {metrics.totalProjects > 0 ? Math.round(((metrics.onTrackProjects || 0) / metrics.totalProjects) * 100) : 0}%
                </div>
              </CardContent>
            </Card>

            {/* At Risk */}
            <Card className="bg-card border-border card-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <AlertTriangle size={18} className="text-amber-400" />
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    At Risk
                  </div>
                </div>
                <div className="text-2xl font-semibold text-foreground tabular-nums">
                  {metrics.atRiskProjects || 0}
                </div>
              </CardContent>
            </Card>

            {/* Overdue Tasks */}
            <Card className="bg-card border-border card-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center",
                    (metrics.overdueTasks || 0) > 0 ? "bg-red-500/10" : "bg-zinc-500/10"
                  )}>
                    <Clock size={18} className={(metrics.overdueTasks || 0) > 0 ? "text-red-400" : "text-zinc-500"} />
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Overdue
                  </div>
                </div>
                <div className={cn(
                  "text-2xl font-semibold tabular-nums",
                  (metrics.overdueTasks || 0) > 0 ? "text-red-400" : "text-foreground"
                )}>
                  {metrics.overdueTasks || 0}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Milestones */}
            <Card className="bg-card border-border card-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Flag size={18} className="text-purple-400" />
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Milestones
                  </div>
                </div>
                <div className="text-2xl font-semibold text-foreground tabular-nums">
                  {metrics.upcomingMilestones || 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Next 30 days</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-8 py-6 space-y-6">
        {/* Filters */}
        <ProjectFiltersBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          riskFilter={riskFilter}
          onRiskChange={setRiskFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onClearFilters={() => {
            setSearchTerm('');
            setStatusFilter('all');
            setRiskFilter('all');
          }}
          hasActiveFilters={hasFilters}
        />

        {/* Project Table */}
        <Card className="bg-card border-border card-elevated">
          <CardContent className="p-0">
            <ProjectHealthTable 
              projects={projects}
              onProjectClick={(projectId) => setActiveProjectId(projectId)}
            />
          </CardContent>
        </Card>

        {totalFiltered === 0 && (
          <div className="text-center py-16">
            <Building size={48} className="mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No projects match your filters</p>
          </div>
        )}

        {/* Pagination */}
        {totalFiltered > 0 && (
          <Pagination
            total={totalFiltered}
            page={page}
            pageSize={pageSize}
            onPageChange={goToPage}
            onPageSizeChange={changePageSize}
          />
        )}
      </div>
    </div>
  );
}