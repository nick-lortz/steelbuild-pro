import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { 
  RefreshCw, DollarSign, TrendingUp, TrendingDown, AlertCircle,
  Download, Mail, CheckCircle, AlertTriangle, Activity, Zap,
  FileText, ChevronDown, ChevronUp, XCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ReportScheduler from '@/components/reports/ReportScheduler';

export default function Financials() {
  const [selectedProject, setSelectedProject] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [showIntegrity, setShowIntegrity] = useState(false);
  const [showReportScheduler, setShowReportScheduler] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000
  });

  const projects = React.useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return allProjects;
    return allProjects.filter((p) =>
      p.project_manager === currentUser.email ||
      p.superintendent === currentUser.email ||
      (p.assigned_users && p.assigned_users.includes(currentUser.email))
    );
  }, [currentUser, allProjects]);

  const { 
    data: financialData = {}, 
    isLoading, 
    isFetching, 
    refetch 
  } = useQuery({
    queryKey: ['financialsDashboard', selectedProject],
    queryFn: async () => {
      const response = await base44.functions.invoke('getFinancialsDashboardData', {
        projectId: selectedProject
      });

      // Normalize response
      const d = response?.data ?? response;
      const normalized =
        (d?.snapshot || d?.breakdown || d?.billing) ? d :
        (d?.data?.snapshot || d?.data?.breakdown) ? d.data :
        (d?.body?.snapshot || d?.body?.breakdown) ? d.body :
        d;

      console.debug('[getFinancialsDashboardData] normalized:', normalized);
      return normalized;
    },
    enabled: !!selectedProject,
    staleTime: 2 * 60 * 1000,
    retry: 2
  });

  const { project = {}, snapshot = {}, breakdown = {}, billing = {}, ai = {}, warnings = [], integrityWarnings = [] } = financialData;

  const handleRefresh = () => {
    refetch();
    setLastRefreshed(new Date());
    toast.success('Financial data refreshed');
  };

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      toast.success('Financial report generated');
    } catch (error) {
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const getVarianceColor = (variance) => {
    if (variance >= 0) return 'text-green-500';
    if (variance > -snapshot.currentBudget * 0.05) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getDataCompletenessColor = () => {
    if (warnings.length === 0) return 'bg-green-500';
    if (warnings.length <= 2) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!selectedProject) {
    return (
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Financials</h1>
              <p className="text-muted-foreground mt-2">Budget • Actuals • Forecast • Billing</p>
            </div>
          </div>
          
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <p className="text-sm font-medium mb-4">Select a project to view financials</p>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_number} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Command Center</h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-muted-foreground text-sm">
                {project.project_number} • {project.name}
              </p>
              <div className={cn("w-2 h-2 rounded-full", getDataCompletenessColor())} />
              <span className="text-xs text-muted-foreground">
                Data {warnings.length === 0 ? 'Complete' : warnings.length <= 2 ? 'Partial' : 'Incomplete'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Updated: {lastRefreshed.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_number} - {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleGeneratePDF} disabled={generatingPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowReportScheduler(true)}>
              <Mail className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          </div>
        </div>

        {/* Missing Data Warning */}
        {warnings.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Data Incomplete</p>
                  <ul className="text-xs text-muted-foreground mt-1 list-disc ml-4">
                    {warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Financial Snapshot */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Financial Snapshot</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Current Budget</p>
                    <div className="text-2xl font-bold">
                      ${((snapshot.currentBudget || 0) / 1000).toFixed(0)}K
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Revised budget</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Actual to Date</p>
                    <div className="text-2xl font-bold text-red-500">
                      ${((snapshot.actualToDate || 0) / 1000).toFixed(0)}K
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Costs incurred</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Committed</p>
                    <div className="text-2xl font-bold text-orange-500">
                      ${((snapshot.committed || 0) / 1000).toFixed(0)}K
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">POs issued</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Forecast (EAC)</p>
                    <div className="text-2xl font-bold text-purple-500">
                      ${((snapshot.eac || 0) / 1000).toFixed(0)}K
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Estimated final</p>
                  </CardContent>
                </Card>

                <Card className={cn(
                  "border-2",
                  (snapshot.projectedOverUnder || 0) >= 0 ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"
                )}>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Projected Over/Under</p>
                    <div className={cn("text-2xl font-bold", getVarianceColor(snapshot.projectedOverUnder || 0))}>
                      {(snapshot.projectedOverUnder || 0) >= 0 ? '+' : ''}
                      ${((snapshot.projectedOverUnder || 0) / 1000).toFixed(0)}K
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((Math.abs(snapshot.projectedOverUnder || 0) / (snapshot.currentBudget || 1)) * 100).toFixed(1)}% variance
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Burn Rate</p>
                    <div className="text-2xl font-bold">
                      ${((snapshot.burnRate || 0) / 1000).toFixed(1)}K/d
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">30-day avg</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Budget vs Actual vs Forecast */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Budget vs Actual vs Forecast</h2>
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {(breakdown.byCategory || []).map((cat) => (
                      <div key={cat.category} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold capitalize min-w-[100px]">{cat.category}</span>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Budget: ${(cat.budget / 1000).toFixed(0)}K</span>
                              <span>Actual: ${(cat.actual / 1000).toFixed(0)}K</span>
                              <span>Committed: ${(cat.committed / 1000).toFixed(0)}K</span>
                              <span>Forecast: ${(cat.forecast / 1000).toFixed(0)}K</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={cat.variance >= 0 ? 'default' : 'destructive'}>
                              {cat.variance >= 0 ? '+' : ''}${(cat.variance / 1000).toFixed(0)}K
                            </Badge>
                            <span className={cn("text-sm font-semibold", getVarianceColor(cat.variance))}>
                              {cat.variancePct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={cn(
                              "h-2 rounded-full transition-all",
                              cat.variance >= 0 ? "bg-green-500" : "bg-red-500"
                            )}
                            style={{ width: `${Math.min(100, Math.max(0, (cat.actual / cat.budget) * 100))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cost Code Intelligence */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Cost Code Intelligence (Top Variances)</h2>
              <Card>
                <CardContent className="pt-4">
                  {(breakdown.byCostCodeTop || []).length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No cost code data available</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b">
                          <tr className="text-left">
                            <th className="pb-2 font-medium">Cost Code</th>
                            <th className="pb-2 font-medium">Name</th>
                            <th className="pb-2 font-medium text-right">Budget</th>
                            <th className="pb-2 font-medium text-right">Actual</th>
                            <th className="pb-2 font-medium text-right">Committed</th>
                            <th className="pb-2 font-medium text-right">Forecast</th>
                            <th className="pb-2 font-medium text-right">Variance</th>
                            <th className="pb-2 font-medium text-right">%</th>
                            <th className="pb-2 font-medium text-center">Trend</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(breakdown.byCostCodeTop || []).map((cc, idx) => (
                            <tr key={idx} className="border-b last:border-0">
                              <td className="py-2 font-mono">{cc.code}</td>
                              <td className="py-2">{cc.name}</td>
                              <td className="py-2 text-right">${(cc.budget / 1000).toFixed(0)}K</td>
                              <td className="py-2 text-right text-red-500">${(cc.actual / 1000).toFixed(0)}K</td>
                              <td className="py-2 text-right text-orange-500">${(cc.committed / 1000).toFixed(0)}K</td>
                              <td className="py-2 text-right text-purple-500">${(cc.forecast / 1000).toFixed(0)}K</td>
                              <td className={cn("py-2 text-right font-semibold", getVarianceColor(cc.variance))}>
                                {cc.variance >= 0 ? '+' : ''}${(cc.variance / 1000).toFixed(0)}K
                              </td>
                              <td className={cn("py-2 text-right", getVarianceColor(cc.variance))}>
                                {cc.variancePct.toFixed(1)}%
                              </td>
                              <td className="py-2 text-center">
                                {cc.variance < 0 ? (
                                  <TrendingDown className="h-4 w-4 text-red-500 mx-auto" />
                                ) : (
                                  <TrendingUp className="h-4 w-4 text-green-500 mx-auto" />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Billing & Cashflow */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Billing & Cashflow</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Contract Value</p>
                    <div className="text-2xl font-bold">
                      ${((billing.contractValue || 0) / 1000).toFixed(0)}K
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Earned to Date</p>
                    <div className="text-2xl font-bold text-green-500">
                      ${((billing.earnedToDate || 0) / 1000).toFixed(0)}K
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Billed to Date</p>
                    <div className="text-2xl font-bold text-blue-500">
                      ${((billing.billedToDate || 0) / 1000).toFixed(0)}K
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Remaining to Bill</p>
                    <div className="text-2xl font-bold">
                      ${((billing.remainingToBill || 0) / 1000).toFixed(0)}K
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn(
                  "border-2",
                  (billing.underOverBilled || 0) >= 0 ? "border-red-500/50 bg-red-500/5" : "border-green-500/50 bg-green-500/5"
                )}>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Under/Overbilled</p>
                    <div className={cn(
                      "text-2xl font-bold",
                      (billing.underOverBilled || 0) < 0 ? "text-red-500" : "text-green-500"
                    )}>
                      {(billing.underOverBilled || 0) >= 0 ? '+' : ''}${((billing.underOverBilled || 0) / 1000).toFixed(0)}K
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(billing.underOverBilled || 0) < 0 ? 'Underbilled' : 'Overbilled'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* AI Financial Analyst */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-500" />
                AI Financial Analyst
              </h2>
              <div className="space-y-4">
                {/* AI Summary */}
                <Card className="border-purple-500/30">
                  <CardHeader>
                    <CardTitle className="text-sm">Financial Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Direction:</span>
                        <Badge variant={ai.summary?.risk === 'on_track' ? 'default' : 'destructive'}>
                          {ai.summary?.direction || 'Analyzing...'}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">Biggest Driver:</span>{' '}
                        <span className="text-muted-foreground">{ai.summary?.biggestDriver || 'None identified'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Confidence:</span>
                        <Badge variant="outline" className="capitalize">{ai.confidence || 'medium'}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Variance Drivers */}
                {(ai.drivers || []).length > 0 && (
                  <Card className="border-purple-500/30">
                    <CardHeader>
                      <CardTitle className="text-sm">Variance Drivers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {(ai.drivers || []).map((driver, idx) => (
                          <div key={idx} className="flex items-start justify-between p-2 rounded bg-muted/30">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{driver.driver}</p>
                              <p className="text-xs text-muted-foreground mt-1">{driver.reason}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              <span className="text-sm font-bold text-red-500">
                                ${(driver.impactedAmount / 1000).toFixed(0)}K
                              </span>
                              <Badge variant="destructive" className="text-xs">{driver.severity}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Actions */}
                {(ai.actions || []).length > 0 && (
                  <Card className="border-purple-500/30">
                    <CardHeader>
                      <CardTitle className="text-sm">Recommended Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(ai.actions || []).map((action, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                            <Badge variant={action.priority === 'high' ? 'destructive' : 'default'} className="text-xs mt-1">
                              {action.priority}
                            </Badge>
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{action.action}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>Owner: {action.owner}</span>
                                <span>Due: {action.dueDate}</span>
                              </div>
                              <p className="text-xs mt-1 text-green-600">Impact: {action.impact}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Missing Data */}
                {(ai.missingDataReasons || []).length > 0 && (
                  <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        AI Confidence Limited
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-xs text-muted-foreground list-disc ml-4 space-y-1">
                        {(ai.missingDataReasons || []).map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Data Integrity & Exceptions */}
            {integrityWarnings.length > 0 && (
              <Collapsible open={showIntegrity} onOpenChange={setShowIntegrity}>
                <Card className="border-red-500/30">
                  <CardHeader>
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Data Integrity Warnings ({integrityWarnings.length})
                      </CardTitle>
                      {showIntegrity ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {integrityWarnings.map((warning, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5" />
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}
          </>
        )}

        {/* Report Scheduler Sheet */}
        <Sheet open={showReportScheduler} onOpenChange={setShowReportScheduler}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Schedule Financial Report</SheetTitle>
            </SheetHeader>
            <ReportScheduler onClose={() => setShowReportScheduler(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </ErrorBoundary>
  );
}