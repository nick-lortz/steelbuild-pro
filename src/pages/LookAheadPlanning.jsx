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
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black">
      {/* Header */}
      <div className="border-b border-zinc-800/50 bg-gradient-to-b from-zinc-900 to-zinc-950/50">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Look-Ahead Planning</h1>
              <p className="text-sm text-zinc-500 font-mono mt-1">
                {weeksAhead}-week window • {stats.total} tasks • {stats.blocked} blocked
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
                <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800 text-white">
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value={null}>All Projects</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={weeksAhead.toString()} onValueChange={(v) => setWeeksAhead(parseInt(v))}>
                <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="2">2 weeks</SelectItem>
                  <SelectItem value="4">4 weeks</SelectItem>
                  <SelectItem value="6">6 weeks</SelectItem>
                  <SelectItem value="8">8 weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="border-b border-zinc-800/50 bg-zinc-950/50">
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <div className="grid grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
              <CardContent className="p-3">
                <div className="text-[9px] text-green-400 uppercase tracking-widest font-bold mb-0.5 flex items-center gap-1">
                  <CheckCircle2 size={9} />
                  READY
                </div>
                <div className="text-2xl font-black text-green-400">{stats.ready}</div>
                <div className="text-[9px] text-zinc-600">{Math.round((stats.ready / stats.total) * 100) || 0}%</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
              <CardContent className="p-3">
                <div className="text-[9px] text-red-400 uppercase tracking-widest font-bold mb-0.5 flex items-center gap-1">
                  <XCircle size={9} />
                  BLOCKED
                </div>
                <div className="text-2xl font-black text-red-400">{stats.blocked}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
              <CardContent className="p-3">
                <div className="text-[9px] text-amber-400 uppercase tracking-widest font-bold mb-0.5 flex items-center gap-1">
                  <AlertTriangle size={9} />
                  ATTENTION
                </div>
                <div className="text-2xl font-black text-amber-400">{stats.needsAttention}</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-3">
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5 flex items-center gap-1">
                  <Layers size={9} />
                  TOTAL
                </div>
                <div className="text-2xl font-black text-white">{stats.total}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-zinc-800/50 bg-zinc-950/30">
        <div className="max-w-[1800px] mx-auto px-8 py-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-zinc-900 border-zinc-800 h-8 text-xs"
              />
            </div>
            
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger className="w-36 bg-zinc-900 border-zinc-800 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
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
              className={cn(
                "h-8 text-[10px] uppercase tracking-wider font-bold",
                showConstraintsOnly ? "bg-red-500 hover:bg-red-600 text-white" : "border-zinc-700 text-zinc-400"
              )}
            >
              <AlertTriangle size={12} className="mr-1" />
              {showConstraintsOnly ? 'ISSUES ONLY' : 'SHOW ISSUES'}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-8 py-6">
        <div className="space-y-2">
          {weeklyGroups.map((week, weekIdx) => {
            const isExpanded = expandedWeeks.includes(weekIdx);
            const isCurrentWeek = weekIdx === 0;
            
            return (
              <Card 
                key={weekIdx} 
                className={cn(
                  "bg-zinc-900 border-zinc-800",
                  isCurrentWeek && "border-amber-500 border-l-4"
                )}
              >
                <button
                  onClick={() => setExpandedWeeks(prev => 
                    prev.includes(weekIdx) ? prev.filter(w => w !== weekIdx) : [...prev, weekIdx]
                  )}
                  className="w-full"
                >
                  <CardHeader className="p-3 hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ChevronDown 
                          size={16} 
                          className={cn(
                            "text-zinc-500 transition-transform",
                            !isExpanded && "-rotate-90"
                          )}
                        />
                        <CardTitle className="text-sm font-black uppercase tracking-wide">
                          {isCurrentWeek && <span className="text-amber-500 mr-2">►</span>}
                          WEEK {weekIdx + 1}
                          <span className="text-zinc-600 font-normal ml-2 text-xs">{week.label}</span>
                        </CardTitle>
                        {isCurrentWeek && (
                          <Badge className="bg-amber-500 text-black font-bold text-[9px] px-2 py-0">
                            THIS WEEK
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="text-zinc-400">{week.readyCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-red-500 rounded-full" />
                          <span className="text-zinc-400">{week.blockedCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-zinc-500 rounded-full" />
                          <span className="text-zinc-400">{week.tasks.length}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </button>
                
                {isExpanded && (
                  <CardContent className="p-0 border-t border-zinc-800">
                    {week.tasks.length === 0 ? (
                      <div className="p-8 text-center text-zinc-600 text-xs">
                        No tasks scheduled
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-800">
                        {week.tasks.sort((a, b) => a.daysUntilStart - b.daysUntilStart).map(task => {
                          const wp = workPackages.find(w => w.id === task.work_package_id);
                          const project = projects.find(p => p.id === task.project_id);
                          
                          return (
                            <div
                              key={task.id}
                              className={cn(
                                "p-3 hover:bg-zinc-800/50 transition-colors group",
                                task.hasIssues && "bg-red-500/5",
                                task.isReady && "bg-green-500/5"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                {/* Readiness */}
                                <div className="flex flex-col items-center gap-0.5 pt-0.5">
                                  <div className={cn(
                                    "w-10 h-10 rounded flex items-center justify-center font-black text-sm border",
                                    task.isReady 
                                      ? "bg-green-500/20 border-green-500 text-green-400" 
                                      : task.hasIssues
                                      ? "bg-red-500/20 border-red-500 text-red-400"
                                      : "bg-amber-500/20 border-amber-500 text-amber-400"
                                  )}>
                                    {task.readinessScore}
                                  </div>
                                  <span className="text-[8px] text-zinc-600 uppercase tracking-wider font-bold">
                                    {task.daysUntilStart}d
                                  </span>
                                </div>

                                {/* Task Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-3 mb-1">
                                    <div className="flex-1">
                                      <h3 className="font-bold text-white text-sm mb-1 group-hover:text-amber-400 transition-colors">
                                        {task.name}
                                      </h3>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0">
                                          {project?.project_number}
                                        </Badge>
                                        {wp && (
                                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                            {wp.package_number}
                                          </Badge>
                                        )}
                                        <Badge className={cn(
                                          "text-[9px] font-bold uppercase px-1.5 py-0",
                                          task.phase === 'detailing' && "bg-blue-500/20 text-blue-400",
                                          task.phase === 'fabrication' && "bg-purple-500/20 text-purple-400",
                                          task.phase === 'delivery' && "bg-amber-500/20 text-amber-400",
                                          task.phase === 'erection' && "bg-green-500/20 text-green-400"
                                        )}>
                                          {task.phase}
                                        </Badge>
                                        <span className="text-[10px] text-zinc-600 font-mono">
                                          {format(parseISO(task.start_date), 'MMM d')} 
                                          {task.end_date && ` → ${format(parseISO(task.end_date), 'MMM d')}`}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Constraints */}
                                  {task.constraints.length > 0 && (
                                    <div className="space-y-1 mt-2">
                                      {task.constraints.map((constraint, idx) => (
                                        <div
                                          key={idx}
                                          className={cn(
                                            "flex items-start gap-2 p-2 rounded text-[10px]",
                                            constraint.severity === 'critical' 
                                              ? "bg-red-500/10 border border-red-500/30" 
                                              : "bg-amber-500/10 border border-amber-500/30"
                                          )}
                                        >
                                          {constraint.severity === 'critical' ? (
                                            <XCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                                          ) : (
                                            <AlertTriangle size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
                                          )}
                                          <div className="flex-1">
                                            <p className={cn(
                                              "font-bold uppercase tracking-wider",
                                              constraint.severity === 'critical' ? "text-red-400" : "text-amber-400"
                                            )}>
                                              {constraint.message}
                                            </p>
                                            {constraint.details && (
                                              <p className="text-zinc-500 mt-0.5 text-[9px]">{constraint.details}</p>
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
                                  className="opacity-0 group-hover:opacity-100 h-7 px-2 text-xs"
                                >
                                  <Edit size={12} className="mr-1" />
                                  EDIT
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
          <Card className="bg-zinc-900 border-zinc-800 mt-4">
            <CardContent className="p-12 text-center">
              <Calendar size={64} className="mx-auto mb-4 text-zinc-700" />
              <h3 className="text-lg font-bold text-zinc-400 mb-2">No Tasks in Window</h3>
              <p className="text-xs text-zinc-600">
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
        <SheetContent className="bg-zinc-900 border-zinc-800 overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="text-white">Edit Task</SheetTitle>
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