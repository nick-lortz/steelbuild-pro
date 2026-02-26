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
    try {
      if (!taskList || taskList.length === 0) return [];
      const tasksWithDeps = taskList.filter(t => (t.predecessor_ids || []).length > 0);
      if (tasksWithDeps.length === 0) return [];

      const taskMap = new Map(taskList.map(t => [t.id, t]));
      const inDegree = new Map(taskList.map(t => [t.id, 0]));
      const successors = new Map(taskList.map(t => [t.id, []]));

      taskList.forEach(task => {
        (task.predecessor_ids || []).forEach(predId => {
          if (taskMap.has(predId)) {
            inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
            successors.get(predId).push(task.id);
          }
        });
      });

      // Topological sort to avoid recursion stack overflow
      const queue = taskList.filter(t => (inDegree.get(t.id) || 0) === 0).map(t => t.id);
      const topoOrder = [];
      const tempInDegree = new Map(inDegree);

      while (queue.length > 0) {
        const current = queue.shift();
        topoOrder.push(current);
        (successors.get(current) || []).forEach(succId => {
          const newDeg = (tempInDegree.get(succId) || 0) - 1;
          tempInDegree.set(succId, newDeg);
          if (newDeg === 0) queue.push(succId);
        });
      }

      // If cycle detected, return empty
      if (topoOrder.length !== taskList.length) return [];

      const earliest = new Map();
      topoOrder.forEach(taskId => {
        const task = taskMap.get(taskId);
        const preds = (task.predecessor_ids || []).filter(id => taskMap.has(id));
        const maxPred = preds.length > 0 ? Math.max(...preds.map(id => (earliest.get(id)?.finish || 0))) : 0;
        const dur = task.duration_days || 1;
        earliest.set(taskId, { start: maxPred, finish: maxPred + dur });
      });

      const projectEnd = Math.max(...Array.from(earliest.values()).map(e => e.finish));
      const latest = new Map();
      [...topoOrder].reverse().forEach(taskId => {
        const task = taskMap.get(taskId);
        const succs = successors.get(taskId) || [];
        const minSucc = succs.length > 0 ? Math.min(...succs.map(id => (latest.get(id)?.start || projectEnd))) : projectEnd;
        const dur = task.duration_days || 1;
        latest.set(taskId, { start: minSucc - dur, finish: minSucc });
      });

      return taskList.filter(task => {
        const e = earliest.get(task.id);
        const l = latest.get(task.id);
        if (!e || !l) return false;
        return Math.abs(l.start - e.start) < 0.01;
      }).map(t => t.id);
    } catch {
      return [];
    }
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