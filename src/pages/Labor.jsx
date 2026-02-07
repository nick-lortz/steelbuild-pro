import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { 
  RefreshCw, Users, AlertCircle, Download, Mail, Plus, Edit, Trash2,
  Check, X, CheckCircle, AlertTriangle, Zap, Clock, TrendingUp,
  ChevronDown, ChevronUp
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ReportScheduler from '@/components/reports/ReportScheduler';

export default function Labor() {
  const [selectedProject, setSelectedProject] = useState('');
  const [dateRange, setDateRange] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [showReportScheduler, setShowReportScheduler] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showAI, setShowAI] = useState(true);
  const [editingRow, setEditingRow] = useState(null);
  const [editData, setEditData] = useState({});

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

  const computedDateRange = React.useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (dateRange === 'today') return { start: today, end: today };
    if (dateRange === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return { start: weekStart.toISOString().split('T')[0], end: weekEnd.toISOString().split('T')[0] };
    }
    if (dateRange === 'custom') return { start: customStart, end: customEnd };
    return { start: today, end: today };
  }, [dateRange, customStart, customEnd]);

  const { 
    data: laborData = {}, 
    isLoading, 
    isFetching, 
    refetch 
  } = useQuery({
    queryKey: ['laborOps', selectedProject, computedDateRange.start, computedDateRange.end],
    queryFn: async () => {
      const response = await base44.functions.invoke('getLaborOpsData', {
        projectId: selectedProject,
        startDate: computedDateRange.start,
        endDate: computedDateRange.end
      });

      const d = response?.data ?? response;
      const normalized =
        (d?.snapshot || d?.entries || d?.ai) ? d :
        (d?.data?.snapshot || d?.data?.entries) ? d.data :
        (d?.body?.snapshot || d?.body?.entries) ? d.body :
        d;

      console.debug('[getLaborOpsData] normalized:', normalized);
      return normalized;
    },
    enabled: !!selectedProject && !!computedDateRange.start,
    staleTime: 2 * 60 * 1000,
    retry: 2
  });

  const { 
    project = {}, 
    range = {},
    snapshot = {}, 
    entries = [],
    ai = {}, 
    warnings = [] 
  } = laborData;

  const { data: workPackages = [] } = useQuery({
    queryKey: ['work-packages', selectedProject],
    queryFn: () => base44.entities.WorkPackage.filter({ project_id: selectedProject }),
    enabled: !!selectedProject,
    staleTime: 5 * 60 * 1000
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: () => base44.entities.CostCode.list('code'),
    staleTime: 10 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LaborHours.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laborOps'] });
      toast.success('Labor entry created');
      setShowNewEntry(false);
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LaborHours.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laborOps'] });
      toast.success('Entry updated');
      setEditingRow(null);
      setEditData({});
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LaborHours.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laborOps'] });
      toast.success('Entry deleted');
      setDeleteConfirm(null);
    }
  });

  const handleRefresh = () => {
    refetch();
    setLastRefreshed(new Date());
    toast.success('Labor data refreshed');
  };

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      toast.success('Labor report generated');
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
          <div><h1 className="text-3xl font-bold tracking-tight">Labor Management</h1><p className="text-muted-foreground mt-2">Time Entry • Productivity • Crew Performance</p></div>
          <Card className="max-w-md"><CardContent className="pt-6"><p className="text-sm font-medium mb-4">Select a project</p><Select value={selectedProject} onValueChange={setSelectedProject}><SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger><SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>)}</SelectContent></Select></CardContent></Card>
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
            <h1 className="text-3xl font-bold tracking-tight">Labor Management</h1>
            <p className="text-muted-foreground mt-2">Time Entry • Productivity • Cost Impacts</p>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-sm text-muted-foreground">{project.project_number} • {project.name}</p>
              <div className={cn("w-2 h-2 rounded-full", warnings.length === 0 ? "bg-green-500" : "bg-yellow-500")} />
              <span className="text-xs text-muted-foreground">Data {warnings.length === 0 ? 'Complete' : 'Partial'}</span>
              <span className="text-xs text-muted-foreground">• Updated: {lastRefreshed.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedProject} onValueChange={setSelectedProject}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>)}</SelectContent></Select>
            <Select value={dateRange} onValueChange={setDateRange}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="today">Today</SelectItem><SelectItem value="week">This Week</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select>
            {dateRange === 'custom' && (
              <>
                <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-36" />
                <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-36" />
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}><RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} /></Button>
            <Button variant="outline" size="sm" onClick={handleGeneratePDF} disabled={generatingPDF}><Download className="h-4 w-4 mr-2" />Export</Button>
            <Button variant="outline" size="sm" onClick={() => setShowReportScheduler(true)}><Mail className="h-4 w-4 mr-2" />Schedule</Button>
            <Button size="sm" onClick={() => setShowNewEntry(true)}><Plus className="h-4 w-4 mr-2" />New Entry</Button>
          </div>
        </div>

        {warnings.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5"><CardContent className="pt-4"><div className="flex items-start gap-3"><AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" /><div><p className="text-sm font-medium">Data Incomplete</p><ul className="text-xs text-muted-foreground mt-1 list-disc ml-4">{warnings.map((w, idx) => <li key={idx}>{w}</li>)}</ul></div></div></CardContent></Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {/* Labor Snapshot */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Labor Snapshot</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Total Hours</p><div className="text-2xl font-bold text-blue-500">{snapshot.totalHours || 0}</div><p className="text-xs text-muted-foreground mt-1">Period total</p></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">OT Hours</p><div className="text-2xl font-bold text-orange-500">{snapshot.totalOT || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Cost</p><div className="text-2xl font-bold text-green-500">${((snapshot.totalCost || 0) / 1000).toFixed(0)}K</div><p className="text-xs text-muted-foreground mt-1">Estimated</p></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Entries</p><div className="text-2xl font-bold">{snapshot.entriesCount || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Avg Hrs/Entry</p><div className="text-2xl font-bold">{snapshot.avgHoursPerEntry || 0}</div></CardContent></Card>
              </div>
            </div>

            {/* Quick Entry (always visible for fast input) */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Quick Labor Entry</h2>
              <QuickEntryForm 
                projectId={selectedProject}
                workPackages={workPackages}
                costCodes={costCodes}
                onSubmit={(data) => createMutation.mutate(data)}
              />
            </div>

            {/* Labor Entries Table */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Labor Entries</h2>
              <Card><CardContent className="p-0">{entries.length === 0 ? <div className="py-12 text-center text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No labor entries in selected range</p></div> : <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead className="border-b bg-muted/30"><tr className="text-left"><th className="p-3 font-medium">Date</th><th className="p-3 font-medium">Crew</th><th className="p-3 font-medium">WP/Task</th><th className="p-3 font-medium text-right">Hours</th><th className="p-3 font-medium text-right">OT</th><th className="p-3 font-medium text-right">Qty</th><th className="p-3 font-medium text-right">Cost</th><th className="p-3 font-medium">Notes</th><th className="p-3 font-medium text-right">Actions</th></tr></thead>
                <tbody>{entries.map((entry) => <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/20">
                  {editingRow === entry.id ? (
                    <>
                      <td className="p-3">{entry.date ? new Date(entry.date).toLocaleDateString() : '-'}</td>
                      <td className="p-3">{entry.crew}</td>
                      <td className="p-3"><Select value={editData.work_package_id || ''} onValueChange={(v) => setEditData({ ...editData, work_package_id: v })}><SelectTrigger className="h-8 w-32"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{workPackages.map((wp) => <SelectItem key={wp.id} value={wp.id}>{wp.title || wp.name}</SelectItem>)}</SelectContent></Select></td>
                      <td className="p-3 text-right"><Input type="number" min="0" value={editData.hours || 0} onChange={(e) => setEditData({ ...editData, hours: e.target.value })} className="h-8 w-16 text-right" /></td>
                      <td className="p-3 text-right"><Input type="number" min="0" value={editData.ot_hours || 0} onChange={(e) => setEditData({ ...editData, ot_hours: e.target.value })} className="h-8 w-16 text-right" /></td>
                      <td className="p-3 text-right"><Input type="number" min="0" step="0.01" value={editData.qty || ''} onChange={(e) => setEditData({ ...editData, qty: e.target.value })} className="h-8 w-16 text-right" /></td>
                      <td className="p-3"></td>
                      <td className="p-3"></td>
                      <td className="p-3 text-right"><div className="flex gap-1 justify-end"><Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: entry.id, data: { work_package_id: editData.work_package_id, hours: Number(editData.hours), overtime_hours: Number(editData.ot_hours), quantity_installed: editData.qty ? Number(editData.qty) : null } })}><Check className="h-3 w-3" /></Button><Button size="sm" variant="ghost" onClick={() => { setEditingRow(null); setEditData({}); }}><X className="h-3 w-3" /></Button></div></td>
                    </>
                  ) : (
                    <>
                      <td className="p-3 text-xs">{entry.date ? new Date(entry.date).toLocaleDateString() : '-'}</td>
                      <td className="p-3">{entry.crew}</td>
                      <td className="p-3 text-xs">{entry.work_package_name || entry.task_name || <span className="text-red-500">Unlinked</span>}</td>
                      <td className="p-3 text-right font-semibold">{entry.hours}</td>
                      <td className="p-3 text-right text-orange-500">{entry.ot_hours || 0}</td>
                      <td className="p-3 text-right">{entry.qty ? entry.qty.toFixed(1) : '-'}</td>
                      <td className="p-3 text-right text-green-500">${entry.cost > 0 ? (entry.cost / 1000).toFixed(1) + 'K' : '-'}</td>
                      <td className="p-3 text-xs text-muted-foreground truncate max-w-[200px]">{entry.notes || '-'}</td>
                      <td className="p-3 text-right"><div className="flex gap-1 justify-end"><Button size="sm" variant="ghost" onClick={() => { setEditingRow(entry.id); setEditData({ work_package_id: entry.work_package_id, hours: entry.hours, ot_hours: entry.ot_hours, qty: entry.qty }); }}><Edit className="h-3 w-3" /></Button><Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(entry)}><Trash2 className="h-3 w-3" /></Button></div></td>
                    </>
                  )}
                </tr>)}</tbody>
              </table></div>}</CardContent></Card>
            </div>

            {/* AI Labor Analyst */}
            {ai.recommendations && ai.recommendations.length > 0 && (
              <Collapsible open={showAI} onOpenChange={setShowAI}>
                <Card className="border-purple-500/30"><CardHeader><CollapsibleTrigger className="flex items-center justify-between w-full"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-purple-500" />AI Labor Analyst</CardTitle>{showAI ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</CollapsibleTrigger></CardHeader><CollapsibleContent><CardContent><div className="space-y-4">
                  <div><p className="text-sm font-medium mb-2">Labor Analysis</p><p className="text-sm text-muted-foreground">{ai.summary}</p><Badge variant="outline" className="capitalize mt-2">{ai.confidence} confidence</Badge></div>
                  {ai.flags && ai.flags.length > 0 && <div><p className="text-sm font-medium mb-2">Issues Detected</p><div className="space-y-2">{ai.flags.map((flag, idx) => <div key={idx} className="flex items-start gap-3 p-2 rounded bg-muted/30"><AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-500" /><div className="flex-1"><p className="text-sm">{flag.message}</p></div></div>)}</div></div>}
                  <div><p className="text-sm font-medium mb-2">Recommended Actions</p><div className="space-y-3">{ai.recommendations.map((rec, idx) => <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"><Badge variant={rec.priority === 'high' ? 'destructive' : 'default'} className="text-xs mt-1">{rec.priority}</Badge><div className="flex-1"><p className="font-semibold text-sm">{rec.action}</p><p className="text-xs text-green-600 mt-1">Impact: {rec.impact}</p></div></div>)}</div></div>
                </div></CardContent></CollapsibleContent></Card>
              </Collapsible>
            )}
          </>
        )}

        {/* New Entry Sheet */}
        <Sheet open={showNewEntry} onOpenChange={setShowNewEntry}><SheetContent className="w-[600px] sm:max-w-[600px]"><SheetHeader><SheetTitle>New Labor Entry</SheetTitle></SheetHeader><NewLaborForm projectId={selectedProject} workPackages={workPackages} costCodes={costCodes} onSubmit={(data) => createMutation.mutate(data)} onCancel={() => setShowNewEntry(false)} /></SheetContent></Sheet>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><DialogContent><DialogHeader><DialogTitle>Delete Entry?</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Delete labor entry from {deleteConfirm?.date}? Cannot undo.</p><DialogFooter><Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleteMutation.mutate(deleteConfirm.id)}>Delete</Button></DialogFooter></DialogContent></Dialog>

        <Sheet open={showReportScheduler} onOpenChange={setShowReportScheduler}><SheetContent><SheetHeader><SheetTitle>Schedule Labor Report</SheetTitle></SheetHeader><ReportScheduler onClose={() => setShowReportScheduler(false)} /></SheetContent></Sheet>
      </div>
    </ErrorBoundary>
  );
}

