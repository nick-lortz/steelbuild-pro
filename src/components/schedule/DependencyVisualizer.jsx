import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';

export default function DependencyVisualizer({ tasks }) {
  const [expanded, setExpanded] = useState(false);
  const [criticalPath, setCriticalPath] = useState([]);

  useEffect(() => {
    if (tasks && tasks.length > 0) {
      const critical = calculateCriticalPath(tasks);
      setCriticalPath(critical);
    }
  }, [tasks]);

  const calculateCriticalPath = (taskList) => {
    // Build dependency graph
    const taskMap = new Map(taskList.map(t => [t.id, t]));
    const graph = new Map();
    
    taskList.forEach(task => {
      const predecessors = task.predecessor_ids || [];
      graph.set(task.id, {
        task,
        predecessors,
        successors: []
      });
    });

    // Build successor links
    graph.forEach((node, taskId) => {
      node.predecessors.forEach(predId => {
        if (graph.has(predId)) {
          graph.get(predId).successors.push(taskId);
        }
      });
    });

    // Calculate earliest start/finish
    const earliestStart = new Map();
    const earliestFinish = new Map();
    
    const calculateEarliest = (taskId) => {
      if (earliestStart.has(taskId)) return earliestFinish.get(taskId);
      
      const node = graph.get(taskId);
      const task = node.task;
      
      let maxPredFinish = 0;
      node.predecessors.forEach(predId => {
        if (graph.has(predId)) {
          maxPredFinish = Math.max(maxPredFinish, calculateEarliest(predId));
        }
      });
      
      const es = maxPredFinish;
      const ef = es + (task.duration_days || 0);
      
      earliestStart.set(taskId, es);
      earliestFinish.set(taskId, ef);
      
      return ef;
    };

    taskList.forEach(task => calculateEarliest(task.id));

    // Calculate latest start/finish (working backwards)
    const projectEnd = Math.max(...Array.from(earliestFinish.values()));
    const latestFinish = new Map();
    const latestStart = new Map();

    const calculateLatest = (taskId) => {
      if (latestFinish.has(taskId)) return latestStart.get(taskId);
      
      const node = graph.get(taskId);
      const task = node.task;
      
      let minSuccStart = projectEnd;
      if (node.successors.length > 0) {
        node.successors.forEach(succId => {
          if (graph.has(succId)) {
            minSuccStart = Math.min(minSuccStart, calculateLatest(succId));
          }
        });
      }
      
      const lf = minSuccStart;
      const ls = lf - (task.duration_days || 0);
      
      latestFinish.set(taskId, lf);
      latestStart.set(taskId, ls);
      
      return ls;
    };

    taskList.forEach(task => calculateLatest(task.id));

    // Identify critical path (tasks with zero float)
    const critical = taskList.filter(task => {
      const float = latestStart.get(task.id) - earliestStart.get(task.id);
      return Math.abs(float) < 0.01; // Account for floating point errors
    });

    return critical.map(t => t.id);
  };

  const renderDependencyNode = (task) => {
    const isCritical = criticalPath.includes(task.id);
    const hasDependencies = (task.predecessor_ids?.length || 0) > 0;
    
    return (
      <div
        key={task.id}
        className={`p-3 rounded border transition-all ${
          isCritical
            ? 'bg-red-500/10 border-red-500/50'
            : 'bg-zinc-950 border-zinc-800'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{task.name}</p>
            <p className="text-[10px] text-zinc-500">{task.duration_days || 0}d</p>
          </div>
          {isCritical && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0">
              Critical
            </Badge>
          )}
        </div>

        {hasDependencies && (
          <div className="flex items-center gap-1">
            <div className="text-amber-500">
              <AlertTriangle size={10} />
            </div>
            <p className="text-[10px] text-zinc-500">
              {task.predecessor_ids.length} dependencies
            </p>
          </div>
        )}

        {/* Dependency lines */}
        {hasDependencies && (
          <div className="mt-2 pl-2 border-l-2 border-amber-500/30">
            {task.predecessor_ids.slice(0, 3).map((predId, idx) => {
              const predTask = tasks.find(t => t.id === predId);
              if (!predTask) return null;
              return (
                <p key={idx} className="text-[9px] text-zinc-600 truncate">
                  → {predTask.name}
                </p>
              );
            })}
            {task.predecessor_ids.length > 3 && (
              <p className="text-[9px] text-zinc-600">
                +{task.predecessor_ids.length - 3} more
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const groupedByPhase = tasks.reduce((acc, task) => {
    const phase = task.phase || 'other';
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(task);
    return acc;
  }, {});

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Task Dependencies & Critical Path
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-7 w-7 p-0"
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {criticalPath.length > 0 && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
            <p className="text-xs font-medium text-red-400 mb-1">
              Critical Path: {criticalPath.length} tasks
            </p>
            <p className="text-[10px] text-zinc-400">
              These tasks directly impact project completion. Any delay will extend the schedule.
            </p>
          </div>
        )}

        {expanded ? (
          <div className="space-y-4">
            {Object.entries(groupedByPhase).map(([phase, phaseTasks]) => (
              <div key={phase}>
                <Badge variant="outline" className="mb-2 capitalize text-[10px]">
                  {phase} ({phaseTasks.length})
                </Badge>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {phaseTasks.map(renderDependencyNode)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.slice(0, 5).map(renderDependencyNode)}
            {tasks.length > 5 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpanded(true)}
                className="w-full border-zinc-700 text-xs"
              >
                Show all {tasks.length} tasks
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}