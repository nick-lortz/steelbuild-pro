import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/components/shared/hooks/useDebounce';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { 
  RefreshCw, AlertTriangle, Clock, TrendingUp, TrendingDown,
  Mail, Download, ArrowRight, AlertCircle, CheckCircle2,
  Activity, FileText, DollarSign, Zap, Target, Shield
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import AIRiskPanel from '@/components/dashboard/AIRiskPanel';
import AIForecastPanel from '@/components/dashboard/AIForecastPanel';
import ReportScheduler from '@/components/reports/ReportScheduler';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Dashboard() {
  const { setActiveProjectId } = useActiveProject();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [riskFilter, setRiskFilter] = useState('all');
  const [timeWindow, setTimeWindow] = useState('30d'); // 7d, 30d, all
  const [showReportScheduler, setShowReportScheduler] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false
  });

  const { 
    data: dashboardData = { projects: [], metrics: {}, pagination: {} }, 
    isLoading: projectsLoading, 
    isFetching: projectsFetching, 
    refetch: refetchDashboard,
    error: dashboardError
  } = useQuery({
    queryKey: ['dashboard', { search: debouncedSearch, risk: riskFilter }],
    queryFn: async () => {
      const response = await base44.functions.invoke('getDashboardData', {
        page: 1,
        pageSize: 100,
        search: debouncedSearch,
        status: 'all',
        risk: riskFilter,
        sort: 'risk'
      });

      // Unwrap response.data first
      const d = response?.data ?? response;
      
      // Then unwrap nested data/body/result
      const normalized = (d?.data || d?.body || d?.result) || d;

      console.debug('[getDashboardData] normalized:', normalized);
      console.debug('[getDashboardData] metrics keys:', Object.keys(normalized?.metrics || {}));

      return normalized;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000
  });

  const projects = dashboardData?.projects || [];
  const metrics = dashboardData?.metrics || {};

  // Check for missing critical metrics
  const missingMetrics = [];
  const expectedKeys = ['totalProjects', 'activeProjects', 'atRiskProjects', 'portfolioValue'];
  expectedKeys.forEach(key => {
    if (!(key in metrics)) missingMetrics.push(key);
  });

  // Calculate Executive-Level Metrics
  const executiveMetrics = useMemo(() => {
    const totalProjects = Number(metrics?.totalProjects) || 0;
    const activeProjects = Number(metrics?.activeProjects) || 0;
    const atRiskProjects = Number(metrics?.atRiskProjects) || 0;
    const overdueTasks = Number(metrics?.overdueTasks) || 0;
    const pendingApprovals = Number(metrics?.pendingApprovals) || 0;
    const avgScheduleSlip = Number(metrics?.avgScheduleSlip) || 0;
    const budgetVariancePct = Number(metrics?.budgetVariancePct) || 0;
    
    // Portfolio Health Index (0-100)
    // Weighted composite: 30% schedule, 30% cost, 20% risk, 20% issues
    const scheduleScore = Math.max(0, 100 - Math.abs(avgScheduleSlip) * 5);
    const costScore = Math.max(0, 100 - Math.abs(budgetVariancePct) * 2);
    const riskScore = activeProjects > 0 ? ((activeProjects - atRiskProjects) / activeProjects) * 100 : 100;
    const issuesScore = Math.max(0, 100 - (overdueTasks + pendingApprovals) * 2);
    
    const healthIndex = Math.round(
      scheduleScore * 0.3 + costScore * 0.3 + riskScore * 0.2 + issuesScore * 0.2
    );

    // Top Risks Count
    const topRisksCount = atRiskProjects + (budgetVariancePct < -10 ? 1 : 0) + (avgScheduleSlip > 5 ? 1 : 0);

    // Change Pressure
    const openCOs = Number(metrics?.openChangeOrders) || 0;
    const changePressure = openCOs + pendingApprovals;

    // RFIs Pressure
    const overdueRFIs = Number(metrics?.overdueRFIs) || 0;
    const avgRFIAge = Number(metrics?.avgRFIDaysOpen) || 0;
    const rfisNeedingAttention = overdueRFIs + (avgRFIAge > 10 ? Math.floor(avgRFIAge / 10) : 0);

    // Momentum
    const tasksCompleted7d = Number(metrics?.tasksCompletedLast7Days) || 0;
    const laborHours7d = Number(metrics?.laborHoursLast7Days) || 0;
    const momentum = tasksCompleted7d + Math.floor(laborHours7d / 10);

    // Forecast Confidence (placeholder - would come from AI forecasts)
    const forecastConfidence = metrics?.forecastConfidence || 'medium';

    return {
      healthIndex,
      topRisksCount,
      changePressure,
      rfisNeedingAttention,
      momentum,
      forecastConfidence,
      overdueRFIs,
      overdueTasks,
      pendingApprovals
    };
  }, [metrics]);

  // Identify Top 5 Projects Needing Attention
  const projectsNeedingAttention = useMemo(() => {
    return projects
      .map(p => {
        const reasons = [];
        if ((p.overdueRFIs || 0) > 0) reasons.push({ label: 'Overdue RFIs', variant: 'destructive' });
        if ((p.budgetVariancePct || 0) < -10) reasons.push({ label: 'Over budget', variant: 'destructive' });
        if ((p.scheduleSlipDays || 0) > 5) reasons.push({ label: 'Schedule slipping', variant: 'destructive' });
        if ((p.pendingApprovals || 0) > 0) reasons.push({ label: 'Pending approvals', variant: 'default' });
        if ((p.daysSinceLastActivity || 999) > 14) reasons.push({ label: 'No activity', variant: 'secondary' });
        
        return { ...p, reasons, attentionScore: reasons.length };
      })
      .filter(p => p.attentionScore > 0)
      .sort((a, b) => b.attentionScore - a.attentionScore)
      .slice(0, 5);
  }, [projects]);

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      const response = await base44.functions.invoke('generateDashboardPDF', {});
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio-command-center-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Portfolio report generated');
    } catch (error) {
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleRefresh = () => {
    refetchDashboard();
    setLastRefreshed(new Date());
    toast.success('Dashboard refreshed');
  };

  const getHealthColor = (index) => {
    if (index >= 80) return 'text-green-500';
    if (index >= 60) return 'text-yellow-500';
    if (index >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getHealthIcon = (index) => {
    if (index >= 80) return CheckCircle2;
    if (index >= 60) return AlertCircle;
    return AlertTriangle;
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              Portfolio Command Center
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Executive insights • Risk analysis • Portfolio health • Forecasts
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {lastRefreshed.toLocaleString()}
            </p>
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

        {/* Missing Data Warning */}
        {missingMetrics.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Data Incomplete</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Missing metrics: {missingMetrics.join(', ')}. Some KPIs may show zero or default values.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Executive Summary Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Portfolio Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-bold", getHealthColor(executiveMetrics.healthIndex))}>
                {executiveMetrics.healthIndex}
                <span className="text-sm font-normal text-muted-foreground">/100</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Composite score</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Top Risks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">
                {executiveMetrics.topRisksCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Projects at risk</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Change Pressure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">
                {executiveMetrics.changePressure}
              </div>
              <p className="text-xs text-muted-foreground mt-1">COs + approvals</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                RFI Pressure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-500">
                {executiveMetrics.rfisNeedingAttention}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Overdue + aging</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Momentum
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">
                {executiveMetrics.momentum}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Forecast Confidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-500 capitalize">
                {executiveMetrics.forecastConfidence}
              </div>
              <p className="text-xs text-muted-foreground mt-1">AI certainty</p>
            </CardContent>
          </Card>
        </div>

        {/* What Needs Attention Now */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Projects Needing Attention */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-500" />
                What Needs Attention Now
              </h2>
              <Link to={createPageUrl('Projects')}>
                <Button variant="ghost" size="sm">
                  View All Projects
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>

            {projectsLoading ? (
              <Card>
                <CardContent className="py-12 flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : projectsNeedingAttention.length === 0 ? (
              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="py-8 flex flex-col items-center justify-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
                  <p className="font-medium text-green-600">All Clear</p>
                  <p className="text-sm text-muted-foreground mt-1">No projects require immediate attention</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {projectsNeedingAttention.map((project) => (
                  <Card key={project.id} className="hover:border-amber-500 transition-colors">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold truncate">{project.name}</h3>
                            <Badge variant={project.risk === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                              {project.risk || 'medium'} risk
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {project.reasons.map((reason, idx) => (
                              <Badge key={idx} variant={reason.variant} className="text-xs">
                                {reason.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Link to={createPageUrl('ProjectDashboard') + `?id=${project.id}`}>
                          <Button
                            size="sm"
                            onClick={() => setActiveProjectId(project.id)}
                          >
                            Open
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Critical Queue */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Critical Queue
            </h2>

            <Card className="border-red-500/30">
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Overdue RFIs</span>
                  <Badge variant="destructive">{executiveMetrics.overdueRFIs}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link to={createPageUrl('RFIHub')}>
                  <Button variant="outline" size="sm" className="w-full">
                    Review RFIs
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-orange-500/30">
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Overdue Tasks</span>
                  <Badge variant="destructive">{executiveMetrics.overdueTasks}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link to={createPageUrl('Schedule')}>
                  <Button variant="outline" size="sm" className="w-full">
                    Review Schedule
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-yellow-500/30">
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Pending Approvals</span>
                  <Badge variant="secondary">{executiveMetrics.pendingApprovals}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link to={createPageUrl('ChangeOrders')}>
                  <Button variant="outline" size="sm" className="w-full">
                    Review Approvals
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* AI Insights Area */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-500" />
            AI Operations Layer
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AIRiskPanel projectId={projects[0]?.id} />
            <AIForecastPanel projectId={projects[0]?.id} />
          </div>
        </div>

        {/* Trends & Signals */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Trends & Signals
            </h2>
            <div className="flex gap-2">
              {['7d', '30d', 'all'].map((window) => (
                <Button
                  key={window}
                  variant={timeWindow === window ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeWindow(window)}
                >
                  {window === 'all' ? 'All' : window.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                  Weekly Spend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${((metrics?.weeklySpend || 0) / 1000).toFixed(0)}K
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs">
                  {(metrics?.weeklySpendDelta || 0) >= 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-red-500" />
                      <span className="text-red-500">+{metrics?.weeklySpendDelta || 0}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">{metrics?.weeklySpendDelta || 0}%</span>
                    </>
                  )}
                  <span className="text-muted-foreground">vs last week</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                  Tasks Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.tasksCompletedLast7Days || 0}
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs">
                  {(metrics?.tasksCompletedDelta || 0) >= 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">+{metrics?.tasksCompletedDelta || 0}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-500" />
                      <span className="text-red-500">{metrics?.tasksCompletedDelta || 0}%</span>
                    </>
                  )}
                  <span className="text-muted-foreground">vs last week</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                  RFI Aging
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(metrics?.avgRFIDaysOpen || 0).toFixed(1)}d
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs">
                  {(metrics?.rfiAgingDelta || 0) >= 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-red-500" />
                      <span className="text-red-500">+{metrics?.rfiAgingDelta || 0}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-green-500" />
                      <span className="text-green-500">{metrics?.rfiAgingDelta || 0}%</span>
                    </>
                  )}
                  <span className="text-muted-foreground">avg days open</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                  Schedule Variance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-2xl font-bold",
                  (metrics?.avgScheduleSlip || 0) < -3 ? "text-red-500" : 
                  (metrics?.avgScheduleSlip || 0) > 3 ? "text-green-500" : "text-yellow-500"
                )}>
                  {(metrics?.avgScheduleSlip || 0) > 0 ? '+' : ''}{(metrics?.avgScheduleSlip || 0).toFixed(1)}d
                </div>
                <p className="text-xs text-muted-foreground mt-1">Avg slip/gain</p>
              </CardContent>
            </Card>
          </div>
        </div>

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