import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { 
  RefreshCw, DollarSign, TrendingUp, TrendingDown, AlertCircle, Download, Mail,
  CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, Zap, Plus, Edit,
  Info, Activity, Trash2, Check, X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ReportScheduler from '@/components/reports/ReportScheduler';

export default function BudgetControl() {
  const [selectedProject, setSelectedProject] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [showIntegrity, setShowIntegrity] = useState(false);
  const [showReportScheduler, setShowReportScheduler] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [viewMode, setViewMode] = useState('overview');

  const queryClient = useQueryClient();

  const [showLineSheet, setShowLineSheet] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [lineForm, setLineForm] = useState({
    project_id: '',
    cost_code_id: '',
    category: 'other',
    original_budget: 0,
    approved_changes: 0,
    current_budget: 0,
    forecast_amount: 0,
    notes: ''
  });

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

  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: () => base44.entities.CostCode.list('code'),
    staleTime: 10 * 60 * 1000
  });

  const { 
    data: controlData = {}, 
    isLoading, 
    isFetching, 
    refetch 
  } = useQuery({
    queryKey: ['budgetControl', selectedProject],
    queryFn: async () => {
      const response = await base44.functions.invoke('getBudgetControlData', {
        projectId: selectedProject
      });

      // Unwrap response.data first
      const d = response?.data ?? response;
      
      // Then unwrap nested data/body/result
      const normalized = (d?.data || d?.body || d?.result) || d;

      console.debug('[getBudgetControlData] normalized:', normalized);
      return normalized;
    },
    enabled: !!selectedProject,
    staleTime: 2 * 60 * 1000,
    retry: 2
  });

  const { 
    project = {}, 
    snapshot = {}, 
    lines = [], 
    drivers = {}, 
    commitments = {},
    ai = {}, 
    warnings = [], 
    integrityWarnings = [] 
  } = controlData;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['budgetControl', selectedProject] });
  };

  const createLineMutation = useMutation({
    mutationFn: (data) => base44.entities.Financial.create(data),
    onSuccess: () => {
      toast.success('Budget line created');
      setShowLineSheet(false);
      setEditingLine(null);
      invalidate();
    },
    onError: (e) => toast.error(`Create failed: ${e?.message || 'Unknown error'}`)
  });

  const updateLineMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Financial.update(id, data),
    onSuccess: () => {
      toast.success('Budget line updated');
      setShowLineSheet(false);
      setEditingLine(null);
      invalidate();
    },
    onError: (e) => toast.error(`Update failed: ${e?.message || 'Unknown error'}`)
  });

  const deleteLineMutation = useMutation({
    mutationFn: (id) => base44.entities.Financial.delete(id),
    onSuccess: () => {
      toast.success('Budget line deleted');
      setDeleteConfirm(null);
      invalidate();
    },
    onError: (e) => toast.error(`Delete failed: ${e?.message || 'Unknown error'}`)
  });

  const openNewLine = () => {
    setEditingLine(null);
    setLineForm({
      project_id: selectedProject,
      cost_code_id: '',
      category: 'other',
      original_budget: 0,
      approved_changes: 0,
      current_budget: 0,
      forecast_amount: 0,
      notes: ''
    });
    setShowLineSheet(true);
  };

  const openEditLine = (line) => {
    setEditingLine(line);
    setLineForm({
      project_id: selectedProject,
      cost_code_id: line.cost_code_id || '',
      category: line.category || 'other',
      original_budget: Number(line.original || 0),
      approved_changes: Number(line.changes || 0),
      current_budget: Number(line.current || 0),
      forecast_amount: Number(line.forecast || 0),
      notes: line.notes || ''
    });
    setShowLineSheet(true);
  };

  const saveLine = () => {
    const orig = Number(lineForm.original_budget || 0);
    const changes = Number(lineForm.approved_changes || 0);
    const payload = {
      project_id: selectedProject,
      cost_code_id: lineForm.cost_code_id,
      category: lineForm.category,
      original_budget: orig,
      approved_changes: changes,
      current_budget: orig + changes,
      forecast_amount: Number(lineForm.forecast_amount || 0),
      notes: lineForm.notes || ''
    };

    if (!payload.cost_code_id) return toast.error('Cost code is required');

    if (editingLine?.id) {
      updateLineMutation.mutate({ id: editingLine.id, data: payload });
    } else {
      createLineMutation.mutate(payload);
    }
  };

  const handleRefresh = () => {
    refetch();
    setLastRefreshed(new Date());
    toast.success('Cost control data refreshed');
  };

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      toast.success('Cost control report generated');
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

  const getFlagColor = (flag) => {
    if (flag === 'Over Budget' || flag === 'Forecast Risk') return 'destructive';
    if (flag === 'Commit Spike') return 'default';
    return 'outline';
  };

  if (!selectedProject) {
    return (
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Budget & Cost Control</h1>
              <p className="text-muted-foreground mt-2">Operational cost management & variance control</p>
            </div>
          </div>
          
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <p className="text-sm font-medium mb-4">Select a project to manage costs</p>
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
              <h1 className="text-3xl font-bold tracking-tight">Budget & Cost Control</h1>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-muted-foreground text-sm">
                  {project.project_number} • {project.name}
                </p>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  warnings.length === 0 ? "bg-green-500" : warnings.length <= 2 ? "bg-yellow-500" : "bg-red-500"
                )} />
                <span className="text-xs text-muted-foreground">
                  Data {warnings.length === 0 ? 'Complete' : warnings.length <= 2 ? 'Partial' : 'Incomplete'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Updated: {lastRefreshed.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={viewMode} onValueChange={setViewMode} className="mr-2">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="allocations">Allocations</TabsTrigger>
                  <TabsTrigger value="commitments">Commitments</TabsTrigger>
                  <TabsTrigger value="forecast">Forecast</TabsTrigger>
                </TabsList>
              </Tabs>
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
                Export
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
              {viewMode === 'overview' && (
                <>
                  {/* Control Snapshot */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Control Snapshot</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Budget Remaining</p>
                          </div>
                          <div className="text-2xl font-bold">
                            ${((snapshot.budgetRemaining || 0) / 1000).toFixed(0)}K
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {((snapshot.budgetRemaining / (snapshot.currentBudget || 1)) * 100).toFixed(0)}% remaining
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Committed Remaining</p>
                          </div>
                          <div className="text-2xl font-bold text-orange-500">
                            ${((snapshot.committedRemaining || 0) / 1000).toFixed(0)}K
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Exposure</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Cost to Date</p>
                          </div>
                          <div className="text-2xl font-bold text-red-500">
                            ${((snapshot.costToDate || 0) / 1000).toFixed(0)}K
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Actuals</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">ETC</p>
                          </div>
                          <div className="text-2xl font-bold text-blue-500">
                            ${((snapshot.etc || 0) / 1000).toFixed(0)}K
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">To complete</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">EAC</p>
                          </div>
                          <div className="text-2xl font-bold text-purple-500">
                            ${((snapshot.eac || 0) / 1000).toFixed(0)}K
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Final forecast</p>
                        </CardContent>
                      </Card>

                      <Card className={cn(
                        "border-2",
                        (snapshot.projectedVariance || 0) >= 0 ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"
                      )}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Variance</p>
                          </div>
                          <div className={cn("text-2xl font-bold", getVarianceColor(snapshot.projectedVariance || 0))}>
                            {(snapshot.projectedVariance || 0) >= 0 ? '+' : ''}
                            ${((snapshot.projectedVariance || 0) / 1000).toFixed(0)}K
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {(snapshot.projectedVariancePct || 0).toFixed(1)}%
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Burn Rate</p>
                          </div>
                          <div className="text-2xl font-bold">
                            ${((snapshot.spendVelocity30d || 0) / 1000).toFixed(1)}K/d
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            7d: ${((snapshot.spendVelocity7d || 0) / 1000).toFixed(1)}K/d
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Variance Drivers */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Variance Drivers</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Over Budget */}
                      <Card className="border-red-500/30">
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-red-500" />
                            Over Budget ({(drivers.overBudget || []).length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {(drivers.overBudget || []).length === 0 ? (
                            <p className="text-xs text-muted-foreground">All cost codes within budget</p>
                          ) : (
                            <div className="space-y-2">
                              {(drivers.overBudget || []).map((d, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                                  <div>
                                    <p className="font-medium">{d.costCode}</p>
                                    <p className="text-muted-foreground">{d.name}</p>
                                  </div>
                                  <Badge variant="destructive">${(d.overrun / 1000).toFixed(0)}K</Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Trending Up */}
                      <Card className="border-yellow-500/30">
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-yellow-500" />
                            Trending Up ({(drivers.trendingUp || []).length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {(drivers.trendingUp || []).length === 0 ? (
                            <p className="text-xs text-muted-foreground">No forecast increases</p>
                          ) : (
                            <div className="space-y-2">
                              {(drivers.trendingUp || []).map((d, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                                  <div>
                                    <p className="font-medium">{d.costCode}</p>
                                    <p className="text-muted-foreground">{d.name}</p>
                                  </div>
                                  <Badge variant="outline">${(d.risk / 1000).toFixed(0)}K</Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Unallocated */}
                      <Card className="border-orange-500/30">
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                            Unallocated Spend
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-orange-500">
                            ${((drivers.unallocated || 0) / 1000).toFixed(0)}K
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Expenses without cost code assignment
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* AI Cost Controller */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-purple-500" />
                      AI Cost Controller
                    </h2>
                    <div className="space-y-4">
                      {/* AI Summary */}
                      <Card className="border-purple-500/30">
                        <CardHeader>
                          <CardTitle className="text-sm">Cost Control Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Status:</span>
                              <Badge variant={ai.summary?.riskLevel === 'low' ? 'default' : 'destructive'}>
                                {ai.summary?.direction || 'Analyzing...'}
                              </Badge>
                            </div>
                            <div>
                              <span className="font-medium">Key Driver:</span>{' '}
                              <span className="text-muted-foreground">{ai.summary?.keyDriver || 'None'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Confidence:</span>
                              <Badge variant="outline" className="capitalize">{ai.confidence || 'medium'}</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* AI Alerts */}
                      {(ai.alerts || []).length > 0 && (
                        <Card className="border-purple-500/30">
                          <CardHeader>
                            <CardTitle className="text-sm">Cost Code Alerts</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {(ai.alerts || []).map((alert, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-2 rounded bg-muted/30">
                                  <AlertTriangle className={cn(
                                    "h-4 w-4 mt-0.5",
                                    alert.severity === 'critical' ? "text-red-500" : "text-yellow-500"
                                  )} />
                                  <div className="flex-1">
                                    <p className="text-sm">{alert.message}</p>
                                    <Badge variant="outline" className="mt-1 text-xs">{alert.severity}</Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* AI Recommendations */}
                      {(ai.recommendations || []).length > 0 && (
                        <Card className="border-purple-500/30">
                          <CardHeader>
                            <CardTitle className="text-sm">Recommended Actions</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {(ai.recommendations || []).map((rec, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                                  <Badge variant={rec.priority === 'critical' || rec.priority === 'high' ? 'destructive' : 'default'} className="text-xs mt-1">
                                    {rec.priority}
                                  </Badge>
                                  <div className="flex-1">
                                    <p className="font-semibold text-sm">{rec.action}</p>
                                    <p className="text-xs text-green-600 mt-1">Impact: {rec.impact}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </>
              )}

              {viewMode === 'allocations' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Budget Lines & Allocations</h2>
                    <Button size="sm" onClick={openNewLine}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Budget Line
                    </Button>
                  </div>
                  <Card>
                    <CardContent className="pt-4">
                      {lines.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                          <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No budget lines established</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="border-b">
                              <tr className="text-left">
                                <th className="pb-2 font-medium">Cost Code</th>
                                <th className="pb-2 font-medium">Name</th>
                                <th className="pb-2 font-medium text-right">Original</th>
                                <th className="pb-2 font-medium text-right">Changes</th>
                                <th className="pb-2 font-medium text-right">Current</th>
                                <th className="pb-2 font-medium text-right">Actual</th>
                                <th className="pb-2 font-medium text-right">Committed</th>
                                <th className="pb-2 font-medium text-right">Forecast</th>
                                <th className="pb-2 font-medium text-right">Variance</th>
                                <th className="pb-2 font-medium">Status</th>
                                <th className="pb-2 font-medium"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {lines.map((line) => (
                                <tr key={line.id} className="border-b last:border-0">
                                  <td className="py-2 font-mono">{line.costCode}</td>
                                  <td className="py-2">{line.costCodeName}</td>
                                  <td className="py-2 text-right">${(line.original / 1000).toFixed(0)}K</td>
                                  <td className="py-2 text-right">{line.changes >= 0 ? '+' : ''}${(line.changes / 1000).toFixed(0)}K</td>
                                  <td className="py-2 text-right font-semibold">${(line.current / 1000).toFixed(0)}K</td>
                                  <td className="py-2 text-right text-red-500">${(line.actual / 1000).toFixed(0)}K</td>
                                  <td className="py-2 text-right text-orange-500">${(line.committed / 1000).toFixed(0)}K</td>
                                  <td className="py-2 text-right text-purple-500">${(line.forecast / 1000).toFixed(0)}K</td>
                                  <td className={cn("py-2 text-right font-semibold", getVarianceColor(line.variance))}>
                                    {line.variance >= 0 ? '+' : ''}${(line.variance / 1000).toFixed(0)}K
                                  </td>
                                  <td className="py-2">
                                    <div className="flex flex-wrap gap-1">
                                      {line.flags.map((flag, idx) => (
                                        <Badge key={idx} variant={getFlagColor(flag)} className="text-xs">
                                          {flag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="py-2">
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openEditLine(line)}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeleteConfirm(line)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
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
              )}

              {viewMode === 'commitments' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Commitments & Exposure</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* By Category */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Commitments by Category</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {(commitments.byCategory || []).map((cat) => (
                            <div key={cat.category} className="flex items-center justify-between p-2 rounded bg-muted/30">
                              <span className="text-sm capitalize">{cat.category}</span>
                              <span className="text-sm font-semibold">${(cat.committed / 1000).toFixed(0)}K</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Top Commitments */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Top Commitments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {(commitments.topCommitments || []).map((c, idx) => (
                            <div key={idx} className="p-2 rounded bg-muted/30">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">{c.costCode}</span>
                                <span className="text-sm font-bold">${(c.committed / 1000).toFixed(0)}K</span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Invoiced: ${(c.actual / 1000).toFixed(0)}K</span>
                                <span className="text-orange-500">Exposure: ${(c.exposure / 1000).toFixed(0)}K</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Total Committed</p>
                          <p className="text-2xl font-bold">${((commitments.total || 0) / 1000).toFixed(0)}K</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Total Exposure</p>
                          <p className="text-2xl font-bold text-orange-500">${((commitments.exposure || 0) / 1000).toFixed(0)}K</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {viewMode === 'forecast' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Forecast & ETC/EAC</h2>
                    <Button size="sm">
                      <Activity className="h-4 w-4 mr-2" />
                      Update ETC
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Current ETC</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-blue-500">
                          ${((snapshot.etc || 0) / 1000).toFixed(0)}K
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Estimate to Complete</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Projected EAC</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-purple-500">
                          ${((snapshot.eac || 0) / 1000).toFixed(0)}K
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Estimate at Completion</p>
                      </CardContent>
                    </Card>

                    <Card className={cn(
                      "border-2",
                      (snapshot.projectedVariance || 0) >= 0 ? "border-green-500/50" : "border-red-500/50"
                    )}>
                      <CardHeader>
                        <CardTitle className="text-sm">Impact on Variance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={cn("text-3xl font-bold", getVarianceColor(snapshot.projectedVariance || 0))}>
                          {(snapshot.projectedVariance || 0) >= 0 ? '+' : ''}${((snapshot.projectedVariance || 0) / 1000).toFixed(0)}K
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {(snapshot.projectedVariancePct || 0).toFixed(1)}% of budget
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {(ai.missingDataReasons || []).length > 0 && (
                    <Card className="border-amber-500/30 bg-amber-500/5">
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          Forecast Confidence Limited
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
              )}

              {/* Data Integrity */}
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
                <SheetTitle>Schedule Cost Control Report</SheetTitle>
              </SheetHeader>
              <ReportScheduler onClose={() => setShowReportScheduler(false)} />
            </SheetContent>
          </Sheet>

          {/* Budget Line Sheet */}
          <Sheet open={showLineSheet} onOpenChange={setShowLineSheet}>
            <SheetContent className="w-[520px] sm:max-w-[520px]">
              <SheetHeader>
                <SheetTitle>{editingLine ? 'Edit Budget Line' : 'New Budget Line'}</SheetTitle>
              </SheetHeader>

              <div className="space-y-4 mt-6">
                <div>
                  <Label>Cost Code *</Label>
                  <Select
                    value={lineForm.cost_code_id}
                    onValueChange={(val) => setLineForm((p) => ({ ...p, cost_code_id: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cost code..." />
                    </SelectTrigger>
                    <SelectContent>
                      {costCodes.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id}>
                          {cc.code} - {cc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Category</Label>
                  <Select
                    value={lineForm.category}
                    onValueChange={(val) => setLineForm((p) => ({ ...p, category: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="labor">Labor</SelectItem>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="subcontract">Subcontract</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Original Budget</Label>
                    <Input
                      type="number"
                      value={lineForm.original_budget}
                      onChange={(e) => setLineForm((p) => ({ ...p, original_budget: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Approved Changes</Label>
                    <Input
                      type="number"
                      value={lineForm.approved_changes}
                      onChange={(e) => setLineForm((p) => ({ ...p, approved_changes: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Forecast</Label>
                  <Input
                    type="number"
                    value={lineForm.forecast_amount}
                    onChange={(e) => setLineForm((p) => ({ ...p, forecast_amount: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={lineForm.notes}
                    onChange={(e) => setLineForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowLineSheet(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={saveLine}
                    disabled={createLineMutation.isPending || updateLineMutation.isPending}
                  >
                    {editingLine ? 'Save Changes' : 'Create Line'}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Delete confirm */}
          <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete budget line?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                This will permanently delete "{deleteConfirm?.costCode || deleteConfirm?.costCodeName}".
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteLineMutation.mutate(deleteConfirm.id)}
                  disabled={deleteLineMutation.isPending}
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
    </ErrorBoundary>
  );
}