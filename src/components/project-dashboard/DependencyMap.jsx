import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function DependencyMap({ tasks, projectId }) {
  const dependencyData = useMemo(() => {
    const projectTasks = tasks.filter(t => t.project_id === projectId);
    
    // Calculate critical path using forward and backward pass
    const calculateCriticalPath = () => {
      const taskMap = {};
      projectTasks.forEach(task => {
        taskMap[task.id] = {
          ...task,
          earlyStart: null,
          earlyFinish: null,
          lateStart: null,
          lateFinish: null,
          totalFloat: null,
          isCritical: false
        };
      });

      // Forward pass - calculate early start/finish
      const calculateEarlyDates = (taskId, visited = new Set()) => {
        if (visited.has(taskId)) return taskMap[taskId].earlyFinish;
        visited.add(taskId);

        const task = taskMap[taskId];
        if (!task) return 0;

        const duration = task.duration_days || 0;
        const predecessors = task.predecessor_ids || [];

        if (predecessors.length === 0) {
          task.earlyStart = 0;
          task.earlyFinish = duration;
        } else {
          const maxPredFinish = Math.max(
            ...predecessors.map(predId => calculateEarlyDates(predId, visited) || 0)
          );
          task.earlyStart = maxPredFinish;
          task.earlyFinish = maxPredFinish + duration;
        }

        return task.earlyFinish;
      };

      projectTasks.forEach(task => calculateEarlyDates(task.id));

      // Find project duration
      const projectDuration = Math.max(...Object.values(taskMap).map(t => t.earlyFinish || 0));

      // Backward pass - calculate late start/finish
      const calculateLateDates = (taskId, visited = new Set()) => {
        if (visited.has(taskId)) return taskMap[taskId].lateStart;
        visited.add(taskId);

        const task = taskMap[taskId];
        if (!task) return projectDuration;

        const duration = task.duration_days || 0;
        const successors = projectTasks.filter(t => 
          (t.predecessor_ids || []).includes(taskId)
        );

        if (successors.length === 0) {
          task.lateFinish = projectDuration;
          task.lateStart = projectDuration - duration;
        } else {
          const minSuccStart = Math.min(
            ...successors.map(s => calculateLateDates(s.id, visited) || projectDuration)
          );
          task.lateFinish = minSuccStart;
          task.lateStart = minSuccStart - duration;
        }

        return task.lateStart;
      };

      projectTasks.forEach(task => calculateLateDates(task.id));

      // Calculate float and identify critical path
      Object.values(taskMap).forEach(task => {
        task.totalFloat = (task.lateStart || 0) - (task.earlyStart || 0);
        task.isCritical = task.totalFloat === 0;
      });

      const criticalTasks = Object.values(taskMap).filter(t => t.isCritical);

      return {
        taskMap,
        criticalTasks,
        projectDuration,
        totalTasks: projectTasks.length,
        criticalTaskCount: criticalTasks.length
      };
    };

    return calculateCriticalPath();
  }, [tasks, projectId]);

  const { criticalTasks, projectDuration, totalTasks, criticalTaskCount, taskMap } = dependencyData;

  // Group tasks by dependency level
  const dependencyLevels = useMemo(() => {
    const levels = [];
    const processed = new Set();

    const getLevel = (taskId, visited = new Set()) => {
      if (visited.has(taskId)) return 0;
      visited.add(taskId);

      const task = taskMap[taskId];
      if (!task) return 0;

      const predecessors = task.predecessor_ids || [];
      if (predecessors.length === 0) return 0;

      return 1 + Math.max(...predecessors.map(predId => getLevel(predId, visited)));
    };

    Object.keys(taskMap).forEach(taskId => {
      const level = getLevel(taskId);
      if (!levels[level]) levels[level] = [];
      levels[level].push(taskMap[taskId]);
    });

    return levels.filter(Boolean);
  }, [taskMap]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'text-green-400';
      case 'in_progress': return 'text-amber-400';
      case 'blocked': return 'text-red-400';
      case 'on_hold': return 'text-orange-400';
      default: return 'text-zinc-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock size={20} className="mx-auto mb-2 text-amber-500" />
              <div className="text-2xl font-bold text-white">{projectDuration}</div>
              <p className="text-xs text-zinc-400 mt-1">Days (Critical Path)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle size={20} className="mx-auto mb-2 text-red-400" />
              <div className="text-2xl font-bold text-red-400">{criticalTaskCount}</div>
              <p className="text-xs text-zinc-400 mt-1">Critical Tasks</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 size={20} className="mx-auto mb-2 text-green-400" />
              <div className="text-2xl font-bold text-white">
                {criticalTasks.filter(t => t.status === 'completed').length}
              </div>
              <p className="text-xs text-zinc-400 mt-1">Critical Complete</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <ArrowRight size={20} className="mx-auto mb-2 text-blue-400" />
              <div className="text-2xl font-bold text-white">{dependencyLevels.length}</div>
              <p className="text-xs text-zinc-400 mt-1">Dependency Levels</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Path Visualization */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="text-zinc-300">Critical Path Tasks</span>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              {criticalTaskCount} tasks · {projectDuration} days
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {criticalTasks.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">No tasks with dependencies found</p>
          ) : (
            <div className="space-y-3">
              {criticalTasks
                .sort((a, b) => (a.earlyStart || 0) - (b.earlyStart || 0))
                .map((task, idx) => {
                  const predecessors = (task.predecessor_ids || [])
                    .map(predId => taskMap[predId])
                    .filter(Boolean);
                  
                  return (
                    <div key={task.id} className="relative">
                      {/* Connection Line */}
                      {idx > 0 && (
                        <div className="absolute -top-3 left-8 w-0.5 h-3 bg-red-500/30" />
                      )}
                      
                      <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-colors">
                        <div className="flex flex-col items-center gap-1 mt-1">
                          <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-bold text-red-400 border border-red-500/30">
                            {idx + 1}
                          </div>
                          {task.status === 'completed' && (
                            <CheckCircle2 size={12} className="text-green-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-medium text-white text-sm">{task.name}</h4>
                            <Badge variant="outline" className={`capitalize ${getStatusColor(task.status)}`}>
                              {task.status ? task.status.replace('_', ' ') : 'unknown'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-2">
                            <div>
                              <span className="text-zinc-600">Duration:</span>{' '}
                              <span className="text-white font-mono">{task.duration_days || 0}d</span>
                            </div>
                            <div>
                              <span className="text-zinc-600">Float:</span>{' '}
                              <span className="text-red-400 font-mono font-bold">{task.totalFloat || 0}d</span>
                            </div>
                            <div>
                              <span className="text-zinc-600">ES:</span>{' '}
                              <span className="text-white font-mono">Day {task.earlyStart}</span>
                            </div>
                            <div>
                              <span className="text-zinc-600">EF:</span>{' '}
                              <span className="text-white font-mono">Day {task.earlyFinish}</span>
                            </div>
                          </div>

                          {predecessors.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-zinc-700">
                              <p className="text-xs text-zinc-600 mb-1">Depends on:</p>
                              <div className="flex flex-wrap gap-1">
                                {predecessors.map(pred => (
                                  <Badge key={pred.id} variant="outline" className="text-xs bg-zinc-900 border-zinc-700">
                                    {pred.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {task.end_date && (
                            <div className="mt-2 text-xs text-zinc-500">
                              Due: {format(new Date(task.end_date), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dependency Levels Breakdown */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base text-zinc-300">Task Dependency Layers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dependencyLevels.map((levelTasks, levelIdx) => (
              <div key={levelIdx}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
                    Level {levelIdx}
                  </Badge>
                  <span className="text-xs text-zinc-600">
                    {levelTasks.length} task{levelTasks.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {levelTasks.map(task => (
                    <div
                      key={task.id}
                      className={`p-2 rounded border ${
                        task.isCritical 
                          ? 'bg-red-500/10 border-red-500/30' 
                          : 'bg-zinc-800/30 border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-white truncate flex-1">
                          {task.name}
                        </p>
                        {task.isCritical && (
                          <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs ${getStatusColor(task.status)}`}>
                          {task.status ? task.status.replace('_', ' ') : 'unknown'}
                        </span>
                        {task.totalFloat !== null && (
                          <span className="text-xs text-zinc-600">
                            • Float: {task.totalFloat}d
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Near-Critical Tasks Warning */}
      {Object.values(taskMap).filter(t => !t.isCritical && t.totalFloat > 0 && t.totalFloat <= 2).length > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardHeader>
            <CardTitle className="text-sm text-amber-400 flex items-center gap-2">
              <AlertTriangle size={16} />
              Near-Critical Tasks (≤2 days float)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.values(taskMap)
                .filter(t => !t.isCritical && t.totalFloat > 0 && t.totalFloat <= 2)
                .map(task => (
                  <div key={task.id} className="p-3 bg-zinc-800/50 rounded border border-amber-500/30">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-white text-sm">{task.name}</p>
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        {task.totalFloat}d float
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Any delay will push this task onto critical path
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

function getStatusColor(status) {
  switch(status) {
    case 'completed': return 'text-green-400';
    case 'in_progress': return 'text-amber-400';
    case 'blocked': return 'text-red-400';
    case 'on_hold': return 'text-orange-400';
    default: return 'text-zinc-400';
  }
}