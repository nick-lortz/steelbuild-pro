import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addDays, differenceInDays, parseISO, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle } from 'lucide-react';

export default function AvailabilityTimeline({ resources, tasks, projects, startDate, endDate, onTaskClick }) {
  const totalDays = differenceInDays(endDate, startDate);
  const weeks = Math.ceil(totalDays / 7);

  const timeline = useMemo(() => {
    return resources.map(resource => {
      const periods = [];
      let current = new Date(startDate);

      while (current <= endDate) {
        const weekEnd = addDays(current, 6);
        const weekTasks = tasks.filter(task => {
          const isAssigned = (task.assigned_resources || []).includes(resource.id) || 
                            (task.assigned_equipment || []).includes(resource.id);
          
          if (!isAssigned || !task.start_date || !task.end_date) return false;

          try {
            const taskStart = parseISO(task.start_date);
            const taskEnd = parseISO(task.end_date);
            
            return isWithinInterval(current, { start: taskStart, end: taskEnd }) ||
                   isWithinInterval(weekEnd, { start: taskStart, end: taskEnd }) ||
                   isWithinInterval(taskStart, { start: current, end: weekEnd });
          } catch {
            return false;
          }
        });

        const maxConcurrent = resource.max_concurrent_assignments || 3;
        const isOverallocated = weekTasks.length > maxConcurrent;
        const utilizationPercent = Math.min((weekTasks.length / maxConcurrent) * 100, 100);

        periods.push({
          weekStart: current,
          weekEnd,
          tasks: weekTasks,
          count: weekTasks.length,
          isOverallocated,
          utilizationPercent
        });

        current = addDays(current, 7);
      }

      return {
        resource,
        periods
      };
    });
  }, [resources, tasks, startDate, endDate]);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle>Resource Availability Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Week Headers */}
            <div className="flex mb-2">
              <div className="w-48 flex-shrink-0" />
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
                {timeline[0]?.periods.map((period, idx) => (
                  <div key={idx} className="text-center border-l border-zinc-800 px-1">
                    <div className="text-[10px] text-zinc-400">
                      {format(period.weekStart, 'MMM d')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resource Rows */}
            {timeline.map(({ resource, periods }) => (
              <div key={resource.id} className="flex items-center mb-2 hover:bg-zinc-800/30 rounded transition-colors">
                <div className="w-48 flex-shrink-0 pr-3">
                  <div className="text-sm font-medium text-white truncate">{resource.name}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge variant="outline" className="text-[9px] capitalize">{resource.type}</Badge>
                    <Badge className={cn(
                      "text-[9px]",
                      resource.status === 'available' ? 'bg-green-500/20 text-green-400' :
                      resource.status === 'assigned' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-zinc-700 text-zinc-400'
                    )}>
                      {resource.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
                  {periods.map((period, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "h-12 rounded border cursor-help transition-all",
                        period.count === 0 && "bg-zinc-800/30 border-zinc-700",
                        period.count > 0 && !period.isOverallocated && "bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30",
                        period.isOverallocated && "bg-red-500/20 border-red-500/30 hover:bg-red-500/30 animate-pulse"
                      )}
                      title={period.tasks.map(t => t.name).join('\n') || 'Available'}
                    >
                      {period.count > 0 && (
                        <div className="flex flex-col items-center justify-center h-full">
                          <div className="flex items-center gap-1">
                            {period.isOverallocated && <AlertTriangle size={10} className="text-red-400" />}
                            <span className={cn(
                              "text-xs font-bold",
                              period.isOverallocated ? "text-red-400" : "text-white"
                            )}>
                              {period.count}
                            </span>
                          </div>
                          <div className="text-[9px] text-zinc-400">
                            {Math.round(period.utilizationPercent)}%
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-zinc-800/30 border border-zinc-700 rounded" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500/20 border border-blue-500/30 rounded" />
            <span>Allocated</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500/20 border border-red-500/30 rounded flex items-center justify-center">
              <AlertTriangle size={8} className="text-red-400" />
            </div>
            <span>Overallocated</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}