import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Lock, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function WorkPackageScheduleView({ projectId }) {
  const [expandedWP, setExpandedWP] = useState(new Set());

  const { data: workPackages = [] } = useQuery({
    queryKey: ['work-packages', projectId],
    queryFn: () => base44.entities.WorkPackage.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-full', projectId],
    queryFn: () => base44.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const phaseSequence = ['detailing', 'fabrication', 'delivery', 'erection', 'closeout'];

  // Compute phase lock status for each WP
  const wpPhaseStatus = useMemo(() => {
    const status = new Map();

    workPackages.forEach(wp => {
      const wpTasks = tasks.filter(t => t.work_package_id === wp.id);
      const phases = new Map();

      // Aggregate tasks by phase
      phaseSequence.forEach(phase => {
        const phaseTasks = wpTasks.filter(t => t.phase === phase);
        if (phaseTasks.length > 0) {
          const allComplete = phaseTasks.every(t => t.status === 'completed');
          const allStarted = phaseTasks.some(t => t.status === 'in_progress' || t.status === 'completed');
          phases.set(phase, {
            tasks: phaseTasks,
            complete: allComplete,
            started: allStarted,
            progress: Math.round(phaseTasks.reduce((sum, t) => sum + (t.progress_percent || 0), 0) / phaseTasks.length)
          });
        }
      });

      // Determine if phases are locked (previous phase not complete)
      const phaseLocks = new Map();
      let previousComplete = true;
      phaseSequence.forEach(phase => {
        if (phases.has(phase)) {
          const isLocked = !previousComplete;
          phaseLocks.set(phase, isLocked);
          if (phases.get(phase).complete) {
            previousComplete = true;
          } else {
            previousComplete = false;
          }
        }
      });

      status.set(wp.id, {
        phases,
        phaseLocks,
        taskCount: wpTasks.length
      });
    });

    return status;
  }, [workPackages, tasks]);

  const toggleWP = (wpId) => {
    const next = new Set(expandedWP);
    if (next.has(wpId)) {
      next.delete(wpId);
    } else {
      next.add(wpId);
    }
    setExpandedWP(next);
  };

  return (
    <div className="space-y-2">
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-lg">Work Package Schedule</CardTitle>
          <p className="text-xs text-zinc-400 mt-1">
            Expand to view phase-locked task progression
          </p>
        </CardHeader>
        <CardContent>
          {workPackages.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">No work packages found</div>
          ) : (
            <div className="space-y-1">
              {workPackages.map((wp) => {
                const isExpanded = expandedWP.has(wp.id);
                const status = wpPhaseStatus.get(wp.id);
                if (!status) return null;

                const wpTasks = tasks.filter(t => t.work_package_id === wp.id);

                return (
                  <div key={wp.id}>
                    {/* WP Header */}
                    <button
                      onClick={() => toggleWP(wp.id)}
                      className="w-full flex items-center gap-3 p-3 rounded border border-zinc-700 hover:bg-zinc-800 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown size={16} className="flex-shrink-0" />
                      ) : (
                        <ChevronRight size={16} className="flex-shrink-0" />
                      )}

                      <div className="flex-1 text-left">
                        <div className="text-sm font-bold text-white">{wp.name}</div>
                        <div className="text-xs text-zinc-400">
                          {status.taskCount} task{status.taskCount !== 1 ? 's' : ''}
                        </div>
                      </div>

                      {/* Phase badges */}
                      <div className="flex gap-1 flex-shrink-0">
                        {phaseSequence.map(phase => {
                          const phaseInfo = status.phases.get(phase);
                          const isLocked = status.phaseLocks.get(phase);

                          if (!phaseInfo) return null;

                          const bgColor = phaseInfo.complete
                            ? 'bg-green-600'
                            : phaseInfo.started
                            ? 'bg-amber-600'
                            : isLocked
                            ? 'bg-red-600'
                            : 'bg-blue-600';

                          return (
                            <div
                              key={phase}
                              className={cn('px-2 py-1 rounded text-[10px] font-bold text-white', bgColor)}
                              title={phase}
                            >
                              {phase.slice(0, 3).toUpperCase()}
                            </div>
                          );
                        })}
                      </div>
                    </button>

                    {/* Tasks (expanded) */}
                    {isExpanded && (
                      <div className="ml-6 mt-1 space-y-1 border-l-2 border-zinc-700 pl-4">
                        {phaseSequence.map(phase => {
                          const phaseInfo = status.phases.get(phase);
                          const isLocked = status.phaseLocks.get(phase);

                          if (!phaseInfo) return null;

                          return (
                            <div key={phase} className="space-y-1">
                              {/* Phase header */}
                              <div className={cn(
                                'text-xs font-bold uppercase tracking-wider py-1 px-2 rounded flex items-center gap-2',
                                isLocked
                                  ? 'text-red-400 bg-red-950/30'
                                  : phaseInfo.complete
                                  ? 'text-green-400 bg-green-950/30'
                                  : 'text-amber-400 bg-amber-950/30'
                              )}>
                                {isLocked && <Lock size={12} />}
                                {phase} ({phaseInfo.progress}%)
                              </div>

                              {/* Phase tasks */}
                              {phaseInfo.tasks.map(task => (
                                <div
                                  key={task.id}
                                  className="p-2 bg-zinc-900 rounded border border-zinc-700 text-xs space-y-1"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono font-bold text-white truncate flex-1">
                                      {task.name}
                                    </span>
                                    <Badge
                                      className={
                                        task.status === 'completed'
                                          ? 'bg-green-600'
                                          : task.status === 'in_progress'
                                          ? 'bg-amber-600'
                                          : task.status === 'blocked'
                                          ? 'bg-red-600'
                                          : 'bg-blue-600'
                                      }
                                    >
                                      {task.status}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center justify-between text-zinc-400">
                                    <span>
                                      {format(parseISO(task.start_date), 'MMM d')} — {format(parseISO(task.end_date), 'MMM d')}
                                    </span>
                                    <span>{task.progress_percent || 0}%</span>
                                  </div>

                                  {/* Task blockers */}
                                  {task.predecessor_ids?.length > 0 && task.status !== 'completed' && (
                                    <div className="flex items-center gap-1 text-yellow-400">
                                      <AlertCircle size={10} />
                                      <span className="text-[10px]">
                                        {task.predecessor_ids.length} predecessor{task.predecessor_ids.length > 1 ? 's' : ''}
                                      </span>
                                    </div>
                                  )}

                                  {/* Critical path */}
                                  {task.is_critical && (
                                    <div className="flex items-center gap-1 text-red-400">
                                      <AlertCircle size={10} />
                                      <span className="text-[10px] font-bold">Critical path</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}