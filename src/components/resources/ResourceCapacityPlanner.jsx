import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Users, Calendar, CheckCircle2 } from 'lucide-react';
import { format, addDays, addWeeks, startOfWeek, endOfWeek } from 'date-fns';

export default function ResourceCapacityPlanner({ projects, resources, tasks, resourceAllocations }) {
  const [timeWindow, setTimeWindow] = useState('2week'); // 2week, 4week, 8week
  const [filterSkill, setFilterSkill] = useState('all');

  const windowDays = useMemo(() => {
    switch (timeWindow) {
      case '2week': return 14;
      case '4week': return 28;
      case '8week': return 56;
      default: return 14;
    }
  }, [timeWindow]);

  const forecastData = useMemo(() => {
    if (!resources || !tasks) return [];

    const today = new Date();
    const endDate = addDays(today, windowDays);

    return resources.map(resource => {
      // Filter tasks by skill match if needed
      if (filterSkill !== 'all' && !resource.skills?.includes(filterSkill)) {
        return null;
      }

      // Get all tasks assigned to this resource in forecast window
      const assignedTasks = tasks.filter(t => 
        t.assigned_resources?.includes(resource.id) &&
        t.start_date && 
        new Date(t.start_date) <= endDate &&
        t.status !== 'completed'
      );

      // Calculate utilization by week
      const weeks = [];
      let currentWeekStart = startOfWeek(today);
      
      for (let i = 0; i < Math.ceil(windowDays / 7); i++) {
        const weekEnd = endOfWeek(currentWeekStart);
        const weekTasks = assignedTasks.filter(t => {
          const start = new Date(t.start_date);
          const end = t.end_date ? new Date(t.end_date) : start;
          return start <= weekEnd && end >= currentWeekStart;
        });

        const utilization = Math.min(weekTasks.length * 25, 100);
        const isOverallocated = weekTasks.length > 3;

        weeks.push({
          start: currentWeekStart,
          end: weekEnd,
          tasks: weekTasks.length,
          utilization,
          isOverallocated,
          projects: [...new Set(weekTasks.map(t => t.project_id))].length
        });

        currentWeekStart = addWeeks(currentWeekStart, 1);
      }

      const avgUtilization = weeks.reduce((sum, w) => sum + w.utilization, 0) / weeks.length;
      const peakUtilization = Math.max(...weeks.map(w => w.utilization));
      const hasBottleneck = weeks.some(w => w.isOverallocated);

      return {
        resource,
        weeks,
        avgUtilization,
        peakUtilization,
        hasBottleneck,
        totalTasks: assignedTasks.length,
        activeProjects: [...new Set(assignedTasks.map(t => t.project_id))].length
      };
    }).filter(Boolean).sort((a, b) => {
      // Sort by bottleneck first, then by utilization
      if (a.hasBottleneck !== b.hasBottleneck) return a.hasBottleneck ? -1 : 1;
      return b.peakUtilization - a.peakUtilization;
    });
  }, [resources, tasks, windowDays, filterSkill]);

  const allSkills = useMemo(() => {
    const skills = new Set();
    resources?.forEach(r => r.skills?.forEach(s => skills.add(s)));
    return Array.from(skills).sort();
  }, [resources]);

  const summary = useMemo(() => {
    const bottlenecks = forecastData.filter(f => f.hasBottleneck).length;
    const overutilized = forecastData.filter(f => f.avgUtilization > 80).length;
    const underutilized = forecastData.filter(f => f.avgUtilization < 40).length;
    const avgUtilization = forecastData.reduce((sum, f) => sum + f.avgUtilization, 0) / (forecastData.length || 1);

    return { bottlenecks, overutilized, underutilized, avgUtilization };
  }, [forecastData]);

  const getUtilizationColor = (util) => {
    if (util >= 100) return 'bg-red-500';
    if (util >= 80) return 'bg-amber-500';
    if (util >= 40) return 'bg-green-500';
    return 'bg-zinc-600';
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">Bottlenecks</p>
                <p className="text-2xl font-bold text-red-400">{summary.bottlenecks}</p>
              </div>
              <AlertTriangle className="text-red-400" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">Over-Utilized</p>
                <p className="text-2xl font-bold text-amber-400">{summary.overutilized}</p>
              </div>
              <TrendingUp className="text-amber-400" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">Under-Utilized</p>
                <p className="text-2xl font-bold text-blue-400">{summary.underutilized}</p>
              </div>
              <Users className="text-blue-400" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">Avg Utilization</p>
                <p className="text-2xl font-bold">{summary.avgUtilization.toFixed(0)}%</p>
              </div>
              <CheckCircle2 className="text-green-400" size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Capacity Forecast</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={filterSkill} onValueChange={setFilterSkill}>
                <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="all">All Skills</SelectItem>
                  {allSkills.map(skill => (
                    <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={timeWindow} onValueChange={setTimeWindow}>
                <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="2week">2 Weeks</SelectItem>
                  <SelectItem value="4week">4 Weeks</SelectItem>
                  <SelectItem value="8week">8 Weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Resource Grid */}
      <div className="space-y-2">
        {forecastData.map(forecast => (
          <Card 
            key={forecast.resource.id}
            className={`bg-zinc-900 border-zinc-800 ${forecast.hasBottleneck ? 'border-red-500/50' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{forecast.resource.name}</h4>
                      {forecast.hasBottleneck && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle size={12} className="mr-1" />
                          Bottleneck
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                      <span>{forecast.resource.classification || forecast.resource.type}</span>
                      <span>•</span>
                      <span>{forecast.totalTasks} tasks</span>
                      <span>•</span>
                      <span>{forecast.activeProjects} projects</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">Avg / Peak</p>
                    <p className="text-sm font-semibold">
                      {forecast.avgUtilization.toFixed(0)}% / {forecast.peakUtilization.toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Weekly bars */}
              <div className="flex gap-1">
                {forecast.weeks.map((week, idx) => (
                  <div 
                    key={idx}
                    className="flex-1 group relative"
                    title={`Week of ${format(week.start, 'MMM d')}: ${week.tasks} tasks, ${week.utilization}% utilized`}
                  >
                    <div className="h-12 bg-zinc-800 rounded-sm overflow-hidden">
                      <div 
                        className={`h-full ${getUtilizationColor(week.utilization)} transition-all`}
                        style={{ height: `${Math.min(week.utilization, 100)}%` }}
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm flex items-center justify-center">
                      <div className="text-xs text-white font-semibold">
                        {week.tasks}
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 text-center mt-1">
                      {format(week.start, 'M/d')}
                    </p>
                  </div>
                ))}
              </div>

              {forecast.resource.skills && forecast.resource.skills.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {forecast.resource.skills.slice(0, 4).map(skill => (
                    <Badge key={skill} variant="outline" className="text-[10px] px-1.5 py-0">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Legend */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-3">
          <div className="flex items-center justify-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-zinc-600 rounded" />
              <span className="text-zinc-400">0-40% (Available)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-zinc-400">40-80% (Optimal)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded" />
              <span className="text-zinc-400">80-100% (High)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-zinc-400">100%+ (Overallocated)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}