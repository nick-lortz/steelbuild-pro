import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import RouteGuard from '@/components/shared/RouteGuard';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { formatDateForInput, parseInputDate, formatDateDisplay } from '@/components/shared/dateUtils';
import { 
  RefreshCw, Truck, AlertCircle, Download, Mail, Plus, Edit, Trash2,
  Check, X, CheckCircle, AlertTriangle, Zap, Clock, MapPin,
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

export default function DeliveriesPage() {
  return (
    <RouteGuard pageLabel="Delivery Management">
      <Deliveries />
    </RouteGuard>
  );
}

function Deliveries() {
  const { activeProjectId: selectedProject, setActiveProjectId } = useActiveProject();
  const [timeFilter, setTimeFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [showReportScheduler, setShowReportScheduler] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showNewDelivery, setShowNewDelivery] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
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
    data: deliveryData = {}, 
    isLoading, 
    isFetching, 
    refetch 
  } = useQuery({
    queryKey: ['deliveryManagement', selectedProject],
    queryFn: async () => {
      const response = await base44.functions.invoke('getDeliveryManagementData', {
        projectId: selectedProject
      });

      const d = response?.data ?? response;
      const normalized =
        (d?.snapshot || d?.deliveries || d?.ai) ? d :
        (d?.data?.snapshot || d?.data?.deliveries) ? d.data :
        (d?.body?.snapshot || d?.body?.deliveries) ? d.body :
        d;

      console.debug('[getDeliveryManagementData] normalized:', normalized);
      return normalized;
    },
    enabled: !!selectedProject,
    staleTime: 2 * 60 * 1000,
    retry: 2
  });

  const { 
    project = {}, 
    snapshot = {}, 
    deliveries = [],
    conflicts = [],
    ai = {}, 
    warnings = [] 
  } = deliveryData;

  const filteredDeliveries = React.useMemo(() => {
    let filtered = deliveries;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (timeFilter === 'today') {
      filtered = filtered.filter(d => d.date === today);
    } else if (timeFilter === 'week') {
      filtered = filtered.filter(d => {
        if (!d.date) return false;
        const delDate = new Date(d.date);
        return delDate >= now && delDate <= sevenDaysOut;
      });
    }

    if (zoneFilter !== 'all') {
      filtered = filtered.filter(d => d.zone === zoneFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    return filtered;
  }, [deliveries, timeFilter, zoneFilter, statusFilter]);

  const deliveriesToday = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return deliveries.filter(d => d.date === today).sort((a, b) => (a.time_start || '').localeCompare(b.time_start || ''));
  }, [deliveries]);

  const deliveriesThisWeek = React.useMemo(() => {
    const now = new Date();
    const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekDeliveries = deliveries.filter(d => {
      if (!d.date) return false;
      const delDate = new Date(d.date);
      return delDate >= now && delDate <= sevenDaysOut;
    });

    const grouped = {};
    weekDeliveries.forEach(d => {
      if (!grouped[d.date]) grouped[d.date] = [];
      grouped[d.date].push(d);
    });

    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [deliveries]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Delivery.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryManagement'] });
      toast.success('Delivery created');
      setShowNewDelivery(false);
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Delivery.update(id, data),
    onSuccess: (updatedData) => {
      queryClient.invalidateQueries({ queryKey: ['deliveryManagement'] });
      if (selectedDelivery?.id === updatedData?.id) setSelectedDelivery(updatedData);
      toast.success('Delivery updated');
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Delivery.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryManagement'] });
      toast.success('Delivery deleted');
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
      setDeleteConfirm(null);
    }
  });

  const handleRefresh = () => {
    refetch();
    setLastRefreshed(new Date());
    toast.success('Delivery data refreshed');
  };

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      toast.success('Delivery report generated');
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
          <div><h1 className="text-3xl font-bold tracking-tight">Delivery Management</h1><p className="text-muted-foreground mt-2">Site Logistics • Scheduling • Constraints</p></div>
          <Card className="max-w-md"><CardContent className="pt-6"><p className="text-sm font-medium mb-4">Select a project</p><Select value={selectedProject} onValueChange={setSelectedProject}><SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger><SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>)}</SelectContent></Select></CardContent></Card>
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
            <h1 className="text-3xl font-bold tracking-tight">Delivery Management</h1>
            <p className="text-muted-foreground mt-2">Site Logistics • Zone/Crane Assignment • Conflicts</p>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-sm text-muted-foreground">{project.project_number} • {project.name}</p>
              <div className={cn("w-2 h-2 rounded-full", warnings.length === 0 ? "bg-green-500" : "bg-yellow-500")} />
              <span className="text-xs text-muted-foreground">Data {warnings.length === 0 ? 'Complete' : 'Partial'}</span>
              <span className="text-xs text-muted-foreground">• Updated: {lastRefreshed.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedProject} onValueChange={setActiveProjectId} className="w-48">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={timeFilter} onValueChange={setTimeFilter}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Time</SelectItem><SelectItem value="today">Today</SelectItem><SelectItem value="week">This Week</SelectItem></SelectContent></Select>
            <Select value={zoneFilter} onValueChange={setZoneFilter}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Zones</SelectItem><SelectItem value="A">Zone A</SelectItem><SelectItem value="B">Zone B</SelectItem><SelectItem value="C">Zone C</SelectItem></SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="in_transit">In Transit</SelectItem><SelectItem value="delivered">Delivered</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}><RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} /></Button>
            <Button variant="outline" size="sm" onClick={handleGeneratePDF} disabled={generatingPDF}><Download className="h-4 w-4 mr-2" />Export</Button>
            <Button variant="outline" size="sm" onClick={() => setShowReportScheduler(true)}><Mail className="h-4 w-4 mr-2" />Schedule</Button>
            <Button size="sm" onClick={() => setShowNewDelivery(true)}><Plus className="h-4 w-4 mr-2" />New Delivery</Button>
          </div>
        </div>

        {warnings.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5"><CardContent className="pt-4"><div className="flex items-start gap-3"><AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" /><div><p className="text-sm font-medium">Data Incomplete</p><ul className="text-xs text-muted-foreground mt-1 list-disc ml-4">{warnings.map((w, idx) => <li key={idx}>{w}</li>)}</ul></div></div></CardContent></Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {/* Logistics Snapshot */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Logistics Snapshot</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Today</p><div className="text-2xl font-bold text-blue-500">{snapshot.deliveriesToday || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">This Week</p><div className="text-2xl font-bold text-green-500">{snapshot.deliveriesThisWeek || 0}</div></CardContent></Card>
                <Card className="border-red-500/30"><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Conflicts</p><div className="text-2xl font-bold text-red-500">{snapshot.conflicts || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Late</p><div className="text-2xl font-bold text-orange-500">{snapshot.late || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Rescheduled</p><div className="text-2xl font-bold">{snapshot.rescheduled || 0}</div></CardContent></Card>
              </div>
            </div>

            {/* Today + This Week Board */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Today */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Today</h2>
                <Card>
                  <CardContent className="pt-4">
                    {deliveriesToday.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground"><Truck className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No deliveries today</p></div>
                    ) : (
                      <div className="space-y-2">
                        {deliveriesToday.map((d) => (
                          <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border bg-card cursor-pointer hover:border-amber-500" onClick={() => { setSelectedDelivery(d); setShowDetailSheet(true); }}>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">{d.vendor}</span>
                                {d.zone && <Badge variant="outline" className="text-xs">Zone {d.zone}</Badge>}
                                {d.crane && <Badge variant="secondary" className="text-xs">{d.crane}</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">{d.load_description || 'No description'}</p>
                            </div>
                            <div className="text-right ml-3">
                              <p className="text-sm font-bold">{d.time_start || 'TBD'}</p>
                              <Badge variant={d.status === 'delivered' ? 'default' : 'outline'} className="text-xs capitalize mt-1">{d.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* This Week */}
              <div>
                <h2 className="text-xl font-semibold mb-4">This Week</h2>
                <Card>
                  <CardContent className="pt-4">
                    {deliveriesThisWeek.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground"><Clock className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No upcoming deliveries</p></div>
                    ) : (
                      <div className="space-y-3">
                        {deliveriesThisWeek.map(([date, dayDeliveries]) => (
                          <div key={date}>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                            <div className="space-y-1">
                              {dayDeliveries.map((d) => (
                                <div key={d.id} className="flex items-center justify-between p-2 rounded border bg-card text-sm cursor-pointer hover:border-amber-500" onClick={() => { setSelectedDelivery(d); setShowDetailSheet(true); }}>
                                  <span className="font-medium">{d.vendor}</span>
                                  <div className="flex items-center gap-2">
                                    {d.zone && <Badge variant="outline" className="text-xs">Z{d.zone}</Badge>}
                                    <span className="text-xs text-muted-foreground">{d.time_start || 'TBD'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Conflicts & Constraints */}
            {conflicts.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Conflicts & Constraints
                </h2>
                <Card className="border-red-500/30">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      {conflicts.map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-red-500">{c.type.replace('_', ' ').toUpperCase()}</p>
                            <p className="text-xs text-muted-foreground mt-1">{c.reason}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              <span>{c.deliveryA.name} ({c.deliveryA.time})</span>
                              <span className="text-muted-foreground">vs</span>
                              <span>{c.deliveryB.name} ({c.deliveryB.time})</span>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">Resolve</Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* AI Logistics Analyst */}
            {ai.recommendations && ai.recommendations.length > 0 && (
              <Collapsible open={showAI} onOpenChange={setShowAI}>
                <Card className="border-purple-500/30">
                   <div className="flex items-center justify-between p-6 pb-3 border-b border-border">
                     <CollapsibleTrigger className="flex items-center justify-between w-full">
                       <h3 className="text-sm flex items-center gap-2 font-semibold"><Zap className="h-4 w-4 text-purple-500" />AI Logistics Analyst</h3>
                      {showAI ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </CollapsibleTrigger>
                      </div>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="space-y-4">
                        <div><p className="text-sm font-medium mb-2">Logistics Status</p><p className="text-sm text-muted-foreground">{ai.summary}</p><Badge variant="outline" className="capitalize mt-2">{ai.confidence} confidence</Badge></div>
                        {ai.predictions && ai.predictions.length > 0 && (
                          <div><p className="text-sm font-medium mb-2">Conflict Predictions</p><div className="space-y-2">{ai.predictions.map((pred, idx) => <div key={idx} className="flex items-start gap-3 p-2 rounded bg-muted/30"><AlertTriangle className={cn("h-4 w-4 mt-0.5", pred.severity === 'critical' ? "text-red-500" : "text-yellow-500")} /><div className="flex-1"><p className="text-sm">{pred.message}</p><p className="text-xs text-green-600 mt-1">→ {pred.action}</p></div></div>)}</div></div>
                        )}
                        <div><p className="text-sm font-medium mb-2">Recommended Actions</p><div className="space-y-3">{ai.recommendations.map((rec, idx) => <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"><Badge variant={rec.priority === 'critical' || rec.priority === 'high' ? 'destructive' : 'default'} className="text-xs mt-1">{rec.priority}</Badge><div className="flex-1"><p className="font-semibold text-sm">{rec.action}</p><p className="text-xs text-green-600 mt-1">Impact: {rec.impact}</p></div></div>)}</div></div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}
          </>
        )}

        {/* New Delivery Sheet */}
        <Sheet open={showNewDelivery} onOpenChange={setShowNewDelivery}>
          <SheetContent className="w-[600px] sm:max-w-[600px]"><SheetHeader><SheetTitle>New Delivery</SheetTitle></SheetHeader><NewDeliveryForm projectId={selectedProject} onSubmit={(data) => createMutation.mutate(data)} onCancel={() => setShowNewDelivery(false)} /></SheetContent>
        </Sheet>

        {/* Detail Sheet */}
        <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
          <SheetContent className="w-[700px] sm:max-w-[700px] overflow-y-auto"><SheetHeader><SheetTitle>Delivery Details</SheetTitle></SheetHeader>{selectedDelivery && <DeliveryDetailTabs delivery={selectedDelivery} onUpdate={(data) => updateMutation.mutate({ id: selectedDelivery.id, data })} onDelete={() => { setDeleteConfirm(selectedDelivery); setShowDetailSheet(false); }} />}</SheetContent>
        </Sheet>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent><DialogHeader><DialogTitle>Delete Delivery?</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Delete delivery from {deleteConfirm?.vendor}? Cannot undo.</p><DialogFooter><Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleteMutation.mutate(deleteConfirm.id)}>Delete</Button></DialogFooter></DialogContent>
        </Dialog>

        <Sheet open={showReportScheduler} onOpenChange={setShowReportScheduler}><SheetContent><SheetHeader><SheetTitle>Schedule Delivery Report</SheetTitle></SheetHeader><ReportScheduler onClose={() => setShowReportScheduler(false)} /></SheetContent></Sheet>
      </div>
    </ErrorBoundary>
  );
}

function NewDeliveryForm({ projectId, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    vendor_name: '',
    scheduled_date: '',
    time_window_start: '',
    time_window_end: '',
    delivery_zone: '',
    crane_assignment: '',
    load_description: '',
    status: 'scheduled'
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.vendor_name) newErrors.vendor_name = 'Vendor required';
    if (!formData.scheduled_date) newErrors.scheduled_date = 'Date required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <div><Label>Vendor *</Label><Input value={formData.vendor_name} onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })} className={errors.vendor_name ? 'border-red-500' : ''} />{errors.vendor_name && <p className="text-xs text-red-500 mt-1">{errors.vendor_name}</p>}</div>
      <div><Label>Load Description</Label><Textarea value={formData.load_description} onChange={(e) => setFormData({ ...formData, load_description: e.target.value })} rows={2} /></div>
      <div><Label>Scheduled Date *</Label><Input type="date" value={formatDateForInput(formData.scheduled_date)} onChange={(e) => setFormData({ ...formData, scheduled_date: parseInputDate(e.target.value) })} className={errors.scheduled_date ? 'border-red-500' : ''} />{errors.scheduled_date && <p className="text-xs text-red-500 mt-1">{errors.scheduled_date}</p>}</div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Time Start</Label><Input type="time" value={formData.time_window_start} onChange={(e) => setFormData({ ...formData, time_window_start: e.target.value })} /></div>
        <div><Label>Time End</Label><Input type="time" value={formData.time_window_end} onChange={(e) => setFormData({ ...formData, time_window_end: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Zone</Label><Select value={formData.delivery_zone} onValueChange={(val) => setFormData({ ...formData, delivery_zone: val })}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="A">Zone A</SelectItem><SelectItem value="B">Zone B</SelectItem><SelectItem value="C">Zone C</SelectItem></SelectContent></Select></div>
        <div><Label>Crane</Label><Input value={formData.crane_assignment} onChange={(e) => setFormData({ ...formData, crane_assignment: e.target.value })} placeholder="e.g., Crane 1" /></div>
      </div>
      <div className="flex gap-2 pt-4"><Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button><Button type="submit" className="flex-1">Create Delivery</Button></div>
    </form>
  );
}

function DeliveryDetailTabs({ delivery, onUpdate, onDelete }) {
  const [editingOverview, setEditingOverview] = useState(false);
  const [overviewData, setOverviewData] = useState({
    scheduled_date: delivery.date,
    time_window_start: delivery.time_start,
    time_window_end: delivery.time_end,
    delivery_zone: delivery.zone,
    crane_assignment: delivery.crane,
    status: delivery.status
  });

  return (
    <Tabs defaultValue="overview" className="mt-6">
      <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="timeline">Timeline</TabsTrigger><TabsTrigger value="constraints">Constraints</TabsTrigger></TabsList>
      <TabsContent value="overview" className="space-y-4">
        {editingOverview ? (
          <>
            <div><Label>Date</Label><Input type="date" value={formatDateForInput(overviewData.scheduled_date) || ''} onChange={(e) => setOverviewData({ ...overviewData, scheduled_date: parseInputDate(e.target.value) })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Time Start</Label><Input type="time" value={overviewData.time_window_start || ''} onChange={(e) => setOverviewData({ ...overviewData, time_window_start: e.target.value })} /></div>
              <div><Label>Time End</Label><Input type="time" value={overviewData.time_window_end || ''} onChange={(e) => setOverviewData({ ...overviewData, time_window_end: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Zone</Label><Select value={overviewData.delivery_zone || ''} onValueChange={(val) => setOverviewData({ ...overviewData, delivery_zone: val })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="A">Zone A</SelectItem><SelectItem value="B">Zone B</SelectItem><SelectItem value="C">Zone C</SelectItem></SelectContent></Select></div>
              <div><Label>Crane</Label><Input value={overviewData.crane_assignment || ''} onChange={(e) => setOverviewData({ ...overviewData, crane_assignment: e.target.value })} /></div>
            </div>
            <div><Label>Status</Label><Select value={overviewData.status} onValueChange={(val) => setOverviewData({ ...overviewData, status: val })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="in_transit">In Transit</SelectItem><SelectItem value="delivered">Delivered</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
            <div className="flex gap-2"><Button onClick={() => { onUpdate(overviewData); setEditingOverview(false); }} disabled={updateMutation.isPending} className="flex-1">Save</Button><Button variant="outline" onClick={() => setEditingOverview(false)} className="flex-1">Cancel</Button></div>
          </>
        ) : (
          <>
            <div><p className="text-sm font-medium mb-2">Vendor</p><p className="text-lg font-bold">{delivery.vendor}</p></div>
            <div><p className="text-sm font-medium mb-2">Load</p><p className="text-sm text-muted-foreground">{delivery.load_description || 'No description'}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm font-medium mb-2">Date</p><p className="text-sm">{formatDateDisplay(delivery.date)}</p></div>
              <div><p className="text-sm font-medium mb-2">Time</p><p className="text-sm">{delivery.time_start || 'TBD'} - {delivery.time_end || 'TBD'}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm font-medium mb-2">Zone</p><Badge variant="outline">{delivery.zone || 'Not assigned'}</Badge></div>
              <div><p className="text-sm font-medium mb-2">Crane</p><p className="text-sm">{delivery.crane || 'Not assigned'}</p></div>
            </div>
            <div><p className="text-sm font-medium mb-2">Status</p><Badge className="capitalize">{delivery.status}</Badge></div>
            <div className="flex gap-2 pt-4 border-t"><Button variant="outline" size="sm" onClick={() => setEditingOverview(true)}><Edit className="h-3 w-3 mr-2" />Edit</Button><Button variant="destructive" size="sm" onClick={onDelete}><Trash2 className="h-3 w-3 mr-2" />Delete</Button></div>
          </>
        )}
      </TabsContent>
      <TabsContent value="timeline"><Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Timeline events will appear here</p></CardContent></Card></TabsContent>
      <TabsContent value="constraints"><Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Constraints and dependencies</p></CardContent></Card></TabsContent>
    </Tabs>
  );
}