import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { Calendar, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GanttTimeline({ tasks, project }) {
  const timelineData = useMemo(() => {
    if (!tasks || tasks.length === 0) return null;

    // Find date range
    const allDates = tasks
      .filter(t => t.start_date && t.end_date)
      .flatMap(t => [new Date(t.start_date), new Date(t.end_date)]);
    
    if (allDates.length === 0) return null;

    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    
    const rangeStart = startOfMonth(subMonths(minDate, 1));
    const rangeEnd = endOfMonth(addMonths(maxDate, 1));
    
    const totalDays = differenceInDays(rangeEnd, rangeStart);
    
    // Group tasks by phase
    const tasksByPhase = {};
    tasks.forEach(task => {
      if (!task.start_date || !task.end_date) return;
      const phase = task.phase || 'other';
      if (!tasksByPhase[phase]) tasksByPhase[phase] = [];
      tasksByPhase[phase].push(task);
    });

    return {
      rangeStart,
      rangeEnd,
      totalDays,
      tasksByPhase
    };
  }, [tasks]);

  if (!timelineData) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6">
          <p className="text-center text-zinc-500">No task schedule data available</p>
        </CardContent>
      </Card>
    );
  }

  const { rangeStart, rangeEnd, totalDays, tasksByPhase } = timelineData;

  const getBarPosition = (task) => {
    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.end_date);
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

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="border-b border-zinc-800">
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar size={18} className="text-amber-500" />
          Project Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Timeline Header - Months */}
        <div className="mb-4 relative h-8 border-b border-zinc-800">
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
                  className="absolute top-0 h-full flex items-center justify-center text-xs text-zinc-400 font-medium border-r border-zinc-800"
                  style={{
                    left: `${(monthStart / totalDays) * 100}%`,
                    width: `${monthWidth}%`
                  }}
                >
                  {format(current, 'MMM yyyy')}
                </div>
              );
              current = addMonths(current, 1);
            }
            return months;
          })()}
        </div>

        {/* Today Indicator */}
        {(() => {
          const today = new Date();
          if (today >= rangeStart && today <= rangeEnd) {
            const todayOffset = differenceInDays(today, rangeStart);
            return (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10 pointer-events-none"
                style={{ left: `${(todayOffset / totalDays) * 100}%` }}
              >
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs text-amber-500 font-medium whitespace-nowrap">
                  Today
                </div>
              </div>
            );
          }
        })()}

        {/* Task Rows by Phase */}
        <div className="space-y-6 mt-4 relative">
          {Object.entries(tasksByPhase).map(([phase, phaseTasks]) => (
            <div key={phase}>
              <h4 className="text-sm font-medium text-zinc-400 mb-3">{phaseLabels[phase]}</h4>
              <div className="space-y-2">
                {phaseTasks.slice(0, 10).map((task) => {
                  const position = getBarPosition(task);
                  const statusColor = getStatusColor(task);
                  const isOverdue = new Date(task.end_date) < new Date() && task.status !== 'completed';

                  return (
                    <div key={task.id} className="relative h-8 bg-zinc-800/30 rounded">
                      <div
                        className={cn(
                          "absolute top-0 h-full rounded flex items-center px-2 transition-all",
                          statusColor
                        )}
                        style={position}
                      >
                        <span className="text-xs font-medium text-white truncate flex items-center gap-1">
                          {isOverdue && <AlertTriangle size={12} />}
                          {task.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {phaseTasks.length > 10 && (
                  <p className="text-xs text-zinc-500 text-center">
                    +{phaseTasks.length - 10} more tasks
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-zinc-400">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-zinc-400">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-zinc-400">Overdue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span className="text-zinc-400">Critical Path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-zinc-600" />
            <span className="text-zinc-400">Not Started</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}