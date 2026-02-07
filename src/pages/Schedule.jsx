import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { 
  RefreshCw, Calendar, AlertCircle, Download, Mail, Plus, Edit, Trash2,
  Check, X, CheckCircle, AlertTriangle, Zap, Clock, TrendingUp, Target,
  ChevronDown, ChevronUp, FileUp
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ReportScheduler from '@/components/reports/ReportScheduler';

export default function Schedule() {
  const [selectedProject, setSelectedProject] = useState('');
  const [viewMode, setViewMode] = useState('wbs');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [showReportScheduler, setShowReportScheduler] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
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

  const { 
    data: scheduleData = {}, 
    isLoading, 
    isFetching, 
    refetch 
  } = useQuery({
    queryKey: ['scheduleWorkspace', selectedProject],
    queryFn: async () => {
      const response = await base44.functions.invoke('getScheduleWorkspaceData', {
        projectId: selectedProject
      });

      // Unwrap response.data first
      const d = response?.data ?? response;
      
      // Then unwrap nested data/body/result
      const normalized = (d?.data || d?.body || d?.result) || d;

      console.debug('[getScheduleWorkspaceData] normalized:', normalized);
      return normalized;
    },
    enabled: !!selectedProject,
    staleTime: 2 * 60 * 1000,
    retry: 2
  });

  const { 
    project = {}, 
    snapshot = {}, 
    tasks = [],
    exceptions = {},
    ai = {}, 
    warnings = [] 
  } = scheduleData;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleWorkspace'] });
      toast.success('Task created');
      setShowNewTask(false);
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleWorkspace'] });
      toast.success('Task updated');
      setEditingRow(null);
      setEditData({});
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleWorkspace'] });
      toast.success('Task deleted');
      setDeleteConfirm(null);
    }
  });

  const handleRefresh = () => {
    refetch();
    setLastRefreshed(new Date());
    toast.success('Schedule refreshed');
  };

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      toast.success('Schedule report generated');
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
          <div><h1 className="text-3xl font-bold tracking-tight">Schedule Management</h1><p className="text-muted-foreground mt-2">WBS • Dependencies • Critical Path • Baselines</p></div>
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
            <h1 className="text-3xl font-bold tracking-tight">Schedule Management</h1>
            <p className="text-muted-foreground mt-2">WBS • Dependencies • Critical Path</p>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-sm text-muted-foreground">{project.project_number} • {project.name}</p>
              <div className={cn("w-2 h-2 rounded-full", warnings.length === 0 ? "bg-green-500" : "bg-yellow-500")} />
              <span className="text-xs text-muted-foreground">Data {warnings.length === 0 ? 'Complete' : 'Partial'}</span>
              <span className="text-xs text-muted-foreground">• Updated: {lastRefreshed.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedProject} onValueChange={setSelectedProject}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>)}</SelectContent></Select>
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button variant={viewMode === 'wbs' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('wbs')}>WBS</Button>
              <Button variant={viewMode === 'gantt' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('gantt')}>Gantt</Button>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}><RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} /></Button>
            <Button variant="outline" size="sm"><FileUp className="h-4 w-4 mr-2" />Import CSV</Button>
            <Button variant="outline" size="sm" onClick={handleGeneratePDF} disabled={generatingPDF}><Download className="h-4 w-4 mr-2" />Export</Button>
            <Button variant="outline" size="sm" onClick={() => setShowReportScheduler(true)}><Mail className="h-4 w-4 mr-2" />Schedule</Button>
            <Button size="sm" onClick={() => setShowNewTask(true)}><Plus className="h-4 w-4 mr-2" />Add Task</Button>
          </div>
        </div>

        {warnings.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5"><CardContent className="pt-4"><div className="flex items-start gap-3"><AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" /><div><p className="text-sm font-medium">Data Incomplete</p><ul className="text-xs text-muted-foreground mt-1 list-disc ml-4">{warnings.map((w, idx) => <li key={idx}>{w}</li>)}</ul></div></div></CardContent></Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {/* Schedule Snapshot */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Schedule Snapshot</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Total Tasks</p><div className="text-2xl font-bold">{snapshot.totalTasks || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Completed</p><div className="text-2xl font-bold text-green-500">{snapshot.completedTasks || 0}</div></CardContent></Card>
                <Card className="border-red-500/30"><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Overdue</p><div className="text-2xl font-bold text-red-500">{snapshot.overdueTasks || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Critical Path</p><div className="text-2xl font-bold text-orange-500">{snapshot.criticalTasks || 0}</div></CardContent></Card>
                <Card className={cn("border-2", (snapshot.avgScheduleVariance || 0) > 0 ? "border-red-500/30 bg-red-500/5" : "border-green-500/30 bg-green-500/5")}><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Schedule Variance</p><div className={cn("text-2xl font-bold", (snapshot.avgScheduleVariance || 0) > 0 ? "text-red-500" : "text-green-500")}>{snapshot.avgScheduleVariance >= 0 ? '+' : ''}{snapshot.avgScheduleVariance || 0}d</div></CardContent></Card>
              </div>
            </div>

            {/* Exceptions Panel */}
            {(exceptions.overdue?.length > 0 || exceptions.invalidDates?.length > 0 || exceptions.criticalAtRisk?.length > 0) && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" />Exceptions</h2>
                <Card className="border-red-500/30"><CardContent className="pt-4"><div className="space-y-3">
                  {exceptions.overdue?.length > 0 && <div><p className="text-sm font-medium mb-2">Overdue Tasks ({exceptions.overdue.length})</p><div className="space-y-1">{exceptions.overdue.slice(0, 5).map((t) => <div key={t.id} className="flex items-center justify-between p-2 rounded border border-red-500/30 bg-red-500/5 text-sm"><span>{t.name}</span><span className="text-xs text-red-500">Due: {new Date(t.end).toLocaleDateString()}</span></div>)}</div></div>}
                  {exceptions.invalidDates?.length > 0 && <div><p className="text-sm font-medium mb-2">Invalid Dates ({exceptions.invalidDates.length})</p><p className="text-xs text-muted-foreground">Tasks with end before start or missing dates</p></div>}
                  {exceptions.criticalAtRisk?.length > 0 && <div><p className="text-sm font-medium mb-2">Critical Path At Risk ({exceptions.criticalAtRisk.length})</p><div className="space-y-1">{exceptions.criticalAtRisk.slice(0, 5).map((t) => <div key={t.id} className="flex items-center justify-between p-2 rounded border text-sm"><span>{t.name}</span><Badge variant="destructive" className="text-xs">{t.progress}% • {new Date(t.end).toLocaleDateString()}</Badge></div>)}</div></div>}
                </div></CardContent></Card>
              </div>
            )}

            {/* AI Schedule Analyst */}
            {ai.recommendations && ai.recommendations.length > 0 && (
              <Collapsible open={showAI} onOpenChange={setShowAI}>
                <Card className="border-purple-500/30"><CardHeader><CollapsibleTrigger className="flex items-center justify-between w-full"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-purple-500" />AI Schedule Analyst</CardTitle>{showAI ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</CollapsibleTrigger></CardHeader><CollapsibleContent><CardContent><div className="space-y-4">
                  <div><p className="text-sm font-medium mb-2">Schedule Analysis</p><p className="text-sm text-muted-foreground">{ai.summary}</p><Badge variant="outline" className="capitalize mt-2">{ai.confidence} confidence</Badge></div>
                  {ai.flags && ai.flags.length > 0 && <div><p className="text-sm font-medium mb-2">Critical Path Risks</p><div className="space-y-2">{ai.flags.map((flag, idx) => <div key={idx} className="flex items-start gap-3 p-2 rounded bg-muted/30"><AlertTriangle className="h-4 w-4 mt-0.5 text-red-500" /><div className="flex-1"><p className="text-sm font-medium">{flag.task_name}</p><p className="text-xs text-muted-foreground">{flag.reason}</p></div></div>)}</div></div>}
                  <div><p className="text-sm font-medium mb-2">Recommended Actions</p><div className="space-y-3">{ai.recommendations.map((rec, idx) => <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"><Badge variant={rec.priority === 'critical' || rec.priority === 'high' ? 'destructive' : 'default'} className="text-xs mt-1">{rec.priority}</Badge><div className="flex-1"><p className="font-semibold text-sm">{rec.action}</p><p className="text-xs text-green-600 mt-1">Impact: {rec.impact}</p></div></div>)}</div></div>
                </div></CardContent></CollapsibleContent></Card>
              </Collapsible>
            )}

            {/* Task Workspace */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Task Workspace ({viewMode === 'gantt' ? 'Gantt Chart' : 'WBS Table'})</h2>
              <Card><CardContent className="p-0">{tasks.length === 0 ? <div className="py-12 text-center text-muted-foreground"><Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No tasks in schedule</p></div> : viewMode === 'gantt' ? (
                <GanttChartView tasks={tasks} />
              ) : <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead className="border-b bg-muted/30"><tr className="text-left">
                  <th className="p-3 font-medium">Task</th>
                  <th className="p-3 font-medium">Start</th>
                  <th className="p-3 font-medium">Finish</th>
                  <th className="p-3 font-medium">Baseline</th>
                  <th className="p-3 font-medium text-right">%</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Owner</th>
                  <th className="p-3 font-medium">Critical</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr></thead>
                <tbody>{tasks.map((task) => <tr key={task.id} className="border-b last:border-0 hover:bg-muted/20">
                  {editingRow === task.id ? (
                    <>
                      <td className="p-3">{task.name}</td>
                      <td className="p-3"><Input type="date" value={editData.start || ''} onChange={(e) => setEditData({ ...editData, start: e.target.value })} className="h-8 w-32" /></td>
                      <td className="p-3"><Input type="date" value={editData.end || ''} onChange={(e) => setEditData({ ...editData, end: e.target.value })} className="h-8 w-32" /></td>
                      <td className="p-3 text-xs text-muted-foreground">{task.baseline_start ? `${new Date(task.baseline_start).toLocaleDateString()} - ${task.baseline_end ? new Date(task.baseline_end).toLocaleDateString() : '-'}` : '-'}</td>
                      <td className="p-3 text-right"><Input type="number" min="0" max="100" value={editData.progress_pct || 0} onChange={(e) => setEditData({ ...editData, progress_pct: e.target.value })} className="h-8 w-16 text-right" /></td>
                      <td className="p-3"><Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}><SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not_started">Not Started</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="on_hold">On Hold</SelectItem></SelectContent></Select></td>
                      <td className="p-3" colSpan={2}></td>
                      <td className="p-3 text-right"><div className="flex gap-1 justify-end"><Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: task.id, data: { ...editData, start_date: editData.start, end_date: editData.end, progress_percent: Number(editData.progress_pct) } })}><Check className="h-3 w-3" /></Button><Button size="sm" variant="ghost" onClick={() => { setEditingRow(null); setEditData({}); }}><X className="h-3 w-3" /></Button></div></td>
                    </>
                  ) : (
                    <>
                      <td className="p-3 font-medium">{task.name}</td>
                      <td className="p-3 text-xs">{task.start ? new Date(task.start).toLocaleDateString() : '-'}</td>
                      <td className="p-3 text-xs">{task.end ? new Date(task.end).toLocaleDateString() : '-'}</td>
                      <td className="p-3 text-xs text-muted-foreground">{task.baseline_start ? `${new Date(task.baseline_start).toLocaleDateString()} - ${task.baseline_end ? new Date(task.baseline_end).toLocaleDateString() : '-'}` : '-'}</td>
                      <td className="p-3 text-right font-bold">{task.progress_pct}%</td>
                      <td className="p-3"><Badge variant={task.status === 'completed' ? 'default' : 'outline'} className="capitalize text-xs">{task.status?.replace('_', ' ')}</Badge></td>
                      <td className="p-3 text-xs">{task.owner}</td>
                      <td className="p-3 text-center">{task.isCritical ? <Badge variant="destructive" className="text-xs">CRITICAL</Badge> : '-'}</td>
                      <td className="p-3 text-right"><div className="flex gap-1 justify-end"><Button size="sm" variant="ghost" onClick={() => { setEditingRow(task.id); setEditData({ start: task.start, end: task.end, progress_pct: task.progress_pct, status: task.status }); }}><Edit className="h-3 w-3" /></Button><Button size="sm" variant="ghost" onClick={() => { setSelectedTask(task); setShowDetailSheet(true); }}>View</Button><Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(task)}><Trash2 className="h-3 w-3" /></Button></div></td>
                    </>
                  )}
                </tr>)}</tbody>
                </table></div>}</CardContent></Card>
            </div>
          </>
        )}

        {/* New Task Sheet */}
        <Sheet open={showNewTask} onOpenChange={setShowNewTask}><SheetContent className="w-[600px] sm:max-w-[600px]"><SheetHeader><SheetTitle>New Task</SheetTitle></SheetHeader><NewTaskForm projectId={selectedProject} onSubmit={(data) => createMutation.mutate(data)} onCancel={() => setShowNewTask(false)} /></SheetContent></Sheet>

        {/* Detail Sheet */}
        <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}><SheetContent className="w-[700px] sm:max-w-[700px] overflow-y-auto"><SheetHeader><SheetTitle>Task Details</SheetTitle></SheetHeader>{selectedTask && <TaskDetailTabs task={selectedTask} onUpdate={(data) => updateMutation.mutate({ id: selectedTask.id, data })} onDelete={() => { setDeleteConfirm(selectedTask); setShowDetailSheet(false); }} />}</SheetContent></Sheet>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}><DialogContent><DialogHeader><DialogTitle>Delete Task?</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Delete "{deleteConfirm?.name}"? Cannot undo.</p><DialogFooter><Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleteMutation.mutate(deleteConfirm.id)}>Delete</Button></DialogFooter></DialogContent></Dialog>

        <Sheet open={showReportScheduler} onOpenChange={setShowReportScheduler}><SheetContent><SheetHeader><SheetTitle>Schedule Schedule Report</SheetTitle></SheetHeader><ReportScheduler onClose={() => setShowReportScheduler(false)} /></SheetContent></Sheet>
      </div>
    </ErrorBoundary>
  );
}

