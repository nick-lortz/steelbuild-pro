import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, AlertCircle, Truck, Users, Lock } from 'lucide-react';
import { addDays, startOfWeek, format, differenceInDays, isBefore, isAfter, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';

export default function LookAheadCore({ projectId }) {
  const [windowStart, setWindowStart] = useState(() => startOfWeek(new Date()));
  const [selectedPhase, setSelectedPhase] = useState('fabrication');

  // 6-week window
  const windowEnd = addDays(windowStart, 42);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId, selectedPhase],
    queryFn: async () => {
      const result = await base44.entities.Task.filter({
        project_id: projectId,
        phase: selectedPhase
      });
      return result.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    },
    enabled: !!projectId
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', projectId],
    queryFn: () => base44.entities.Delivery.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list(),
    enabled: !!projectId
  });

  // Filter tasks within window
  const visibleTasks = useMemo(() => {
    return tasks.filter(t => {
      const taskStart = new Date(t.start_date);
      const taskEnd = new Date(t.end_date);
      return (
        (isWithinInterval(taskStart, { start: windowStart, end: windowEnd }) ||
         isWithinInterval(taskEnd, { start: windowStart, end: windowEnd }) ||
         (isBefore(taskStart, windowStart) && isAfter(taskEnd, windowEnd)))
      );
    });
  }, [tasks, windowStart, windowEnd]);

  // Detect conflicts
  const conflicts = useMemo(() => {
    const issues = [];
    
    visibleTasks.forEach(task => {
      // Missing deliveries
      if (task.linked_delivery_ids?.length) {
        const requiredDeliveries = deliveries.filter(d => task.linked_delivery_ids.includes(d.id));
        requiredDeliveries.forEach(delivery => {
          const taskStart = new Date(task.start_date);
          if (delivery.actual_arrival_date) {
            const arrivalDate = new Date(delivery.actual_arrival_date);
            if (isAfter(arrivalDate, taskStart)) {
              issues.push({
                type: 'delivery_delay',
                taskId: task.id,
                message: `Delivery ${delivery.package_number} arriving after task start`,
                severity: 'critical'
              });
            }
          }
        });
      }

      // Resource conflicts
      if (task.assigned_resources?.length && task.status !== 'completed') {
        const concurrentTasks = visibleTasks.filter(t =>
          t.id !== task.id &&
          t.assigned_resources?.some(r => task.assigned_resources.includes(r)) &&
          isWithinInterval(new Date(t.start_date), { start: new Date(task.start_date), end: new Date(task.end_date) })
        );
        if (concurrentTasks.length > 0) {
          issues.push({
            type: 'resource_conflict',
            taskId: task.id,
            message: `Resource assigned to ${concurrentTasks.length} overlapping task(s)`,
            severity: 'warning'
          });
        }
      }

      // Missing predecessors
      if (task.predecessor_ids?.length) {
        task.predecessor_ids.forEach(predId => {
          const predTask = tasks.find(t => t.id === predId);
          if (predTask && new Date(predTask.end_date) >= new Date(task.start_date)) {
            issues.push({
              type: 'dependency',
              taskId: task.id,
              message: `Predecessor task overlaps or not complete`,
              severity: 'warning'
            });
          }
        });
      }
    });

    return issues;
  }, [visibleTasks, deliveries, tasks]);

  const getWeeks = () => {
    const weeks = [];
    for (let i = 0; i < 6; i++) {
      const weekStart = addDays(windowStart, i * 7);
      weeks.push({
        start: weekStart,
        end: addDays(weekStart, 6),
        number: Math.floor(i) + 1
      });
    }
    return weeks;
  };

  const weeks = getWeeks();

  const handlePrevWeek = () => setWindowStart(addDays(windowStart, -7));
  const handleNextWeek = () => setWindowStart(addDays(windowStart, 7));

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-lg">Look-Ahead Schedule</CardTitle>
              <p className="text-xs text-zinc-400 mt-1">
                {format(windowStart, 'MMM d')} — {format(windowEnd, 'MMM d, yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePrevWeek}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleNextWeek}
                className="h-8 w-8 p-0"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Select value={selectedPhase} onValueChange={setSelectedPhase}>
              <SelectTrigger className="w-40 h-8 text-xs bg-zinc-900 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="detailing">Detailing</SelectItem>
                <SelectItem value="fabrication">Fabrication</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="erection">Erection</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Timeline Header */}
      <div className="grid gap-1" style={{ gridTemplateColumns: `100px repeat(6, 1fr)` }}>
        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider p-2">Task</div>
        {weeks.map((week) => (
          <div key={week.number} className="text-xs font-bold text-zinc-400 uppercase tracking-wider p-2 text-center border-l border-zinc-700">
            W{week.number}
            <div className="text-[10px] text-zinc-500 font-normal">
              {format(week.start, 'MMM d')}
            </div>
          </div>
        ))}
      </div>

      {/* Tasks */}
      <div className="space-y-1">
        {visibleTasks.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            No tasks in {selectedPhase} phase during this window
          </div>
        ) : (
          visibleTasks.map((task) => {
            const taskStart = new Date(task.start_date);
            const taskEnd = new Date(task.end_date);
            const taskConflicts = conflicts.filter(c => c.taskId === task.id);

            return (
              <div
                key={task.id}
                className="grid gap-1 items-stretch"
                style={{ gridTemplateColumns: `100px repeat(6, 1fr)` }}
              >
                {/* Task name */}
                <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900 rounded-l border border-r-0 border-zinc-700 truncate">
                  {task.is_critical && (
                    <Lock size={12} className="text-red-400 flex-shrink-0" />
                  )}
                  <div className="truncate">
                    <div className="text-xs font-mono font-bold text-white truncate">
                      {task.name}
                    </div>
                    {taskConflicts.length > 0 && (
                      <div className="text-[10px] text-red-400">
                        {taskConflicts.length} conflict{taskConflicts.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Week cells */}
                {weeks.map((week) => {
                  const inWeek =
                    (isWithinInterval(taskStart, { start: week.start, end: week.end }) ||
                     isWithinInterval(taskEnd, { start: week.start, end: week.end }) ||
                     (isBefore(taskStart, week.start) && isAfter(taskEnd, week.end)));

                  const startInWeek = isWithinInterval(taskStart, { start: week.start, end: week.end });
                  const endInWeek = isWithinInterval(taskEnd, { start: week.start, end: week.end });

                  const statusColor = {
                    completed: 'bg-green-600',
                    in_progress: 'bg-amber-500',
                    blocked: 'bg-red-600',
                    not_started: 'bg-blue-600'
                  }[task.status] || 'bg-zinc-600';

                  return (
                    <div
                      key={week.number}
                      className={cn(
                        'relative border border-zinc-700 rounded-r last:rounded-r',
                        inWeek ? statusColor : 'bg-zinc-950 border-zinc-800'
                      )}
                    >
                      {inWeek && (
                        <div className="p-1 h-full flex flex-col justify-center">
                          <div className="text-[10px] font-bold text-white opacity-80 text-center">
                            {startInWeek || endInWeek ? (
                              <span>{Math.ceil(task.progress_percent || 0)}%</span>
                            ) : (
                              <span>→</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Conflicts Summary */}
      {conflicts.length > 0 && (
        <Card className="bg-red-950/30 border-red-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-400">
              <AlertCircle size={16} />
              {conflicts.length} Conflict{conflicts.length > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conflicts.slice(0, 5).map((conflict, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px]',
                      conflict.severity === 'critical'
                        ? 'border-red-600 text-red-400'
                        : 'border-yellow-600 text-yellow-400'
                    )}
                  >
                    {conflict.type === 'delivery_delay' && <Truck size={10} />}
                    {conflict.type === 'resource_conflict' && <Users size={10} />}
                    {conflict.type === 'dependency' && <Lock size={10} />}
                  </Badge>
                  <span className="text-zinc-300">{conflict.message}</span>
                </div>
              ))}
              {conflicts.length > 5 && (
                <p className="text-[10px] text-zinc-500">+{conflicts.length - 5} more</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}