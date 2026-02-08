import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Calendar } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';

export default function ProjectScheduleWidget({ projectId }) {
  const { data: healthData, isLoading } = useQuery({
    queryKey: ['project-schedule-health', projectId],
    queryFn: async () => {
      const response = await apiClient.functions.invoke('calculateProjectScheduleHealth', {
        project_id: projectId
      });
      return response.data;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000
  });

  if (isLoading || !healthData) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getHealthColor = (status) => {
    switch (status) {
      case 'on_track': return 'text-green-400';
      case 'at_risk': return 'text-amber-400';
      case 'delayed': return 'text-red-400';
      default: return 'text-zinc-400';
    }
  };

  const getHealthBadge = (status) => {
    switch (status) {
      case 'on_track': return <Badge className="bg-green-500/20 text-green-400 border-green-500/40">On Track</Badge>;
      case 'at_risk': return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40">At Risk</Badge>;
      case 'delayed': return <Badge className="bg-red-500/20 text-red-400 border-red-500/40">Delayed</Badge>;
      default: return <Badge>Unknown</Badge>;
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg">Schedule Health</CardTitle>
          {getHealthBadge(healthData.health_status)}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Health Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">Health Score</span>
            <span className={`text-2xl font-bold ${getHealthColor(healthData.health_status)}`}>
              {healthData.health_score}
            </span>
          </div>
          <Progress 
            value={healthData.health_score} 
            className="h-2"
          />
        </div>

        {/* Progress Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-zinc-400">Overall Progress</div>
            <div className="text-2xl font-bold text-white">
              {healthData.overall_progress}%
            </div>
            <Progress value={healthData.overall_progress} className="h-1.5" />
          </div>
          
          <div className="space-y-1">
            <div className="text-xs text-zinc-400">Weighted Progress</div>
            <div className="text-2xl font-bold text-white">
              {healthData.weighted_progress}%
            </div>
            <Progress value={healthData.weighted_progress} className="h-1.5" />
          </div>
        </div>

        {/* Task Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-3 bg-zinc-800/50 rounded-lg">
            <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
            <div>
              <div className="text-xs text-zinc-400">Completed</div>
              <div className="text-lg font-bold text-white">{healthData.completed_tasks}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-zinc-800/50 rounded-lg">
            <Clock size={16} className="text-blue-400 flex-shrink-0" />
            <div>
              <div className="text-xs text-zinc-400">In Progress</div>
              <div className="text-lg font-bold text-white">{healthData.in_progress_tasks}</div>
            </div>
          </div>

          {healthData.overdue_tasks > 0 && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
              <div>
                <div className="text-xs text-zinc-400">Overdue</div>
                <div className="text-lg font-bold text-red-400">{healthData.overdue_tasks}</div>
              </div>
            </div>
          )}

          {healthData.blocked_tasks > 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
              <div>
                <div className="text-xs text-zinc-400">Blocked</div>
                <div className="text-lg font-bold text-amber-400">{healthData.blocked_tasks}</div>
              </div>
            </div>
          )}
        </div>

        {/* Schedule Variance */}
        {healthData.tasks_with_baseline > 0 && (
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-zinc-400" />
              <span className="text-xs text-zinc-400">Schedule Variance</span>
            </div>
            <div className={`text-lg font-bold ${
              healthData.avg_schedule_variance_days === 0 
                ? 'text-green-400' 
                : healthData.avg_schedule_variance_days > 0 
                  ? 'text-red-400' 
                  : 'text-green-400'
            }`}>
              {healthData.avg_schedule_variance_days > 0 ? '+' : ''}
              {healthData.avg_schedule_variance_days} days
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {healthData.tasks_with_baseline} tasks with baseline
            </div>
          </div>
        )}

        {/* Phase Progress */}
        <div>
          <div className="text-sm font-medium text-white mb-3">Phase Progress</div>
          <div className="space-y-2">
            {Object.entries(healthData.phase_progress).map(([phase, data]) => {
              if (data.total === 0) return null;
              return (
                <div key={phase}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-zinc-400 capitalize">{phase}</span>
                    <span className="text-white">
                      {data.completed}/{data.total} ({data.percent}%)
                    </span>
                  </div>
                  <Progress value={data.percent} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Milestones */}
        {healthData.upcoming_milestones.length > 0 && (
          <div>
            <div className="text-sm font-medium text-white mb-2">Upcoming Milestones</div>
            <div className="space-y-2">
              {healthData.upcoming_milestones.slice(0, 3).map(milestone => (
                <div key={milestone.id} className="flex items-center gap-2 text-xs p-2 bg-zinc-800/50 rounded">
                  <Calendar size={12} className="text-amber-400 flex-shrink-0" />
                  <span className="flex-1 text-white truncate">{milestone.name}</span>
                  <span className="text-zinc-400">{milestone.end_date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alerts */}
        {healthData.alerts.length > 0 && (
          <div className="space-y-2">
            {healthData.alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 p-2 rounded text-xs ${
                  alert.severity === 'critical'
                    ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                    : alert.severity === 'high'
                      ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                      : alert.severity === 'medium'
                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                        : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                }`}
              >
                <AlertTriangle size={14} className="flex-shrink-0" />
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}