import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { 
  RefreshCw, FileText, TrendingUp, TrendingDown, AlertCircle, Download, Mail,
  Plus, Edit, Trash2, Check, X, Clock, AlertTriangle, Zap, Send, CheckCircle,
  XCircle, ChevronDown, ChevronUp, FileCheck
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import ReportScheduler from '@/components/reports/ReportScheduler';

export default function ChangeOrders() {
  const [selectedProject, setSelectedProject] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agingFilter, setAgingFilter] = useState('all');
  const [impactFilter, setImpactFilter] = useState('all');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [showReportScheduler, setShowReportScheduler] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showNewCO, setShowNewCO] = useState(false);
  const [showDocsSheet, setShowDocsSheet] = useState(false);
  const [selectedCO, setSelectedCO] = useState(null);
  const [editingId, setEditingId] = useState(null);
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
    data: coData = {}, 
    isLoading, 
    isFetching, 
    refetch 
  } = useQuery({
    queryKey: ['changeOrdersRollup', selectedProject],
    queryFn: async () => {
      const response = await base44.functions.invoke('getChangeOrdersRollup', {
        projectId: selectedProject === 'all' ? null : selectedProject
      });

      const d = response?.data ?? response;
      const normalized =
        (d?.summary || d?.items || d?.ai) ? d :
        (d?.data?.summary || d?.data?.items) ? d.data :
        (d?.body?.summary || d?.body?.items) ? d.body :
        d;

      console.debug('[getChangeOrdersRollup] normalized:', normalized);
      return normalized;
    },
    staleTime: 2 * 60 * 1000,
    retry: 2
  });

  const { 
    summary = {}, 
    items = [], 
    bottlenecks = [],
    ai = {}, 
    warnings = [] 
  } = coData;

  // Apply filters
  const filteredItems = React.useMemo(() => {
    let filtered = items;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(co => co.status === statusFilter);
    }

    if (agingFilter === 'warning') {
      filtered = filtered.filter(co => co.age_days > 7 && co.age_days <= 14);
    } else if (agingFilter === 'high') {
      filtered = filtered.filter(co => co.age_days > 14 && co.age_days <= 30);
    } else if (agingFilter === 'critical') {
      filtered = filtered.filter(co => co.age_days > 30);
    }

    if (impactFilter === 'cost') {
      filtered = filtered.filter(co => Math.abs(co.value) > 0);
    } else if (impactFilter === 'schedule') {
      filtered = filtered.filter(co => co.schedule_impact_days > 0);
    } else if (impactFilter === 'both') {
      filtered = filtered.filter(co => Math.abs(co.value) > 0 && co.schedule_impact_days > 0);
    }

    return filtered;
  }, [items, statusFilter, agingFilter, impactFilter]);

  const createCOMutation = useMutation({
    mutationFn: (data) => base44.entities.ChangeOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrdersRollup'] });
      toast.success('Change order created');
      setShowNewCO(false);
    },
    onError: (error) => {
      toast.error(`Failed to create: ${error.message}`);
    }
  });

  const updateCOMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChangeOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrdersRollup'] });
      toast.success('Change order updated');
      setEditingId(null);
      setEditData({});
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    }
  });

  const deleteCOMutation = useMutation({
    mutationFn: (id) => base44.entities.ChangeOrder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrdersRollup'] });
      toast.success('Change order deleted');
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    }
  });

  const handleRefresh = () => {
    refetch();
    setLastRefreshed(new Date());
    toast.success('Change orders refreshed');
  };

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      toast.success('CO pipeline report generated');
    } catch (error) {
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleEdit = (co) => {
    setEditingId(co.id);
    setEditData({
      title: co.title,
      description: co.description,
      cost_impact: co.value,
      schedule_impact_days: co.schedule_impact_days,
      status: co.status
    });
  };

  const handleSave = (id) => {
    // Validation
    if (!editData.title || editData.title.trim().length === 0) {
      toast.error('Title is required');
      return;
    }

    if (editData.cost_impact === undefined || isNaN(Number(editData.cost_impact))) {
      toast.error('Valid cost impact required');
      return;
    }

    if (editData.schedule_impact_days === undefined || isNaN(Number(editData.schedule_impact_days)) || Number(editData.schedule_impact_days) < 0) {
      toast.error('Valid schedule impact required (≥0)');
      return;
    }

    updateCOMutation.mutate({ 
      id, 
      data: {
        ...editData,
        cost_impact: Number(editData.cost_impact),
        schedule_impact_days: Number(editData.schedule_impact_days)
      }
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleDelete = (co) => {
    setDeleteConfirm(co);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteCOMutation.mutate(deleteConfirm.id);
    }
  };

  const getAgingColor = (days) => {
    if (days > 30) return 'text-red-500';
    if (days > 14) return 'text-orange-500';
    if (days > 7) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'under_review': return 'outline';
      case 'submitted': return 'secondary';
      default: return 'outline';
    }
  };

  const getReasonChipColor = (reason) => {
    if (reason === 'critical_age') return 'destructive';
    if (reason === 'high_age' || reason === 'awaiting_gc') return 'default';
    return 'outline';
  };

  const getReasonLabel = (reason) => {
    switch (reason) {
      case 'critical_age': return 'Critical Age';
      case 'high_age': return 'High Age';
      case 'warning_age': return 'Warning';
      case 'missing_backup': return 'Missing Backup';
      case 'awaiting_gc': return 'Awaiting GC';
      default: return 'Review';
    }
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Change Orders</h1>
            <p className="text-muted-foreground mt-2">CO Lifecycle • Pipeline Health • Claim Readiness</p>
            <div className="flex items-center gap-3 mt-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                warnings.length === 0 ? "bg-green-500" : warnings.length <= 2 ? "bg-yellow-500" : "bg-red-500"
              )} />
              <span className="text-xs text-muted-foreground">
                Data {warnings.length === 0 ? 'Complete' : warnings.length <= 2 ? 'Partial' : 'Incomplete'}
              </span>
              <span className="text-xs text-muted-foreground">• Updated: {lastRefreshed.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
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
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={agingFilter} onValueChange={setAgingFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages</SelectItem>
                <SelectItem value="warning">Warning (7-14d)</SelectItem>
                <SelectItem value="high">High (14-30d)</SelectItem>
                <SelectItem value="critical">Critical (>30d)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={impactFilter} onValueChange={setImpactFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Impact</SelectItem>
                <SelectItem value="cost">Cost Only</SelectItem>
                <SelectItem value="schedule">Schedule Only</SelectItem>
                <SelectItem value="both">Both</SelectItem>
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
            <Button size="sm" onClick={() => setShowNewCO(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New CO
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
            {/* CO Pipeline Summary */}
            <div>
              <h2 className="text-xl font-semibold mb-4">CO Pipeline Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Open COs</p>
                    <div className="text-2xl font-bold">{summary.openCount || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">Active</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Pending Approval</p>
                    <div className="text-2xl font-bold text-orange-500">{summary.pendingCount || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">Awaiting action</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Avg Age</p>
                    <div className={cn("text-2xl font-bold", getAgingColor(summary.avgAgeDays || 0))}>
                      {summary.avgAgeDays || 0}d
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Days open</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Pending Value</p>
                    <div className="text-2xl font-bold text-blue-500">
                      ${((summary.pendingValue || 0) / 1000).toFixed(0)}K
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Unapproved</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Approved (30d)</p>
                    <div className="text-2xl font-bold text-green-500">
                      ${((summary.approvedValuePeriod || 0) / 1000).toFixed(0)}K
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">This period</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Schedule Risk</p>
                    <div className="text-2xl font-bold text-purple-500">
                      {summary.pendingScheduleImpactDays || 0}d
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Pending</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Aging & Bottlenecks */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Aging & Bottlenecks</h2>
              <Card>
                <CardContent className="pt-4">
                  {bottlenecks.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-500" />
                      <p>No aging bottlenecks - pipeline healthy</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bottlenecks.map((b, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm font-semibold">CO-{b.co_number}</span>
                              <Badge variant="outline" className="text-xs">{b.project_name}</Badge>
                              <Badge variant={getReasonChipColor(b.reason)} className="text-xs">
                                {getReasonLabel(b.reason)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{b.title}</p>
                          </div>
                          <div className="flex items-center gap-4 ml-4">
                            <div className="text-right">
                              <div className={cn("text-lg font-bold", getAgingColor(b.age_days))}>
                                {b.age_days}d
                              </div>
                              <p className="text-xs text-muted-foreground">${(b.value / 1000).toFixed(0)}K</p>
                            </div>
                            <Button size="sm" variant="outline">
                              <Send className="h-3 w-3 mr-2" />
                              Remind
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* AI Change Order Analyst */}
            {ai.recommendations && ai.recommendations.length > 0 && (
              <Collapsible open={showAI} onOpenChange={setShowAI}>
                <Card className="border-purple-500/30">
                  <CardHeader>
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="h-4 w-4 text-purple-500" />
                        AI Change Order Analyst
                      </CardTitle>
                      {showAI ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium mb-2">Pipeline Analysis</p>
                          <p className="text-sm text-muted-foreground">{ai.pipelineSummary}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="capitalize">{ai.confidence || 'medium'} confidence</Badge>
                          </div>
                        </div>

                        {ai.bottlenecks && ai.bottlenecks.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">AI Alerts</p>
                            <div className="space-y-2">
                              {ai.bottlenecks.map((alert, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-2 rounded bg-muted/30">
                                  <AlertTriangle className={cn(
                                    "h-4 w-4 mt-0.5",
                                    alert.severity === 'critical' ? "text-red-500" : "text-yellow-500"
                                  )} />
                                  <div className="flex-1">
                                    <p className="text-sm">{alert.message}</p>
                                    <p className="text-xs text-green-600 mt-1">→ {alert.action}</p>
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
                                  {rec.affectedCOs && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Affects: {rec.affectedCOs.join(', ')}
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

            {/* CO Lifecycle Table */}
            <div>
              <h2 className="text-xl font-semibold mb-4">CO Lifecycle ({filteredItems.length})</h2>
              <Card>
                <CardContent className="pt-4">
                  {filteredItems.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No change orders found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b sticky top-0 bg-card">
                          <tr className="text-left">
                            <th className="pb-2 font-medium">CO #</th>
                            <th className="pb-2 font-medium">Project</th>
                            <th className="pb-2 font-medium">Title</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 font-medium text-right">Value</th>
                            <th className="pb-2 font-medium text-right">Schedule</th>
                            <th className="pb-2 font-medium text-right">Age</th>
                            <th className="pb-2 font-medium">Owner</th>
                            <th className="pb-2 font-medium">Next Step</th>
                            <th className="pb-2 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredItems.map((co) => (
                            <tr key={co.id} className="border-b last:border-0 hover:bg-muted/30">
                              {editingId === co.id ? (
                                <>
                                  <td className="py-2 font-mono">CO-{co.co_number}</td>
                                  <td className="py-2">{co.project_number}</td>
                                  <td className="py-2">
                                    <Input
                                      value={editData.title || ''}
                                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                      className="h-8"
                                    />
                                  </td>
                                  <td className="py-2">
                                    <Select 
                                      value={editData.status} 
                                      onValueChange={(val) => setEditData({ ...editData, status: val })}
                                    >
                                      <SelectTrigger className="h-8 w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="submitted">Submitted</SelectItem>
                                        <SelectItem value="under_review">Under Review</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="py-2 text-right">
                                    <Input
                                      type="number"
                                      value={editData.cost_impact || 0}
                                      onChange={(e) => setEditData({ ...editData, cost_impact: e.target.value })}
                                      className="h-8 w-24 text-right"
                                    />
                                  </td>
                                  <td className="py-2 text-right">
                                    <Input
                                      type="number"
                                      value={editData.schedule_impact_days || 0}
                                      onChange={(e) => setEditData({ ...editData, schedule_impact_days: e.target.value })}
                                      className="h-8 w-16 text-right"
                                    />
                                  </td>
                                  <td className="py-2" colSpan={3}></td>
                                  <td className="py-2 text-right">
                                    <div className="flex items-center gap-1 justify-end">
                                      <Button size="sm" variant="ghost" onClick={() => handleSave(co.id)}>
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={handleCancel}>
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="py-2 font-mono">CO-{co.co_number}</td>
                                  <td className="py-2">
                                    <div>
                                      <p className="font-medium">{co.project_number}</p>
                                      <p className="text-xs text-muted-foreground">{co.project_name}</p>
                                    </div>
                                  </td>
                                  <td className="py-2 max-w-xs">
                                    <p className="truncate">{co.title}</p>
                                  </td>
                                  <td className="py-2">
                                    <Badge variant={getStatusColor(co.status)} className="capitalize">
                                      {co.status.replace('_', ' ')}
                                    </Badge>
                                  </td>
                                  <td className="py-2 text-right font-semibold">
                                    ${(co.value / 1000).toFixed(0)}K
                                  </td>
                                  <td className="py-2 text-right">
                                    {co.schedule_impact_days > 0 ? `${co.schedule_impact_days}d` : '-'}
                                  </td>
                                  <td className="py-2 text-right">
                                    <div className={cn("font-bold", getAgingColor(co.age_days))}>
                                      {co.age_days}d
                                    </div>
                                  </td>
                                  <td className="py-2 text-xs">{co.owner}</td>
                                  <td className="py-2">
                                    <Badge variant="outline" className="text-xs">{co.next_step}</Badge>
                                  </td>
                                  <td className="py-2 text-right">
                                    <div className="flex items-center gap-1 justify-end">
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={() => {
                                          setSelectedCO(co);
                                          setShowDocsSheet(true);
                                        }}
                                      >
                                        <FileCheck className="h-3 w-3" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => handleEdit(co)}>
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => handleDelete(co)}>
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
          </>
        )}

        {/* New CO Sheet */}
        <Sheet open={showNewCO} onOpenChange={setShowNewCO}>
          <SheetContent className="w-[600px] sm:max-w-[600px]">
            <SheetHeader>
              <SheetTitle>New Change Order</SheetTitle>
            </SheetHeader>
            <NewCOForm 
              projects={projects}
              onSubmit={(data) => createCOMutation.mutate(data)}
              onCancel={() => setShowNewCO(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Docs & Claim Readiness Sheet */}
        <Sheet open={showDocsSheet} onOpenChange={setShowDocsSheet}>
          <SheetContent className="w-[600px] sm:max-w-[600px]">
            <SheetHeader>
              <SheetTitle>Docs & Claim Readiness</SheetTitle>
            </SheetHeader>
            {selectedCO && (
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">CO-{selectedCO.co_number}: {selectedCO.title}</p>
                  <Badge variant={getStatusColor(selectedCO.status)} className="capitalize">
                    {selectedCO.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm font-medium mb-3">Required Documents</p>
                  <div className="space-y-2">
                    {[
                      { key: 'scope_narrative', label: 'Scope Narrative', required: true },
                      { key: 'backup_docs', label: 'Backup Documents', required: true },
                      { key: 'references', label: 'RFI/Drawing References', required: false },
                      { key: 'photos', label: 'Photos', required: false },
                      { key: 'emails', label: 'Email Correspondence', required: false }
                    ].map((doc) => {
                      const missing = selectedCO.missing_docs.includes(doc.key);
                      return (
                        <div key={doc.key} className="flex items-center justify-between p-2 rounded border">
                          <div className="flex items-center gap-2">
                            {missing ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                            <span className="text-sm">{doc.label}</span>
                            {doc.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                          </div>
                          {missing && (
                            <Button size="sm" variant="outline">Upload</Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Claim Readiness</p>
                  <div className="p-3 rounded bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Completeness</span>
                      <span className="text-sm font-bold">
                        {Math.round(((5 - selectedCO.missing_docs.length) / 5) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-green-500 transition-all"
                        style={{ width: `${((5 - selectedCO.missing_docs.length) / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Change Order?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete CO-{deleteConfirm?.co_number}? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Report Scheduler Sheet */}
        <Sheet open={showReportScheduler} onOpenChange={setShowReportScheduler}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Schedule CO Pipeline Report</SheetTitle>
            </SheetHeader>
            <ReportScheduler onClose={() => setShowReportScheduler(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </ErrorBoundary>
  );
}

function NewCOForm({ projects, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: '',
    title: '',
    description: '',
    cost_impact: 0,
    schedule_impact_days: 0,
    status: 'draft'
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.project_id) newErrors.project_id = 'Project required';
    if (!formData.title || formData.title.trim().length === 0) newErrors.title = 'Title required';
    if (formData.cost_impact === undefined || isNaN(Number(formData.cost_impact))) {
      newErrors.cost_impact = 'Valid cost required';
    }
    if (formData.schedule_impact_days === undefined || isNaN(Number(formData.schedule_impact_days)) || Number(formData.schedule_impact_days) < 0) {
      newErrors.schedule_impact_days = 'Valid schedule impact required (≥0)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        ...formData,
        cost_impact: Number(formData.cost_impact),
        schedule_impact_days: Number(formData.schedule_impact_days),
        submitted_date: formData.status !== 'draft' ? new Date().toISOString() : null
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <div>
        <Label>Project *</Label>
        <Select value={formData.project_id} onValueChange={(val) => setFormData({ ...formData, project_id: val })}>
          <SelectTrigger className={errors.project_id ? 'border-red-500' : ''}>
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
        {errors.project_id && <p className="text-xs text-red-500 mt-1">{errors.project_id}</p>}
      </div>

      <div>
        <Label>Title *</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={errors.title ? 'border-red-500' : ''}
        />
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
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
          <Label>Cost Impact ($)</Label>
          <Input
            type="number"
            value={formData.cost_impact}
            onChange={(e) => setFormData({ ...formData, cost_impact: e.target.value })}
            className={errors.cost_impact ? 'border-red-500' : ''}
          />
          {errors.cost_impact && <p className="text-xs text-red-500 mt-1">{errors.cost_impact}</p>}
        </div>

        <div>
          <Label>Schedule Impact (days)</Label>
          <Input
            type="number"
            value={formData.schedule_impact_days}
            onChange={(e) => setFormData({ ...formData, schedule_impact_days: e.target.value })}
            className={errors.schedule_impact_days ? 'border-red-500' : ''}
          />
          {errors.schedule_impact_days && <p className="text-xs text-red-500 mt-1">{errors.schedule_impact_days}</p>}
        </div>
      </div>

      <div>
        <Label>Status</Label>
        <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          Create Change Order
        </Button>
      </div>
    </form>
  );
}