import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Filter,
  Layers,
  Search,
  ChevronDown,
  Edit,
  Plus
} from 'lucide-react';
import { format, addWeeks, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, differenceInDays } from 'date-fns';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import TaskForm from '@/components/schedule/TaskForm';

export default function LookAheadPlanning() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [weeksAhead, setWeeksAhead] = useState(4);
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showConstraintsOnly, setShowConstraintsOnly] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState([0]);
  const [editingTask, setEditingTask] = useState(null);
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', activeProjectId],
    queryFn: () => activeProjectId 
      ? base44.entities.Task.filter({ project_id: activeProjectId }, 'start_date')
      : base44.entities.Task.list('start_date'),
    staleTime: 2 * 60 * 1000
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 10 * 60 * 1000
  });

  const { data: workPackages = [] } = useQuery({
    queryKey: ['work-packages', activeProjectId],
    queryFn: () => activeProjectId 
      ? base44.entities.WorkPackage.filter({ project_id: activeProjectId })
      : [],
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000
  });

  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawing-sets', activeProjectId],
    queryFn: () => activeProjectId 
      ? base44.entities.DrawingSet.filter({ project_id: activeProjectId })
      : [],
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', activeProjectId],
    queryFn: () => activeProjectId 
      ? base44.entities.Delivery.filter({ project_id: activeProjectId })
      : [],
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', activeProjectId],
    queryFn: () => activeProjectId 
      ? base44.entities.RFI.filter({ project_id: activeProjectId })
      : [],
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditingTask(null);
      toast.success('Task updated');
    }
  });

  const lookAheadWindow = useMemo(() => {
    const today = new Date();
    const endDate = addWeeks(today, weeksAhead);
    return {
      start: startOfWeek(today, { weekStartsOn: 1 }),
      end: endOfWeek(endDate, { weekStartsOn: 1 })
    };
  }, [weeksAhead]);

  const lookAheadTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!task.start_date) return false;
      
      try {
        const taskStart = parseISO(task.start_date);
        const inWindow = isWithinInterval(taskStart, lookAheadWindow);
        
        if (!inWindow) return false;
        if (task.status === 'completed' || task.status === 'cancelled') return false;
        if (phaseFilter !== 'all' && task.phase !== phaseFilter) return false;
        if (searchTerm && !task.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        
        return true;
      } catch {
        return false;
      }
    });
  }, [tasks, lookAheadWindow, phaseFilter, searchTerm]);

  const taskAnalysis = useMemo(() => {
    return lookAheadTasks.map(task => {
      const constraints = [];
      const wp = workPackages.find(w => w.id === task.work_package_id);
      
      if (wp?.linked_drawing_set_ids?.length > 0) {
        const linkedSets = drawingSets.filter(ds => wp.linked_drawing_set_ids.includes(ds.id));
        const notFFF = linkedSets.filter(ds => ds.status !== 'FFF');
        if (notFFF.length > 0) {
          constraints.push({
            type: 'drawings',
            severity: 'critical',
            message: `${notFFF.length} drawing set(s) not FFF`,
            details: notFFF.map(ds => ds.set_name).join(', ')
          });
        }
      }
      
      const linkedRFIs = (task.linked_rfi_ids || []).map(id => rfis.find(r => r.id === id)).filter(Boolean);
      const openRFIs = linkedRFIs.filter(r => r.status !== 'answered' && r.status !== 'closed');
      if (openRFIs.length > 0) {
        const blockerRFIs = openRFIs.filter(r => r.blocker_info?.is_blocker);
        if (blockerRFIs.length > 0) {
          constraints.push({
            type: 'rfi',
            severity: 'critical',
            message: `${blockerRFIs.length} blocker RFI(s)`,
            details: blockerRFIs.map(r => `RFI ${r.rfi_number}: ${r.subject}`).join('; ')
          });
        }
      }
      
      const taskDeliveries = deliveries.filter(d => 
        d.package_name === wp?.package_number || (task.linked_delivery_ids || []).includes(d.id)
      );
      const pendingDeliveries = taskDeliveries.filter(d => d.delivery_status !== 'received' && d.delivery_status !== 'closed');
      if (task.phase === 'erection' && pendingDeliveries.length > 0) {
        constraints.push({
          type: 'delivery',
          severity: 'critical',
          message: `Material not received`,
          details: pendingDeliveries.map(d => d.package_name).join(', ')
        });
      }
      
      if (task.predecessor_ids?.length > 0) {
        const predecessors = task.predecessor_ids.map(id => tasks.find(t => t.id === id)).filter(Boolean);
        const incomplete = predecessors.filter(p => p.status !== 'completed');
        if (incomplete.length > 0) {
          constraints.push({
            type: 'dependency',
            severity: 'warning',
            message: `${incomplete.length} predecessor(s) incomplete`,
            details: incomplete.map(t => t.name).join('; ')
          });
        }
      }
      
      const readinessScore = constraints.filter(c => c.severity === 'critical').length === 0 ? 
        (constraints.length === 0 ? 100 : 60) : 0;
      
      return {
        ...task,
        constraints,
        readinessScore,
        isReady: readinessScore === 100,
        hasIssues: constraints.some(c => c.severity === 'critical'),
        daysUntilStart: task.start_date ? differenceInDays(parseISO(task.start_date), new Date()) : 999
      };
    });
  }, [lookAheadTasks, workPackages, drawingSets, rfis, deliveries, tasks]);

  const weeklyGroups = useMemo(() => {
    const weeks = [];
    let currentWeekStart = lookAheadWindow.start;
    
    while (currentWeekStart <= lookAheadWindow.end) {
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      const weekTasks = taskAnalysis.filter(task => {
        try {
          const taskStart = parseISO(task.start_date);
          return isWithinInterval(taskStart, { start: currentWeekStart, end: weekEnd });
        } catch {
          return false;
        }
      });
      
      weeks.push({
        start: currentWeekStart,
        end: weekEnd,
        label: format(currentWeekStart, 'MMM d') + ' - ' + format(weekEnd, 'MMM d'),
        tasks: weekTasks,
        readyCount: weekTasks.filter(t => t.isReady).length,
        blockedCount: weekTasks.filter(t => t.hasIssues).length
      });
      
      currentWeekStart = addWeeks(currentWeekStart, 1);
    }
    
    return weeks;
  }, [taskAnalysis, lookAheadWindow]);

  const stats = useMemo(() => {
    const filteredTasks = showConstraintsOnly ? taskAnalysis.filter(t => t.constraints.length > 0) : taskAnalysis;
    return {
      total: taskAnalysis.length,
      ready: taskAnalysis.filter(t => t.isReady).length,
      blocked: taskAnalysis.filter(t => t.hasIssues).length,
      needsAttention: taskAnalysis.filter(t => t.constraints.length > 0 && !t.hasIssues).length,
      filtered: filteredTasks.length
    };
  }, [taskAnalysis, showConstraintsOnly]);

  const displayTasks = showConstraintsOnly ? taskAnalysis.filter(t => t.constraints.length > 0) : taskAnalysis;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-[1800px] mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Look-Ahead Planning</h1>
              <p className="text-xs text-muted-foreground mt-1.5">
                {weeksAhead}-week window · {stats.total} tasks · {stats.blocked} blocked
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
                <SelectTrigger className="w-64 h-9">
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Projects</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={weeksAhead.toString()} onValueChange={(v) => setWeeksAhead(parseInt(v))}>
                <SelectTrigger className="w-28 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Weeks</SelectItem>
                  <SelectItem value="4">4 Weeks</SelectItem>
                  <SelectItem value="6">6 Weeks</SelectItem>
                  <SelectItem value="8">8 Weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-muted/30 border-b border-border">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            <Card className="card-elevated border-success/20 bg-success/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-success mb-2">
                  <CheckCircle2 size={14} />
                  Ready
                </div>
                <div className="text-3xl font-semibold text-foreground tabular-nums">{stats.ready}</div>
                <div className="text-xs text-muted-foreground mt-1">{Math.round((stats.ready / stats.total) * 100) || 0}% of total</div>
              </CardContent>
            </Card>
            <Card className="card-elevated border-destructive/20 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-destructive mb-2">
                  <XCircle size={14} />
                  Blocked
                </div>
                <div className="text-3xl font-semibold text-foreground tabular-nums">{stats.blocked}</div>
              </CardContent>
            </Card>
            <Card className="card-elevated border-warning/20 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-warning mb-2">
                  <AlertTriangle size={14} />
                  Attention
                </div>
                <div className="text-3xl font-semibold text-foreground tabular-nums">{stats.needsAttention}</div>
              </CardContent>
            </Card>
            <Card className="card-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                  <Layers size={14} />
                  Total
                </div>
                <div className="text-3xl font-semibold text-foreground tabular-nums">{stats.total}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border-b border-border">
        <div className="max-w-[1800px] mx-auto px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Phases</SelectItem>
                <SelectItem value="detailing">Detailing</SelectItem>
                <SelectItem value="fabrication">Fabrication</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="erection">Erection</SelectItem>
                <SelectItem value="closeout">Closeout</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={showConstraintsOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowConstraintsOnly(!showConstraintsOnly)}
              className="h-9 gap-2"
            >
              <AlertTriangle size={14} />
              {showConstraintsOnly ? 'Issues Only' : 'Show Issues'}
            </Button>
          </div>
        </div>
      </div>

      {/* Weekly Timeline */}
      <div className="max-w-[1800px] mx-auto px-6 py-4">
        <div className="space-y-2">
          {weeklyGroups.map((week, weekIdx) => {
            const isExpanded = expandedWeeks.includes(weekIdx);
            const isCurrentWeek = weekIdx === 0;
            
            return (
              <Card 
                key={weekIdx} 
                className={cn(
                  "card-elevated",
                  isCurrentWeek && "border-l-4 border-primary"
                )}
              >
                <button
                  onClick={() => setExpandedWeeks(prev => 
                    prev.includes(weekIdx) ? prev.filter(w => w !== weekIdx) : [...prev, weekIdx]
                  )}
                  className="w-full"
                >
                  <CardHeader className="p-4 hover:bg-muted/30 transition-smooth">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ChevronDown 
                          size={18} 
                          className={cn(
                            "text-muted-foreground transition-transform",
                            !isExpanded && "-rotate-90"
                          )}
                        />
                        <CardTitle className="text-base font-semibold">
                          {isCurrentWeek && <span className="text-primary mr-2">▸</span>}
                          Week {weekIdx + 1}
                          <span className="text-muted-foreground font-normal ml-2 text-sm">{week.label}</span>
                        </CardTitle>
                        {isCurrentWeek && (
                          <Badge variant="outline" className="border-primary text-primary text-[10px] font-semibold">
                            Current Week
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-success rounded-full" />
                          <span className="text-muted-foreground tabular-nums">{week.readyCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-destructive rounded-full" />
                          <span className="text-muted-foreground tabular-nums">{week.blockedCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                          <span className="text-muted-foreground tabular-nums">{week.tasks.length}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </button>
                
                {isExpanded && (
                  <CardContent className="p-0 border-t border-border">
                    {week.tasks.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        No tasks scheduled
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {week.tasks.sort((a, b) => a.daysUntilStart - b.daysUntilStart).map(task => {
                          const wp = workPackages.find(w => w.id === task.work_package_id);
                          const project = projects.find(p => p.id === task.project_id);
                          
                          return (
                            <div
                              key={task.id}
                              className={cn(
                                "p-4 hover:bg-muted/40 transition-smooth group",
                                task.hasIssues && "bg-destructive/5",
                                task.isReady && "bg-success/5"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                {/* Readiness */}
                                <div className="flex flex-col items-center gap-1 pt-1">
                                  <div className={cn(
                                    "w-12 h-12 rounded-lg flex items-center justify-center font-semibold text-sm border-2",
                                    task.isReady 
                                      ? "bg-success/10 border-success text-success" 
                                      : task.hasIssues
                                      ? "bg-destructive/10 border-destructive text-destructive"
                                      : "bg-warning/10 border-warning text-warning"
                                  )}>
                                    {task.readinessScore}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground tabular-nums">
                                    {task.daysUntilStart}d
                                  </span>
                                </div>

                                {/* Task Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex-1">
                                      <h3 className="font-medium text-foreground text-sm mb-2 group-hover:text-primary transition-smooth">
                                        {task.name}
                                      </h3>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className="text-[10px] font-mono">
                                          {project?.project_number}
                                        </Badge>
                                        {wp && (
                                          <Badge variant="outline" className="text-[10px]">
                                            {wp.package_number}
                                          </Badge>
                                        )}
                                        <Badge variant="outline" className={cn(
                                          "text-[10px] font-medium",
                                          task.phase === 'detailing' && "border-blue-500/50 text-blue-400",
                                          task.phase === 'fabrication' && "border-purple-500/50 text-purple-400",
                                          task.phase === 'delivery' && "border-warning/50 text-warning",
                                          task.phase === 'erection' && "border-success/50 text-success"
                                        )}>
                                          {task.phase}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground font-mono">
                                          {format(parseISO(task.start_date), 'MMM d')} 
                                          {task.end_date && ` → ${format(parseISO(task.end_date), 'MMM d')}`}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Constraints */}
                                  {task.constraints.length > 0 && (
                                    <div className="space-y-2 mt-3">
                                      {task.constraints.map((constraint, idx) => (
                                        <div
                                          key={idx}
                                          className={cn(
                                            "flex items-start gap-2 p-2.5 rounded-md border text-xs",
                                            constraint.severity === 'critical' 
                                              ? "bg-destructive/5 border-destructive/30" 
                                              : "bg-warning/5 border-warning/30"
                                          )}
                                        >
                                          {constraint.severity === 'critical' ? (
                                            <XCircle size={14} className="text-destructive mt-0.5 flex-shrink-0" />
                                          ) : (
                                            <AlertTriangle size={14} className="text-warning mt-0.5 flex-shrink-0" />
                                          )}
                                          <div className="flex-1">
                                            <p className={cn(
                                              "font-medium",
                                              constraint.severity === 'critical' ? "text-destructive" : "text-warning"
                                            )}>
                                              {constraint.message}
                                            </p>
                                            {constraint.details && (
                                              <p className="text-muted-foreground mt-1 text-xs">{constraint.details}</p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Actions */}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingTask(task)}
                                  className="opacity-0 group-hover:opacity-100 h-8"
                                >
                                  <Edit size={14} />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {displayTasks.length === 0 && (
          <Card className="card-elevated mt-6">
            <CardContent className="p-12 text-center">
              <Calendar size={64} className="mx-auto mb-4 text-muted-foreground/40" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Tasks in Window</h3>
              <p className="text-sm text-muted-foreground">
                {showConstraintsOnly 
                  ? 'No tasks with constraints - all clear!' 
                  : `Add tasks with start dates in the next ${weeksAhead} weeks`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Task Sheet */}
      <Sheet open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Edit Task</SheetTitle>
          </SheetHeader>
          {editingTask && (
            <div className="mt-6">
              <TaskForm
                task={editingTask}
                projectId={activeProjectId}
                onSubmit={(data) => updateTaskMutation.mutate({ id: editingTask.id, data })}
                onCancel={() => setEditingTask(null)}
                isLoading={updateTaskMutation.isPending}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}