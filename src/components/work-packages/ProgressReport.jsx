import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ProgressReport({ workPackages, tasks }) {
  const stats = useMemo(() => {
    const total = workPackages.length;
    const notStarted = workPackages.filter(wp => wp.status === 'not_started').length;
    const inProgress = workPackages.filter(wp => wp.status === 'in_progress').length;
    const completed = workPackages.filter(wp => wp.status === 'completed' || wp.status === 'closed').length;
    const onHold = workPackages.filter(wp => wp.status === 'on_hold').length;
    
    const avgProgress = total > 0
      ? workPackages.reduce((sum, wp) => sum + (wp.percent_complete || 0), 0) / total
      : 0;
    
    const totalBudget = workPackages.reduce((sum, wp) => sum + (wp.budget_at_award || 0), 0);
    const totalForecast = workPackages.reduce((sum, wp) => sum + (wp.forecast_at_completion || 0), 0);
    const variance = totalForecast - totalBudget;
    const variancePercent = totalBudget > 0 ? (variance / totalBudget) * 100 : 0;

    // Phase distribution
    const phaseBreakdown = {
      pre_fab: workPackages.filter(wp => wp.phase === 'pre_fab').length,
      shop: workPackages.filter(wp => wp.phase === 'shop').length,
      delivery: workPackages.filter(wp => wp.phase === 'delivery').length,
      erection: workPackages.filter(wp => wp.phase === 'erection').length,
      punch: workPackages.filter(wp => wp.phase === 'punch').length
    };

    // Task stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    return {
      total,
      notStarted,
      inProgress,
      completed,
      onHold,
      avgProgress,
      totalBudget,
      totalForecast,
      variance,
      variancePercent,
      phaseBreakdown,
      totalTasks,
      completedTasks,
      taskCompletionRate
    };
  }, [workPackages, tasks]);

  const phaseColors = {
    pre_fab: 'bg-blue-500',
    shop: 'bg-purple-500',
    delivery: 'bg-amber-500',
    erection: 'bg-green-500',
    punch: 'bg-cyan-500'
  };

  const maxPhaseCount = Math.max(...Object.values(stats.phaseBreakdown));

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-700/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs text-blue-300 flex items-center gap-2">
              <BarChart3 size={14} />
              Total Packages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-zinc-400 mt-1">
              {stats.completed} completed • {stats.inProgress} active
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-700/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs text-green-300 flex items-center gap-2">
              <TrendingUp size={14} />
              Avg Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.avgProgress.toFixed(0)}%</div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
                style={{ width: `${stats.avgProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-900/30 to-amber-800/20 border-amber-700/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs text-amber-300 flex items-center gap-2">
              <Clock size={14} />
              Task Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.taskCompletionRate.toFixed(0)}%</div>
            <div className="text-xs text-zinc-400 mt-1">
              {stats.completedTasks} / {stats.totalTasks} tasks
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-gradient-to-br border",
          stats.variance > 0
            ? "from-red-900/30 to-red-800/20 border-red-700/30"
            : "from-zinc-900/30 to-zinc-800/20 border-zinc-700/30"
        )}>
          <CardHeader className="pb-3">
            <CardTitle className={cn(
              "text-xs flex items-center gap-2",
              stats.variance > 0 ? "text-red-300" : "text-zinc-300"
            )}>
              <CheckCircle2 size={14} />
              Budget Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-3xl font-bold",
              stats.variance > 0 ? "text-red-400" : "text-white"
            )}>
              {stats.variance > 0 ? '+' : ''}{stats.variancePercent.toFixed(1)}%
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              ${(Math.abs(stats.variance) / 1000).toFixed(0)}K {stats.variance > 0 ? 'over' : 'under'} budget
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phase Distribution */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-sm">Phase Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.phaseBreakdown).map(([phase, count]) => {
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={phase}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-300 capitalize">
                      {phase.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full transition-all", phaseColors[phase])}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-sm">Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-zinc-900/50 rounded-lg">
              <div className="text-xs text-zinc-500 mb-1">Not Started</div>
              <div className="text-2xl font-bold text-zinc-400">{stats.notStarted}</div>
            </div>
            <div className="p-3 bg-blue-900/20 rounded-lg">
              <div className="text-xs text-blue-400 mb-1">In Progress</div>
              <div className="text-2xl font-bold text-blue-300">{stats.inProgress}</div>
            </div>
            <div className="p-3 bg-green-900/20 rounded-lg">
              <div className="text-xs text-green-400 mb-1">Completed</div>
              <div className="text-2xl font-bold text-green-300">{stats.completed}</div>
            </div>
            <div className="p-3 bg-amber-900/20 rounded-lg">
              <div className="text-xs text-amber-400 mb-1">On Hold</div>
              <div className="text-2xl font-bold text-amber-300">{stats.onHold}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}