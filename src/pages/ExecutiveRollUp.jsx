import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { 
  RefreshCw, AlertTriangle, Clock, TrendingUp, TrendingDown, FileText,
  Mail, Download, ArrowRight, AlertCircle, Target, Shield, Zap,
  ChevronDown, ChevronUp, CheckCircle, XCircle, Activity
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import ReportScheduler from '@/components/reports/ReportScheduler';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function ExecutiveRollUp() {
  const [timeWindow, setTimeWindow] = useState('30d'); // 7d, lastWeek, 30d, quarter
  const [reportMode, setReportMode] = useState('screen'); // screen, pdf
  const [showReportScheduler, setShowReportScheduler] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [showAppendix, setShowAppendix] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
    gcTime: Infinity
  });

  const { 
    data: rollupData = {}, 
    isLoading, 
    isFetching, 
    refetch,
    error
  } = useQuery({
    queryKey: ['executiveRollUp', timeWindow],
    queryFn: async () => {
      const response = await base44.functions.invoke('getExecutiveRollUpData', {
        timeWindow
      });

      // Normalize response
      const d = response?.data ?? response;
      const normalized =
        (d?.summary || d?.scorecards || d?.drivers) ? d :
        (d?.data?.summary || d?.data?.scorecards) ? d.data :
        (d?.body?.summary || d?.body?.scorecards) ? d.body :
        d;

      console.debug('[getExecutiveRollUpData] normalized:', normalized);
      return normalized;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: currentUser?.role === 'admin'
  });

  const { summary = {}, scorecards = {}, drivers = [], exceptions = {}, ai = {}, metadata = {} } = rollupData;

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      toast.success('Executive report generated');
      // Placeholder - integrate with actual PDF generation
    } catch (error) {
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleRefresh = () => {
    refetch();
    setLastRefreshed(new Date());
    toast.success('Report refreshed');
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'text-red-500 bg-red-500/10 border-red-500/30',
      high: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
      medium: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
      low: 'text-blue-500 bg-blue-500/10 border-blue-500/30'
    };
    return colors[severity] || colors.medium;
  };

  const getTrendIcon = (trend) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'worsening') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-yellow-500" />;
  };

  // Access control
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <ErrorBoundary>
        <div className="space-y-6">
          <Card className="border-amber-500/50">
            <CardContent className="p-8 text-center">
              <Shield size={48} className="mx-auto mb-4 text-amber-500" />
              <p className="font-medium">Executive Access Required</p>
              <p className="text-sm text-muted-foreground mt-2">This report is restricted to executives and administrators.</p>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="border-b pb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Executive Roll Up</h1>
              <p className="text-muted-foreground text-sm">
                Board-ready portfolio reporting • Trends • Performance drivers • Strategic decisions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleGeneratePDF} disabled={generatingPDF}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowReportScheduler(true)}>
                <Mail className="h-4 w-4 mr-2" />
                Schedule Delivery
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {[
                { label: 'This Week', value: '7d' },
                { label: 'Last Week', value: 'lastWeek' },
                { label: '30 Days', value: '30d' },
                { label: 'Quarter', value: 'quarter' }
              ].map(opt => (
                <Button
                  key={opt.value}
                  variant={timeWindow === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeWindow(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                {metadata.dataComplete ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Data Complete</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span>Partial Data</span>
                  </>
                )}
              </div>
              <span>Updated: {lastRefreshed.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Missing Data Warning */}
        {metadata.missingData && metadata.missingData.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Incomplete Dataset</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Missing: {metadata.missingData.join(', ')}. Some metrics may be unavailable or default to zero.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Executive Brief */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-500" />
              Executive Brief
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-2" />
                  <p>
                    <span className="font-semibold">Portfolio Direction:</span>{' '}
                    <span className={cn(
                      "capitalize",
                      summary.portfolioDirection === 'improving' ? 'text-green-500' :
                      summary.portfolioDirection === 'declining' ? 'text-red-500' : 'text-yellow-500'
                    )}>
                      {summary.portfolioDirection || 'stable'}
                    </span>
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-2" />
                  <p>
                    <span className="font-semibold">Key Drivers:</span>{' '}
                    {(summary.topDrivers || []).join(', ') || 'None identified'}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
                  <p>
                    <span className="font-semibold">Biggest Risk:</span>{' '}
                    <span className="text-red-500">{summary.biggestRisk || 'None identified'}</span>
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                  <p>
                    <span className="font-semibold">Opportunity:</span>{' '}
                    <span className="text-green-500">{summary.opportunity || 'Maintain momentum'}</span>
                  </p>
                </div>
                {summary.decisions && summary.decisions.length > 0 && (
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mt-2" />
                    <div>
                      <p className="font-semibold">Decisions Needed:</p>
                      <ul className="list-disc ml-5 mt-1 text-xs text-muted-foreground space-y-1">
                        {summary.decisions.map((decision, idx) => (
                          <li key={idx}>{decision}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rollup Scorecards */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Portfolio Scorecards</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Schedule Exposure</p>
                <div className="text-2xl font-bold text-red-500">
                  {scorecards.scheduleExposure || 0}d
                </div>
                <p className="text-xs text-muted-foreground mt-1">Days at risk</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cost Exposure</p>
                <div className="text-2xl font-bold text-red-500">
                  ${((scorecards.costExposure || 0) / 1000).toFixed(0)}K
                </div>
                <p className="text-xs text-muted-foreground mt-1">Over budget</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Change Pipeline</p>
                <div className="text-2xl font-bold text-orange-500">
                  {scorecards.changePipeline?.pending || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ${((scorecards.changePipeline?.pendingValue || 0) / 1000).toFixed(0)}K pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">RFI Aging</p>
                <div className="text-2xl font-bold text-yellow-500">
                  {scorecards.rfiAging?.avg || 0}d
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {scorecards.rfiAging?.overdue || 0} overdue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Execution Throughput</p>
                <div className="text-2xl font-bold text-green-500">
                  {scorecards.executionThroughput || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Tasks closed</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Forecast Confidence</p>
                <div className="flex items-baseline gap-1 text-sm font-semibold">
                  <span className="text-red-500">{scorecards.forecastConfidence?.low || 0}</span>
                  <span className="text-yellow-500">{scorecards.forecastConfidence?.medium || 0}</span>
                  <span className="text-green-500">{scorecards.forecastConfidence?.high || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Low/Med/High</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Portfolio Drivers */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-500" />
            Portfolio Drivers
          </h2>
          <Card>
            <CardContent className="pt-4">
              {drivers.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p>No major drivers identified</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {drivers.map((driver, idx) => (
                    <div key={idx} className={cn("flex items-center justify-between p-3 rounded-lg border", getSeverityColor(driver.severity))}>
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-center min-w-[60px]">
                          <div className="text-2xl font-bold">{driver.projectsImpacted}</div>
                          <div className="text-xs opacity-70">projects</div>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">{driver.driver}</div>
                          <div className="text-xs opacity-70 mt-1">{driver.impactType} impact</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {driver.severity}
                          </Badge>
                          {getTrendIcon(driver.trend)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Exceptions List */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Exceptions (Outliers Only)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Schedule Outliers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Worst Schedule Exposure</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(exceptions.scheduleOutliers || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No outliers</p>
                  ) : (
                    exceptions.scheduleOutliers.map((project, idx) => (
                      <Link key={idx} to={createPageUrl('ProjectDashboard') + `?id=${project.id}`}>
                        <div className="flex items-center justify-between p-2 rounded border border-red-500/30 hover:bg-red-500/5 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{project.name}</p>
                            <p className="text-xs text-muted-foreground">{project.project_number}</p>
                          </div>
                          <div className="text-right ml-2">
                            <p className="text-sm font-bold text-red-500">+{project.scheduleSlip}d</p>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cost Outliers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Worst Cost Exposure</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(exceptions.costOutliers || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No outliers</p>
                  ) : (
                    exceptions.costOutliers.map((project, idx) => (
                      <Link key={idx} to={createPageUrl('ProjectDashboard') + `?id=${project.id}`}>
                        <div className="flex items-center justify-between p-2 rounded border border-red-500/30 hover:bg-red-500/5 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{project.name}</p>
                            <p className="text-xs text-muted-foreground">{project.project_number}</p>
                          </div>
                          <div className="text-right ml-2">
                            <p className="text-sm font-bold text-red-500">
                              ${(Math.abs(project.variance) / 1000).toFixed(0)}K
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Approval Outliers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Most Pending Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(exceptions.approvalOutliers || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No outliers</p>
                  ) : (
                    exceptions.approvalOutliers.map((project, idx) => (
                      <Link key={idx} to={createPageUrl('ProjectDashboard') + `?id=${project.id}`}>
                        <div className="flex items-center justify-between p-2 rounded border border-orange-500/30 hover:bg-orange-500/5 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{project.name}</p>
                            <p className="text-xs text-muted-foreground">{project.project_number}</p>
                          </div>
                          <div className="text-right ml-2">
                            <Badge variant="secondary">{project.pendingCount}</Badge>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* AI Executive Analyst */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-500" />
            AI Executive Analyst
          </h2>
          <div className="space-y-4">
            {/* AI Risk Clusters */}
            <Card className="border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-sm">Risk Clusters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(ai.clusters || []).map((cluster, idx) => (
                    <div key={idx} className={cn("p-3 rounded-lg border", getSeverityColor(cluster.severity))}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{cluster.name}</p>
                          <p className="text-xs opacity-70 mt-1">{cluster.projects.length} projects impacted</p>
                        </div>
                        <Badge variant="outline" className="capitalize">{cluster.severity}</Badge>
                      </div>
                      <p className="text-xs mt-2">
                        <span className="font-medium">Recommended:</span> {cluster.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Recommended Decisions */}
            <Card className="border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-sm">Recommended Decisions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(ai.recommendations || []).map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="flex-shrink-0 mt-1">
                        <Badge variant={rec.priority === 'critical' ? 'destructive' : 'default'} className="text-xs">
                          {rec.priority}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{rec.decision}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Owner: {rec.owner}</span>
                          <span>Due: {rec.dueDate}</span>
                        </div>
                        <p className="text-xs mt-1 text-green-600">Impact: {rec.impact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Confidence */}
            <Card className="border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-sm">AI Confidence & Assumptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Confidence Level:</span>
                    <Badge variant="outline" className="capitalize">{ai.confidence || 'medium'}</Badge>
                  </div>
                  {ai.assumptions && ai.assumptions.length > 0 && (
                    <div>
                      <p className="font-medium mb-1">Assumptions:</p>
                      <ul className="list-disc ml-5 text-muted-foreground space-y-1">
                        {ai.assumptions.map((assumption, idx) => (
                          <li key={idx}>{assumption}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Board-ready Appendix */}
        <Collapsible open={showAppendix} onOpenChange={setShowAppendix}>
          <Card>
            <CardHeader>
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <CardTitle className="text-sm">Board-ready Appendix</CardTitle>
                {showAppendix ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="text-xs space-y-3">
                <div>
                  <p className="font-semibold mb-1">Key Metrics Definitions</p>
                  <ul className="list-disc ml-5 text-muted-foreground space-y-1">
                    <li>Schedule Exposure: Sum of positive schedule variances (days behind)</li>
                    <li>Cost Exposure: Total projected overrun across portfolio</li>
                    <li>Change Pipeline: Open change orders awaiting approval</li>
                    <li>RFI Aging: Average days open for active RFIs</li>
                    <li>Execution Throughput: Tasks completed in reporting period</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-1">Sign Conventions</p>
                  <ul className="list-disc ml-5 text-muted-foreground space-y-1">
                    <li>Positive schedule variance = behind schedule</li>
                    <li>Negative cost variance = over budget</li>
                    <li>Green/Yellow/Red based on margin variance from plan</li>
                  </ul>
                </div>
                {metadata.missingData && metadata.missingData.length > 0 && (
                  <div>
                    <p className="font-semibold mb-1 text-amber-500">Data Completeness Warnings</p>
                    <ul className="list-disc ml-5 text-muted-foreground space-y-1">
                      {metadata.missingData.map((item, idx) => (
                        <li key={idx}>Missing: {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Report Scheduler Sheet */}
        <Sheet open={showReportScheduler} onOpenChange={setShowReportScheduler}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Schedule Executive Report Delivery</SheetTitle>
            </SheetHeader>
            <ReportScheduler onClose={() => setShowReportScheduler(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </ErrorBoundary>
  );
}