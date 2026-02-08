import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  Truck,
  Package,
  FileText,
  AlertCircle,
  Users,
  CheckCircle2,
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

export default function Calendar() {
  const { activeProjectId } = useActiveProject();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', activeProjectId],
    queryFn: () => activeProjectId 
      ? apiClient.entities.Task.filter({ project_id: activeProjectId }, 'start_date')
      : apiClient.entities.Task.list('start_date'),
    staleTime: 2 * 60 * 1000
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.entities.Project.list('name'),
    staleTime: 10 * 60 * 1000
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', activeProjectId],
    queryFn: () => activeProjectId 
      ? apiClient.entities.Delivery.filter({ project_id: activeProjectId })
      : apiClient.entities.Delivery.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings', activeProjectId],
    queryFn: () => activeProjectId
      ? apiClient.entities.Meeting.filter({ project_id: activeProjectId })
      : apiClient.entities.Meeting.list(),
    staleTime: 5 * 60 * 1000
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditingTask(null);
      toast.success('Task updated');
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => apiClient.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
    }
  });

  // Calendar grid setup
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Compile events
  const calendarEvents = useMemo(() => {
    const events = [];

    tasks.forEach(task => {
      if (task.start_date && task.status !== 'cancelled') {
        if (phaseFilter === 'all' || task.phase === phaseFilter) {
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
        }
      }
    });

    deliveries.forEach(d => {
      const date = d.scheduled_date || d.confirmed_date || d.requested_date;
      if (date) {
        events.push({
          id: d.id,
          type: 'delivery',
          title: d.package_name,
          date,
          status: d.delivery_status,
          project_id: d.project_id,
          data: d
        });
      }
    });

    meetings.forEach(m => {
      if (m.meeting_date) {
        events.push({
          id: m.id,
          type: 'meeting',
          title: m.title,
          date: m.meeting_date.split('T')[0],
          project_id: m.project_id,
          data: m
        });
      }
    });

    return events;
  }, [tasks, deliveries, meetings, phaseFilter]);

  // Events by date
  const eventsByDate = useMemo(() => {
    const grouped = {};
    calendarEvents.forEach(event => {
      const key = event.date;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(event);
    });
    return grouped;
  }, [calendarEvents]);

  const selectedDateEvents = selectedDate ? (eventsByDate[format(selectedDate, 'yyyy-MM-dd')] || []) : [];

  const monthStats = useMemo(() => {
    const monthEvents = calendarEvents.filter(e => {
      try {
        const eventDate = parseISO(e.date);
        return isSameMonth(eventDate, currentDate);
      } catch {
        return false;
      }
    });

    const overdue = monthEvents.filter(e => {
      try {
        const eventDate = parseISO(e.date);
        return isPast(eventDate) && e.status !== 'completed' && e.status !== 'received' && e.status !== 'closed';
      } catch {
        return false;
      }
    }).length;

    const thisWeek = monthEvents.filter(e => {
      try {
        const eventDate = parseISO(e.date);
        const now = new Date();
        return differenceInDays(eventDate, now) >= 0 && differenceInDays(eventDate, now) <= 7;
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
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-black">
      {/* Header */}
      <div className="border-b border-zinc-800/50 bg-gradient-to-b from-zinc-900 to-zinc-950/50">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Calendar</h1>
              <p className="text-sm text-zinc-500 font-mono mt-1">
                {format(currentDate, 'MMMM yyyy')} • {monthStats.total} events
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="border-zinc-700 h-9 px-3"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant={isToday(currentDate) ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className={cn(
                  "h-9 px-4 text-xs uppercase tracking-wider font-bold",
                  isToday(currentDate) ? "bg-amber-500 hover:bg-amber-600 text-black" : "border-zinc-700"
                )}
              >
                TODAY
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="border-zinc-700 h-9 px-3"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="border-b border-zinc-800/50 bg-zinc-950/50">
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <div className="grid grid-cols-5 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-3">
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">Tasks</div>
                <div className="text-2xl font-black text-white">{monthStats.byType.task}</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-3">
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">Deliveries</div>
                <div className="text-2xl font-black text-amber-500">{monthStats.byType.delivery}</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-3">
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-0.5">Meetings</div>
                <div className="text-2xl font-black text-blue-400">{monthStats.byType.meeting}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
              <CardContent className="p-3">
                <div className="text-[9px] text-red-400 uppercase tracking-widest font-bold mb-0.5">Overdue</div>
                <div className="text-2xl font-black text-red-400">{monthStats.overdue}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
              <CardContent className="p-3">
                <div className="text-[9px] text-green-400 uppercase tracking-widest font-bold mb-0.5">This Week</div>
                <div className="text-2xl font-black text-green-400">{monthStats.thisWeek}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-zinc-800/50 bg-zinc-950/30">
        <div className="max-w-[1800px] mx-auto px-8 py-3">
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800 h-8 text-xs">
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
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-8 py-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-zinc-600 uppercase tracking-widest py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
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
                      "min-h-[100px] p-2 rounded border transition-all text-left",
                      isCurrentMonth ? "bg-zinc-800/50 border-zinc-700" : "bg-zinc-900/30 border-zinc-800/50 opacity-40",
                      isCurrentDay && "border-amber-500 border-2 bg-amber-500/10",
                      isSelected && "bg-zinc-700 border-zinc-500",
                      "hover:bg-zinc-700/50"
                    )}
                  >
                    <div className={cn(
                      "text-sm font-bold mb-1",
                      isCurrentDay ? "text-amber-500" : isCurrentMonth ? "text-white" : "text-zinc-600"
                    )}>
                      {format(day, 'd')}
                    </div>
                    
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded font-bold truncate",
                            event.type === 'task' && "bg-blue-500/20 text-blue-400",
                            event.type === 'delivery' && "bg-amber-500/20 text-amber-400",
                            event.type === 'meeting' && "bg-purple-500/20 text-purple-400"
                          )}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[9px] text-zinc-600 font-bold px-1.5">
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

        {/* Selected Date Details */}
        {selectedDate && (
          <Card className="bg-zinc-900 border-zinc-800 mt-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold uppercase">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedDate(null)}
                  className="h-7 px-2 text-zinc-500"
                >
                  <X size={14} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-8 text-zinc-600 text-sm">
                  No events scheduled
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDateEvents.map(event => {
                    const project = projects.find(p => p.id === event.project_id);
                    
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "p-3 rounded border",
                          event.type === 'task' && "bg-blue-500/5 border-blue-500/20",
                          event.type === 'delivery' && "bg-amber-500/5 border-amber-500/20",
                          event.type === 'meeting' && "bg-purple-500/5 border-purple-500/20"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {event.type === 'task' && <FileText size={12} className="text-blue-400" />}
                              {event.type === 'delivery' && <Truck size={12} className="text-amber-400" />}
                              {event.type === 'meeting' && <Users size={12} className="text-purple-400" />}
                              <h4 className="font-bold text-white text-sm">{event.title}</h4>
                            </div>
                            {project && (
                              <p className="text-[10px] text-zinc-600 font-mono mb-1">
                                {project.project_number} • {project.name}
                              </p>
                            )}
                            {event.phase && (
                              <Badge className={cn(
                                "text-[9px] font-bold uppercase px-1.5 py-0",
                                event.phase === 'detailing' && "bg-blue-500/20 text-blue-400",
                                event.phase === 'fabrication' && "bg-purple-500/20 text-purple-400",
                                event.phase === 'delivery' && "bg-amber-500/20 text-amber-400",
                                event.phase === 'erection' && "bg-green-500/20 text-green-400"
                              )}>
                                {event.phase}
                              </Badge>
                            )}
                            {event.status && (
                              <Badge className={cn(
                                "text-[9px] ml-1 px-1.5 py-0",
                                event.status === 'completed' && "bg-green-500/20 text-green-400",
                                event.status === 'in_progress' && "bg-blue-500/20 text-blue-400",
                                event.status === 'blocked' && "bg-red-500/20 text-red-400"
                              )}>
                                {event.status}
                              </Badge>
                            )}
                          </div>
                          {event.type === 'task' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingTask(event.data)}
                                className="h-7 px-2 text-xs"
                              >
                                <Edit size={12} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm('Delete this task?')) {
                                    deleteTaskMutation.mutate(event.id);
                                  }
                                }}
                                className="h-7 px-2 text-red-500 hover:text-red-400"
                              >
                                <Trash2 size={12} />
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