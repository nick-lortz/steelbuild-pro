import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from '@/lib/utils';

export default function ResourceHeatmap({ data }) {
  if (!data || data.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Resource Allocation Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">No resource data available for selected filters.</p>
        </CardContent>
      </Card>
    );
  }

  const getColorClass = (utilization) => {
    if (utilization >= 90) return 'bg-red-500';
    if (utilization >= 75) return 'bg-orange-500';
    if (utilization >= 50) return 'bg-yellow-500';
    if (utilization >= 25) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const weeks = [...new Set(data.map(d => d.week))];
  const resources = [...new Set(data.map(d => d.resource_name))];

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base">Resource Allocation Heatmap</CardTitle>
        <p className="text-xs text-zinc-500 mt-1">Weekly utilization by resource</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header */}
            <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: `150px repeat(${weeks.length}, 1fr)` }}>
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Resource</div>
              {weeks.map(week => (
                <div key={week} className="text-xs font-bold text-zinc-500 text-center">
                  {week}
                </div>
              ))}
            </div>

            {/* Heatmap Grid */}
            {resources.map(resource => (
              <div key={resource} className="grid gap-1 mb-1" style={{ gridTemplateColumns: `150px repeat(${weeks.length}, 1fr)` }}>
                <div className="text-xs text-white font-medium truncate py-2">{resource}</div>
                {weeks.map(week => {
                  const cell = data.find(d => d.resource_name === resource && d.week === week);
                  const utilization = cell?.utilization || 0;
                  return (
                    <div
                      key={`${resource}-${week}`}
                      className={cn(
                        "h-10 rounded flex items-center justify-center text-xs font-bold text-white transition-all hover:scale-105",
                        getColorClass(utilization),
                        utilization === 0 && "opacity-20"
                      )}
                      title={`${resource} - ${week}: ${utilization}%`}
                    >
                      {utilization > 0 ? `${utilization}%` : '-'}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-6 pt-4 border-t border-zinc-800">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Utilization:</p>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-xs text-zinc-400">0-25%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-xs text-zinc-400">25-50%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-xs text-zinc-400">50-75%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-xs text-zinc-400">75-90%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-xs text-zinc-400">90-100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}