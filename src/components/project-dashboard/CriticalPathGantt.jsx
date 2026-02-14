import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Home } from 'lucide-react';

export default function CriticalPathGantt({ projectId }) {
  const [showCriticalPath, setShowCriticalPath] = useState(true);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => base44.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000
  });

  // Calculate critical path
  const criticalPathData = useMemo(() => {
    if (!tasks || tasks.length === 0) return { criticalTasks: new Set(), longestPath: 0 };

    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const adjacencyList = new Map();
    const inDegree = new Map();
    
    tasks.forEach(task => {
      adjacencyList.set(task.id, []);
      inDegree.set(task.id, 0);
    });

    tasks.forEach(task => {
      const predecessors = task.predecessor_ids || [];
      predecessors.forEach(predId => {
        if (adjacencyList.has(predId)) {
          adjacencyList.get(predId).push(task.id);
          inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
        }
      });
    });

    const earliestStart = new Map();
    const earliestFinish = new Map();
    const queue = [];

    tasks.forEach(task => {
      if (inDegree.get(task.id) === 0) {
        queue.push(task.id);
        const duration = task.duration_days || (task.start_date && task.end_date ? differenceInDays(parseISO(task.end_date), parseISO(task.start_date)) : 1);
        earliestStart.set(task.id, 0);
        earliestFinish.set(task.id, duration);
      }
    });

    while (queue.length > 0) {
      const taskId = queue.shift();
      const successors = adjacencyList.get(taskId) || [];
      
      successors.forEach(succId => {
        const task = taskMap.get(succId);
        const duration = task.duration_days || (task.start_date && task.end_date ? differenceInDays(parseISO(task.end_date), parseISO(task.start_date)) : 1);
        const predFinish = earliestFinish.get(taskId) || 0;
        const currentES = earliestStart.get(succId) || 0;
        
        if (predFinish > currentES) {
          earliestStart.set(succId, predFinish);
          earliestFinish.set(succId, predFinish + duration);
        }
        
        inDegree.set(succId, inDegree.get(succId) - 1);
        if (inDegree.get(succId) === 0) {
          queue.push(succId);
        }
      });
    }

    let projectDuration = 0;
    earliestFinish.forEach(ef => {
      if (ef > projectDuration) projectDuration = ef;
    });

    const latestStart = new Map();
    const latestFinish = new Map();
    const reverseDependencies = new Map();

    tasks.forEach(task => reverseDependencies.set(task.id, []));
    tasks.forEach(task => {
      (task.predecessor_ids || []).forEach(predId => {
        if (reverseDependencies.has(predId)) {
          reverseDependencies.get(predId).push(task.id);
        }
      });
    });

    tasks.forEach(task => {
      const successors = reverseDependencies.get(task.id) || [];
      if (successors.length === 0) {
        latestFinish.set(task.id, projectDuration);
        const duration = task.duration_days || (task.start_date && task.end_date ? differenceInDays(parseISO(task.end_date), parseISO(task.start_date)) : 1);
        latestStart.set(task.id, projectDuration - duration);
      }
    });

    const criticalTasks = new Set();
    tasks.forEach(task => {
      const es = earliestStart.get(task.id) || 0;
      const ls = latestStart.get(task.id) || 0;
      const slack = ls - es;
      
      if (Math.abs(slack) < 0.01) {
        criticalTasks.add(task.id);
      }
    });

    return {
      criticalTasks,
      longestPath: projectDuration
    };
  }, [tasks]);

  const chartData = useMemo(() => {
    if (!tasks || tasks.length === 0) return { validTasks: [], minDate: new Date(), maxDate: new Date() };

    const validTasks = tasks.filter(t => t.start_date && t.end_date);
    if (validTasks.length === 0) return { validTasks: [], minDate: new Date(), maxDate: new Date() };

    const dates = validTasks.map(t => parseISO(t.start_date).getTime());
    const endDates = validTasks.map(t => parseISO(t.end_date).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...endDates));

    return { validTasks, minDate, maxDate };
  }, [tasks]);

  if (chartData.validTasks.length === 0) {
    return <div className="text-center py-12 text-zinc-500 text-sm">No tasks with dates</div>;
  }

  const totalDays = differenceInDays(chartData.maxDate, chartData.minDate) || 1;
  const HEADER_HEIGHT = 40;
  const BAR_HEIGHT = 40;
  const chartHeight = HEADER_HEIGHT + (chartData.validTasks.length * BAR_HEIGHT);
  const chartWidth = 1400;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
            Critical Path: {criticalPathData.criticalTasks.size} tasks
          </Badge>
          <Badge variant="outline" className="text-zinc-400">
            Duration: {criticalPathData.longestPath} days
          </Badge>
        </div>
        <Button
          size="sm"
          variant={showCriticalPath ? "default" : "outline"}
          onClick={() => setShowCriticalPath(!showCriticalPath)}
          className={showCriticalPath ? "bg-red-500 hover:bg-red-600 text-white" : "border-zinc-700"}
        >
          <Zap size={14} className="mr-1" />
          {showCriticalPath ? 'Hide' : 'Show'} Critical Path
        </Button>
      </div>

      <div className="overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} className="bg-zinc-950 rounded border border-zinc-800">
          {/* Grid lines */}
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={i}
              x1={300 + (i * (chartWidth - 300) / 10)}
              y1={HEADER_HEIGHT}
              x2={300 + (i * (chartWidth - 300) / 10)}
              y2={chartHeight}
              stroke="#27272a"
              strokeWidth="1"
            />
          ))}

          {/* Timeline header */}
          <rect x="0" y="0" width={chartWidth} height={HEADER_HEIGHT} className="fill-zinc-900" />
          <text x="10" y="25" className="text-xs fill-zinc-400 font-bold">TASK</text>
          {Array.from({ length: 10 }).map((_, i) => {
            const dayOffset = Math.floor((i / 10) * totalDays);
            const date = addDays(chartData.minDate, dayOffset);
            return (
              <text
                key={i}
                x={300 + (i * (chartWidth - 300) / 10)}
                y="25"
                className="text-xs fill-zinc-400"
                textAnchor="middle"
              >
                {format(date, 'MMM d')}
              </text>
            );
          })}

          {/* Task bars */}
          {chartData.validTasks.map((task, index) => {
            const y = HEADER_HEIGHT + (index * BAR_HEIGHT);
            const barY = y + (BAR_HEIGHT - 16) / 2;
            
            const startDays = differenceInDays(parseISO(task.start_date), chartData.minDate);
            const durationDays = differenceInDays(parseISO(task.end_date), parseISO(task.start_date));
            
            const x = 300 + ((startDays / totalDays) * (chartWidth - 300));
            const width = Math.max((durationDays / totalDays) * (chartWidth - 300), 4);
            
            const isCritical = criticalPathData.criticalTasks.has(task.id);
            const showCritical = showCriticalPath && isCritical;
            
            return (
              <g key={task.id}>
                {/* Task name */}
                <text
                  x={10}
                  y={barY + 12}
                  className={showCritical ? "text-xs fill-red-400 font-bold" : "text-xs fill-zinc-300"}
                  style={{ fontSize: '11px' }}
                >
                  {task.name.length > 30 ? task.name.substring(0, 30) + '...' : task.name}
                </text>

                {/* Critical path glow effect */}
                {showCritical && (
                  <rect
                    x={x - 2}
                    y={barY - 2}
                    width={width + 4}
                    height={20}
                    className="fill-red-500/20"
                    rx={6}
                  />
                )}

                {/* Task bar */}
                <rect
                  x={x}
                  y={barY}
                  width={width}
                  height={16}
                  className={
                    showCritical ? 'fill-red-500' :
                    task.status === 'completed' ? 'fill-green-600' : 
                    'fill-blue-600'
                  }
                  rx={4}
                />

                {/* Duration text */}
                <text
                  x={x + width / 2}
                  y={barY + 12}
                  className="text-xs fill-white text-center"
                  textAnchor="middle"
                  style={{ fontSize: '10px', fontWeight: 'bold' }}
                >
                  {durationDays}d
                </text>

                {/* Critical path indicator */}
                {showCritical && (
                  <circle
                    cx={x - 8}
                    cy={barY + 8}
                    r={3}
                    className="fill-red-500"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
      
      {/* Legend */}
      {showCriticalPath && criticalPathData.criticalTasks.size > 0 && (
        <div className="flex items-center gap-4 mt-4 p-3 bg-zinc-900 border border-zinc-800 rounded">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-zinc-400">Critical Path ({criticalPathData.criticalTasks.size} tasks)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-600" />
            <span className="text-xs text-zinc-400">Non-Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-600" />
            <span className="text-xs text-zinc-400">Completed</span>
          </div>
        </div>
      )}
    </div>
  );
}