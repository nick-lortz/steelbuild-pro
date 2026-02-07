import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { 
  RefreshCw, Calendar, AlertCircle, Download, Mail, Plus, Edit, Trash2,
  CheckCircle, AlertTriangle, Zap, Clock, Target,
  ChevronDown, ChevronUp, Package
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ReportScheduler from '@/components/reports/ReportScheduler';

export default function LookAheadPlanning() {
  const [selectedProject, setSelectedProject] = useState('');
  const [windowWeeks, setWindowWeeks] = useState(4);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [showReportScheduler, setShowReportScheduler] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
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
    data: lookAheadData = {}, 
    isLoading, 
    isFetching, 
    refetch 
  } = useQuery({
    queryKey: ['lookAheadData', selectedProject, windowWeeks],
    queryFn: async () => {
      const response = await base44.functions.invoke('getLookAheadData', {
        projectId: selectedProject === 'all' ? null : selectedProject,
        windowWeeks,
        allProjects: selectedProject === 'all'
      });

      // Unwrap response.data first
      const d = response?.data ?? response;
      
      // Then unwrap nested data/body/result
      const normalized = (d?.data || d?.body || d?.result) || d;

      console.debug('[getLookAheadData] normalized:', normalized);
      return normalized;
    },
    enabled: !!selectedProject,
    staleTime: 2 * 60 * 1000,
    retry: 2
  });

  const { 
    project = {}, 
    window = {}, 
    snapshot = {}, 
    tasks = [],
    constraints = [],
    ai = {}, 
    warnings = [] 
  } = lookAheadData;

  const tasksByWeek = React.useMemo(() => {
    const weeks = [];
    for (let i = 0; i < windowWeeks; i++) {
      weeks[i] = tasks.filter(t => t.weekIndex === i);
    }
    return weeks;
  }, [tasks, windowWeeks]);

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lookAheadData', selectedProject, windowWeeks] });
      toast.success('Task created');
      setShowNewTask(false);
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lookAheadData', selectedProject, windowWeeks] });
      toast.success('Task updated');
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    }
  });

  const handleRefresh = () => {
    refetch();
    setLastRefreshed(new Date());
    toast.success('Look-ahead refreshed');
  };

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      toast.success('Look-ahead report generated');
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
          <div><h1 className="text-3xl font-bold tracking-tight">Look-Ahead Planning</h1><p className="text-muted-foreground mt-2">2–6 Week Commitment Window</p></div>
          <Card className="max-w-md"><CardContent className="pt-6"><p className="text-sm font-medium mb-4">Select a project or view all</p><Select value={selectedProject} onValueChange={setSelectedProject}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="all">✓ All Projects ({projects.length})</SelectItem><div className="border-t my-1" />{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>)}</SelectContent></Select></CardContent></Card>
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
            <h1 className="text-3xl font-bold tracking-tight">Look-Ahead Planning</h1>
            <p className="text-muted-foreground mt-2">Weekly Commitments • Constraints • Readiness</p>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-sm text-muted-foreground">
                {selectedProject === 'all' ? `Portfolio (${projects.length} projects)` : `${project.project_number} • ${project.name}`}
              </p>
              <div className={cn("w-2 h-2 rounded-full", warnings.length === 0 ? "bg-green-500" : "bg-yellow-500")} />
              <span className="text-xs text-muted-foreground">Data {warnings.length === 0 ? 'Complete' : 'Partial'}</span>
              <span className="text-xs text-muted-foreground">• Updated: {lastRefreshed.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedProject} onValueChange={setSelectedProject}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">✓ All Projects ({projects.length})</SelectItem><div className="border-t my-1" />{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>)}</SelectContent></Select>
            <Select value={windowWeeks.toString()} onValueChange={(v) => setWindowWeeks(parseInt(v))}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="2">2 Weeks</SelectItem><SelectItem value="4">4 Weeks</SelectItem><SelectItem value="6">6 Weeks</SelectItem></SelectContent></Select>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}><RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} /></Button>
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
            {/* Readiness Snapshot */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Readiness Snapshot</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Ready Tasks</p><div className="text-2xl font-bold text-green-500">{snapshot.readyTasks || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Blocked Tasks</p><div className="text-2xl font-bold text-red-500">{snapshot.blockedTasks || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Critical Constraints</p><div className="text-2xl font-bold text-orange-500">{snapshot.criticalConstraints || 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground uppercase mb-1">Due This Week</p><div className="text-2xl font-bold text-blue-500">{snapshot.tasksDueThisWeek || 0}</div></CardContent></Card>
              </div>
            </div>

            {/* AI Look-Ahead Coach */}
            {ai.recommendations && ai.recommendations.length > 0 && (
              <Collapsible open={showAI} onOpenChange={setShowAI}>
                <Card className="border-purple-500/30">
                  <CardHeader>
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-purple-500" />AI Look-Ahead Coach</CardTitle>
                      {showAI ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="space-y-4">
                        <div><p className="text-sm font-medium mb-2">Window Analysis</p><p className="text-sm text-muted-foreground">{ai.summary}</p><Badge variant="outline" className="capitalize mt-2">{ai.confidence} confidence</Badge></div>
                        {ai.predictions && ai.predictions.length > 0 && (
                          <div><p className="text-sm font-medium mb-2">Predicted Slips</p><div className="space-y-2">{ai.predictions.map((pred, idx) => <div key={idx} className="flex items-start gap-3 p-2 rounded bg-muted/30"><AlertTriangle className="h-4 w-4 mt-0.5 text-red-500" /><div className="flex-1"><p className="text-sm font-medium">{pred.task_name}</p><p className="text-xs text-muted-foreground">{pred.blockers}</p></div></div>)}</div></div>
                        )}
                        <div><p className="text-sm font-medium mb-2">Recommended Actions</p><div className="space-y-3">{ai.recommendations.map((rec, idx) => <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"><Badge variant={rec.priority === 'critical' || rec.priority === 'high' ? 'destructive' : 'default'} className="text-xs mt-1">{rec.priority}</Badge><div className="flex-1"><p className="font-semibold text-sm">{rec.action}</p><p className="text-xs text-green-600 mt-1">Impact: {rec.impact}</p></div></div>)}</div></div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Weekly Buckets Board */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Weekly Commitment Buckets</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {tasksByWeek.map((weekTasks, idx) => (
                  <div key={idx}>
                    <div className="mb-3 flex items-center gap-2">
                      <h3 className="font-semibold text-sm">Week {idx + 1}</h3>
                      <Badge variant="outline" className="text-xs">{weekTasks.length}</Badge>
                      {idx === 0 && <Badge className="text-xs bg-amber-500 text-black">This Week</Badge>}
                    </div>
                    <div className="space-y-2">
                      {weekTasks.length === 0 ? (
                        <Card className="bg-muted/20 border-dashed"><CardContent className="py-6 text-center"><p className="text-xs text-muted-foreground">No tasks</p></CardContent></Card>
                      ) : (
                        weekTasks.map((task) => (
                          <Card key={task.id} className={cn("cursor-pointer hover:border-amber-500 transition-colors", !task.is_ready && "border-red-500/50")}>
                            <CardContent className="pt-3 pb-3">
                              <div className="space-y-2">
                                <div>
                                  {task.project_number && <p className="text-xs text-amber-500 font-bold mb-1">{task.project_number} • {task.project_name}</p>}
                                  <p className="font-semibold text-sm mb-1">{task.name}</p>
                                  <p className="text-xs text-muted-foreground">{task.owner}</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <Badge variant={task.is_ready ? 'default' : 'destructive'} className="text-xs">
                                    {task.is_ready ? 'Ready' : 'Blocked'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs capitalize">{task.phase}</Badge>
                                </div>
                                {task.readinessFlags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {task.readinessFlags.map((flag, fidx) => (
                                      <Badge key={fidx} variant="destructive" className="text-xs">{flag.label}</Badge>
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

            {/* Constraints Panel */}
            {constraints.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-red-500" />
                  Constraints ({constraints.length})
                </h2>
                <Card>
                  <CardContent className="pt-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b">
                          <tr className="text-left">
                            <th className="pb-2 font-medium">Type</th>
                            <th className="pb-2 font-medium">Task</th>
                            <th className="pb-2 font-medium">Constraint</th>
                            <th className="pb-2 font-medium">Owner</th>
                            <th className="pb-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {constraints.slice(0, 20).map((c) => (
                            <tr key={c.id} className="border-b last:border-0">
                              <td className="py-2">
                                <Badge variant="outline" className="text-xs capitalize">{c.type}</Badge>
                              </td>
                              <td className="py-2 font-medium">{c.task_name}</td>
                              <td className="py-2 text-muted-foreground">{c.label}</td>
                              <td className="py-2">{c.owner}</td>
                              <td className="py-2">
                                <Badge variant={c.status === 'open' ? 'destructive' : 'default'} className="text-xs capitalize">
                                  {c.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}

        {/* New Task Sheet */}
        <Sheet open={showNewTask} onOpenChange={setShowNewTask}>
          <SheetContent className="w-[600px] sm:max-w-[600px]"><SheetHeader><SheetTitle>Add Look-Ahead Task</SheetTitle></SheetHeader><NewTaskForm projectId={selectedProject} windowStart={window.start} onSubmit={(data) => createTaskMutation.mutate(data)} onCancel={() => setShowNewTask(false)} /></SheetContent>
        </Sheet>

        <Sheet open={showReportScheduler} onOpenChange={setShowReportScheduler}><SheetContent><SheetHeader><SheetTitle>Schedule Look-Ahead Report</SheetTitle></SheetHeader><ReportScheduler onClose={() => setShowReportScheduler(false)} /></SheetContent></Sheet>
      </div>
    </ErrorBoundary>
  );
}

function NewTaskForm({ projectId, windowStart, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    name: '',
    start_date: windowStart || new Date().toISOString().split('T')[0],
    end_date: '',
    phase: 'fabrication',
    status: 'not_started'
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Name required';
    if (!formData.start_date) newErrors.start_date = 'Start date required';
    if (!formData.end_date) newErrors.end_date = 'End date required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <div><Label>Task Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={errors.name ? 'border-red-500' : ''} />{errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}</div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Start Date *</Label><Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className={errors.start_date ? 'border-red-500' : ''} />{errors.start_date && <p className="text-xs text-red-500 mt-1">{errors.start_date}</p>}</div>
        <div><Label>End Date *</Label><Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className={errors.end_date ? 'border-red-500' : ''} />{errors.end_date && <p className="text-xs text-red-500 mt-1">{errors.end_date}</p>}</div>
      </div>
      <div><Label>Phase</Label><Select value={formData.phase} onValueChange={(v) => setFormData({ ...formData, phase: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="detailing">Detailing</SelectItem><SelectItem value="fabrication">Fabrication</SelectItem><SelectItem value="delivery">Delivery</SelectItem><SelectItem value="erection">Erection</SelectItem><SelectItem value="closeout">Closeout</SelectItem></SelectContent></Select></div>
      <div className="flex gap-2 pt-4"><Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button><Button type="submit" className="flex-1">Add Task</Button></div>
    </form>
  );
}