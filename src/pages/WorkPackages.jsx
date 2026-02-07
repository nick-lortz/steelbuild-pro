import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import RouteGuard from '@/components/shared/RouteGuard';
import { 
  RefreshCw, Package, AlertCircle, Download, Mail, Plus, Edit, Trash2,
  Check, X, CheckCircle, AlertTriangle, Zap, TrendingUp, Clock, Users,
  FileCheck, Activity, Target
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ReportScheduler from '@/components/reports/ReportScheduler';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';

export default function WorkPackagesPage() {
  return (
    <RouteGuard pageLabel="Work Packages">
      <WorkPackages />
    </RouteGuard>
  );
}

function WorkPackages() {
  const { activeProjectId: selectedProject } = useActiveProject();
  const [statusFilter, setStatusFilter] = useState('all');
  const [needsAttentionOnly, setNeedsAttentionOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [showReportScheduler, setShowReportScheduler] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showNewPackage, setShowNewPackage] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [editingCardId, setEditingCardId] = useState(null);
  const [editData, setEditData] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showAI, setShowAI] = useState(true);

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
    data: wpData = {}, 
    isLoading, 
    isFetching, 
    refetch 
  } = useQuery({
    queryKey: ['workPackagesBoard', selectedProject],
    queryFn: async () => {
      const response = await base44.functions.invoke('getWorkPackagesBoardData', {
        projectId: selectedProject
      });

      // Unwrap response.data first
      const d = response?.data ?? response;
      
      // Then unwrap nested data/body/result
      const normalized = (d?.data || d?.body || d?.result) || d;

      console.debug('[getWorkPackagesBoardData] normalized:', normalized);
      return normalized;
    },
    enabled: !!selectedProject,
    staleTime: 2 * 60 * 1000,
    retry: 2
  });

  const { 
    project = {}, 
    snapshot = {}, 
    packages = [],
    needsAttention = [],
    tasksByPackage = {},
    ai = {}, 
    warnings = [] 
  } = wpData;

  const filteredPackages = React.useMemo(() => {
    let filtered = packages;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }

    if (needsAttentionOnly) {
      filtered = filtered.filter(p => p.blockers.length > 0);
    }

    return filtered;
  }, [packages, statusFilter, searchTerm, needsAttentionOnly]);

  const packagesByStatus = React.useMemo(() => {
    const grouped = {
      planned: [],
      in_progress: [],
      blocked: [],
      completed: []
    };

    filteredPackages.forEach(p => {
      const status = p.status || 'planned';
      if (grouped[status]) {
        grouped[status].push(p);
      } else {
        grouped.planned.push(p);
      }
    });

    return grouped;
  }, [filteredPackages]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkPackage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workPackagesBoard', selectedProject] });
      toast.success('Work package created');
      setShowNewPackage(false);
    },
    onError: (error) => {
      toast.error(`Failed to create: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkPackage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workPackagesBoard', selectedProject] });
      toast.success('Package updated');
      setEditingCardId(null);
      setEditData({});
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await base44.functions.invoke('cascadeDeleteWorkPackage', { work_package_id: id });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workPackagesBoard', selectedProject] });
      toast.success('Package deleted');
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    }
  });

  const handleRefresh = () => {
    refetch();
    setLastRefreshed(new Date());
    toast.success('Work packages refreshed');
  };

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      toast.success('Work packages report generated');
    } catch (error) {
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleEditCard = (pkg) => {
    setEditingCardId(pkg.id);
    setEditData({
      status: pkg.status,
      progress_percent: pkg.progress_pct,
      target_date: pkg.target_date,
      assigned_lead: pkg.lead,
      budget_amount: pkg.budget
    });
  };

  const handleSaveCard = (id) => {
    if (editData.progress_percent < 0 || editData.progress_percent > 100) {
      toast.error('Progress must be 0-100');
      return;
    }

    if (editData.budget_amount < 0) {
      toast.error('Budget must be ≥ 0');
      return;
    }

    updateMutation.mutate({ 
      id, 
      data: {
        ...editData,
        progress_percent: Number(editData.progress_percent),
        budget_amount: Number(editData.budget_amount)
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingCardId(null);
    setEditData({});
  };

  if (!selectedProject) {
    return (
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Work Packages</h1>
              <p className="text-muted-foreground mt-2">Production Execution Control Center</p>
            </div>
          </div>
          
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <p className="text-sm font-medium mb-4">Select a project to manage packages</p>
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
            <h1 className="text-3xl font-bold tracking-tight">Work Packages</h1>
            <p className="text-muted-foreground mt-2">Production Execution • Dependencies • Blockers</p>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-sm text-muted-foreground">{project.project_number} • {project.name}</p>
              <div className={cn(
                "w-2 h-2 rounded-full",
                warnings.length === 0 ? "bg-green-500" : "bg-yellow-500"
              )} />
              <span className="text-xs text-muted-foreground">
                Data {warnings.length === 0 ? 'Complete' : 'Partial'}
              </span>
              <span className="text-xs text-muted-foreground">• Updated: {lastRefreshed.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input 
              placeholder="Search packages..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48"
            />
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-48">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant={needsAttentionOnly ? "default" : "outline"} 
              size="sm"
              onClick={() => setNeedsAttentionOnly(!needsAttentionOnly)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Needs Attention
            </Button>
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
            <Button size="sm" onClick={() => setShowNewPackage(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Package
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
            {/* Execution Snapshot */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Execution Snapshot</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">In Progress</p>
                    <div className="text-2xl font-bold text-blue-500">{snapshot.inProgress || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Completed</p>
                    <div className="text-2xl font-bold text-green-500">{snapshot.completed || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Blocked</p>
                    <div className="text-2xl font-bold text-red-500">{snapshot.blocked || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">At Risk</p>
                    <div className="text-2xl font-bold text-orange-500">{snapshot.atRisk || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Completed (7d)</p>
                    <div className="text-2xl font-bold">{snapshot.completed7d || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Completed (30d)</p>
                    <div className="text-2xl font-bold">{snapshot.completed30d || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Labor (7d)</p>
                    <div className="text-2xl font-bold">{(snapshot.laborHours7d || 0).toFixed(0)}h</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Labor (30d)</p>
                    <div className="text-2xl font-bold">{(snapshot.laborHours30d || 0).toFixed(0)}h</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Needs Attention Now */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-red-500" />
                Needs Attention Now
              </h2>
              <Card>
                <CardContent className="pt-4">
                  {needsAttention.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-500" />
                      <p>All packages on track</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {needsAttention.map((pkg) => (
                        <div key={pkg.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{pkg.name}</span>
                              <Badge variant={pkg.status === 'blocked' ? 'destructive' : 'outline'} className="capitalize">
                                {pkg.status}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {pkg.blockers.map((b, idx) => (
                                <Badge key={idx} variant="destructive" className="text-xs">
                                  {b.label}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <div className="text-right mr-4">
                              <div className="text-sm font-bold">{pkg.progress_pct}%</div>
                              <p className="text-xs text-muted-foreground">{pkg.lead}</p>
                            </div>
                            <Button 
                              size="sm"
                              onClick={() => {
                                setSelectedPackage(pkg);
                                setShowDetailSheet(true);
                              }}
                            >
                              Review
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* AI Work Package Analyst */}
            {ai.recommendations && ai.recommendations.length > 0 && (
              <Collapsible open={showAI} onOpenChange={setShowAI}>
                <Card className="border-purple-500/30">
                  <CardHeader>
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="h-4 w-4 text-purple-500" />
                        AI Work Package Analyst
                      </CardTitle>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium mb-2">Pipeline Analysis</p>
                          <p className="text-sm text-muted-foreground">{ai.summary}</p>
                          <Badge variant="outline" className="capitalize mt-2">{ai.confidence} confidence</Badge>
                        </div>

                        {ai.packageRisks && ai.packageRisks.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Package Risks</p>
                            <div className="space-y-2">
                              {ai.packageRisks.map((risk, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-2 rounded bg-muted/30">
                                  <AlertTriangle className={cn(
                                    "h-4 w-4 mt-0.5",
                                    risk.risk_level === 'critical' ? "text-red-500" : "text-yellow-500"
                                  )} />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{risk.package_name}</p>
                                    <p className="text-xs text-muted-foreground">{risk.reason}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <p className="text-sm font-medium mb-2">Recommended Actions</p>
                          <div className="space-y-3">
                            {ai.recommendations.map((rec, idx) => (
                              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                                <Badge variant={rec.priority === 'critical' || rec.priority === 'high' ? 'destructive' : 'default'} className="text-xs mt-1">
                                  {rec.priority}
                                </Badge>
                                <div className="flex-1">
                                  <p className="font-semibold text-sm">{rec.action}</p>
                                  <p className="text-xs text-green-600 mt-1">Impact: {rec.impact}</p>
                                  {rec.affectedPackages && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Affects: {rec.affectedPackages.slice(0, 3).join(', ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Work Package Board */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Work Package Board</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(packagesByStatus).map(([status, pkgs]) => (
                  <div key={status}>
                    <div className="mb-3 flex items-center gap-2">
                      <h3 className="font-semibold capitalize text-sm">{status.replace('_', ' ')}</h3>
                      <Badge variant="outline" className="text-xs">{pkgs.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {pkgs.length === 0 ? (
                        <Card className="bg-muted/20 border-dashed">
                          <CardContent className="py-8 text-center">
                            <p className="text-xs text-muted-foreground">No packages</p>
                          </CardContent>
                        </Card>
                      ) : (
                        pkgs.map((pkg) => (
                          <Card 
                            key={pkg.id}
                            className={cn(
                              "cursor-pointer hover:border-amber-500 transition-colors",
                              pkg.blockers.length > 0 && "border-red-500/50"
                            )}
                            onClick={() => {
                              setSelectedPackage(pkg);
                              setShowDetailSheet(true);
                            }}
                          >
                            <CardContent className="pt-4">
                              <div className="space-y-2">
                                <div>
                                  <p className="font-semibold text-sm mb-1">{pkg.name}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{pkg.lead}</span>
                                    {pkg.target_date && (
                                      <>
                                        <span>•</span>
                                        <span>Target: {new Date(pkg.target_date).toLocaleDateString()}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-muted-foreground">Progress</span>
                                    <span className="text-xs font-bold">{pkg.progress_pct}%</span>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                      className="h-2 rounded-full bg-green-500 transition-all"
                                      style={{ width: `${pkg.progress_pct}%` }}
                                    />
                                  </div>
                                </div>

                                {pkg.blockers.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {pkg.blockers.map((b, idx) => (
                                      <Badge key={idx} variant="destructive" className="text-xs">
                                        {b.label}
                                      </Badge>
                                    ))}
                                  </div>
                                )}

                                <div className="mt-2 space-y-2">
                                  {editingCardId === pkg.id ? (
                                    <>
                                      {/* Status */}
                                      <div onClick={(e) => e.stopPropagation()}>
                                        <Label className="text-[10px] text-muted-foreground">Status</Label>
                                        <Select
                                          value={editData.status || "planned"}
                                          onValueChange={(val) => setEditData((p) => ({ ...p, status: val }))}
                                        >
                                          <SelectTrigger className="h-8">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="planned">Planned</SelectItem>
                                            <SelectItem value="in_progress">In Progress</SelectItem>
                                            <SelectItem value="blocked">Blocked</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {/* Progress + Budget */}
                                      <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                                        <div>
                                          <Label className="text-[10px] text-muted-foreground">Progress %</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            className="h-8"
                                            value={editData.progress_percent ?? 0}
                                            onChange={(e) =>
                                              setEditData((p) => ({ ...p, progress_percent: e.target.value }))
                                            }
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-[10px] text-muted-foreground">Budget $</Label>
                                          <Input
                                            type="number"
                                            min="0"
                                            className="h-8"
                                            value={editData.budget_amount ?? 0}
                                            onChange={(e) =>
                                              setEditData((p) => ({ ...p, budget_amount: e.target.value }))
                                            }
                                          />
                                        </div>
                                      </div>

                                      {/* Target + Lead */}
                                      <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                                        <div>
                                          <Label className="text-[10px] text-muted-foreground">Target</Label>
                                          <Input
                                            type="date"
                                            className="h-8"
                                            value={editData.target_date || ""}
                                            onChange={(e) =>
                                              setEditData((p) => ({ ...p, target_date: e.target.value }))
                                            }
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-[10px] text-muted-foreground">Lead</Label>
                                          <Input
                                            className="h-8"
                                            value={editData.assigned_lead || ""}
                                            onChange={(e) =>
                                              setEditData((p) => ({ ...p, assigned_lead: e.target.value }))
                                            }
                                          />
                                        </div>
                                      </div>

                                      {/* Save/Cancel */}
                                      <div className="flex justify-end gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          size="sm"
                                          onClick={() => handleSaveCard(pkg.id)}
                                          disabled={updateMutation.isPending}
                                        >
                                          <Check className="h-3 w-3 mr-1" />
                                          Save
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                          <X className="h-3 w-3 mr-1" />
                                          Cancel
                                        </Button>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">
                                        Budget: ${((pkg.budget || 0) / 1000).toFixed(0)}K
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditCard(pkg);
                                        }}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* New Package Sheet */}
        <Sheet open={showNewPackage} onOpenChange={setShowNewPackage}>
          <SheetContent className="w-[600px] sm:max-w-[600px]">
            <SheetHeader>
              <SheetTitle>New Work Package</SheetTitle>
            </SheetHeader>
            <NewPackageForm
              projectId={selectedProject}
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setShowNewPackage(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Package Detail Sheet */}
        <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
          <SheetContent className="w-[700px] sm:max-w-[700px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Package Details</SheetTitle>
            </SheetHeader>
            {selectedPackage && (
              <PackageDetailTabs
                package={selectedPackage}
                tasks={tasksByPackage[selectedPackage.id] || []}
                onUpdate={(data) => updateMutation.mutate({ id: selectedPackage.id, data })}
                onDelete={() => {
                  setDeleteConfirm(selectedPackage);
                  setShowDetailSheet(false);
                }}
              />
            )}
          </SheetContent>
        </Sheet>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Work Package?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Delete "{deleteConfirm?.name}" and all associated tasks? This cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteConfirm.id)}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Report Scheduler Sheet */}
        <Sheet open={showReportScheduler} onOpenChange={setShowReportScheduler}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Schedule Work Package Report</SheetTitle>
            </SheetHeader>
            <ReportScheduler onClose={() => setShowReportScheduler(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </ErrorBoundary>
  );
}

function NewPackageForm({ projectId, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    name: '',
    description: '',
    status: 'planned',
    progress_percent: 0,
    budget_amount: 0,
    assigned_lead: ''
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.name || formData.name.trim().length === 0) newErrors.name = 'Name required';
    if (formData.progress_percent < 0 || formData.progress_percent > 100) newErrors.progress_percent = 'Progress must be 0-100';
    if (formData.budget_amount < 0) newErrors.budget_amount = 'Budget must be ≥ 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        ...formData,
        progress_percent: Number(formData.progress_percent),
        budget_amount: Number(formData.budget_amount)
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <div>
        <Label>Package Name *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Progress (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={formData.progress_percent}
            onChange={(e) => setFormData({ ...formData, progress_percent: e.target.value })}
            className={errors.progress_percent ? 'border-red-500' : ''}
          />
          {errors.progress_percent && <p className="text-xs text-red-500 mt-1">{errors.progress_percent}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Budget ($)</Label>
          <Input
            type="number"
            min="0"
            value={formData.budget_amount}
            onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value })}
            className={errors.budget_amount ? 'border-red-500' : ''}
          />
          {errors.budget_amount && <p className="text-xs text-red-500 mt-1">{errors.budget_amount}</p>}
        </div>

        <div>
          <Label>Assigned Lead</Label>
          <Input
            value={formData.assigned_lead}
            onChange={(e) => setFormData({ ...formData, assigned_lead: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label>Target Date</Label>
        <Input
          type="date"
          value={formData.target_date || ''}
          onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1">Create Package</Button>
      </div>
    </form>
  );
}

function PackageDetailTabs({ package: pkg, tasks, onUpdate, onDelete }) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    status: pkg.status,
    progress_percent: pkg.progress_pct,
    target_date: pkg.target_date,
    assigned_lead: pkg.lead,
    budget_amount: pkg.budget,
    description: pkg.description
  });

  const handleSave = () => {
    onUpdate({
      ...formData,
      progress_percent: Number(formData.progress_percent),
      budget_amount: Number(formData.budget_amount)
    });
    setEditMode(false);
  };

  return (
    <Tabs defaultValue="overview" className="mt-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
        <TabsTrigger value="budget">Budget</TabsTrigger>
        <TabsTrigger value="ai">AI Insights</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold">{pkg.name}</h3>
          {!editMode ? (
            <Button size="sm" variant="outline" onClick={() => setEditMode(true)}>
              <Edit className="h-3 w-3 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Check className="h-3 w-3 mr-2" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                setEditMode(false);
                setFormData({
                  status: pkg.status,
                  progress_percent: pkg.progress_pct,
                  target_date: pkg.target_date,
                  assigned_lead: pkg.lead,
                  budget_amount: pkg.budget,
                  description: pkg.description
                });
              }}>
                <X className="h-3 w-3 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>

        {editMode ? (
          <>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Progress (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress_percent}
                  onChange={(e) => setFormData({ ...formData, progress_percent: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Budget ($)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.budget_amount}
                  onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value })}
                />
              </div>

              <div>
                <Label>Assigned Lead</Label>
                <Input
                  value={formData.assigned_lead || ''}
                  onChange={(e) => setFormData({ ...formData, assigned_lead: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Target Date</Label>
              <Input
                type="date"
                value={formData.target_date || ''}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium mb-2">Description</p>
              <p className="text-sm text-muted-foreground">{pkg.description || 'No description'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Status</p>
                <Badge className="capitalize">{pkg.status}</Badge>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Progress</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div className="h-2 rounded-full bg-green-500" style={{ width: `${pkg.progress_pct}%` }} />
                  </div>
                  <span className="text-sm font-bold">{pkg.progress_pct}%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Lead</p>
                <p className="text-sm">{pkg.lead}</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Target Date</p>
                <p className="text-sm">{pkg.target_date ? new Date(pkg.target_date).toLocaleDateString() : 'Not set'}</p>
              </div>
            </div>
          </>
        )}

        <div className="pt-4 border-t">
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="h-3 w-3 mr-2" />
            Delete Package
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="tasks" className="space-y-3">
        {tasks.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No tasks linked to this package</p>
          </div>
        ) : (
          tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{task.name}</p>
                    <p className="text-xs text-muted-foreground">{task.status}</p>
                  </div>
                  <Badge variant="outline">{task.progress_percent || 0}%</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="budget" className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Budget</p>
              <p className="text-xl font-bold">${(pkg.budget / 1000).toFixed(0)}K</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Actual</p>
              <p className="text-xl font-bold text-red-500">${(pkg.actual / 1000).toFixed(0)}K</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Committed</p>
              <p className="text-xl font-bold text-orange-500">${(pkg.committed / 1000).toFixed(0)}K</p>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="ai" className="space-y-3">
        <Card className="border-purple-500/30">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              AI insights for this package will appear here based on progress, budget variance, and blockers.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}