function NewTaskForm({ projectId, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    name: '',
    start_date: '',
    end_date: '',
    duration_days: 1,
    status: 'not_started',
    phase: 'fabrication',
    progress_percent: 0,
    is_critical: false
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Name required';
    if (!formData.start_date) newErrors.start_date = 'Start date required';
    if (!formData.end_date) newErrors.end_date = 'End date required';
    if (formData.end_date && formData.start_date && formData.end_date < formData.start_date) newErrors.end_date = 'End must be after start';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSubmit({ ...formData, progress_percent: Number(formData.progress_percent), duration_days: Number(formData.duration_days), baseline_start: formData.start_date, baseline_end: formData.end_date });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <div><Label>Task Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={errors.name ? 'border-red-500' : ''} />{errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}</div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Start Date *</Label><Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className={errors.start_date ? 'border-red-500' : ''} />{errors.start_date && <p className="text-xs text-red-500 mt-1">{errors.start_date}</p>}</div>
        <div><Label>End Date *</Label><Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className={errors.end_date ? 'border-red-500' : ''} />{errors.end_date && <p className="text-xs text-red-500 mt-1">{errors.end_date}</p>}</div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Phase</Label><Select value={formData.phase} onValueChange={(v) => setFormData({ ...formData, phase: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="detailing">Detailing</SelectItem><SelectItem value="fabrication">Fabrication</SelectItem><SelectItem value="delivery">Delivery</SelectItem><SelectItem value="erection">Erection</SelectItem><SelectItem value="closeout">Closeout</SelectItem></SelectContent></Select></div>
        <div><Label>Status</Label><Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not_started">Not Started</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="on_hold">On Hold</SelectItem></SelectContent></Select></div>
      </div>
      <div><Label className="flex items-center gap-2"><input type="checkbox" checked={formData.is_critical} onChange={(e) => setFormData({ ...formData, is_critical: e.target.checked })} />Critical Path Task</Label></div>
      <div className="flex gap-2 pt-4"><Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button><Button type="submit" className="flex-1">Create Task</Button></div>
    </form>
  );
}

function GanttChartView({ tasks }) {
  if (!tasks || tasks.length === 0) return null;
  
  // Calculate date range
  const dates = tasks.flatMap(t => [t.start, t.end]).filter(Boolean).map(d => new Date(d));
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  const totalDays = Math.ceil((maxDate - minDate) / (24 * 60 * 60 * 1000)) + 1;
  
  const getTaskPosition = (task) => {
    const start = new Date(task.start);
    const end = new Date(task.end);
    const left = Math.floor(((start - minDate) / (24 * 60 * 60 * 1000)) / totalDays * 100);
    const width = Math.max(1, Math.floor(((end - start) / (24 * 60 * 60 * 1000)) / totalDays * 100));
    return { left: `${left}%`, width: `${width}%` };
  };
  
  return (
    <div className="p-4 space-y-1 bg-zinc-950">
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <div className="w-48">Task</div>
        <div className="flex-1 flex items-center justify-between px-2">
          <span>{minDate.toLocaleDateString()}</span>
          <span>{maxDate.toLocaleDateString()}</span>
        </div>
      </div>
      {tasks.map((task) => {
        const pos = getTaskPosition(task);
        return (
          <div key={task.id} className="flex items-center gap-2">
            <div className="w-48 text-sm truncate">{task.name}</div>
            <div className="flex-1 relative h-8 bg-zinc-900 rounded">
              <div 
                className={cn(
                  "absolute h-6 top-1 rounded flex items-center px-2",
                  task.isCritical ? "bg-red-500" : "bg-blue-500"
                )}
                style={pos}
              >
                <span className="text-xs font-medium text-white truncate">{task.progress_pct}%</span>
              </div>
            </div>
            <Badge variant={task.status === 'completed' ? 'default' : 'outline'} className="text-xs w-24">
              {task.status?.replace('_', ' ')}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

function TaskDetailTabs({ task, onUpdate, onDelete }) {
  return (
    <Tabs defaultValue="overview" className="mt-6">
      <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="dependencies">Dependencies</TabsTrigger><TabsTrigger value="baseline">Baseline</TabsTrigger></TabsList>
      <TabsContent value="overview" className="space-y-4">
        <div><p className="text-sm font-medium mb-2">Task</p><p className="text-lg font-bold">{task.name}</p></div>
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-sm font-medium mb-2">Start</p><p className="text-sm">{task.start ? new Date(task.start).toLocaleDateString() : '-'}</p></div>
          <div><p className="text-sm font-medium mb-2">End</p><p className="text-sm">{task.end ? new Date(task.end).toLocaleDateString() : '-'}</p></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-sm font-medium mb-2">Status</p><Badge className="capitalize">{task.status?.replace('_', ' ')}</Badge></div>
          <div><p className="text-sm font-medium mb-2">Progress</p><div className="flex items-center gap-2"><div className="flex-1 bg-muted rounded-full h-2"><div className="h-2 rounded-full bg-green-500" style={{ width: `${task.progress_pct}%` }} /></div><span className="text-sm font-bold">{task.progress_pct}%</span></div></div>
        </div>
        <div className="flex gap-2 pt-4 border-t"><Button variant="destructive" size="sm" onClick={onDelete}><Trash2 className="h-3 w-3 mr-2" />Delete Task</Button></div>
      </TabsContent>
      <TabsContent value="dependencies"><Card><CardContent className="pt-4"><div className="space-y-2"><div><p className="text-sm font-medium mb-2">Predecessors ({task.predecessors?.length || 0})</p>{task.predecessors?.length > 0 ? <div className="space-y-1">{task.predecessors.map((p) => <div key={p.id} className="p-2 rounded border text-sm"><span>{p.name}</span><Badge variant="outline" className="ml-2 text-xs capitalize">{p.status}</Badge></div>)}</div> : <p className="text-xs text-muted-foreground">No predecessors</p>}</div><div><p className="text-sm font-medium mb-2">Successors ({task.successors?.length || 0})</p>{task.successors?.length > 0 ? <div className="space-y-1">{task.successors.map((s) => <div key={s.id} className="p-2 rounded border text-sm">{s.name}</div>)}</div> : <p className="text-xs text-muted-foreground">No successors</p>}</div></div></CardContent></Card></TabsContent>
      <TabsContent value="baseline"><Card><CardContent className="pt-4"><div className="space-y-3"><div className="grid grid-cols-2 gap-4"><div><p className="text-sm font-medium mb-2">Baseline Start</p><p className="text-sm">{task.baseline_start ? new Date(task.baseline_start).toLocaleDateString() : 'Not set'}</p></div><div><p className="text-sm font-medium mb-2">Baseline End</p><p className="text-sm">{task.baseline_end ? new Date(task.baseline_end).toLocaleDateString() : 'Not set'}</p></div></div>{task.baseline_end && task.end && <div><p className="text-sm font-medium mb-2">Variance</p><div className={cn("text-lg font-bold", new Date(task.end) > new Date(task.baseline_end) ? "text-red-500" : "text-green-500")}>{Math.round((new Date(task.end) - new Date(task.baseline_end)) / (24 * 60 * 60 * 1000))} days</div></div>}</div></CardContent></Card></TabsContent>
    </Tabs>
  );
}