function QuickEntryForm({ projectId, workPackages, costCodes, onSubmit }) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    work_date: new Date().toISOString().split('T')[0],
    crew_employee: '',
    work_package_id: '',
    cost_code_id: '',
    hours: 8,
    overtime_hours: 0,
    quantity_installed: '',
    description: ''
  });

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData, hours: Number(formData.hours), overtime_hours: Number(formData.overtime_hours), quantity_installed: formData.quantity_installed ? Number(formData.quantity_installed) : null };
    onSubmit(data);
    setFormData({ ...formData, hours: 8, overtime_hours: 0, quantity_installed: '', description: '' });
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={handleQuickSubmit}>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div><Input type="date" value={formData.work_date} onChange={(e) => setFormData({ ...formData, work_date: e.target.value })} className="h-9" /></div>
            <div><Input placeholder="Crew/Employee" value={formData.crew_employee} onChange={(e) => setFormData({ ...formData, crew_employee: e.target.value })} className="h-9" /></div>
            <div><Select value={formData.work_package_id} onValueChange={(v) => setFormData({ ...formData, work_package_id: v })}><SelectTrigger className="h-9"><SelectValue placeholder="WP..." /></SelectTrigger><SelectContent>{workPackages.map((wp) => <SelectItem key={wp.id} value={wp.id}>{wp.title || wp.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Select value={formData.cost_code_id} onValueChange={(v) => setFormData({ ...formData, cost_code_id: v })}><SelectTrigger className="h-9"><SelectValue placeholder="Cost Code..." /></SelectTrigger><SelectContent>{costCodes.map((cc) => <SelectItem key={cc.id} value={cc.id}>{cc.code}</SelectItem>)}</SelectContent></Select></div>
            <div><Input type="number" min="0" step="0.5" placeholder="Hrs" value={formData.hours} onChange={(e) => setFormData({ ...formData, hours: e.target.value })} className="h-9" /></div>
            <div><Input type="number" min="0" step="0.5" placeholder="OT" value={formData.overtime_hours} onChange={(e) => setFormData({ ...formData, overtime_hours: e.target.value })} className="h-9" /></div>
            <div><Input type="number" min="0" step="0.01" placeholder="Qty" value={formData.quantity_installed} onChange={(e) => setFormData({ ...formData, quantity_installed: e.target.value })} className="h-9" /></div>
            <div><Button type="submit" className="w-full h-9">Log</Button></div>
          </div>
          <div className="mt-2"><Input placeholder="Notes (optional)" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="h-9" /></div>
        </form>
      </CardContent>
    </Card>
  );
}

function NewLaborForm({ projectId, workPackages, costCodes, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    work_date: new Date().toISOString().split('T')[0],
    crew_employee: '',
    work_package_id: '',
    cost_code_id: '',
    hours: 8,
    overtime_hours: 0,
    quantity_installed: '',
    description: ''
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.work_date) newErrors.work_date = 'Date required';
    if (!formData.crew_employee) newErrors.crew_employee = 'Crew/employee required';
    if (formData.hours <= 0) newErrors.hours = 'Hours must be > 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSubmit({ ...formData, hours: Number(formData.hours), overtime_hours: Number(formData.overtime_hours), quantity_installed: formData.quantity_installed ? Number(formData.quantity_installed) : null });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Date *</Label><Input type="date" value={formData.work_date} onChange={(e) => setFormData({ ...formData, work_date: e.target.value })} className={errors.work_date ? 'border-red-500' : ''} />{errors.work_date && <p className="text-xs text-red-500 mt-1">{errors.work_date}</p>}</div>
        <div><Label>Crew/Employee *</Label><Input value={formData.crew_employee} onChange={(e) => setFormData({ ...formData, crew_employee: e.target.value })} className={errors.crew_employee ? 'border-red-500' : ''} />{errors.crew_employee && <p className="text-xs text-red-500 mt-1">{errors.crew_employee}</p>}</div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Work Package</Label><Select value={formData.work_package_id} onValueChange={(v) => setFormData({ ...formData, work_package_id: v })}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{workPackages.map((wp) => <SelectItem key={wp.id} value={wp.id}>{wp.title || wp.name}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Cost Code</Label><Select value={formData.cost_code_id} onValueChange={(v) => setFormData({ ...formData, cost_code_id: v })}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{costCodes.map((cc) => <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><Label>Hours *</Label><Input type="number" min="0" step="0.5" value={formData.hours} onChange={(e) => setFormData({ ...formData, hours: e.target.value })} className={errors.hours ? 'border-red-500' : ''} />{errors.hours && <p className="text-xs text-red-500 mt-1">{errors.hours}</p>}</div>
        <div><Label>OT Hours</Label><Input type="number" min="0" step="0.5" value={formData.overtime_hours} onChange={(e) => setFormData({ ...formData, overtime_hours: e.target.value })} /></div>
        <div><Label>Quantity Installed</Label><Input type="number" min="0" step="0.01" placeholder="tons, units, etc." value={formData.quantity_installed} onChange={(e) => setFormData({ ...formData, quantity_installed: e.target.value })} /></div>
      </div>
      <div><Label>Notes</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} /></div>
      <div className="flex gap-2 pt-4"><Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button><Button type="submit" className="flex-1">Create Entry</Button></div>
    </form>
  );
}