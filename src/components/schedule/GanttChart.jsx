import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addDays, differenceInDays, startOfWeek, startOfMonth } from 'date-fns';
import { AlertTriangle, Link as LinkIcon } from 'lucide-react';

export default function GanttChart({ 
  tasks, 
  viewMode, 
  onTaskUpdate, 
  onTaskEdit,
  criticalPath = [],
  resources,
  rfis,
  changeOrders,
  projects = []
}) {
  const [draggingTask, setDraggingTask] = useState(null);
  const chartRef = useRef(null);

  if (!tasks.length) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-8 text-center text-zinc-500">
          No tasks found. Add tasks to see the Gantt chart.
        </CardContent>
      </Card>
    );
  }

  // Calculate date range with null checks
  const dates = tasks
    .filter(t => t.start_date && t.end_date)
    .flatMap(t => [new Date(t.start_date), new Date(t.end_date)]);
  
  if (dates.length === 0) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-8 text-center text-zinc-500">
          No valid task dates found. Please ensure tasks have start and end dates.
        </CardContent>
      </Card>
    );
  }
  
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  
  // Extend range to at least 6 months
  const startDate = addDays(minDate, -14);
  const endDate = addDays(maxDate, 180);
  const totalDays = differenceInDays(endDate, startDate);

  // Generate time periods based on view mode
  const periods = [];
  let current = new Date(startDate);
  
  while (current <= endDate) {
    periods.push(new Date(current));
    if (viewMode === 'day') {
      current = addDays(current, 1);
    } else if (viewMode === 'week') {
      current = addDays(current, 7);
    } else {
      current = addDays(current, 30);
    }
  }

  // Group tasks by phase
  const phases = ['detailing', 'fabrication', 'delivery', 'erection', 'closeout'];
  const tasksByPhase = {};
  phases.forEach(phase => {
    tasksByPhase[phase] = tasks.filter(t => t.phase === phase);
  });

  const phaseLabels = {
    detailing: 'Detailing',
    fabrication: 'Fabrication',
    delivery: 'Delivery',
    erection: 'Erection',
    closeout: 'Closeout'
  };

  const getTaskPosition = (task) => {
    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.end_date);
    const daysFromStart = differenceInDays(taskStart, startDate);
    const duration = differenceInDays(taskEnd, taskStart);
    
    return {
      left: `${(daysFromStart / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  const isCritical = (taskId) => criticalPath.includes(taskId);

  const hasRFIImpact = (task) => {
    return task.linked_rfi_ids && task.linked_rfi_ids.length > 0;
  };

  const hasCOImpact = (task) => {
    return task.linked_co_ids && task.linked_co_ids.length > 0;
  };

  const handleTaskClick = (task) => {
    onTaskEdit(task);
  };

  const columnWidth = viewMode === 'day' ? 60 : viewMode === 'week' ? 80 : 100;
  
  // Calculate today's position
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysFromStart = differenceInDays(today, startDate);
  const todayPosition = (daysFromStart / totalDays) * 100;

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
      <CardHeader className="border-b border-zinc-800">
        <CardTitle className="text-sm text-white">Gantt Chart - {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto" ref={chartRef}>
          <div style={{ minWidth: `${periods.length * columnWidth}px` }}>
            {/* Timeline Header */}
            <div className="flex border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <div className="w-64 flex-shrink-0 border-r border-zinc-800 p-3 font-medium text-xs text-zinc-400">
                TASK NAME
              </div>
              <div className="flex flex-1 relative">
                {periods.map((date, idx) => (
                  <div 
                    key={idx} 
                    className="border-r border-zinc-800 p-2 text-center text-xs text-zinc-400"
                    style={{ minWidth: `${columnWidth}px` }}
                  >
                    <div className="font-medium">
                      {viewMode === 'day' && format(date, 'MMM d')}
                      {viewMode === 'week' && format(date, 'MMM d')}
                      {viewMode === 'month' && format(date, 'MMM yyyy')}
                    </div>
                    {viewMode === 'day' && (
                      <div className="text-[10px] text-zinc-600">{format(date, 'EEE')}</div>
                    )}
                  </div>
                ))}
                
                {/* Today indicator in header */}
                {todayPosition >= 0 && todayPosition <= 100 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-20"
                    style={{ left: `${todayPosition}%` }}
                  />
                )}
              </div>
            </div>

            {/* Task Rows by Phase */}
            {phases.map(phase => {
              const phaseTasks = tasksByPhase[phase];
              if (phaseTasks.length === 0) return null;

              return (
                <div key={phase} className="border-b border-zinc-800">
                  {/* Phase Header */}
                  <div className="flex bg-zinc-800/50">
                    <div className="w-64 flex-shrink-0 border-r border-zinc-800 p-2 font-semibold text-sm text-amber-500">
                      {phaseLabels[phase]}
                    </div>
                    <div className="flex-1" style={{ minWidth: `${periods.length * columnWidth}px` }} />
                  </div>

                  {/* Phase Tasks */}
                  {phaseTasks.map((task) => {
                    const pos = getTaskPosition(task);
                    const critical = isCritical(task.id);
                    const hasRFI = hasRFIImpact(task);
                    const hasCO = hasCOImpact(task);
                    const project = projects.find(p => p.id === task.project_id);
                    
                    return (
                      <div key={task.id} className="flex border-b border-zinc-800 hover:bg-zinc-800/30 group">
                        {/* Task Name */}
                        <div className="w-64 flex-shrink-0 border-r border-zinc-800 p-2 flex flex-col gap-1">
                          <button
                            onClick={() => handleTaskClick(task)}
                            className="text-left text-sm text-white hover:text-amber-500 truncate w-full"
                          >
                            {task.is_milestone ? '◆ ' : ''}{task.name}
                          </button>
                          <div className="flex items-center gap-2">
                            {project && (
                              <span className="text-xs text-zinc-400 truncate">
                                {project.name}
                              </span>
                            )}
                            {(hasRFI || hasCO) && (
                              <div className="flex gap-1">
                                {hasRFI && <LinkIcon size={10} className="text-blue-400" />}
                                {hasCO && <LinkIcon size={10} className="text-purple-400" />}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Gantt Bar */}
                        <div className="flex-1 relative py-2" style={{ minWidth: `${periods.length * columnWidth}px` }}>
                          {/* Grid lines */}
                          {periods.map((_, idx) => (
                            <div
                              key={idx}
                              className="absolute top-0 bottom-0 border-r border-zinc-800/50"
                              style={{ left: `${(idx / periods.length) * 100}%` }}
                            />
                          ))}

                          {/* Today indicator line */}
                          {todayPosition >= 0 && todayPosition <= 100 && (
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-amber-500/70 z-10"
                              style={{ left: `${todayPosition}%` }}
                            />
                          )}

                          {/* Baseline (if exists) */}
                          {task.baseline_start && task.baseline_end && (
                            <div
                              className="absolute h-2 bg-zinc-700/30 rounded"
                              style={{
                                left: getTaskPosition({ start_date: task.baseline_start, end_date: task.baseline_end }).left,
                                width: getTaskPosition({ start_date: task.baseline_start, end_date: task.baseline_end }).width,
                                top: '50%',
                                transform: 'translateY(-8px)',
                              }}
                            />
                          )}

                          {/* Task Bar */}
                          <div
                            className={`absolute h-6 rounded cursor-pointer transition-all hover:shadow-lg ${
                              task.is_milestone 
                                ? 'bg-amber-500 w-3 h-3 transform rotate-45' 
                                : critical 
                                  ? 'bg-red-500 border-2 border-red-400' 
                                  : task.status === 'completed'
                                    ? 'bg-green-500'
                                    : task.status === 'in_progress'
                                      ? 'bg-blue-500'
                                      : 'bg-zinc-600'
                            }`}
                            style={{
                              ...pos,
                              top: '50%',
                              transform: task.is_milestone ? 'translateY(-50%) rotate(45deg)' : 'translateY(-50%)',
                            }}
                            onClick={() => handleTaskClick(task)}
                          >
                            {!task.is_milestone && task.progress_percent > 0 && (
                              <div 
                                className="absolute inset-0 bg-white/20 rounded-l"
                                style={{ width: `${task.progress_percent}%` }}
                              />
                            )}
                            {!task.is_milestone && (
                              <div className="absolute inset-0 flex items-center px-2 text-xs font-medium text-white truncate">
                                {task.name}
                              </div>
                            )}
                          </div>

                          {/* Dependencies */}
                          {task.predecessor_ids?.filter(predId => tasks.some(t => t.id === predId)).map(predId => {
                            const pred = tasks.find(t => t.id === predId);
                            if (!pred || !pred.start_date || !pred.end_date) return null;
                            
                            // Simple dependency line (could be enhanced)
                            return (
                              <div
                                key={predId}
                                className="absolute h-px bg-zinc-600 z-0"
                                style={{
                                  left: getTaskPosition(pred).left,
                                  width: '20px',
                                  top: '50%',
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="border-t border-zinc-800 bg-zinc-900/50 p-5">
          <h4 className="text-sm font-semibold text-white mb-4">Legend</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-amber-500" />
              <span className="font-medium text-amber-400">Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-red-500 rounded border border-red-400" />
              <span className="text-zinc-200">Critical Path</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-blue-500 rounded border border-blue-400" />
              <span className="text-zinc-200">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-500 rounded border border-green-400" />
              <span className="text-zinc-200">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-zinc-600 rounded border border-zinc-500" />
              <span className="text-zinc-200">Not Started</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500 transform rotate-45 border border-amber-400" />
              <span className="text-zinc-200">Milestone</span>
            </div>
            <div className="flex items-center gap-2">
              <LinkIcon size={16} className="text-blue-400" />
              <span className="text-zinc-200">Linked RFI</span>
            </div>
            <div className="flex items-center gap-2">
              <LinkIcon size={16} className="text-purple-400" />
              <span className="text-zinc-200">Linked CO</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}