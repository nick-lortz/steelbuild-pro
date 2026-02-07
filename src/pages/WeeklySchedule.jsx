import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  TrendingUp,
  FileText
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

function SectionHeader({ icon: Icon, title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b border-border">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-4 w-4 text-amber-500" /> : null}
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        </div>
        {subtitle ? <p className="text-xs text-muted-foreground mt-1">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function MetricCard({ label, value, tone, icon: Icon }) {
  const toneClass =
    tone === 'danger' ? 'border-red-500/30 bg-red-500/5' :
    tone === 'good' ? 'border-green-500/30 bg-green-500/5' :
    tone === 'info' ? 'border-blue-500/30 bg-blue-500/5' :
    tone === 'warn' ? 'border-amber-500/30 bg-amber-500/5' :
    'border-border bg-card';

  const valueClass =
    tone === 'danger' ? 'text-red-500' :
    tone === 'good' ? 'text-green-500' :
    tone === 'info' ? 'text-blue-500' :
    tone === 'warn' ? 'text-amber-500' :
    'text-foreground';

  return (
    <Card className={cn("border", toneClass)}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
            <p className={cn("text-2xl font-bold", valueClass)}>{value}</p>
          </div>
          {Icon && <Icon className="h-4 w-4 opacity-50" />}
        </div>
      </CardContent>
    </Card>
  );
}

export default function WeeklySchedule() {
  const { activeProjectId } = useActiveProject();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [viewMode, setViewMode] = useState('day');
  const queryClient = useQueryClient();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
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

  const weekTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!task.start_date) return false;
      if (task.status === 'completed' || task.status === 'cancelled') return false;
      if (phaseFilter !== 'all' && task.phase !== phaseFilter) return false;

      try {
        const taskStart = parseISO(task.start_date);
        const taskEnd = task.end_date ? parseISO(task.end_date) : taskStart;

        return (taskStart >= weekStart && taskStart <= weekEnd) ||
               (taskEnd >= weekStart && taskEnd <= weekEnd) ||
               (taskStart <= weekStart && taskEnd >= weekEnd);
      } catch {
        return false;
      }
    });
  }, [tasks, weekStart, weekEnd, phaseFilter]);

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
    },
    onError: (e) => toast.error(e?.message || 'Failed to update task')
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
    <div className="space-y-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Weekly Schedule</h1>
          <p className="text-muted-foreground mt-2">
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={isToday(currentWeek) ? "default" : "outline"}
            onClick={goToThisWeek}
          >
            This Week
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted">
            <button
              onClick={() => setViewMode('day')}
              className={cn(
                "px-3 py-1 rounded text-xs font-semibold transition-colors",
                viewMode === 'day'
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              DAY
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "px-3 py-1 rounded text-xs font-semibold transition-colors",
                viewMode === 'list'
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              LIST
            </button>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard label="Total Tasks" value={weekStats.total} tone="info" />
        <MetricCard label="Completed" value={weekStats.completed} tone="good" icon={CheckCircle2} />
        <MetricCard label="In Progress" value={weekStats.inProgress} tone="info" icon={TrendingUp} />
        <MetricCard label="Blocked" value={weekStats.blocked} tone={weekStats.blocked > 0 ? "danger" : undefined} icon={AlertCircle} />
        <MetricCard label="Completion" value={`${weekStats.completionRate}%`} tone="warn" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-44">
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
      </div>

      {/* Content */}
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
                  "bg-card border-border overflow-hidden flex flex-col",
                  isCurrentDay && "border-2 border-amber-500/60 shadow-md shadow-amber-500/10"
                )}
              >
                <div className={cn(
                  "p-3 border-b border-border text-center",
                  isCurrentDay && "bg-amber-500/5"
                )}>
                  <div className="text-xs font-semibold text-muted-foreground uppercase">
                    {format(day, 'EEE')}
                  </div>
                  <div className={cn(
                    "text-2xl font-bold mt-1",
                    isCurrentDay ? "text-amber-600" : dayPassed ? "text-muted-foreground" : "text-foreground"
                  )}>
                    {format(day, 'd')}
                  </div>
                  {isCurrentDay && (
                    <Badge className="bg-amber-500 text-black text-[10px] mt-2 font-semibold">
                      TODAY
                    </Badge>
                  )}
                </div>

                <CardContent className="p-2 min-h-[380px] space-y-1.5 flex-1 flex flex-col">
                  {dayTasks.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                      No tasks
                    </div>
                  ) : (
                    <>
                      <div className="p-2 bg-muted rounded text-center">
                        <div className="text-[10px] text-muted-foreground mb-1 uppercase font-semibold">Progress</div>
                        <div className="text-lg font-bold text-amber-600">{dayProgress}%</div>
                        <div className="text-[9px] text-muted-foreground">
                          {completedToday}/{dayTasks.length}
                        </div>
                      </div>

                      <div className="space-y-1 flex-1 overflow-y-auto">
                        {dayTasks.map((task) => {
                          const wp = workPackages.find(w => w.id === task.work_package_id);
                          const isCompleted = task.status === 'completed';
                          const isBlocked = task.status === 'blocked';

                          return (
                            <div
                              key={task.id}
                              onClick={() => toggleTaskStatus(task)}
                              className={cn(
                                "p-2 rounded border group hover:border-amber-500/50 transition-all cursor-pointer",
                                isCompleted && "bg-green-500/5 border-green-500/20",
                                isBlocked && "bg-red-500/5 border-red-500/30",
                                !isCompleted && !isBlocked && "bg-card border-border hover:bg-muted/30"
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <Checkbox
                                  checked={isCompleted}
                                  className="mt-0.5"
                                  onClick={(e) => e.stopPropagation()}
                                  onCheckedChange={() => toggleTaskStatus(task)}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    "text-xs font-bold leading-tight",
                                    isCompleted ? "line-through text-muted-foreground" : "text-foreground group-hover:text-amber-600"
                                  )}>
                                    {task.name}
                                  </p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    <Badge className={cn(
                                      "text-[8px] font-bold px-1.5 py-0 h-auto",
                                      task.phase === 'detailing' && "bg-blue-500/20 text-blue-600",
                                      task.phase === 'fabrication' && "bg-purple-500/20 text-purple-600",
                                      task.phase === 'delivery' && "bg-amber-500/20 text-amber-600",
                                      task.phase === 'erection' && "bg-green-500/20 text-green-600"
                                    )}>
                                      {task.phase?.substring(0, 3).toUpperCase()}
                                    </Badge>
                                    {wp && (
                                      <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-auto font-mono">
                                        {wp.package_number}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {isBlocked && (
                                <div className="mt-1 pt-1 border-t border-red-500/20">
                                  <p className="text-[9px] text-red-500 font-bold uppercase tracking-wide">
                                    ⚠ BLOCKED
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
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
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar size={48} className="mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-1">No Tasks This Week</h3>
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
                      "bg-card border-border hover:border-amber-500/40 transition-all cursor-pointer group",
                      isCompleted && "opacity-60",
                      isBlocked && "border-red-500/30"
                    )}
                    onClick={() => toggleTaskStatus(task)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isCompleted}
                          className="mt-1"
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => toggleTaskStatus(task)}
                        />

                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className={cn(
                                "font-bold mb-2",
                                isCompleted ? "line-through text-muted-foreground" : "text-foreground group-hover:text-amber-600"
                              )}>
                                {task.name}
                              </h3>

                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <Badge variant="outline" className="text-[9px] font-mono">
                                  {project?.project_number}
                                </Badge>
                                {wp && (
                                  <Badge variant="outline" className="text-[9px]">
                                    <Package size={10} className="mr-1" />
                                    {wp.package_number}
                                  </Badge>
                                )}
                                <Badge className={cn(
                                  "text-[9px] font-bold uppercase",
                                  task.phase === 'detailing' && "bg-blue-500/20 text-blue-600",
                                  task.phase === 'fabrication' && "bg-purple-500/20 text-purple-600",
                                  task.phase === 'delivery' && "bg-amber-500/20 text-amber-600",
                                  task.phase === 'erection' && "bg-green-500/20 text-green-600"
                                )}>
                                  {task.phase}
                                </Badge>
                                <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                                  <Clock size={12} />
                                  {format(parseISO(task.start_date), 'EEE, MMM d')}
                                </span>
                              </div>

                              {isBlocked && (
                                <div className="p-2 bg-red-500/10 border border-red-500/30 rounded">
                                  <p className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
                                    <AlertCircle size={12} />
                                    BLOCKED - CANNOT PROCEED
                                  </p>
                                </div>
                              )}
                            </div>

                            {task.progress_percent > 0 && (
                              <div className="text-right">
                                <div className="text-xl font-bold text-amber-600">
                                  {task.progress_percent}%
                                </div>
                                <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
                                  Progress
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
          )}
        </div>
      )}
    </div>
  );
}