import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Truck,
  FileText,
  Users,
  Edit,
  Trash2,
  X
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isToday,
  parseISO,
  isSameDay,
  isPast,
  differenceInDays
} from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import TaskForm from '@/components/schedule/TaskForm';

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

function MetricCard({ label, value, tone }) {
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
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
        <p className={cn("text-2xl font-bold", valueClass)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function EventPill({ event }) {
  const base = "text-[10px] px-2 py-0.5 rounded font-semibold truncate border";
  if (event.type === 'task') return <div className={cn(base, "bg-blue-500/10 text-blue-600 border-blue-500/20")}>{event.title}</div>;
  if (event.type === 'delivery') return <div className={cn(base, "bg-amber-500/10 text-amber-600 border-amber-500/20")}>{event.title}</div>;
  return <div className={cn(base, "bg-purple-500/10 text-purple-600 border-purple-500/20")}>{event.title}</div>;
}

export default function Calendar() {
  const { activeProjectId } = useActiveProject();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [phaseFilter, setPhaseFilter] = useState('all');
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

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.Delivery.filter({ project_id: activeProjectId })
      : base44.entities.Delivery.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings', activeProjectId],
    queryFn: () => activeProjectId
      ? base44.entities.Meeting.filter({ project_id: activeProjectId })
      : base44.entities.Meeting.list(),
    staleTime: 5 * 60 * 1000
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditingTask(null);
      toast.success('Task updated');
    },
    onError: (e) => toast.error(e?.message || 'Failed to update task')
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
    },
    onError: (e) => toast.error(e?.message || 'Failed to delete task')
  });

  // Calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Compile events
  const calendarEvents = useMemo(() => {
    const events = [];

    tasks.forEach(task => {
      if (!task.start_date) return;
      if (task.status === 'cancelled') return;
      if (phaseFilter !== 'all' && task.phase !== phaseFilter) return;

      events.push({
        id: task.id,
        type: 'task',
        title: task.name,
        date: task.start_date,
        endDate: task.end_date,
        phase: task.phase,
        status: task.status,
        project_id: task.project_id,
        data: task
      });
    });

    deliveries.forEach(d => {
      const date = d.scheduled_date || d.confirmed_date || d.requested_date;
      if (!date) return;
      events.push({
        id: d.id,
        type: 'delivery',
        title: d.package_name || 'Delivery',
        date,
        status: d.delivery_status,
        project_id: d.project_id,
        data: d
      });
    });

    meetings.forEach(m => {
      if (!m.meeting_date) return;
      events.push({
        id: m.id,
        type: 'meeting',
        title: m.title || 'Meeting',
        date: String(m.meeting_date).split('T')[0],
        project_id: m.project_id,
        data: m
      });
    });

    return events;
  }, [tasks, deliveries, meetings, phaseFilter]);

  const eventsByDate = useMemo(() => {
    const grouped = {};
    calendarEvents.forEach(event => {
      const key = event.date;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(event);
    });
    return grouped;
  }, [calendarEvents]);

  const selectedDateEvents = selectedDate
    ? (eventsByDate[format(selectedDate, 'yyyy-MM-dd')] || [])
    : [];

  const monthStats = useMemo(() => {
    const monthEvents = calendarEvents.filter(e => {
      try {
        return isSameMonth(parseISO(e.date), currentDate);
      } catch {
        return false;
      }
    });

    const overdue = monthEvents.filter(e => {
      try {
        const eventDate = parseISO(e.date);
        return isPast(eventDate) && !['completed', 'received', 'closed'].includes(e.status);
      } catch {
        return false;
      }
    }).length;

    const thisWeek = monthEvents.filter(e => {
      try {
        const eventDate = parseISO(e.date);
        const now = new Date();
        const d = differenceInDays(eventDate, now);
        return d >= 0 && d <= 7;
      } catch {
        return false;
      }
    }).length;

    return {
      total: monthEvents.length,
      overdue,
      thisWeek,
      byType: {
        task: monthEvents.filter(e => e.type === 'task').length,
        delivery: monthEvents.filter(e => e.type === 'delivery').length,
        meeting: monthEvents.filter(e => e.type === 'meeting').length
      }
    };
  }, [calendarEvents, currentDate]);

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Calendar</h1>
          <p className="text-muted-foreground mt-2">
            {format(currentDate, 'MMMM yyyy')} • {monthStats.total} events
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={isToday(currentDate) ? "default" : "outline"}
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>

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
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard label="Tasks" value={monthStats.byType.task} tone="info" />
        <MetricCard label="Deliveries" value={monthStats.byType.delivery} tone="warn" />
        <MetricCard label="Meetings" value={monthStats.byType.meeting} tone="good" />
        <MetricCard label="Overdue" value={monthStats.overdue} tone={monthStats.overdue > 0 ? "danger" : undefined} />
        <MetricCard label="This Week" value={monthStats.thisWeek} tone="good" />
      </div>

      {/* Calendar */}
      <Card>
        <SectionHeader
          icon={CalendarIcon}
          title="Month View"
          subtitle="Click a day to view details. Showing Tasks, Deliveries, and Meetings."
        />
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, idx) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate[dateKey] || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "min-h-[110px] p-2 rounded-lg border transition-all text-left",
                    isCurrentMonth ? "bg-card border-border" : "bg-muted/20 border-border/50 opacity-60",
                    isCurrentDay && "border-amber-500/60 bg-amber-500/5",
                    isSelected && "ring-2 ring-amber-500/40",
                    "hover:bg-muted/30"
                  )}
                >
                  <div className={cn(
                    "text-sm font-semibold mb-1",
                    isCurrentDay ? "text-amber-600" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {format(day, 'd')}
                  </div>

                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(ev => (
                      <EventPill key={`${ev.type}-${ev.id}`} event={ev} />
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground font-medium px-1">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected day details */}
      {selectedDate && (
        <Card>
          <SectionHeader
            title={format(selectedDate, 'EEEE, MMMM d, yyyy')}
            subtitle={`${selectedDateEvents.length} event(s)`}
            right={
              <Button size="icon" variant="ghost" onClick={() => setSelectedDate(null)}>
                <X className="h-4 w-4" />
              </Button>
            }
          />
          <CardContent className="pt-4">
            {selectedDateEvents.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No events scheduled</div>
            ) : (
              <div className="space-y-2">
                {selectedDateEvents.map(event => {
                  const proj = projects.find(p => p.id === event.project_id);

                  const panelClass =
                    event.type === 'task' ? "bg-blue-500/5 border-blue-500/20" :
                    event.type === 'delivery' ? "bg-amber-500/5 border-amber-500/20" :
                    "bg-purple-500/5 border-purple-500/20";

                  return (
                    <div key={`${event.type}-${event.id}`} className={cn("p-3 rounded-lg border", panelClass)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {event.type === 'task' && <FileText className="h-4 w-4 text-blue-600" />}
                            {event.type === 'delivery' && <Truck className="h-4 w-4 text-amber-600" />}
                            {event.type === 'meeting' && <Users className="h-4 w-4 text-purple-600" />}
                            <p className="font-semibold text-sm truncate">{event.title}</p>
                          </div>

                          {proj ? (
                            <p className="text-xs text-muted-foreground">
                              {proj.project_number} • {proj.name}
                            </p>
                          ) : null}

                          <div className="mt-2 flex flex-wrap gap-2">
                            {event.phase ? <Badge variant="outline" className="capitalize">{event.phase}</Badge> : null}
                            {event.status ? <Badge variant="outline" className="capitalize">{event.status}</Badge> : null}
                          </div>
                        </div>

                        {event.type === 'task' && (
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={() => setEditingTask(event.data)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const ok = window.confirm('Delete this task?');
                                if (ok) deleteTaskMutation.mutate(event.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Task Sheet */}
      <Sheet open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
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