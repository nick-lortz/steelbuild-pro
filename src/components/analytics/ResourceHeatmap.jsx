import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, addDays, startOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ResourceHeatmap({ projects, resources, resourceAllocations, tasks }) {
  const [viewWeeks, setViewWeeks] = useState(4);

  // Calculate resource utilization over time
  const utilizationData = useMemo(() => {
    const startDate = startOfWeek(new Date());
    const days = eachDayOfInterval({
      start: startDate,
      end: addDays(startDate, viewWeeks * 7 - 1)
    });

    const laborResources = resources.filter(r => r.type === 'labor');

    return laborResources.map(resource => {
      const dailyUtilization = days.map(day => {
        // Find tasks assigned to this resource on this day
        const dayTasks = tasks.filter(t => {
          if (!t.assigned_resources || !t.assigned_resources.includes(resource.id)) return false;
          if (!t.start_date || !t.end_date) return false;
          
          const taskStart = new Date(t.start_date);
          const taskEnd = new Date(t.end_date);
          
          return day >= taskStart && day <= taskEnd;
        });

        // Calculate utilization (assume 8 hour workday, each task takes estimated_hours/duration)
        const totalHours = dayTasks.reduce((sum, t) => {
          const duration = Math.max(1, Math.ceil((new Date(t.end_date) - new Date(t.start_date)) / (1000 * 60 * 60 * 24)));
          const dailyHours = (Number(t.estimated_hours) || 0) / duration;
          return sum + dailyHours;
        }, 0);

        const utilizationPercent = Math.min(100, (totalHours / 8) * 100);

        return {
          date: day,
          hours: totalHours,
          utilization: utilizationPercent,
          tasks: dayTasks.length
        };
      });

      // Calculate metrics
      const avgUtilization = dailyUtilization.reduce((sum, d) => sum + d.utilization, 0) / dailyUtilization.length;
      const overallocatedDays = dailyUtilization.filter(d => d.utilization > 100).length;
      const underutilizedDays = dailyUtilization.filter(d => d.utilization < 50).length;

      return {
        resource,
        dailyUtilization,
        avgUtilization,
        overallocatedDays,
        underutilizedDays
      };
    });
  }, [resources, tasks, viewWeeks]);

  // Get date headers
  const weeks = useMemo(() => {
    const startDate = startOfWeek(new Date());
    const days = eachDayOfInterval({
      start: startDate,
      end: addDays(startDate, viewWeeks * 7 - 1)
    });

    const grouped = [];
    for (let i = 0; i < days.length; i += 7) {
      grouped.push(days.slice(i, i + 7));
    }
    return grouped;
  }, [viewWeeks]);

  const getUtilizationColor = (utilization) => {
    if (utilization === 0) return 'bg-zinc-800';
    if (utilization < 50) return 'bg-blue-500/20';
    if (utilization < 80) return 'bg-green-500/40';
    if (utilization <= 100) return 'bg-amber-500/60';
    return 'bg-red-500/80';
  };

  const getUtilizationStatus = (data) => {
    if (data.overallocatedDays > 0) return { text: 'Overallocated', color: 'text-red-400', icon: AlertTriangle };
    if (data.avgUtilization > 80) return { text: 'Well Utilized', color: 'text-green-400', icon: CheckCircle };
    if (data.avgUtilization < 50) return { text: 'Underutilized', color: 'text-blue-400', icon: Users };
    return { text: 'Balanced', color: 'text-zinc-400', icon: CheckCircle };
  };

  // Summary stats
  const summary = useMemo(() => {
    const totalResources = utilizationData.length;
    const overallocated = utilizationData.filter(d => d.overallocatedDays > 0).length;
    const underutilized = utilizationData.filter(d => d.avgUtilization < 50).length;
    const avgUtilization = utilizationData.reduce((sum, d) => sum + d.avgUtilization, 0) / (totalResources || 1);

    return { totalResources, overallocated, underutilized, avgUtilization };
  }, [utilizationData]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs font-medium">Total Resources</p>
                <p className="text-2xl font-bold text-white mt-1">{summary.totalResources}</p>
              </div>
              <Users className="text-blue-500" size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs font-medium">Avg Utilization</p>
                <p className="text-2xl font-bold text-green-400 mt-1">
                  {summary.avgUtilization.toFixed(0)}%
                </p>
              </div>
              <CheckCircle className="text-green-500" size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs font-medium">Overallocated</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{summary.overallocated}</p>
              </div>
              <AlertTriangle className="text-red-500" size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs font-medium">Underutilized</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{summary.underutilized}</p>
              </div>
              <Users className="text-blue-500" size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Users size={18} className="text-blue-500" />
              Resource Utilization Heatmap ({viewWeeks} Weeks)
            </CardTitle>
            <div className="flex gap-2">
              <button
                onClick={() => setViewWeeks(2)}
                className={cn(
                  "px-3 py-1 text-xs rounded",
                  viewWeeks === 2 ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-400"
                )}
              >
                2 Weeks
              </button>
              <button
                onClick={() => setViewWeeks(4)}
                className={cn(
                  "px-3 py-1 text-xs rounded",
                  viewWeeks === 4 ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-400"
                )}
              >
                4 Weeks
              </button>
              <button
                onClick={() => setViewWeeks(8)}
                className={cn(
                  "px-3 py-1 text-xs rounded",
                  viewWeeks === 8 ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-400"
                )}
              >
                8 Weeks
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 overflow-x-auto">
          {utilizationData.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto text-zinc-600 mb-3" size={40} />
              <p className="text-zinc-400">No labor resources found</p>
              <p className="text-zinc-600 text-sm mt-1">Add labor resources to track utilization</p>
            </div>
          ) : (
            <div className="min-w-[800px]">
              {/* Headers */}
              <div className="flex mb-2">
                <div className="w-48 flex-shrink-0"></div>
                <div className="flex-1 grid grid-cols-7 gap-1">
                  {weeks[0]?.map((day, idx) => (
                    <div key={idx} className="text-center text-xs text-zinc-400 font-medium">
                      {format(day, 'EEE')}
                    </div>
                  ))}
                </div>
                <div className="w-24 flex-shrink-0"></div>
              </div>

              {/* Resource Rows */}
              {utilizationData.map((data, resourceIdx) => {
                const status = getUtilizationStatus(data);
                const StatusIcon = status.icon;

                return (
                  <div key={resourceIdx} className="mb-3">
                    <div className="flex items-center mb-1">
                      <div className="w-48 flex-shrink-0">
                        <p className="text-white font-medium text-sm truncate">
                          {data.resource.name}
                        </p>
                        <p className="text-zinc-500 text-xs">
                          {data.resource.classification}
                        </p>
                      </div>

                      <div className="flex-1 flex gap-1">
                        {weeks.map((week, weekIdx) => (
                          <div key={weekIdx} className="grid grid-cols-7 gap-1 flex-1">
                            {week.map((day, dayIdx) => {
                              const dayData = data.dailyUtilization.find(d => 
                                isSameDay(d.date, day)
                              );
                              
                              return (
                                <div
                                  key={dayIdx}
                                  className={cn(
                                    "h-10 rounded flex items-center justify-center text-xs font-medium cursor-pointer hover:ring-2 hover:ring-amber-500 transition-all",
                                    getUtilizationColor(dayData?.utilization || 0)
                                  )}
                                  title={`${format(day, 'MMM d')}: ${(dayData?.utilization || 0).toFixed(0)}% (${dayData?.hours.toFixed(1)}h, ${dayData?.tasks} tasks)`}
                                >
                                  {dayData && dayData.utilization > 0 && (
                                    <span className="text-white">
                                      {dayData.utilization.toFixed(0)}%
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>

                      <div className="w-24 flex-shrink-0 pl-3">
                        <div className="flex items-center gap-1">
                          <StatusIcon size={14} className={status.color} />
                          <span className={cn("text-xs", status.color)}>
                            {data.avgUtilization.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-zinc-800">
                <p className="text-zinc-400 text-xs font-medium mb-2">Utilization Legend:</p>
                <div className="flex gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-zinc-800"></div>
                    <span className="text-xs text-zinc-400">0%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-500/20"></div>
                    <span className="text-xs text-zinc-400">&lt;50%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500/40"></div>
                    <span className="text-xs text-zinc-400">50-80%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-amber-500/60"></div>
                    <span className="text-xs text-zinc-400">80-100%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500/80"></div>
                    <span className="text-xs text-zinc-400">&gt;100%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}