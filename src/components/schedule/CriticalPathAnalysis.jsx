import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export default function CriticalPathAnalysis({ tasks, criticalPathData, projects }) {
  const { criticalTasks, longestPath, taskData } = criticalPathData;

  const criticalTasksList = tasks.filter(t => criticalTasks.includes(t.id));
  const totalTasks = tasks.length;
  const criticalCount = criticalTasksList.length;
  const criticalPercent = totalTasks > 0 ? ((criticalCount / totalTasks) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-red-500/10 border-red-500/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-red-400">
              <AlertTriangle size={16} />
              Critical Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{criticalCount}</p>
            <p className="text-xs text-zinc-400 mt-1">{criticalPercent}% of total tasks</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-amber-400">
              <Clock size={16} />
              Project Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{longestPath}</p>
            <p className="text-xs text-zinc-400 mt-1">Working days</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-blue-400">
              <TrendingUp size={16} />
              Avg Float
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {tasks.length > 0 
                ? (tasks.reduce((sum, t) => sum + (t.float_days || 0), 0) / tasks.length).toFixed(1)
                : 0
              }
            </p>
            <p className="text-xs text-zinc-400 mt-1">Days</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Tasks List */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle>Critical Path Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {criticalTasksList.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">No critical tasks found</p>
          ) : (
            <div className="space-y-2">
              {criticalTasksList.map((task, idx) => {
                const project = projects.find(p => p.id === task.project_id);
                const taskInfo = taskData?.[task.id];
                
                return (
                  <div 
                    key={task.id} 
                    className="p-4 bg-zinc-800/50 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                            #{idx + 1}
                          </Badge>
                          <h4 className="font-medium text-white">{task.name}</h4>
                        </div>
                        <p className="text-xs text-zinc-500 mb-2">{project?.name}</p>
                        <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
                          <div>
                            <span className="text-zinc-500">Start:</span>{' '}
                            {task.start_date ? format(new Date(task.start_date), 'MMM d') : '-'}
                          </div>
                          <div>
                            <span className="text-zinc-500">End:</span>{' '}
                            {task.end_date ? format(new Date(task.end_date), 'MMM d') : '-'}
                          </div>
                          <div>
                            <span className="text-zinc-500">Duration:</span> {task.duration_days}d
                          </div>
                          <div className="text-red-400 font-medium">
                            <span className="text-zinc-500">Float:</span> {taskInfo?.totalFloat || 0}d
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className="capitalize border-zinc-700"
                      >
                        {task.phase?.replace('_', ' ')}
                      </Badge>
                    </div>
                    {task.predecessor_ids && task.predecessor_ids.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-zinc-700">
                        <p className="text-xs text-zinc-500 mb-1">Dependencies:</p>
                        <div className="flex flex-wrap gap-2">
                          {task.predecessor_ids.map(predId => {
                            const pred = tasks.find(t => t.id === predId);
                            return pred ? (
                              <Badge key={predId} variant="outline" className="text-xs">
                                {pred.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compression Risks */}
      {criticalTasksList.some(t => t.duration_days < 3) && (
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardHeader>
            <CardTitle className="text-sm text-amber-400 flex items-center gap-2">
              <AlertTriangle size={16} />
              Schedule Compression Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-300 mb-3">
              The following critical tasks have very short durations and may pose a risk:
            </p>
            <div className="space-y-2">
              {criticalTasksList
                .filter(t => t.duration_days < 3)
                .map(task => (
                  <div key={task.id} className="p-3 bg-zinc-800/50 rounded border border-amber-500/30">
                    <p className="font-medium text-white">{task.name}</p>
                    <p className="text-xs text-amber-400 mt-1">
                      Duration: {task.duration_days} day{task.duration_days !== 1 ? 's' : ''} - Consider adding buffer
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}