import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Lock, ArrowRight } from 'lucide-react';
import { format, parseISO, differenceInDays, addDays, isAfter, isBefore, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';

export default function SteelGanttChart({ projectId }) {
  const [expandedTask, setExpandedTask] = useState(null);
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-gantt', projectId],
    queryFn: () => base44.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const phaseSequence = ['detailing', 'fabrication', 'delivery', 'erection', 'closeout'];

  // Build dependency graph and find blocking issues
  const blockingAnalysis = useMemo(() => {
    const blocks = new Map(); // taskId -> array of reasons

    tasks.forEach(task => {
      const blockReasons = [];

      // Hard rule: task cannot start before ALL predecessors finish
      if (task.predecessor_ids?.length) {
        task.predecessor_ids.forEach(predId => {
          const predTask = tasks.find(t => t.id === predId);
          if (predTask) {
            const predEnd = new Date(predTask.end_date);
            const taskStart = new Date(task.start_date);
            if (isAfter(predEnd, taskStart) && predTask.status !== 'completed') {
              blockReasons.push({
                type: 'predecessor',
                taskId: predId,
                taskName: predTask.name,
                reason: `Predecessor "${predTask.name}" ends after this task starts`
              });
            }
          }
        });
      }

      // Hard rule: phase sequence (detailing before fab, fab before delivery, etc.)
      const taskPhaseIdx = phaseSequence.indexOf(task.phase);
      const taskStart = new Date(task.start_date);

      tasks.forEach(otherTask => {
        if (otherTask.id !== task.id && otherTask.project_id === task.project_id) {
          const otherPhaseIdx = phaseSequence.indexOf(otherTask.phase);
          if (taskPhaseIdx > otherPhaseIdx) {
            const otherEnd = new Date(otherTask.end_date);
            if (!isAfter(taskStart, otherEnd)) {
              if (
                isWithinInterval(otherTask.start_date, { start: task.start_date, end: addDays(task.start_date, 180) }) ||
                isWithinInterval(taskStart, { start: otherTask.start_date, end: otherTask.end_date })
              ) {
                if (otherTask.status !== 'completed') {
                  blockReasons.push({
                    type: 'phase_sequence',
                    taskId: otherTask.id,
                    taskName: otherTask.name,
                    reason: `${otherTask.phase} must complete before ${task.phase}`
                  });
                }
              }
            }
          }
        }
      });

      if (blockReasons.length > 0) {
        blocks.set(task.id, blockReasons);
      }
    });

    return blocks;
  }, [tasks]);

  // Sort tasks: by phase, then by start date
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const phaseA = phaseSequence.indexOf(a.phase);
      const phaseB = phaseSequence.indexOf(b.phase);
      if (phaseA !== phaseB) return phaseA - phaseB;
      return new Date(a.start_date) - new Date(b.start_date);
    });
  }, [tasks]);

  // Calculate gantt timeline: min/max dates
  const dateRange = useMemo(() => {
    if (sortedTasks.length === 0) return { start: new Date(), end: addDays(new Date(), 180) };
    const starts = sortedTasks.map(t => new Date(t.start_date));
    const ends = sortedTasks.map(t => new Date(t.end_date));
    return {
      start: new Date(Math.min(...starts)),
      end: new Date(Math.max(...ends))
    };
  }, [sortedTasks]);

  const daysInRange = differenceInDays(dateRange.end, dateRange.start);

  const getTaskPosition = (task) => {
    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.end_date);
    const taskDays = differenceInDays(taskEnd, taskStart);
    const startOffset = differenceInDays(taskStart, dateRange.start);
    return { startOffset, taskDays };
  };

  const handleBlockingIssue = (taskId) => {
    setExpandedTask(expandedTask === taskId ? null : taskId);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-lg">Steel-Aware Gantt</CardTitle>
          <p className="text-xs text-zinc-400 mt-1">
            Hard dependencies enforced. {blockingAnalysis.size} task(s) blocked.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {sortedTasks.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">No tasks scheduled</div>
          ) : (
            <div className="space-y-2 pb-4">
              {/* Timeline ruler */}
              <div className="flex items-end gap-2 mb-4">
                <div className="w-40 text-xs font-bold text-zinc-500 uppercase">Task</div>
                <div className="flex-1 flex gap-0">
                  {Array.from({ length: Math.ceil(daysInRange / 7) }).map((_, idx) => (
                    <div
                      key={idx}
                      className="text-[10px] text-zinc-500 flex-shrink-0"
                      style={{ width: `${(7 / daysInRange) * 100}%` }}
                    >
                      W{idx + 1}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tasks */}
              {sortedTasks.map((task) => {
                const { startOffset, taskDays } = getTaskPosition(task);
                const hasBlocks = blockingAnalysis.has(task.id);
                const blocks = blockingAnalysis.get(task.id) || [];

                const statusColor = {
                  completed: 'bg-green-600',
                  in_progress: 'bg-amber-500',
                  blocked: 'bg-red-600',
                  not_started: 'bg-blue-600'
                }[task.status] || 'bg-zinc-600';

                const leftPercent = (startOffset / daysInRange) * 100;
                const widthPercent = (taskDays / daysInRange) * 100;

                return (
                  <div key={task.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-40 truncate">
                        <div className="flex items-center gap-2">
                          {hasBlocks && (
                            <button
                              onClick={() => handleBlockingIssue(task.id)}
                              className="flex-shrink-0"
                            >
                              <AlertCircle size={14} className="text-red-400 hover:text-red-300" />
                            </button>
                          )}
                          {task.is_critical && (
                            <Lock size={12} className="text-red-400 flex-shrink-0" />
                          )}
                          <span className="text-xs font-mono font-bold text-white truncate">
                            {task.name}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {format(parseISO(task.start_date), 'MMM d')} ({taskDays}d)
                        </div>
                      </div>

                      <div className="flex-1 relative h-6 bg-zinc-950 rounded border border-zinc-700">
                        <div
                          className={cn(
                            'absolute top-0 bottom-0 rounded border border-opacity-50',
                            statusColor
                          )}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${Math.max(widthPercent, 2)}%`,
                            minWidth: '2px'
                          }}
                          title={`${task.progress_percent || 0}% complete`}
                        >
                          <div className="text-[10px] font-bold text-white opacity-70 px-1 pt-0.5">
                            {task.progress_percent || 0}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Blocking reasons */}
                    {expandedTask === task.id && blocks.length > 0 && (
                      <div className="ml-4 pl-4 border-l-2 border-red-600 space-y-1 bg-red-950/20 p-2 rounded text-xs">
                        {blocks.map((block, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <ArrowRight size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold text-red-400">
                                {block.type === 'predecessor' ? 'Predecessor Block' : 'Phase Sequence'}
                              </div>
                              <div className="text-red-300 text-[10px]">{block.reason}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {blockingAnalysis.size > 0 && (
        <Card className="bg-red-950/30 border-red-900">
          <CardContent className="pt-4">
            <div className="text-sm">
              <div className="font-bold text-red-400 mb-2">
                {blockingAnalysis.size} task{blockingAnalysis.size > 1 ? 's' : ''} blocked by hard dependencies
              </div>
              <p className="text-xs text-zinc-300">
                Resolve predecessor completions or phase sequence violations to unblock tasks.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}