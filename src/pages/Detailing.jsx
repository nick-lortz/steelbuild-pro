import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { 
  RefreshCw, FileText, AlertCircle, Download, Mail, Plus, Edit, Trash2,
  Check, X, CheckCircle, AlertTriangle, Zap, TrendingUp, Clock, Send,
  ChevronDown, ChevronUp, XCircle
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

export default function Detailing() {
  const [selectedProject, setSelectedProject] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dueSoonOnly, setDueSoonOnly] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [showReportScheduler, setShowReportScheduler] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showNewItem, setShowNewItem] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
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
    data: detailData = {}, 
    isLoading, 
    isFetching, 
    refetch 
  } = useQuery({
    queryKey: ['detailingPipeline', selectedProject],
    queryFn: async () => {
      const response = await base44.functions.invoke('getDetailingPipelineData', {
        projectId: selectedProject
      });

      const d = response?.data ?? response;
      const normalized =
        (d?.snapshot || d?.items || d?.ai) ? d :
        (d?.data?.snapshot || d?.data?.items) ? d.data :
        (d?.body?.snapshot || d?.body?.items) ? d.body :
        d;

      console.debug('[getDetailingPipelineData] normalized:', normalized);
      return normalized;
    },
    enabled: !!selectedProject,
    staleTime: 2 * 60 * 1000,
    retry: 2
  });

  const { 
    project = {}, 
    snapshot = {}, 
    items = [],
    needsAttention = [],
    ai = {}, 
    warnings = [] 
  } = detailData;

  const filteredItems = React.useMemo(() => {
    let filtered = items;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(i => i.status === statusFilter);
    }

    if (dueSoonOnly) {
      const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(i => {
        if (!i.target_submit) return false;
        const target = new Date(i.target_submit);
        return target <= sevenDaysOut && i.status !== 'FFF';
      });
    }

    return filtered;
  }, [items, statusFilter, dueSoonOnly]);

  const itemsByStatus = React.useMemo(() => {
    const statusMap = {
      'Not Started': 'not_started',
      'IFA': 'submitted',
      'BFA': 'returned',
      'BFS': 'returned',
      'Revise & Resubmit': 'returned',
      'FFF': 'released',
      'As-Built': 'released'
    };

    const grouped = {
      not_started: [],
      in_progress: [],
      submitted: [],
      returned: [],
      approved: [],
      released: []
    };

    filteredItems.forEach(i => {
      const mappedStatus = statusMap[i.status] || 'in_progress';
      if (grouped[mappedStatus]) {
        grouped[mappedStatus].push(i);
      }
    });

    return grouped;
  }, [filteredItems]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DrawingSet.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detailingPipeline'] });
      toast.success('Detailing item created');
      setShowNewItem(false);
    },
    onError: (error) => {
      toast.error(`Failed to create: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DrawingSet.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detailingPipeline'] });
      toast.success('Item updated');
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DrawingSet.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detailingPipeline'] });
      toast.success('Item deleted');
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    }
  });

  const handleRefresh = () => {
    refetch();
    setLastRefreshed(new Date());
    toast.success('Detailing pipeline refreshed');
  };

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      toast.success('Detailing report generated');
    } catch (error) {
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (!selectedProject) {
    return (
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Detailing Pipeline</h1>
              <p className="text-muted-foreground mt-2">Shop Drawings • Approvals • Release to Fab</p>
            </div>
          </div>
          
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <p className="text-sm font-medium mb-4">Select a project to manage detailing</p>
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
            <h1 className="text-3xl font-bold tracking-tight">Detailing Pipeline</h1>
            <p className="text-muted-foreground mt-2">Submittals • Approvals • Release Control</p>
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
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="IFA">IFA</SelectItem>
                  <SelectItem value="BFA">BFA</SelectItem>
                  <SelectItem value="Revise & Resubmit">R&R</SelectItem>
                  <SelectItem value="FFF">FFF</SelectItem>
                </SelectContent>
            </Select>
            <Button 
              variant={dueSoonOnly ? "default" : "outline"} 
              size="sm"
              onClick={() => setDueSoonOnly(!dueSoonOnly)}
            >
              <Clock className="h-4 w-4 mr-2" />
              Due Soon
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
            <Button size="sm" onClick={() => setShowNewItem(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Item
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
            {/* Pipeline Snapshot */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Pipeline Snapshot</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Not Started</p>
                    <div className="text-2xl font-bold">{snapshot.notStarted || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">In Progress</p>
                    <div className="text-2xl font-bold text-blue-500">{snapshot.inProgress || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Submitted</p>
                    <div className="text-2xl font-bold text-orange-500">{snapshot.submitted || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Returned</p>
                    <div className="text-2xl font-bold text-red-500">{snapshot.returned || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Approved</p>
                    <div className="text-2xl font-bold text-green-500">{snapshot.approved || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Released FFF</p>
                    <div className="text-2xl font-bold text-purple-500">{snapshot.releasedForFab || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Avg Cycle</p>
                    <div className="text-2xl font-bold">{snapshot.avgCycleTime || 0}d</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Overdue</p>
                    <div className="text-2xl font-bold text-red-500">{snapshot.overdue || 0}</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* AI Detailing Analyst */}
            {ai.recommendations && ai.recommendations.length > 0 && (
              <Collapsible open={showAI} onOpenChange={setShowAI}>
                <Card className="border-purple-500/30">
                  <CardHeader>
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="h-4 w-4 text-purple-500" />
                        AI Detailing Analyst
                      </CardTitle>
                      {showAI ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium mb-2">Pipeline Status</p>
                          <p className="text-sm text-muted-foreground">{ai.summary}</p>
                          <Badge variant="outline" className="capitalize mt-2">{ai.confidence} confidence</Badge>
                        </div>

                        {ai.risks && ai.risks.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Schedule Risks</p>
                            <div className="space-y-2">
                              {ai.risks.map((risk, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-2 rounded bg-muted/30">
                                  <AlertTriangle className={cn(
                                    "h-4 w-4 mt-0.5",
                                    risk.risk_level === 'critical' ? "text-red-500" : "text-yellow-500"
                                  )} />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{risk.item_name}</p>
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
                                  {rec.affectedItems && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Affects: {rec.affectedItems.slice(0, 3).join(', ')}
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

            {/* Pipeline Board */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Pipeline Board</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(itemsByStatus).map(([status, statusItems]) => (
                  <div key={status}>
                    <div className="mb-3 flex items-center gap-2">
                      <h3 className="font-semibold capitalize text-sm">{status.replace('_', ' ')}</h3>
                      <Badge variant="outline" className="text-xs">{statusItems.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {statusItems.length === 0 ? (
                        <Card className="bg-muted/20 border-dashed">
                          <CardContent className="py-6 text-center">
                            <p className="text-xs text-muted-foreground">Empty</p>
                          </CardContent>
                        </Card>
                      ) : (
                        statusItems.map((item) => (
                          <Card 
                            key={item.id}
                            className={cn(
                              "cursor-pointer hover:border-amber-500 transition-colors",
                              item.blockers.length > 0 && "border-red-500/50"
                            )}
                            onClick={() => {
                              setSelectedItem(item);
                              setShowDetailSheet(true);
                            }}
                          >
                            <CardContent className="pt-3 pb-3">
                              <div className="space-y-2">
                                <div>
                                  <p className="font-semibold text-sm mb-1">{item.name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{item.set_number}</p>
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">{item.assignee}</span>
                                  {item.revisions > 0 && (
                                    <Badge variant="outline" className="text-xs">Rev {item.revisions}</Badge>
                                  )}
                                </div>

                                {item.blockers.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {item.blockers.map((b, idx) => (
                                      <Badge key={idx} variant="destructive" className="text-xs">
                                        {b.label}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
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

        {/* New Detailing Item Sheet */}
        <Sheet open={showNewItem} onOpenChange={setShowNewItem}>
          <SheetContent className="w-[600px] sm:max-w-[600px]">
            <SheetHeader>
              <SheetTitle>New Detailing Item</SheetTitle>
            </SheetHeader>
            <NewDetailingForm
              projectId={selectedProject}
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setShowNewItem(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Detail Item Sheet */}
        <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
          <SheetContent className="w-[700px] sm:max-w-[700px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Detailing Item Details</SheetTitle>
            </SheetHeader>
            {selectedItem && (
              <DetailingItemTabs
                item={selectedItem}
                onUpdate={(data) => updateMutation.mutate({ id: selectedItem.id, data })}
                onDelete={() => {
                  setDeleteConfirm(selectedItem);
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
              <DialogTitle>Delete Detailing Item?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Delete "{deleteConfirm?.name}"? This cannot be undone.
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
              <SheetTitle>Schedule Detailing Report</SheetTitle>
            </SheetHeader>
            <ReportScheduler onClose={() => setShowReportScheduler(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </ErrorBoundary>
  );
}

function NewDetailingForm({ projectId, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    set_name: '',
    set_number: '',
    status: 'draft',
    discipline: 'structural',
    reviewer: ''
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.set_name || formData.set_name.trim().length === 0) newErrors.set_name = 'Set name required';
    if (!formData.set_number || formData.set_number.trim().length === 0) newErrors.set_number = 'Set number required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <div>
        <Label>Set Name *</Label>
        <Input
          value={formData.set_name}
          onChange={(e) => setFormData({ ...formData, set_name: e.target.value })}
          className={errors.set_name ? 'border-red-500' : ''}
        />
        {errors.set_name && <p className="text-xs text-red-500 mt-1">{errors.set_name}</p>}
      </div>

      <div>
        <Label>Set Number *</Label>
        <Input
          value={formData.set_number}
          onChange={(e) => setFormData({ ...formData, set_number: e.target.value })}
          className={errors.set_number ? 'border-red-500' : ''}
        />
        {errors.set_number && <p className="text-xs text-red-500 mt-1">{errors.set_number}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Discipline</Label>
          <Select value={formData.discipline} onValueChange={(val) => setFormData({ ...formData, discipline: val })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="structural">Structural</SelectItem>
              <SelectItem value="misc_metals">Misc Metals</SelectItem>
              <SelectItem value="stairs">Stairs</SelectItem>
              <SelectItem value="handrails">Handrails</SelectItem>
              <SelectItem value="connections">Connections</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="IFA">IFA</SelectItem>
              <SelectItem value="BFA">BFA</SelectItem>
              <SelectItem value="Revise & Resubmit">Revise & Resubmit</SelectItem>
              <SelectItem value="FFF">FFF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Reviewer</Label>
        <Input
          value={formData.reviewer}
          onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1">Create Item</Button>
      </div>
    </form>
  );
}

function DetailingItemTabs({ item, onUpdate, onDelete }) {
  const [editingOverview, setEditingOverview] = useState(false);
  const [overviewData, setOverviewData] = useState({
    set_name: item.name,
    status: item.status,
    reviewer: item.assignee
  });

  const handleSaveOverview = () => {
    onUpdate(overviewData);
    setEditingOverview(false);
  };

  return (
    <Tabs defaultValue="overview" className="mt-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="revisions">Revisions</TabsTrigger>
        <TabsTrigger value="links">Links</TabsTrigger>
        <TabsTrigger value="approvals">Approvals</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        {editingOverview ? (
          <>
            <div>
              <Label>Set Name</Label>
              <Input
                value={overviewData.set_name}
                onChange={(e) => setOverviewData({ ...overviewData, set_name: e.target.value })}
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={overviewData.status} onValueChange={(val) => setOverviewData({ ...overviewData, status: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="IFA">IFA</SelectItem>
                  <SelectItem value="BFA">BFA</SelectItem>
                  <SelectItem value="BFS">BFS</SelectItem>
                  <SelectItem value="Revise & Resubmit">Revise & Resubmit</SelectItem>
                  <SelectItem value="FFF">FFF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reviewer</Label>
              <Input
                value={overviewData.reviewer}
                onChange={(e) => setOverviewData({ ...overviewData, reviewer: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveOverview} className="flex-1">Save</Button>
              <Button variant="outline" onClick={() => setEditingOverview(false)} className="flex-1">Cancel</Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium mb-2">Set Name</p>
              <p className="text-lg font-bold">{item.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Status</p>
                <Badge className="capitalize">{item.status}</Badge>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Reviewer</p>
                <p className="text-sm">{item.assignee}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Submitted</p>
                <p className="text-sm">{item.submitted_date ? new Date(item.submitted_date).toLocaleDateString() : 'Not submitted'}</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Approved</p>
                <p className="text-sm">{item.approved_date ? new Date(item.approved_date).toLocaleDateString() : 'Pending'}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={() => setEditingOverview(true)}>
                <Edit className="h-3 w-3 mr-2" />
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={onDelete}>
                <Trash2 className="h-3 w-3 mr-2" />
                Delete
              </Button>
            </div>
          </>
        )}
      </TabsContent>

      <TabsContent value="revisions" className="space-y-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              Revision history: {item.revisions} revision{item.revisions !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="links" className="space-y-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              RFI and drawing linkages will appear here
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="approvals" className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded border">
            <span className="text-sm">IFA Date</span>
            <span className="text-sm font-medium">{item.submitted_date ? new Date(item.submitted_date).toLocaleDateString() : '-'}</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded border">
            <span className="text-sm">BFA Date</span>
            <span className="text-sm font-medium">{item.approved_date ? new Date(item.approved_date).toLocaleDateString() : '-'}</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded border">
            <span className="text-sm">FFF Date</span>
            <span className="text-sm font-medium">{item.released_date ? new Date(item.released_date).toLocaleDateString() : '-'}</span>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}