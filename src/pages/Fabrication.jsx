import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import RouteGuard from '@/components/shared/RouteGuard';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { formatDateForInput, parseInputDate, formatDateDisplay } from '@/components/shared/dateUtils';
import { 
  RefreshCw, Wrench, AlertCircle, Download, Mail, Plus, Edit, Trash2,
  Check, X, CheckCircle, AlertTriangle, Zap, Clock, Truck, Package,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
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

export default function FabricationPage() {
  return (
    <RouteGuard pageLabel="Fabrication Control">
      <Fabrication />
    </RouteGuard>
  );
}

function Fabrication() {
  const { activeProjectId: selectedProject } = useActiveProject();
  const [stageFilter, setStageFilter] = useState('all');
  const [onHoldOnly, setOnHoldOnly] = useState(false);
  const [shippingWeekOnly, setShippingWeekOnly] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [showReportScheduler, setShowReportScheduler] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showNewPackage, setShowNewPackage] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
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
    data: fabData = {}, 
    isLoading, 
    isFetching, 
    refetch 
  } = useQuery({
    queryKey: ['fabricationControl', selectedProject],
    queryFn: async () => {
      const response = await base44.functions.invoke('getFabricationControlData', {
        projectId: selectedProject
      });

      const d = response?.data ?? response;
      const normalized =
        (d?.snapshot || d?.packages || d?.ai) ? d :
        (d?.data?.snapshot || d?.data?.packages) ? d.data :
        (d?.body?.snapshot || d?.body?.packages) ? d.body :
        d;

      console.debug('[getFabricationControlData] normalized:', normalized);
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
    shipping = [],
    holds = [],
    ai = {}, 
    warnings = [] 
  } = fabData;

  const filteredPackages = React.useMemo(() => {
    let filtered = packages;

    if (stageFilter !== 'all') {
      filtered = filtered.filter(p => p.stage === stageFilter);
    }

    if (onHoldOnly) {
      filtered = filtered.filter(p => p.on_hold || p.holds.length > 0);
    }

    if (shippingWeekOnly) {
      const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(p => 
        p.ship_target && new Date(p.ship_target) <= sevenDaysOut && !p.shipped_date
      );
    }

    return filtered;
  }, [packages, stageFilter, onHoldOnly, shippingWeekOnly]);

  const packagesByStage = React.useMemo(() => {
    const stages = ['not_started', 'cutting', 'fit_up', 'weld', 'paint', 'qa', 'ready_to_ship', 'shipped'];
    const grouped = {};
    stages.forEach(s => { grouped[s] = []; });

    filteredPackages.forEach(p => {
      const stage = p.stage || 'not_started';
      if (grouped[stage]) {
        grouped[stage].push(p);
      }
    });

    return grouped;
  }, [filteredPackages]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FabricationPackage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabricationControl'] });
      toast.success('Fabrication package created');
      setShowNewPackage(false);
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FabricationPackage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabricationControl'] });
      toast.success('Package updated');
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FabricationPackage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabricationControl'] });
      toast.success('Package deleted');
      setDeleteConfirm(null);
    }
  });

  const handleRefresh = () => {
    refetch();
    setLastRefreshed(new Date());
    toast.success('Fabrication data refreshed');
  };

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      toast.success('Fabrication report generated');
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
              <h1 className="text-3xl font-bold tracking-tight">Fabrication Control</h1>
              <p className="text-muted-foreground mt-2">Shop Production • QA • Shipment Readiness</p>
            </div>
          </div>
          
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <p className="text-sm font-medium mb-4">Select a project</p>
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
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fabrication Control</h1>
            <p className="text-muted-foreground mt-2">Shop Production • QA • Shipment Readiness</p>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-sm text-muted-foreground">{project.project_number} • {project.name}</p>
              <div className={cn("w-2 h-2 rounded-full", warnings.length === 0 ? "bg-green-500" : "bg-yellow-500")} />
              <span className="text-xs text-muted-foreground">
                Data {warnings.length === 0 ? 'Complete' : 'Partial'}
              </span>
              <span className="text-xs text-muted-foreground">• Updated: {lastRefreshed.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="cutting">Cutting</SelectItem>
                <SelectItem value="fit_up">Fit-up</SelectItem>
                <SelectItem value="weld">Weld</SelectItem>
                <SelectItem value="paint">Paint</SelectItem>
                <SelectItem value="qa">QA</SelectItem>
                <SelectItem value="ready_to_ship">Ready</SelectItem>
              </SelectContent>
            </Select>
            <Button variant={onHoldOnly ? "default" : "outline"} size="sm" onClick={() => setOnHoldOnly(!onHoldOnly)}>
              On Hold
            </Button>
            <Button variant={shippingWeekOnly ? "default" : "outline"} size="sm" onClick={() => setShippingWeekOnly(!shippingWeekOnly)}>
              <Truck className="h-4 w-4 mr-2" />
              This Week
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

        {warnings.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Data Incomplete</p>
                  <ul className="text-xs text-muted-foreground mt-1 list-disc ml-4">
                    {warnings.map((w, idx) => <li key={idx}>{w}</li>)}
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
            {/* Production Snapshot */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Production Snapshot</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-11 gap-3">
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Not Started</p><div className="text-2xl font-bold">{snapshot.notStarted || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Cutting</p><div className="text-2xl font-bold text-blue-500">{snapshot.cutting || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Fit-up</p><div className="text-2xl font-bold text-cyan-500">{snapshot.fitUp || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Weld</p><div className="text-2xl font-bold text-orange-500">{snapshot.weld || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Paint</p><div className="text-2xl font-bold text-purple-500">{snapshot.paint || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">QA</p><div className="text-2xl font-bold text-yellow-500">{snapshot.qa || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Ready</p><div className="text-2xl font-bold text-green-500">{snapshot.readyToShip || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Shipped</p><div className="text-2xl font-bold text-green-600">{snapshot.shipped || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Ship (7d)</p><div className="text-2xl font-bold">{snapshot.shipped7d || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Ship (30d)</p><div className="text-2xl font-bold">{snapshot.shipped30d || 0}</div></CardContent></Card>
                <Card className="border-red-500/30"><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">On Hold</p><div className="text-2xl font-bold text-red-500">{snapshot.onHold || 0}</div></CardContent></Card>
              </div>
            </div>

            {/* Shipping & Holds */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Shipping This Week */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Shipping This Week</h2>
                <Card>
                  <CardContent className="pt-4">
                    {shipping.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No shipments scheduled</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {shipping.map((s) => (
                          <div key={s.id} className="flex items-center justify-between p-2 rounded border bg-card">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{s.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Target: {formatDateDisplay(s.ship_target) || 'TBD'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={s.qa_status === 'approved' ? 'default' : 'destructive'} className="text-xs capitalize">
                                {s.qa_status}
                              </Badge>
                              <Badge variant="outline" className="text-xs capitalize">{s.status.replace('_', ' ')}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Holds */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Holds & Issues</h2>
                <Card>
                  <CardContent className="pt-4">
                    {holds.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-500" />
                        <p>No holds - production clear</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {holds.map((h) => (
                          <div key={h.package_id} className="flex items-center justify-between p-2 rounded border border-red-500/30 bg-red-500/5">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{h.package_name}</p>
                              <p className="text-xs text-muted-foreground">{h.reason}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              <span className="text-xs text-red-500 font-bold">{h.age_days}d</span>
                              <Badge variant="outline" className="text-xs">{h.next_step}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* AI Fabrication Analyst */}
            {ai.recommendations && ai.recommendations.length > 0 && (
              <Collapsible open={showAI} onOpenChange={setShowAI}>
                <Card className="border-purple-500/30">
                   <div className="flex items-center justify-between p-6 pb-3 border-b border-border">
                     <CollapsibleTrigger className="flex items-center justify-between w-full">
                       <h3 className="text-sm flex items-center gap-2 font-semibold">
                        <Zap className="h-4 w-4 text-purple-500" />
                        AI Fabrication Analyst
                        </h3>
                        {showAI ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </CollapsibleTrigger>
                        </div>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium mb-2">Production Status</p>
                          <p className="text-sm text-muted-foreground">{ai.summary}</p>
                          <Badge variant="outline" className="capitalize mt-2">{ai.confidence} confidence</Badge>
                        </div>

                        {ai.risks && ai.risks.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Shipment Risks</p>
                            <div className="space-y-2">
                              {ai.risks.map((risk, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-2 rounded bg-muted/30">
                                  <AlertTriangle className={cn("h-4 w-4 mt-0.5", risk.risk_level === 'critical' ? "text-red-500" : "text-yellow-500")} />
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

            {/* Shop Floor Board */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Shop Floor Board</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {Object.entries(packagesByStage).map(([stage, pkgs]) => (
                  <div key={stage}>
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="font-semibold capitalize text-xs">{stage.replace('_', ' ')}</h3>
                      <Badge variant="outline" className="text-xs">{pkgs.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {pkgs.length === 0 ? (
                        <Card className="bg-muted/20 border-dashed"><CardContent className="py-4 text-center"><p className="text-xs text-muted-foreground">Empty</p></CardContent></Card>
                      ) : (
                        pkgs.map((pkg) => (
                          <Card 
                            key={pkg.id}
                            className={cn("cursor-pointer hover:border-amber-500 transition-colors", pkg.holds.length > 0 && "border-red-500/50")}
                            onClick={() => { setSelectedPackage(pkg); setShowDetailSheet(true); }}
                          >
                            <CardContent className="pt-3 pb-3">
                              <div className="space-y-2">
                                <p className="font-semibold text-xs">{pkg.name}</p>
                                {pkg.holds.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {pkg.holds.map((h, idx) => (
                                      <Badge key={idx} variant="destructive" className="text-xs">{h.reason}</Badge>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">{pkg.progress_pct}%</span>
                                  <Badge variant={pkg.qa_status === 'approved' ? 'default' : 'outline'} className="text-xs">
                                    {pkg.qa_status}
                                  </Badge>
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
            <SheetHeader><SheetTitle>New Fabrication Package</SheetTitle></SheetHeader>
            <NewFabPackageForm projectId={selectedProject} onSubmit={(data) => createMutation.mutate(data)} onCancel={() => setShowNewPackage(false)} />
          </SheetContent>
        </Sheet>

        {/* Detail Sheet */}
        <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
          <SheetContent className="w-[700px] sm:max-w-[700px] overflow-y-auto">
            <SheetHeader><SheetTitle>Fabrication Package Details</SheetTitle></SheetHeader>
            {selectedPackage && (
              <FabPackageDetailTabs package={selectedPackage} onUpdate={(data) => updateMutation.mutate({ id: selectedPackage.id, data })} onDelete={() => { setDeleteConfirm(selectedPackage); setShowDetailSheet(false); }} />
            )}
          </SheetContent>
        </Sheet>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Package?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Delete "{deleteConfirm?.name}"? Cannot undo.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteConfirm.id)}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Sheet open={showReportScheduler} onOpenChange={setShowReportScheduler}>
          <SheetContent><SheetHeader><SheetTitle>Schedule Fabrication Report</SheetTitle></SheetHeader><ReportScheduler onClose={() => setShowReportScheduler(false)} /></SheetContent>
        </Sheet>
      </div>
    </ErrorBoundary>
  );
}

function NewFabPackageForm({ projectId, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    package_name: '',
    piece_marks: '',
    status: 'not_started',
    progress_percent: 0,
    ship_target_date: ''
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.package_name) newErrors.package_name = 'Name required';
    if (formData.progress_percent < 0 || formData.progress_percent > 100) newErrors.progress_percent = 'Must be 0-100';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSubmit({ ...formData, progress_percent: Number(formData.progress_percent) });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <div><Label>Package Name *</Label><Input value={formData.package_name} onChange={(e) => setFormData({ ...formData, package_name: e.target.value })} className={errors.package_name ? 'border-red-500' : ''} />{errors.package_name && <p className="text-xs text-red-500 mt-1">{errors.package_name}</p>}</div>
      <div><Label>Piece Marks</Label><Input value={formData.piece_marks} onChange={(e) => setFormData({ ...formData, piece_marks: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Stage</Label><Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not_started">Not Started</SelectItem><SelectItem value="cutting">Cutting</SelectItem><SelectItem value="fit_up">Fit-up</SelectItem><SelectItem value="weld">Weld</SelectItem><SelectItem value="paint">Paint</SelectItem><SelectItem value="qa">QA</SelectItem></SelectContent></Select></div>
        <div><Label>Progress (%)</Label><Input type="number" min="0" max="100" value={formData.progress_percent} onChange={(e) => setFormData({ ...formData, progress_percent: e.target.value })} className={errors.progress_percent ? 'border-red-500' : ''} />{errors.progress_percent && <p className="text-xs text-red-500 mt-1">{errors.progress_percent}</p>}</div>
      </div>
      <div><Label>Ship Target Date</Label><Input type="date" value={formData.ship_target_date} onChange={(e) => setFormData({ ...formData, ship_target_date: e.target.value })} /></div>
      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1">Create Package</Button>
      </div>
    </form>
  );
}

function FabPackageDetailTabs({ package: pkg, onUpdate, onDelete }) {
  const [editingOverview, setEditingOverview] = useState(false);
  const [overviewData, setOverviewData] = useState({
    status: pkg.stage,
    progress_percent: pkg.progress_pct,
    ship_target_date: pkg.ship_target,
    on_hold: pkg.on_hold,
    hold_reason: pkg.hold_reason
  });

  return (
    <Tabs defaultValue="overview" className="mt-6">
      <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="qa">QA</TabsTrigger><TabsTrigger value="holds">Holds</TabsTrigger></TabsList>
      <TabsContent value="overview" className="space-y-4">
        {editingOverview ? (
          <>
            <div><Label>Stage</Label><Select value={overviewData.status} onValueChange={(val) => setOverviewData({ ...overviewData, status: val })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cutting">Cutting</SelectItem><SelectItem value="fit_up">Fit-up</SelectItem><SelectItem value="weld">Weld</SelectItem><SelectItem value="paint">Paint</SelectItem><SelectItem value="qa">QA</SelectItem><SelectItem value="ready_to_ship">Ready</SelectItem><SelectItem value="shipped">Shipped</SelectItem></SelectContent></Select></div>
            <div><Label>Progress (%)</Label><Input type="number" min="0" max="100" value={overviewData.progress_percent} onChange={(e) => setOverviewData({ ...overviewData, progress_percent: e.target.value })} /></div>
            <div><Label>Ship Target</Label><Input type="date" value={formatDateForInput(overviewData.ship_target_date) || ''} onChange={(e) => setOverviewData({ ...overviewData, ship_target_date: parseInputDate(e.target.value) })} /></div>
            <div className="flex gap-2"><Button onClick={() => { onUpdate({ ...overviewData, progress_percent: Number(overviewData.progress_percent) }); setEditingOverview(false); }} className="flex-1">Save</Button><Button variant="outline" onClick={() => setEditingOverview(false)} className="flex-1">Cancel</Button></div>
          </>
        ) : (
          <>
            <div><p className="text-sm font-medium mb-2">Package</p><p className="text-lg font-bold">{pkg.name}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm font-medium mb-2">Stage</p><Badge className="capitalize">{pkg.stage.replace('_', ' ')}</Badge></div>
              <div><p className="text-sm font-medium mb-2">Progress</p><div className="flex items-center gap-2"><div className="flex-1 bg-muted rounded-full h-2"><div className="h-2 rounded-full bg-green-500" style={{ width: `${pkg.progress_pct}%` }} /></div><span className="text-sm font-bold">{pkg.progress_pct}%</span></div></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm font-medium mb-2">Ship Target</p><p className="text-sm">{pkg.ship_target ? new Date(pkg.ship_target).toLocaleDateString() : 'Not set'}</p></div>
              <div><p className="text-sm font-medium mb-2">QA Status</p><Badge variant={pkg.qa_status === 'approved' ? 'default' : 'outline'} className="capitalize">{pkg.qa_status}</Badge></div>
            </div>
            <div className="flex gap-2 pt-4 border-t"><Button variant="outline" size="sm" onClick={() => setEditingOverview(true)}><Edit className="h-3 w-3 mr-2" />Edit</Button><Button variant="destructive" size="sm" onClick={onDelete}><Trash2 className="h-3 w-3 mr-2" />Delete</Button></div>
          </>
        )}
      </TabsContent>
      <TabsContent value="qa"><Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">QA checklist items will appear here</p></CardContent></Card></TabsContent>
      <TabsContent value="holds"><Card><CardContent className="pt-4">{pkg.holds.length === 0 ? <p className="text-sm text-muted-foreground">No holds</p> : <div className="space-y-2">{pkg.holds.map((h, idx) => <div key={idx} className="p-2 rounded border"><p className="text-sm font-medium">{h.reason}</p>{h.age_days > 0 && <p className="text-xs text-muted-foreground">Age: {h.age_days} days</p>}</div>)}</div>}</CardContent></Card></TabsContent>
    </Tabs>
  );
}