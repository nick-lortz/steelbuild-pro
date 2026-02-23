import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ResourceAllocationCalendar({ resources, tasks, projects, onResourceClick }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const allocationMatrix = useMemo(() => {
    const matrix = {};

    resources.forEach(resource => {
      matrix[resource.id] = {
        resource,
        dailyAllocations: {}
      };

      weekDays.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const dayTasks = tasks.filter(task => {
          const isAssigned = (task.assigned_resources || []).includes(resource.id) || 
                            (task.assigned_equipment || []).includes(resource.id);
          
          if (!isAssigned || !task.start_date || !task.end_date) return false;

          try {
            return isWithinInterval(day, {
              start: parseISO(task.start_date),
              end: parseISO(task.end_date)
            });
          } catch {
            return false;
          }
        });

        const maxConcurrent = resource.max_concurrent_assignments || 3;
        const isOverallocated = dayTasks.length > maxConcurrent;

        matrix[resource.id].dailyAllocations[dayKey] = {
          tasks: dayTasks,
          count: dayTasks.length,
          isOverallocated,
          utilizationPercent: Math.min((dayTasks.length / maxConcurrent) * 100, 100)
        };
      });
    });

    return matrix;
  }, [resources, tasks, weekDays]);

  const goToPrevWeek = () => setCurrentWeekStart(addDays(currentWeekStart, -7));
  const goToNextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));
  const goToThisWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Weekly Resource Allocation</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={goToPrevWeek}>
              <ChevronLeft size={14} />
            </Button>
            <Button size="sm" variant="outline" onClick={goToThisWeek}>
              This Week
            </Button>
            <Button size="sm" variant="outline" onClick={goToNextWeek}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider sticky left-0 bg-zinc-900 z-10 min-w-[200px]">
                  Resource
                </th>
                {weekDays.map(day => (
                  <th key={day.toString()} className="p-2 text-center min-w-[120px]">
                    <div className={cn(
                      "text-xs font-semibold",
                      isSameDay(day, new Date()) ? "text-amber-400" : "text-zinc-400"
                    )}>
                      {format(day, 'EEE')}
                    </div>
                    <div className={cn(
                      "text-xs",
                      isSameDay(day, new Date()) ? "text-amber-400 font-bold" : "text-zinc-500"
                    )}>
                      {format(day, 'MMM d')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map(resource => {
                const allocation = allocationMatrix[resource.id];
                if (!allocation) return null;

                return (
                  <tr key={resource.id} className="border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3 sticky left-0 bg-zinc-900 z-10">
                      <button
                        onClick={() => onResourceClick?.(resource)}
                        className="text-left hover:text-amber-400 transition-colors"
                      >
                        <div className="font-medium text-sm text-white">{resource.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {resource.type}
                          </Badge>
                          <Badge className={cn(
                            "text-[10px]",
                            resource.status === 'available' ? 'bg-green-500/20 text-green-400' :
                            resource.status === 'assigned' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-zinc-700 text-zinc-400'
                          )}>
                            {resource.status}
                          </Badge>
                        </div>
                      </button>
                    </td>
                    {weekDays.map(day => {
                      const dayKey = format(day, 'yyyy-MM-dd');
                      const dayAlloc = allocation.dailyAllocations[dayKey];
                      const isToday = isSameDay(day, new Date());

                      return (
                        <td 
                          key={dayKey} 
                          className={cn(
                            "p-2 relative",
                            isToday && "bg-amber-500/5"
                          )}
                        >
                          {dayAlloc.count > 0 ? (
                            <div className={cn(
                              "rounded p-2 text-center transition-all cursor-help",
                              dayAlloc.isOverallocated 
                                ? "bg-red-500/20 border border-red-500/30" 
                                : dayAlloc.count >= 2
                                  ? "bg-amber-500/20 border border-amber-500/30"
                                  : "bg-blue-500/20 border border-blue-500/30"
                            )}
                            title={`${dayAlloc.tasks.map(t => t.name).join('\n')}`}
                            >
                              <div className="flex items-center justify-center gap-1">
                                {dayAlloc.isOverallocated && <AlertTriangle size={10} className="text-red-400" />}
                                <span className={cn(
                                  "text-xs font-bold",
                                  dayAlloc.isOverallocated ? "text-red-400" : "text-white"
                                )}>
                                  {dayAlloc.count}
                                </span>
                              </div>
                              <div className="text-[9px] text-zinc-400 mt-1">
                                {Math.round(dayAlloc.utilizationPercent)}%
                              </div>
                            </div>
                          ) : (
                            <div className="p-2 text-center">
                              <span className="text-xs text-zinc-700">—</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500/20 border border-blue-500/30 rounded" />
            <span>Normal Load</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-500/20 border border-amber-500/30 rounded" />
            <span>High Load</span>
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