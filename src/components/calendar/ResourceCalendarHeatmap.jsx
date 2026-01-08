import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  format,
  parseISO,
  isWithinInterval
} from 'date-fns';
import { cn } from '@/lib/utils';

export default function ResourceCalendarHeatmap({ resources, allocations, tasks, currentDate }) {
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const heatmapData = useMemo(() => {
    return resources.map(resource => {
      const dailyAllocation = {};

      monthDays.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        dailyAllocation[dayKey] = 0;

        // Check resource allocations
        allocations
          .filter(a => a.resource_id === resource.id)
          .forEach(allocation => {
            if (allocation.start_date && allocation.end_date) {
              try {
                const start = parseISO(allocation.start_date);
                const end = parseISO(allocation.end_date);
                
                if (isWithinInterval(day, { start, end })) {
                  dailyAllocation[dayKey] += allocation.allocation_percentage || 100;
                }
              } catch (e) {
                // Skip invalid dates
              }
            }
          });

        // Check task assignments
        tasks
          .filter(t => 
            (t.assigned_resources || []).includes(resource.id) ||
            (t.assigned_equipment || []).includes(resource.id)
          )
          .forEach(task => {
            if (task.start_date && task.end_date && task.status !== 'completed') {
              try {
                const start = parseISO(task.start_date);
                const end = parseISO(task.end_date);
                
                if (isWithinInterval(day, { start, end })) {
                  dailyAllocation[dayKey] += 33; // Rough estimate per task
                }
              } catch (e) {
                // Skip invalid dates
              }
            }
          });
      });

      const avgUtilization = Object.values(dailyAllocation).reduce((sum, val) => sum + val, 0) / monthDays.length;

      return {
        resource,
        dailyAllocation,
        avgUtilization: Math.min(avgUtilization, 100),
      };
    });
  }, [resources, allocations, tasks, monthDays]);

  const getUtilizationColor = (utilization) => {
    if (utilization === 0) return 'bg-zinc-800';
    if (utilization < 25) return 'bg-green-500/20';
    if (utilization < 50) return 'bg-green-500/40';
    if (utilization < 75) return 'bg-amber-500/40';
    if (utilization < 100) return 'bg-amber-500/60';
    return 'bg-red-500/60';
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg">Resource Utilization Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex items-center gap-2 mb-4 text-xs">
          <span className="text-zinc-400">Utilization:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-zinc-800 rounded" />
            <span className="text-zinc-500">0%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-500/40 rounded" />
            <span className="text-zinc-500">50%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-amber-500/60 rounded" />
            <span className="text-zinc-500">75%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-500/60 rounded" />
            <span className="text-zinc-500">100%+</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Day headers */}
            <div className="flex mb-2">
              <div className="w-40 flex-shrink-0" />
              {monthDays.map(day => (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  className="flex-1 text-center text-[10px] text-zinc-500"
                >
                  {format(day, 'd')}
                </div>
              ))}
            </div>

            {/* Resource rows */}
            {heatmapData.map(({ resource, dailyAllocation, avgUtilization }) => (
              <div key={resource.id} className="flex items-center mb-1">
                <div className="w-40 flex-shrink-0 pr-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white truncate">
                      {resource.name}
                    </span>
                    <Badge variant="outline" className="text-[9px] ml-1">
                      {Math.round(avgUtilization)}%
                    </Badge>
                  </div>
                </div>
                <div className="flex-1 flex gap-0.5">
                  {monthDays.map(day => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const utilization = dailyAllocation[dayKey] || 0;
                    
                    return (
                      <div
                        key={dayKey}
                        className={cn(
                          'flex-1 h-6 rounded-sm transition-colors',
                          getUtilizationColor(utilization)
                        )}
                        title={`${format(day, 'MMM d')}: ${Math.round(utilization)}%`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}