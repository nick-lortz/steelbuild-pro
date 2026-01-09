import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

export default function HeatmapWidget({ resources, tasks, timeRange }) {
  const heatmapData = useMemo(() => {
    if (!resources || !tasks) return [];

    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 14;
    const grid = [];

    resources.slice(0, 10).forEach(resource => {
      const row = {
        resource: resource.name,
        days: []
      };

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const assignedTasks = tasks.filter(t => 
          t.assigned_resources?.includes(resource.id) &&
          t.start_date <= dateStr &&
          t.end_date >= dateStr
        );

        const utilization = Math.min(assignedTasks.length * 30, 100);

        row.days.push({
          date: dateStr,
          utilization,
          tasks: assignedTasks.length
        });
      }

      grid.push(row);
    });

    return grid;
  }, [resources, tasks, timeRange]);

  const getHeatColor = (utilization) => {
    if (utilization === 0) return 'bg-zinc-800';
    if (utilization < 25) return 'bg-blue-900/50';
    if (utilization < 50) return 'bg-green-900/50';
    if (utilization < 75) return 'bg-amber-900/50';
    return 'bg-red-900/50';
  };

  if (heatmapData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-zinc-400">
        No resource data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="space-y-1">
          {heatmapData.map((row, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <div className="w-32 text-xs text-zinc-400 truncate">{row.resource}</div>
              <div className="flex gap-1">
                {row.days.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    className={cn(
                      "w-4 h-4 rounded-sm transition-colors",
                      getHeatColor(day.utilization)
                    )}
                    title={`${day.date}: ${day.tasks} tasks, ${day.utilization}% utilized`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-zinc-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-zinc-800 rounded-sm" />
            <span>0%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-900/50 rounded-sm" />
            <span>25%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-900/50 rounded-sm" />
            <span>50%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-900/50 rounded-sm" />
            <span>75%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-900/50 rounded-sm" />
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}