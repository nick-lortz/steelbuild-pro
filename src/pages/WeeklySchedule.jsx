import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Package,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  isToday,
  isPast
} from 'date-fns';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-2">
          {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
          {label}
        </p>
        <p className={cn("text-2xl font-bold", valueClass)}>{value}</p>
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
      : [],
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000
  });

  const weekTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!task.start_date) return false;
      if (task.status === 'cancelled') return false;
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
    weekDays.forEach(d => (grouped[format(d, 'yyyy-MM-dd')] = []));

    weekTasks.forEach(task => {
      try {
        const taskStart = parseISO(task.start_date);
        const taskEnd = task.end_date ? parseISO(task.end_date) : taskStart;

        weekDays.forEach(day => {
          if (day >= taskStart && day <= taskEnd) {
            grouped[format(day, 'yyyy-MM-dd')].push(task);
          }
        });
      } catch {
        // ignore malformed
      }
    });

    return grouped;
  }, [weekTasks, weekDays]);

  const weekStats = useMemo(() => {
    const completed = weekTasks.filter(t => t.status === 'completed').length;
    const inProgress = weekTasks.filter(t => t.status === 'in_progress').length;
    const blocked = weekTasks.filter(t => t.status === 'blocked').length;

    return {
      total: weekTasks.length,
      completed,
      inProgress,
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
        progress_percent: newStatus === 'completed' ? 100 : (task.progress_percent || 0)
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
          <Button variant={isToday(currentWeek) ? "default" : "outline"} onClick={goToThisWeek}>
            This Week
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard label="Total Tasks" value={weekStats.total} />
        <MetricCard label="Completed" value={weekStats.completed} tone="good" icon={CheckCircle2} />
        <MetricCard label="In Progress" value={weekStats.inProgress} tone="info" icon={TrendingUp} />
        <MetricCard label="Blocked" value={weekStats.blocked} tone={weekStats.blocked > 0 ? "danger" : undefined} icon={AlertCircle} />
        <MetricCard label="Completion" value={`${weekStats.completionRate}%`} tone="warn" />
      </div>

      {/* Filters */}
      <Card>
        <SectionHeader
          title="Filters"
          subtitle="Phase filter and view mode."
          right={
            <div className="flex items-center gap-2">
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

              <div className="flex items-center rounded-lg border bg-card p-1">
                <Button
                  variant={viewMode === 'day' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('day')}
                >
                  By Day
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  List
                </Button>
              </div>
            </div>
          }
        />
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">
            Showing active tasks in the selected week (completed tasks can still be toggled from the UI).
          </p>
        </CardContent>
      </Card>

      {/* Content */}
      {viewMode === 'day' ? (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDay[dayKey] || [];
            const isCurrentDay = isToday(day);
            const dayPassed = isPast(day) && !isToday(day);

            const completedToday = dayTasks.filter(t => t.status === 'completed').length;
            const dayProgress = dayTasks.length > 0 ? Math.round((completedToday / dayTasks.length) * 100) : 0;

            return (
              <Card key={dayKey} className={cn(isCurrentDay && "border-amber-500/50 bg-amber-500/5")}>
                <SectionHeader
                  title={`${format(day, 'EEE')} • ${format(day, 'd')}`}
                  subtitle={isCurrentDay ? 'Today' : dayPassed ? 'Past' : 'Upcoming'}
                  right={dayTasks.length ? <Badge variant="outline">{dayTasks.length}</Badge> : null}
                />
                <CardContent className="pt-4 space-y-2 min-h-[340px]">
                  {dayTasks.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">No tasks</div>
                  ) : (
                    <>
                      <div className="p-3 rounded-lg border bg-muted/30">
                        <p className="text-xs text-muted-foreground">Progress</p>
                        <p className="text-xl font-bold text-amber-500">{dayProgress}%</p>
                        <p className="text-xs text-muted-foreground">{completedToday}/{dayTasks.length} completed</p>
                      </div>

                      {dayTasks.map(task => {
                        const wp = workPackages.find(w => w.id === task.work_package_id);
                        const isCompleted = task.status === 'completed';
                        const isBlocked = task.status === 'blocked';

                        return (
                          <button
                            key={task.id}
                            onClick={() => toggleTaskStatus(task)}
                            className={cn(
                              "w-full text-left p-3 rounded-lg border transition hover:bg-muted/30",
                              isCompleted && "border-green-500/20 bg-green-500/5",
                              isBlocked && "border-red-500/30 bg-red-500/5",
                              !isCompleted && !isBlocked && "border-border bg-card"
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <Checkbox
                                checked={isCompleted}
                                onClick={(e) => e.stopPropagation()}
                                onCheckedChange={() => toggleTaskStatus(task)}
                                className="mt-1"
                              />

                              <div className="min-w-0 flex-1">
                                <p className={cn("text-sm font-semibold", isCompleted && "line-through text-muted-foreground")}>
                                  {task.name}
                                </p>

                                <div className="mt-2 flex flex-wrap gap-2 items-center">
                                  {task.phase ? <Badge variant="outline" className="capitalize">{task.phase}</Badge> : null}
                                  {wp ? (
                                    <Badge variant="outline" className="font-mono">
                                      <Package className="h-3 w-3 mr-1" />
                                      {wp.package_number}
                                    </Badge>
                                  ) : null}
                                  {task.estimated_hours > 0 ? (
                                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {task.estimated_hours}h
                                    </span>
                                  ) : null}
                                  {isBlocked ? <Badge variant="destructive">Blocked</Badge> : null}
                                </div>
                              </div>
                            </div>
                          </button>
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
            <Card>
              <CardContent className="pt-10 pb-10 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">No tasks found for this week.</p>
              </CardContent>
            </Card>
          ) : (
            weekTasks
              .slice()
              .sort((a, b) => {
                try { return parseISO(a.start_date) - parseISO(b.start_date); } catch { return 0; }
              })
              .map(task => {
                const wp = workPackages.find(w => w.id === task.work_package_id);
                const project = projects.find(p => p.id === task.project_id);
                const isCompleted = task.status === 'completed';
                const isBlocked = task.status === 'blocked';

                return (
                  <Card key={task.id} className={cn(isCompleted && "opacity-70", isBlocked && "border-red-500/30")}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={() => toggleTaskStatus(task)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-base font-semibold", isCompleted && "line-through text-muted-foreground")}>
                            {task.name}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2 items-center">
                            {project?.project_number ? (
                              <Badge variant="outline" className="font-mono">{project.project_number}</Badge>
                            ) : null}
                            {wp ? (
                              <Badge variant="outline" className="font-mono">
                                <Package className="h-3 w-3 mr-1" />
                                {wp.package_number}
                              </Badge>
                            ) : null}
                            {task.phase ? <Badge variant="outline" className="capitalize">{task.phase}</Badge> : null}
                            {task.start_date ? (
                              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(parseISO(task.start_date), 'EEE, MMM d')}
                              </span>
                            ) : null}
                            {task.estimated_hours > 0 ? (
                              <span className="text-xs text-muted-foreground">{task.estimated_hours}h</span>
                            ) : null}
                            {isBlocked ? <Badge variant="destructive">Blocked</Badge> : null}
                          </div>
                        </div>

                        {task.progress_percent > 0 ? (
                          <div className="text-right">
                            <p className="text-lg font-bold text-amber-500">{task.progress_percent}%</p>
                            <p className="text-xs text-muted-foreground">Progress</p>
                          </div>
                        ) : null}
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