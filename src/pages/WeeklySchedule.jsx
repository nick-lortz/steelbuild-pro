import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
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
      ? apiClient.entities.Task.filter({ project_id: activeProjectId }, 'start_date')
      : apiClient.entities.Task.list('start_date'),
    staleTime: 2 * 60 * 1000
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.entities.Project.list('name'),
    staleTime: 10 * 60 * 1000
  });

  const { data: workPackages = [] } = useQuery({
    queryKey: ['work-packages', activeProjectId],
    queryFn: () => activeProjectId 
      ? apiClient.entities.WorkPackage.filter({ project_id: activeProjectId })
      : apiClient.entities.WorkPackage.list(),
    enabled: !!activeProjectId,
    staleTime: 5 * 60 * 1000
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', activeProjectId],
    queryFn: () => activeProjectId 
      ? apiClient.entities.Delivery.filter({ project_id: activeProjectId })
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
    mutationFn: ({ id, data }) => apiClient.entities.Task.update(id, data),
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
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b-2 border-amber-500 bg-black">
        <div className="max-w-[1800px] mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight">Weekly Schedule</h1>
              <p className="text-xs text-zinc-500 font-mono mt-1 uppercase tracking-wider">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousWeek}
                className="border-zinc-700 h-9"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant={isToday(currentWeek) ? 'default' : 'outline'}
                size="sm"
                onClick={goToThisWeek}
                className={cn(
                  "h-9 text-xs uppercase tracking-wider font-bold",
                  isToday(currentWeek) 
                    ? "bg-amber-500 hover:bg-amber-600 text-black" 
                    : "border-zinc-700"
                )}
              >
                THIS WEEK
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
                className="border-zinc-700 h-9"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-zinc-950 border-b border-zinc-800">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="grid grid-cols-5 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-3">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Total Tasks</div>
                <div className="text-2xl font-black text-white">{weekStats.total}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="p-3">
                <div className="text-[10px] text-green-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
                  <CheckCircle2 size={9} />
                  COMPLETED
                </div>
                <div className="text-2xl font-black text-green-400">{weekStats.completed}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="p-3">
                <div className="text-[10px] text-blue-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
                  <TrendingUp size={9} />
                  IN PROGRESS
                </div>
                <div className="text-2xl font-black text-blue-400">{weekStats.inProgress}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
              <CardContent className="p-3">
                <div className="text-[10px] text-red-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
                  <AlertCircle size={9} />
                  BLOCKED
                </div>
                <div className="text-2xl font-black text-red-400">{weekStats.blocked}</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
              <CardContent className="p-3">
                <div className="text-[10px] text-amber-400 uppercase tracking-widest font-bold mb-1">Completion</div>
                <div className="text-2xl font-black text-amber-400">{weekStats.completionRate}%</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-black border-b border-zinc-800">
        <div className="max-w-[1800px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800 h-9 text-sm">
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

              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs">
                <span className="text-zinc-500 uppercase tracking-wider font-bold">View:</span>
                <button
                  onClick={() => setViewMode('day')}
                  className={cn(
                    "px-2 py-1 rounded font-bold uppercase tracking-wider transition-colors",
                    viewMode === 'day' 
                      ? "bg-amber-500 text-black" 
                      : "text-zinc-500 hover:text-white"
                  )}
                >
                  BY DAY
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "px-2 py-1 rounded font-bold uppercase tracking-wider transition-colors",
                    viewMode === 'list' 
                      ? "bg-amber-500 text-black" 
                      : "text-zinc-500 hover:text-white"
                  )}
                >
                  LIST
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
                    "bg-zinc-900 border-zinc-800 overflow-hidden",
                    isCurrentDay && "border-2 border-amber-500 shadow-lg shadow-amber-500/20"
                  )}
                >
                  <CardHeader className={cn(
                    "p-3 border-b border-zinc-800",
                    isCurrentDay && "bg-gradient-to-b from-amber-500/10 to-transparent"
                  )}>
                    <div className="text-center">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                        {format(day, 'EEE')}
                      </div>
                      <div className={cn(
                        "text-2xl font-black",
                        isCurrentDay ? "text-amber-500" : dayPassed ? "text-zinc-600" : "text-white"
                      )}>
                        {format(day, 'd')}
                      </div>
                      {isCurrentDay && (
                        <Badge className="bg-amber-500 text-black text-[9px] mt-1 font-bold">
                          TODAY
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 min-h-[400px] space-y-1.5">
                    {dayTasks.length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-zinc-700 text-xs">
                        No tasks
                      </div>
                    ) : (
                      <>
                        <div className="mb-2 p-2 bg-zinc-800/50 rounded text-center">
                          <div className="text-xs text-zinc-400 mb-1">Progress</div>
                          <div className="text-lg font-black text-amber-500">{dayProgress}%</div>
                          <div className="text-[10px] text-zinc-600">
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
                                "p-2 rounded border group hover:border-amber-500/50 transition-all cursor-pointer",
                                isCompleted && "bg-green-500/5 border-green-500/20",
                                isBlocked && "bg-red-500/5 border-red-500/30",
                                !isCompleted && !isBlocked && "bg-zinc-800/50 border-zinc-700"
                              )}
                              onClick={() => toggleTaskStatus(task)}
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
                                    "text-xs font-bold leading-tight mb-1",
                                    isCompleted ? "line-through text-zinc-600" : "text-white group-hover:text-amber-400"
                                  )}>
                                    {task.name}
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    <Badge className={cn(
                                      "text-[9px] font-bold px-1 py-0",
                                      task.phase === 'detailing' && "bg-blue-500/20 text-blue-400 border-blue-500/30",
                                      task.phase === 'fabrication' && "bg-purple-500/20 text-purple-400 border-purple-500/30",
                                      task.phase === 'delivery' && "bg-amber-500/20 text-amber-400 border-amber-500/30",
                                      task.phase === 'erection' && "bg-green-500/20 text-green-400 border-green-500/30"
                                    )}>
                                      {task.phase.substring(0, 3).toUpperCase()}
                                    </Badge>
                                    {wp && (
                                      <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">
                                        {wp.package_number}
                                      </Badge>
                                    )}
                                  </div>
                                  {task.estimated_hours > 0 && (
                                    <p className="text-[10px] text-zinc-600 mt-1">
                                      {task.estimated_hours}h est.
                                    </p>
                                  )}
                                </div>
                              </div>
                              {isBlocked && (
                                <div className="mt-1 pt-1 border-t border-red-500/20">
                                  <p className="text-[9px] text-red-400 font-bold uppercase tracking-wider">
                                    ⚠ BLOCKED
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
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-12 text-center">
                  <Calendar size={64} className="mx-auto mb-4 text-zinc-700" />
                  <h3 className="text-xl font-bold text-zinc-400 mb-2">No Tasks This Week</h3>
                  <p className="text-zinc-600">Schedule tasks with start dates in this week</p>
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
                        "bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group",
                        isCompleted && "opacity-60",
                        isBlocked && "border-red-500/30"
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
                                  "text-base font-bold mb-2",
                                  isCompleted ? "line-through text-zinc-600" : "text-white group-hover:text-amber-400"
                                )}>
                                  {task.name}
                                </h3>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="text-[10px] font-mono">
                                    {project?.project_number}
                                  </Badge>
                                  {wp && (
                                    <Badge variant="outline" className="text-[10px]">
                                      <Package size={8} className="mr-1" />
                                      {wp.package_number}
                                    </Badge>
                                  )}
                                  <Badge className={cn(
                                    "text-[10px] font-bold uppercase",
                                    task.phase === 'detailing' && "bg-blue-500/20 text-blue-400 border-blue-500/30",
                                    task.phase === 'fabrication' && "bg-purple-500/20 text-purple-400 border-purple-500/30",
                                    task.phase === 'delivery' && "bg-amber-500/20 text-amber-400 border-amber-500/30",
                                    task.phase === 'erection' && "bg-green-500/20 text-green-400 border-green-500/30"
                                  )}>
                                    {task.phase}
                                  </Badge>
                                  <span className="text-xs text-zinc-600 font-mono flex items-center gap-1">
                                    <Clock size={10} />
                                    {format(parseISO(task.start_date), 'EEE, MMM d')}
                                  </span>
                                  {task.estimated_hours > 0 && (
                                    <span className="text-xs text-zinc-600">
                                      {task.estimated_hours}h est.
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {task.progress_percent > 0 && (
                                  <div className="text-right">
                                    <div className="text-lg font-black text-amber-500">
                                      {task.progress_percent}%
                                    </div>
                                    <div className="text-[9px] text-zinc-600 uppercase tracking-wider">
                                      Progress
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {isBlocked && (
                              <div className="p-2 bg-red-500/10 border border-red-500/30 rounded">
                                <p className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                                  <AlertCircle size={12} />
                                  BLOCKED - CANNOT PROCEED
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
          <Card className="bg-zinc-900 border-zinc-800 mt-6">
            <CardContent className="p-12 text-center">
              <Calendar size={64} className="mx-auto mb-4 text-zinc-700" />
              <h3 className="text-xl font-bold text-zinc-400 mb-2">No Tasks Scheduled</h3>
              <p className="text-zinc-600 mb-4">No tasks found for the selected week and filters</p>
              <Button
                onClick={goToThisWeek}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
              >
                Go to Current Week
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}