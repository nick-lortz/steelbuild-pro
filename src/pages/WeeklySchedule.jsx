import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Users,
  Package,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Download,
  FileText,
  TrendingUp
} from 'lucide-react';
import { 
  format, 
  parseISO, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay,
  addWeeks,
  isToday,
  isFuture,
  isPast
} from 'date-fns';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function WeeklySchedule() {
  const { activeProjectId } = useActiveProject();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'list'
  const queryClient = useQueryClient();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 }); // Sunday
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

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
      : base44.entities.WorkPackage.list(),
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

  // Filter tasks for this week
  const weekTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!task.start_date) return false;
      if (task.status === 'completed' || task.status === 'cancelled') return false;
      if (phaseFilter !== 'all' && task.phase !== phaseFilter) return false;
      
      try {
        const taskStart = parseISO(task.start_date);
        const taskEnd = task.end_date ? parseISO(task.end_date) : taskStart;
        
        // Task overlaps with current week
        return (taskStart >= weekStart && taskStart <= weekEnd) ||
               (taskEnd >= weekStart && taskEnd <= weekEnd) ||
               (taskStart <= weekStart && taskEnd >= weekEnd);
      } catch {
        return false;
      }
    });
  }, [tasks, weekStart, weekEnd, phaseFilter]);

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    const grouped = {};
    weekDays.forEach(day => {
      grouped[format(day, 'yyyy-MM-dd')] = [];
    });
    
    weekTasks.forEach(task => {
      try {
        const taskStart = parseISO(task.start_date);
        const taskEnd = task.end_date ? parseISO(task.end_date) : taskStart;
        
        weekDays.forEach(day => {
          if (day >= taskStart && day <= taskEnd) {
            const key = format(day, 'yyyy-MM-dd');
            grouped[key].push(task);
          }
        });
      } catch (e) {
        console.error('Error processing task:', task, e);
      }
    });
    
    return grouped;
  }, [weekTasks, weekDays]);

  // Week stats
  const weekStats = useMemo(() => {
    const completed = weekTasks.filter(t => t.status === 'completed').length;
    const inProgress = weekTasks.filter(t => t.status === 'in_progress').length;
    const notStarted = weekTasks.filter(t => t.status === 'not_started').length;
    const blocked = weekTasks.filter(t => t.status === 'blocked').length;
    
    return {
      total: weekTasks.length,
      completed,
      inProgress,
      notStarted,
      blocked,
      completionRate: weekTasks.length > 0 ? Math.round((completed / weekTasks.length) * 100) : 0
    };
  }, [weekTasks]);

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated');
    }
  });

  const toggleTaskStatus = (task) => {
    const newStatus = task.status === 'completed' ? 'in_progress' : 'completed';
    updateTaskMutation.mutate({
      id: task.id,
      data: { 
        status: newStatus,
        progress_percent: newStatus === 'completed' ? 100 : task.progress_percent
      }
    });
  };

  const goToPreviousWeek = () => setCurrentWeek(addWeeks(currentWeek, -1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const goToThisWeek = () => setCurrentWeek(new Date());

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-[1800px] mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Weekly Schedule</h1>
              <p className="text-xs text-muted-foreground mt-1.5">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousWeek}
                className="h-9"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant={isToday(currentWeek) ? 'default' : 'outline'}
                size="sm"
                onClick={goToThisWeek}
                className="h-9"
              >
                This Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
                className="h-9"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-muted/30 border-b border-border">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="grid grid-cols-5 gap-4">
            <Card className="card-elevated">
              <CardContent className="p-4">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Total Tasks</div>
                <div className="text-3xl font-semibold text-foreground tabular-nums">{weekStats.total}</div>
              </CardContent>
            </Card>
            
            <Card className="card-elevated border-success/20 bg-success/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-[11px] text-success uppercase tracking-wider font-semibold mb-2">
                  <CheckCircle2 size={14} />
                  Completed
                </div>
                <div className="text-3xl font-semibold text-foreground tabular-nums">{weekStats.completed}</div>
              </CardContent>
            </Card>

            <Card className="card-elevated border-info/20 bg-info/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-[11px] text-info uppercase tracking-wider font-semibold mb-2">
                  <TrendingUp size={14} />
                  In Progress
                </div>
                <div className="text-3xl font-semibold text-foreground tabular-nums">{weekStats.inProgress}</div>
              </CardContent>
            </Card>

            <Card className="card-elevated border-destructive/20 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-[11px] text-destructive uppercase tracking-wider font-semibold mb-2">
                  <AlertCircle size={14} />
                  Blocked
                </div>
                <div className="text-3xl font-semibold text-foreground tabular-nums">{weekStats.blocked}</div>
              </CardContent>
            </Card>

            <Card className="card-elevated border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="text-[11px] text-primary uppercase tracking-wider font-semibold mb-2">Completion</div>
                <div className="text-3xl font-semibold text-foreground tabular-nums">{weekStats.completionRate}%</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border-b border-border">
        <div className="max-w-[1800px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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

              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted border border-border rounded-lg text-xs">
                <span className="text-muted-foreground font-medium">View:</span>
                <button
                  onClick={() => setViewMode('day')}
                  className={cn(
                    "px-3 py-1.5 rounded-md font-medium transition-smooth",
                    viewMode === 'day' 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  By Day
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "px-3 py-1.5 rounded-md font-medium transition-smooth",
                    viewMode === 'list' 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  List
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        {viewMode === 'day' ? (
          <div className="grid grid-cols-7 gap-3">
            {weekDays.map((day, dayIdx) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayTasks = tasksByDay[dayKey] || [];
              const isCurrentDay = isToday(day);
              const dayPassed = isPast(day) && !isToday(day);
              const completedToday = dayTasks.filter(t => t.status === 'completed').length;
              const dayProgress = dayTasks.length > 0 ? Math.round((completedToday / dayTasks.length) * 100) : 0;
              
              return (
                <Card
                  key={dayIdx}
                  className={cn(
                    "card-elevated overflow-hidden",
                    isCurrentDay && "border-l-4 border-primary"
                  )}
                >
                  <CardHeader className={cn(
                    "p-4 border-b border-border",
                    isCurrentDay && "bg-primary/5"
                  )}>
                    <div className="text-center">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">
                        {format(day, 'EEE')}
                      </div>
                      <div className={cn(
                        "text-3xl font-semibold tabular-nums",
                        isCurrentDay ? "text-primary" : dayPassed ? "text-muted-foreground/50" : "text-foreground"
                      )}>
                        {format(day, 'd')}
                      </div>
                      {isCurrentDay && (
                        <Badge variant="outline" className="border-primary text-primary text-[10px] mt-2 font-semibold">
                          Today
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 min-h-[400px] space-y-2">
                    {dayTasks.length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                        No tasks
                      </div>
                    ) : (
                      <>
                        <div className="mb-3 p-3 bg-muted/50 rounded-lg text-center">
                          <div className="text-xs text-muted-foreground mb-1.5">Progress</div>
                          <div className="text-2xl font-semibold text-primary tabular-nums">{dayProgress}%</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {completedToday}/{dayTasks.length}
                          </div>
                        </div>
                        {dayTasks.map((task, idx) => {
                          const wp = workPackages.find(w => w.id === task.work_package_id);
                          const isCompleted = task.status === 'completed';
                          const isBlocked = task.status === 'blocked';
                          
                          return (
                            <div
                              key={task.id}
                              className={cn(
                                "p-2.5 rounded-lg border group hover:border-primary/50 transition-smooth cursor-pointer",
                                isCompleted && "bg-success/5 border-success/20",
                                isBlocked && "bg-destructive/5 border-destructive/30",
                                !isCompleted && !isBlocked && "bg-muted/30 border-border"
                              )}
                              onClick={() => toggleTaskStatus(task)}
                            >
                              <div className="flex items-start gap-2">
                                <Checkbox
                                  checked={isCompleted}
                                  className="mt-1"
                                  onClick={(e) => e.stopPropagation()}
                                  onCheckedChange={() => toggleTaskStatus(task)}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    "text-xs font-medium leading-snug mb-1.5",
                                    isCompleted ? "line-through text-muted-foreground" : "text-foreground group-hover:text-primary"
                                  )}>
                                    {task.name}
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    <Badge variant="outline" className={cn(
                                      "text-[10px] font-medium",
                                      task.phase === 'detailing' && "border-blue-500/50 text-blue-400",
                                      task.phase === 'fabrication' && "border-purple-500/50 text-purple-400",
                                      task.phase === 'delivery' && "border-warning/50 text-warning",
                                      task.phase === 'erection' && "border-success/50 text-success"
                                    )}>
                                      {task.phase.substring(0, 3).toUpperCase()}
                                    </Badge>
                                    {wp && (
                                      <Badge variant="outline" className="text-[10px] font-mono">
                                        {wp.package_number}
                                      </Badge>
                                    )}
                                  </div>
                                  {task.estimated_hours > 0 && (
                                    <p className="text-[10px] text-muted-foreground mt-1.5 tabular-nums">
                                      {task.estimated_hours}h est.
                                    </p>
                                  )}
                                </div>
                              </div>
                              {isBlocked && (
                                <div className="mt-2 pt-2 border-t border-destructive/20">
                                  <p className="text-[10px] text-destructive font-semibold flex items-center gap-1">
                                    <AlertCircle size={10} />
                                    Blocked
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {weekTasks.length === 0 ? (
              <Card className="card-elevated">
                <CardContent className="p-12 text-center">
                  <Calendar size={64} className="mx-auto mb-4 text-muted-foreground/40" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Tasks This Week</h3>
                  <p className="text-sm text-muted-foreground">Schedule tasks with start dates in this week</p>
                </CardContent>
              </Card>
            ) : (
              weekTasks
                .sort((a, b) => {
                  const dateA = parseISO(a.start_date);
                  const dateB = parseISO(b.start_date);
                  return dateA - dateB;
                })
                .map(task => {
                  const wp = workPackages.find(w => w.id === task.work_package_id);
                  const project = projects.find(p => p.id === task.project_id);
                  const isCompleted = task.status === 'completed';
                  const isBlocked = task.status === 'blocked';
                  
                  return (
                    <Card
                      key={task.id}
                      className={cn(
                        "card-elevated hover:border-border/80 transition-smooth cursor-pointer group",
                        isCompleted && "opacity-60",
                        isBlocked && "border-destructive/30"
                      )}
                      onClick={() => toggleTaskStatus(task)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={isCompleted}
                            className="mt-1"
                            onClick={(e) => e.stopPropagation()}
                            onCheckedChange={() => toggleTaskStatus(task)}
                          />
                          
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <h3 className={cn(
                                  "text-sm font-medium mb-2",
                                  isCompleted ? "line-through text-muted-foreground" : "text-foreground group-hover:text-primary"
                                )}>
                                  {task.name}
                                </h3>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="text-[10px] font-mono">
                                    {project?.project_number}
                                  </Badge>
                                  {wp && (
                                    <Badge variant="outline" className="text-[10px]">
                                      <Package size={10} className="mr-1" />
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
                                  <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                                    <Clock size={12} />
                                    {format(parseISO(task.start_date), 'EEE, MMM d')}
                                  </span>
                                  {task.estimated_hours > 0 && (
                                    <span className="text-xs text-muted-foreground tabular-nums">
                                      {task.estimated_hours}h est.
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {task.progress_percent > 0 && (
                                  <div className="text-right">
                                    <div className="text-xl font-semibold text-primary tabular-nums">
                                      {task.progress_percent}%
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                      Progress
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {isBlocked && (
                              <div className="p-2.5 bg-destructive/10 border border-destructive/30 rounded-md">
                                <p className="text-xs font-medium text-destructive flex items-center gap-1.5">
                                  <AlertCircle size={14} />
                                  Blocked - cannot proceed
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
            )}
          </div>
        )}

        {weekTasks.length === 0 && (
          <Card className="card-elevated mt-6">
            <CardContent className="p-12 text-center">
              <Calendar size={64} className="mx-auto mb-4 text-muted-foreground/40" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Tasks Scheduled</h3>
              <p className="text-sm text-muted-foreground mb-4">No tasks found for the selected week and filters</p>
              <Button onClick={goToThisWeek}>
                Go to Current Week
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}