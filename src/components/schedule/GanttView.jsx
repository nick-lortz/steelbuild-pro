import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, differenceInDays, startOfMonth, endOfMonth, eachMonthOfInterval, addMonths, subMonths } from 'date-fns';
import { Calendar, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GanttView({ tasks, compact = false }) {
  const timelineData = useMemo(() => {
    if (!tasks || tasks.length === 0) return null;

    const allDates = tasks
      .filter(t => t.start_date && t.end_date)
      .flatMap(t => [new Date(t.start_date + 'T00:00:00'), new Date(t.end_date + 'T00:00:00')]);
    
    if (allDates.length === 0) return null;

    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    
    const rangeStart = startOfMonth(subMonths(minDate, 1));
    const rangeEnd = endOfMonth(addMonths(maxDate, 1));
    
    const totalDays = differenceInDays(rangeEnd, rangeStart);
    
    const tasksByPhase = {};
    tasks.forEach(task => {
      if (!task.start_date || !task.end_date) return;
      const phase = task.phase || 'other';
      if (!tasksByPhase[phase]) tasksByPhase[phase] = [];
      tasksByPhase[phase].push(task);
    });

    return { rangeStart, rangeEnd, totalDays, tasksByPhase };
  }, [tasks]);

  if (!timelineData) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <Calendar size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No scheduled tasks</p>
      </div>
    );
  }

  const { rangeStart, rangeEnd, totalDays, tasksByPhase } = timelineData;

  const getBarPosition = (task) => {
    const taskStart = new Date(task.start_date + 'T00:00:00');
    const taskEnd = new Date(task.end_date + 'T00:00:00');
    const startOffset = differenceInDays(taskStart, rangeStart);
    const duration = differenceInDays(taskEnd, taskStart) + 1;
    
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`
    };
  };

  const getStatusColor = (task) => {
    const today = new Date();
    const isOverdue = new Date(task.end_date) < today && task.status !== 'completed';
    const isCompleted = task.status === 'completed';
    const isCritical = task.is_critical;

    if (isCompleted) return 'bg-green-500';
    if (isOverdue) return 'bg-red-500';
    if (isCritical) return 'bg-amber-500';
    if (task.status === 'in_progress') return 'bg-blue-500';
    return 'bg-zinc-600';
  };

  const phaseLabels = {
    detailing: 'Detailing',
    fabrication: 'Fabrication',
    delivery: 'Delivery',
    erection: 'Erection',
    closeout: 'Closeout',
    other: 'Other'
  };

  const maxTasksPerPhase = compact ? 5 : 10;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="border-b border-zinc-800 py-3">
        <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
          <Calendar size={16} className="text-amber-500" />
          Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Month Headers */}
        <div className="mb-3 relative h-6 border-b border-zinc-800">
          {(() => {
            const months = [];
            let current = startOfMonth(rangeStart);
            while (current <= rangeEnd) {
              const monthStart = differenceInDays(current, rangeStart);
              const monthEnd = differenceInDays(endOfMonth(current), rangeStart);
              const monthWidth = ((monthEnd - monthStart + 1) / totalDays) * 100;
              
              months.push(
                <div
                  key={current.toString()}
                  className="absolute top-0 h-full flex items-center justify-center text-[10px] text-zinc-400 font-medium border-r border-zinc-800"
                  style={{
                    left: `${(monthStart / totalDays) * 100}%`,
                    width: `${monthWidth}%`
                  }}
                >
                  {format(current, 'MMM yy')}
                </div>
              );
              current = addMonths(current, 1);
            }
            return months;
          })()}
        </div>

        {/* Task Rows */}
        <div className="space-y-4 relative">
          {/* Today Line */}
          {(() => {
            const today = new Date();
            if (today >= rangeStart && today <= rangeEnd) {
              const todayOffset = differenceInDays(today, rangeStart);
              return (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10 pointer-events-none"
                  style={{ left: `${(todayOffset / totalDays) * 100}%` }}
                >
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-amber-500 font-medium whitespace-nowrap">
                    Today
                  </div>
                </div>
              );
            }
          })()}

          {Object.entries(tasksByPhase).map(([phase, phaseTasks]) => (
            <div key={phase}>
              <h4 className="text-xs font-medium text-zinc-400 mb-2">{phaseLabels[phase]}</h4>
              <div className="space-y-1.5">
                {phaseTasks.slice(0, maxTasksPerPhase).map((task) => {
                  const position = getBarPosition(task);
                  const statusColor = getStatusColor(task);
                  const isOverdue = new Date(task.end_date) < new Date() && task.status !== 'completed';

                  return (
                    <div key={task.id} className="relative h-6 bg-zinc-800/30 rounded">
                      <div
                        className={cn("absolute top-0 h-full rounded flex items-center px-2 transition-all", statusColor)}
                        style={position}
                      >
                        <span className="text-[10px] font-medium text-white truncate flex items-center gap-1">
                          {isOverdue && <AlertTriangle size={10} />}
                          {task.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {phaseTasks.length > maxTasksPerPhase && (
                  <p className="text-[10px] text-zinc-500 text-center">
                    +{phaseTasks.length - maxTasksPerPhase} more
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center gap-3 flex-wrap text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded bg-blue-500" />
            <span className="text-zinc-400">In Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded bg-green-500" />
            <span className="text-zinc-400">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded bg-red-500" />
            <span className="text-zinc-400">Overdue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded bg-amber-500" />
            <span className="text-zinc-400">Critical</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}