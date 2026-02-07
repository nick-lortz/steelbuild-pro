import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/components/shared/hooks/useDebounce';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { 
  RefreshCw, TrendingUp, TrendingDown, DollarSign, Users, 
  Building, AlertTriangle, Clock, Flag, Activity, Zap, FileText, Mail, Download
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import ProjectHealthTable from '@/components/dashboard/ProjectHealthTable';
import ProjectFiltersBar from '@/components/dashboard/ProjectFiltersBar';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { usePagination } from '@/components/shared/hooks/usePagination';
import Pagination from '@/components/ui/Pagination';
import AIRiskPanel from '@/components/dashboard/AIRiskPanel';
import RoleBasedKPIs from '@/components/dashboard/RoleBasedKPIs';
import AIForecastPanel from '@/components/dashboard/AIForecastPanel';
import ReportScheduler from '@/components/reports/ReportScheduler';

export default function Dashboard() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [sortBy, setSortBy] = useState('risk');
  const [showAIRisk, setShowAIRisk] = useState(false);
  const [showReportScheduler, setShowReportScheduler] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const { page, pageSize, skip, limit, goToPage, changePageSize } = usePagination(1, 25);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

  const { 
    data: dashboardData = { projects: [], metrics: {}, pagination: {} }, 
    isLoading: projectsLoading, 
    isFetching: projectsFetching, 
    refetch: refetchDashboard 
  } = useQuery({
    queryKey: ['dashboard', { page, pageSize, search: debouncedSearch, status: statusFilter, risk: riskFilter, sort: sortBy }],
    queryFn: async () => {
      const response = await base44.functions.invoke('getDashboardData', {
        page,
        pageSize,
        search: debouncedSearch,
        status: statusFilter,
        risk: riskFilter,
        sort: sortBy
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000
  });

  const projects = dashboardData?.projects || [];
  const metrics = dashboardData?.metrics || {};
  const pagination = dashboardData?.pagination || {};

  // Safe metric accessors
  const totalProjects = metrics?.totalProjects || 0;
  const activeProjects = metrics?.activeProjects || 0;
  const totalContractValue = metrics?.totalContractValue || 0;
  const avgBudgetVariance = metrics?.avgBudgetVariance || 0;
  const atRiskProjects = metrics?.atRiskProjects || 0;

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      const response = await base44.functions.invoke('generateDashboardPDF', {});
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Dashboard PDF generated');
    } catch (error) {
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleRefresh = () => {
    refetchDashboard();
    toast.success('Dashboard refreshed');
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Project portfolio overview and health metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={projectsFetching}>
              <RefreshCw className={cn("h-4 w-4", projectsFetching && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleGeneratePDF} disabled={generatingPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowReportScheduler(true)}>
              <Mail className="h-4 w-4 mr-2" />
              Schedule Report
            </Button>
          </div>
        </div>

        {/* Role-Based KPIs */}
        <RoleBasedKPIs dashboardData={dashboardData} currentUser={currentUser} />

        {/* Portfolio Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                {activeProjects} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contract Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(totalContractValue / 1000000).toFixed(1)}M
              </div>
              <p className="text-xs text-muted-foreground">
                Portfolio value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget Variance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                (metrics.avgBudgetVariance || 0) < 0 ? "text-red-500" : "text-green-500"
              )}>
                {(metrics.avgBudgetVariance || 0).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Average variance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">At Risk Projects</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                {metrics.atRiskProjects || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Require attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AI Risk Analysis */}
        {activeProjectId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AIRiskPanel projectId={activeProjectId} />
            <AIForecastPanel projectId={activeProjectId} />
          </div>
        )}

        {/* Filters */}
        <ProjectFiltersBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          riskFilter={riskFilter}
          setRiskFilter={setRiskFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />

        {/* Project Health Table */}
        {projectsLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ProjectHealthTable
              projects={projects}
              onProjectClick={(project) => setActiveProjectId(project.id)}
            />
            
            <Pagination
              total={pagination.total || 0}
              page={page}
              pageSize={pageSize}
              onPageChange={goToPage}
              onPageSizeChange={changePageSize}
            />
          </>
        )}

        {/* Report Scheduler Sheet */}
        <Sheet open={showReportScheduler} onOpenChange={setShowReportScheduler}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Schedule Executive Report</SheetTitle>
            </SheetHeader>
            <ReportScheduler onClose={() => setShowReportScheduler(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </ErrorBoundary>
  );
}