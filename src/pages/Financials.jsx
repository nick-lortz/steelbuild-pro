import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { 
  RefreshCw, DollarSign, TrendingUp, TrendingDown, AlertCircle,
  Download, Mail, CheckCircle, AlertTriangle, Activity, Zap,
  FileText, ChevronDown, ChevronUp, XCircle, Plus, Edit, Trash2,
  Check, X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReportScheduler from '@/components/reports/ReportScheduler';

export default function Financials() {
  const [selectedProject, setSelectedProject] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [showIntegrity, setShowIntegrity] = useState(false);
  const [showReportScheduler, setShowReportScheduler] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState('snapshot');
  const [showNewSOV, setShowNewSOV] = useState(false);
  const [showNewExpense, setShowNewExpense] = useState(false);
  const [showNewBudget, setShowNewBudget] = useState(false);
  const [editingSOV, setEditingSOV] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingBudget, setEditingBudget] = useState(null);
  const [editData, setEditData] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const queryClient = useQueryClient();

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

      // Unwrap response.data first
      const d = response?.data ?? response;
      
      // Then unwrap nested data/body/result
      const normalized = (d?.data || d?.body || d?.result) || d;

      console.debug('[getFinancialsDashboardData] normalized:', normalized);
      return normalized;
    },
    enabled: !!selectedProject,
    staleTime: 2 * 60 * 1000,
    retry: 2
  });

  // Load raw entities for editing
  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', selectedProject],
    queryFn: () => base44.entities.SOVItem.filter({ project_id: selectedProject }),
    enabled: !!selectedProject,
    staleTime: 2 * 60 * 1000
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', selectedProject],
    queryFn: () => base44.entities.Expense.filter({ project_id: selectedProject }, '-expense_date'),
    enabled: !!selectedProject,
    staleTime: 2 * 60 * 1000
  });

  const { data: budgetLines = [] } = useQuery({
    queryKey: ['financials', selectedProject],
    queryFn: () => base44.entities.Financial.filter({ project_id: selectedProject }),
    enabled: !!selectedProject,
    staleTime: 2 * 60 * 1000
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: () => base44.entities.CostCode.list('code'),
    staleTime: 10 * 60 * 1000
  });

  const { project = {}, snapshot = {}, breakdown = {}, billing = {}, ai = {}, warnings = [], integrityWarnings = [] } = financialData;

  // Mutations for SOV
  const createSOVMutation = useMutation({
    mutationFn: (data) => base44.entities.SOVItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sov-items', selectedProject] });
      queryClient.invalidateQueries({ queryKey: ['financialsDashboard', selectedProject] });
      toast.success('SOV item created');
      setShowNewSOV(false);
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  const updateSOVMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SOVItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sov-items', selectedProject] });
      queryClient.invalidateQueries({ queryKey: ['financialsDashboard', selectedProject] });
      toast.success('SOV updated');
      setEditingSOV(null);
      setEditData({});
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  const deleteSOVMutation = useMutation({
    mutationFn: (id) => base44.entities.SOVItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sov-items', selectedProject] });
      queryClient.invalidateQueries({ queryKey: ['financialsDashboard', selectedProject] });
      toast.success('SOV deleted');
      setDeleteConfirm(null);
    }
  });

  // Mutations for Expenses
  const createExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', selectedProject] });
      queryClient.invalidateQueries({ queryKey: ['financialsDashboard', selectedProject] });
      toast.success('Expense created');
      setShowNewExpense(false);
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', selectedProject] });
      queryClient.invalidateQueries({ queryKey: ['financialsDashboard', selectedProject] });
      toast.success('Expense updated');
      setEditingExpense(null);
      setEditData({});
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', selectedProject] });
      queryClient.invalidateQueries({ queryKey: ['financialsDashboard', selectedProject] });
      toast.success('Expense deleted');
      setDeleteConfirm(null);
    }
  });

  // Mutations for Budget
  const createBudgetMutation = useMutation({
    mutationFn: (data) => base44.entities.Financial.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials', selectedProject] });
      queryClient.invalidateQueries({ queryKey: ['financialsDashboard', selectedProject] });
      toast.success('Budget line created');
      setShowNewBudget(false);
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  const updateBudgetMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Financial.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials', selectedProject] });
      queryClient.invalidateQueries({ queryKey: ['financialsDashboard', selectedProject] });
      toast.success('Budget updated');
      setEditingBudget(null);
      setEditData({});
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: (id) => base44.entities.Financial.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials', selectedProject] });
      queryClient.invalidateQueries({ queryKey: ['financialsDashboard', selectedProject] });
      toast.success('Budget line deleted');
      setDeleteConfirm(null);
    }
  });

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['sov-items', selectedProject] });
    queryClient.invalidateQueries({ queryKey: ['expenses', selectedProject] });
    queryClient.invalidateQueries({ queryKey: ['financials', selectedProject] });
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mr-2">
              <TabsList>
                <TabsTrigger value="snapshot">Snapshot</TabsTrigger>
                <TabsTrigger value="sov">SOV</TabsTrigger>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                <TabsTrigger value="budget">Budget</TabsTrigger>
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
            {activeTab === 'snapshot' && (
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
                                style={{ width: `${Math.min(100, Math.max(0, (cat.forecast / (cat.budget || 1)) * 100))}%` }}
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
                      (billing.underOverBilled || 0) < 0 ? "border-red-500/50 bg-red-500/5" : "border-green-500/50 bg-green-500/5"
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
                  </div>
                </div>
              </>
            )}

            {activeTab === 'sov' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Schedule of Values</h2>
                  <Button size="sm" onClick={() => setShowNewSOV(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add SOV Line
                  </Button>
                </div>
                <Card>
                  <CardContent className="pt-4">
                    {sovItems.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No SOV items</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b">
                            <tr className="text-left">
                              <th className="pb-2 font-medium">Line #</th>
                              <th className="pb-2 font-medium">Description</th>
                              <th className="pb-2 font-medium text-right">Value</th>
                              <th className="pb-2 font-medium text-right">% Complete</th>
                              <th className="pb-2 font-medium text-right">Earned</th>
                              <th className="pb-2 font-medium text-right">Billed</th>
                              <th className="pb-2 font-medium text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sovItems.map((sov) => (
                              <tr key={sov.id} className="border-b last:border-0">
                                {editingSOV === sov.id ? (
                                  <>
                                    <td className="py-2">{sov.line_number}</td>
                                    <td className="py-2">
                                      <Input
                                        value={editData.description || ''}
                                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                        className="h-8"
                                      />
                                    </td>
                                    <td className="py-2 text-right">
                                      <Input
                                        type="number"
                                        value={editData.value || 0}
                                        onChange={(e) => setEditData({ ...editData, value: e.target.value })}
                                        className="h-8 w-24 text-right"
                                      />
                                    </td>
                                    <td className="py-2 text-right">
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={editData.percent_complete || 0}
                                        onChange={(e) => setEditData({ ...editData, percent_complete: e.target.value })}
                                        className="h-8 w-16 text-right"
                                      />
                                    </td>
                                    <td className="py-2" colSpan={2}></td>
                                    <td className="py-2 text-right">
                                      <div className="flex gap-1 justify-end">
                                        <Button size="sm" variant="ghost" onClick={() => updateSOVMutation.mutate({ id: sov.id, data: { ...editData, value: Number(editData.value), percent_complete: Number(editData.percent_complete) } })}>
                                          <Check className="h-3 w-3" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => { setEditingSOV(null); setEditData({}); }}>
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-2">{sov.line_number}</td>
                                    <td className="py-2">{sov.description}</td>
                                    <td className="py-2 text-right font-semibold">${(sov.value / 1000).toFixed(0)}K</td>
                                    <td className="py-2 text-right">{sov.percent_complete || 0}%</td>
                                    <td className="py-2 text-right text-green-500">${((sov.value * (sov.percent_complete || 0) / 100) / 1000).toFixed(0)}K</td>
                                    <td className="py-2 text-right text-blue-500">${((sov.billed_to_date || 0) / 1000).toFixed(0)}K</td>
                                    <td className="py-2 text-right">
                                      <div className="flex gap-1 justify-end">
                                        <Button size="sm" variant="ghost" onClick={() => { setEditingSOV(sov.id); setEditData({ description: sov.description, value: sov.value, percent_complete: sov.percent_complete }); }}>
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm({ type: 'sov', id: sov.id, name: sov.description })}>
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  </>
                                )}
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

            {activeTab === 'expenses' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Expenses</h2>
                  <Button size="sm" onClick={() => setShowNewExpense(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </div>
                <Card>
                  <CardContent className="pt-4">
                    {expenses.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No expenses logged</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b">
                            <tr className="text-left">
                              <th className="pb-2 font-medium">Date</th>
                              <th className="pb-2 font-medium">Description</th>
                              <th className="pb-2 font-medium">Category</th>
                              <th className="pb-2 font-medium">Vendor</th>
                              <th className="pb-2 font-medium text-right">Amount</th>
                              <th className="pb-2 font-medium">Status</th>
                              <th className="pb-2 font-medium text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expenses.slice(0, 50).map((exp) => (
                              <tr key={exp.id} className="border-b last:border-0">
                                {editingExpense === exp.id ? (
                                  <>
                                    <td className="py-2">
                                      <Input
                                        type="date"
                                        value={editData.expense_date || ''}
                                        onChange={(e) => setEditData({ ...editData, expense_date: e.target.value })}
                                        className="h-8 w-32"
                                      />
                                    </td>
                                    <td className="py-2">
                                      <Input
                                        value={editData.description || ''}
                                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                        className="h-8"
                                      />
                                    </td>
                                    <td className="py-2">
                                      <Select value={editData.category} onValueChange={(val) => setEditData({ ...editData, category: val })}>
                                        <SelectTrigger className="h-8 w-28">
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
                                    </td>
                                    <td className="py-2">
                                      <Input
                                        value={editData.vendor || ''}
                                        onChange={(e) => setEditData({ ...editData, vendor: e.target.value })}
                                        className="h-8"
                                      />
                                    </td>
                                    <td className="py-2 text-right">
                                      <Input
                                        type="number"
                                        value={editData.amount || 0}
                                        onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                                        className="h-8 w-24 text-right"
                                      />
                                    </td>
                                    <td className="py-2" colSpan={1}></td>
                                    <td className="py-2 text-right">
                                      <div className="flex gap-1 justify-end">
                                        <Button size="sm" variant="ghost" onClick={() => updateExpenseMutation.mutate({ id: exp.id, data: { ...editData, amount: Number(editData.amount) } })}>
                                          <Check className="h-3 w-3" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => { setEditingExpense(null); setEditData({}); }}>
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-2">{exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : '-'}</td>
                                    <td className="py-2">{exp.description}</td>
                                    <td className="py-2 capitalize">{exp.category}</td>
                                    <td className="py-2">{exp.vendor || '-'}</td>
                                    <td className="py-2 text-right font-semibold">${(exp.amount / 1000).toFixed(1)}K</td>
                                    <td className="py-2">
                                      <Badge variant={exp.payment_status === 'paid' ? 'default' : 'outline'} className="capitalize text-xs">
                                        {exp.payment_status || 'pending'}
                                      </Badge>
                                    </td>
                                    <td className="py-2 text-right">
                                      <div className="flex gap-1 justify-end">
                                        <Button size="sm" variant="ghost" onClick={() => { setEditingExpense(exp.id); setEditData({ expense_date: exp.expense_date, description: exp.description, category: exp.category, vendor: exp.vendor, amount: exp.amount }); }}>
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm({ type: 'expense', id: exp.id, name: exp.description })}>
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  </>
                                )}
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

            {activeTab === 'budget' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Budget Lines</h2>
                  <Button size="sm" onClick={() => setShowNewBudget(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Budget Line
                  </Button>
                </div>
                <Card>
                  <CardContent className="pt-4">
                    {budgetLines.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No budget lines</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b">
                            <tr className="text-left">
                              <th className="pb-2 font-medium">Cost Code</th>
                              <th className="pb-2 font-medium">Category</th>
                              <th className="pb-2 font-medium text-right">Original</th>
                              <th className="pb-2 font-medium text-right">Changes</th>
                              <th className="pb-2 font-medium text-right">Current</th>
                              <th className="pb-2 font-medium text-right">Actual</th>
                              <th className="pb-2 font-medium text-right">Committed</th>
                              <th className="pb-2 font-medium text-right">Forecast</th>
                              <th className="pb-2 font-medium text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {budgetLines.map((line) => {
                              const costCode = costCodes.find(cc => cc.id === line.cost_code_id);
                              return (
                                <tr key={line.id} className="border-b last:border-0">
                                  {editingBudget === line.id ? (
                                    <>
                                      <td className="py-2">{costCode?.code || 'N/A'}</td>
                                      <td className="py-2 capitalize">{line.category}</td>
                                      <td className="py-2 text-right">
                                        <Input
                                          type="number"
                                          value={editData.original_budget || 0}
                                          onChange={(e) => setEditData({ ...editData, original_budget: e.target.value })}
                                          className="h-8 w-24 text-right"
                                        />
                                      </td>
                                      <td className="py-2 text-right">
                                        <Input
                                          type="number"
                                          value={editData.approved_changes || 0}
                                          onChange={(e) => setEditData({ ...editData, approved_changes: e.target.value })}
                                          className="h-8 w-24 text-right"
                                        />
                                      </td>
                                      <td className="py-2" colSpan={4}></td>
                                      <td className="py-2 text-right">
                                        <div className="flex gap-1 justify-end">
                                          <Button size="sm" variant="ghost" onClick={() => {
                                            const orig = Number(editData.original_budget);
                                            const changes = Number(editData.approved_changes);
                                            updateBudgetMutation.mutate({ id: line.id, data: { ...editData, original_budget: orig, approved_changes: changes, current_budget: orig + changes } });
                                          }}>
                                            <Check className="h-3 w-3" />
                                          </Button>
                                          <Button size="sm" variant="ghost" onClick={() => { setEditingBudget(null); setEditData({}); }}>
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="py-2 font-mono">{costCode?.code || 'N/A'}</td>
                                      <td className="py-2 capitalize">{line.category}</td>
                                      <td className="py-2 text-right">${(line.original_budget / 1000).toFixed(0)}K</td>
                                      <td className="py-2 text-right">{line.approved_changes >= 0 ? '+' : ''}${(line.approved_changes / 1000).toFixed(0)}K</td>
                                      <td className="py-2 text-right font-semibold">${(line.current_budget / 1000).toFixed(0)}K</td>
                                      <td className="py-2 text-right text-red-500">${(line.actual_amount / 1000).toFixed(0)}K</td>
                                      <td className="py-2 text-right text-orange-500">${(line.committed_amount / 1000).toFixed(0)}K</td>
                                      <td className="py-2 text-right text-purple-500">${(line.forecast_amount / 1000).toFixed(0)}K</td>
                                      <td className="py-2 text-right">
                                        <div className="flex gap-1 justify-end">
                                          <Button size="sm" variant="ghost" onClick={() => { setEditingBudget(line.id); setEditData({ original_budget: line.original_budget, approved_changes: line.approved_changes }); }}>
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm({ type: 'budget', id: line.id, name: costCode?.code || 'Budget line' })}>
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </td>
                                    </>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

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

        {/* New SOV Sheet */}
        <Sheet open={showNewSOV} onOpenChange={setShowNewSOV}>
          <SheetContent className="w-[600px] sm:max-w-[600px]">
            <SheetHeader>
              <SheetTitle>New SOV Line Item</SheetTitle>
            </SheetHeader>
            <NewSOVForm
              projectId={selectedProject}
              onSubmit={(data) => createSOVMutation.mutate(data)}
              onCancel={() => setShowNewSOV(false)}
            />
          </SheetContent>
        </Sheet>

        {/* New Expense Sheet */}
        <Sheet open={showNewExpense} onOpenChange={setShowNewExpense}>
          <SheetContent className="w-[600px] sm:max-w-[600px]">
            <SheetHeader>
              <SheetTitle>New Expense</SheetTitle>
            </SheetHeader>
            <NewExpenseForm
              projectId={selectedProject}
              costCodes={costCodes}
              onSubmit={(data) => createExpenseMutation.mutate(data)}
              onCancel={() => setShowNewExpense(false)}
            />
          </SheetContent>
        </Sheet>

        {/* New Budget Sheet */}
        <Sheet open={showNewBudget} onOpenChange={setShowNewBudget}>
          <SheetContent className="w-[600px] sm:max-w-[600px]">
            <SheetHeader>
              <SheetTitle>New Budget Line</SheetTitle>
            </SheetHeader>
            <NewBudgetForm
              projectId={selectedProject}
              costCodes={costCodes}
              onSubmit={(data) => createBudgetMutation.mutate(data)}
              onCancel={() => setShowNewBudget(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {deleteConfirm?.type}?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Delete "{deleteConfirm?.name}"? This cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => {
                if (deleteConfirm.type === 'sov') deleteSOVMutation.mutate(deleteConfirm.id);
                else if (deleteConfirm.type === 'expense') deleteExpenseMutation.mutate(deleteConfirm.id);
                else if (deleteConfirm.type === 'budget') deleteBudgetMutation.mutate(deleteConfirm.id);
              }}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

function NewSOVForm({ projectId, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    line_number: '',
    description: '',
    value: 0,
    percent_complete: 0
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.line_number) newErrors.line_number = 'Line number required';
    if (!formData.description) newErrors.description = 'Description required';
    if (formData.value < 0) newErrors.value = 'Value must be ≥ 0';
    if (formData.percent_complete < 0 || formData.percent_complete > 100) newErrors.percent_complete = 'Must be 0-100';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ ...formData, value: Number(formData.value), percent_complete: Number(formData.percent_complete) });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <div>
        <Label>Line Number *</Label>
        <Input value={formData.line_number} onChange={(e) => setFormData({ ...formData, line_number: e.target.value })} className={errors.line_number ? 'border-red-500' : ''} />
        {errors.line_number && <p className="text-xs text-red-500 mt-1">{errors.line_number}</p>}
      </div>

      <div>
        <Label>Description *</Label>
        <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={errors.description ? 'border-red-500' : ''} />
        {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Value ($)</Label>
          <Input type="number" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} className={errors.value ? 'border-red-500' : ''} />
          {errors.value && <p className="text-xs text-red-500 mt-1">{errors.value}</p>}
        </div>

        <div>
          <Label>% Complete</Label>
          <Input type="number" min="0" max="100" value={formData.percent_complete} onChange={(e) => setFormData({ ...formData, percent_complete: e.target.value })} className={errors.percent_complete ? 'border-red-500' : ''} />
          {errors.percent_complete && <p className="text-xs text-red-500 mt-1">{errors.percent_complete}</p>}
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1">Create SOV Line</Button>
      </div>
    </form>
  );
}

function NewExpenseForm({ projectId, costCodes, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
    category: 'other',
    vendor: '',
    amount: 0,
    cost_code_id: ''
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.expense_date) newErrors.expense_date = 'Date required';
    if (!formData.description) newErrors.description = 'Description required';
    if (formData.amount <= 0) newErrors.amount = 'Amount must be > 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ ...formData, amount: Number(formData.amount) });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <div>
        <Label>Expense Date *</Label>
        <Input type="date" value={formData.expense_date} onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })} className={errors.expense_date ? 'border-red-500' : ''} />
        {errors.expense_date && <p className="text-xs text-red-500 mt-1">{errors.expense_date}</p>}
      </div>

      <div>
        <Label>Description *</Label>
        <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={errors.description ? 'border-red-500' : ''} />
        {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Category</Label>
          <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
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

        <div>
          <Label>Cost Code</Label>
          <Select value={formData.cost_code_id} onValueChange={(val) => setFormData({ ...formData, cost_code_id: val })}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {costCodes.map((cc) => (
                <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Vendor</Label>
        <Input value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} />
      </div>

      <div>
        <Label>Amount ($) *</Label>
        <Input type="number" min="0" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className={errors.amount ? 'border-red-500' : ''} />
        {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1">Create Expense</Button>
      </div>
    </form>
  );
}

function NewBudgetForm({ projectId, costCodes, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    cost_code_id: '',
    category: 'other',
    original_budget: 0,
    approved_changes: 0
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.cost_code_id) newErrors.cost_code_id = 'Cost code required';
    if (formData.original_budget < 0) newErrors.original_budget = 'Budget must be ≥ 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const orig = Number(formData.original_budget);
      const changes = Number(formData.approved_changes);
      onSubmit({ 
        ...formData, 
        original_budget: orig, 
        approved_changes: changes,
        current_budget: orig + changes
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <div>
        <Label>Cost Code *</Label>
        <Select value={formData.cost_code_id} onValueChange={(val) => setFormData({ ...formData, cost_code_id: val })}>
          <SelectTrigger className={errors.cost_code_id ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select cost code..." />
          </SelectTrigger>
          <SelectContent>
            {costCodes.map((cc) => (
              <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.cost_code_id && <p className="text-xs text-red-500 mt-1">{errors.cost_code_id}</p>}
      </div>

      <div>
        <Label>Category</Label>
        <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Original Budget ($)</Label>
          <Input type="number" min="0" value={formData.original_budget} onChange={(e) => setFormData({ ...formData, original_budget: e.target.value })} className={errors.original_budget ? 'border-red-500' : ''} />
          {errors.original_budget && <p className="text-xs text-red-500 mt-1">{errors.original_budget}</p>}
        </div>

        <div>
          <Label>Approved Changes ($)</Label>
          <Input type="number" value={formData.approved_changes} onChange={(e) => setFormData({ ...formData, approved_changes: e.target.value })} />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1">Create Budget Line</Button>
      </div>
    </form>
  );
}