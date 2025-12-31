import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addDays, differenceInDays, isPast, isBefore } from 'date-fns';
import { AlertTriangle, Link as LinkIcon, Home, ChevronDown, ChevronRight, GitBranch, Filter, Search, X } from 'lucide-react';
import DependencyEditor from './DependencyEditor';

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
  const [dragOffset, setDragOffset] = useState(0);
  const [collapsedPhases, setCollapsedPhases] = useState(new Set());
  const [collapsedParents, setCollapsedParents] = useState(new Set());
  const [editingDependencies, setEditingDependencies] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const chartRef = useRef(null);

  const togglePhase = (phase) => {
    const newCollapsed = new Set(collapsedPhases);
    if (newCollapsed.has(phase)) {
      newCollapsed.delete(phase);
    } else {
      newCollapsed.add(phase);
    }
    setCollapsedPhases(newCollapsed);
  };

  const toggleParent = (taskId) => {
    const newCollapsed = new Set(collapsedParents);
    if (newCollapsed.has(taskId)) {
      newCollapsed.delete(taskId);
    } else {
      newCollapsed.add(taskId);
    }
    setCollapsedParents(newCollapsed);
  };

  const scrollToToday = () => {
    if (chartRef.current) {
      const scrollPosition = (todayPosition / 100) * chartRef.current.scrollWidth - (chartRef.current.clientWidth / 2);
      chartRef.current.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
    }
  };

  // Auto-scroll to today on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (todayPosition >= 0 && todayPosition <= 100) {
        scrollToToday();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const collapseAll = () => {
    setCollapsedPhases(new Set(phases));
  };

  const expandAll = () => {
    setCollapsedPhases(new Set());
    setCollapsedParents(new Set());
  };

  // Filter tasks first
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = !searchTerm || 
        task.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.wbs_code?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesProject = projectFilter === 'all' || task.project_id === projectFilter;
      
      return matchesSearch && matchesStatus && matchesProject;
    });
  }, [tasks, searchTerm, statusFilter, projectFilter]);

  if (!filteredTasks.length) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-8 text-center text-zinc-500">
          No tasks found. Add tasks to see the Gantt chart.
        </CardContent>
      </Card>
    );
  }

  // Calculate date range with null checks
  const dates = filteredTasks
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

  // Group filteredTasks by phase
  const phases = ['detailing', 'fabrication', 'delivery', 'erection', 'closeout'];
  const tasksByPhase = {};
  phases.forEach(phase => {
    tasksByPhase[phase] = filteredTasks.filter(t => t.phase === phase);
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

  const isOverdue = (task) => {
    if (!task.end_date || task.status === 'completed') return false;
    const endDate = new Date(task.end_date);
    return isPast(endDate) && isBefore(endDate, new Date());
  };

  const handleTaskClick = (task, e) => {
    // Right-click or Ctrl+click opens dependency editor
    if (e?.button === 2 || e?.ctrlKey) {
      e.preventDefault();
      setEditingDependencies(task);
    } else {
      onTaskEdit(task);
    }
  };

  const handleDragStart = (task, e) => {
    e.stopPropagation();
    if (task.is_milestone) return; // Don't drag milestones
    
    const taskStart = new Date(task.start_date);
    const daysFromStart = differenceInDays(taskStart, startDate);
    const clickPosition = (e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.offsetWidth;
    
    setDraggingTask(task);
    setDragOffset(clickPosition);
  };

  const handleDragMove = (e) => {
    if (!draggingTask || !chartRef.current) return;
    
    const chartRect = chartRef.current.getBoundingClientRect();
    const relativeX = e.clientX - chartRect.left;
    const percentage = relativeX / chartRect.scrollWidth;
    const newDaysFromStart = Math.round(percentage * totalDays);
    const taskDuration = differenceInDays(new Date(draggingTask.end_date), new Date(draggingTask.start_date));
    
    // Calculate new dates
    const newStartDate = addDays(startDate, newDaysFromStart);
    const newEndDate = addDays(newStartDate, taskDuration);
    
    // Update visual position temporarily
    document.body.style.cursor = 'grabbing';
  };

  const handleDragEnd = (e) => {
    if (!draggingTask || !chartRef.current) return;
    
    const chartRect = chartRef.current.getBoundingClientRect();
    const relativeX = e.clientX - chartRect.left;
    const percentage = relativeX / chartRect.scrollWidth;
    const newDaysFromStart = Math.round(percentage * totalDays);
    const taskDuration = differenceInDays(new Date(draggingTask.end_date), new Date(draggingTask.start_date));
    
    // Calculate new dates
    const newStartDate = addDays(startDate, newDaysFromStart);
    const newEndDate = addDays(newStartDate, taskDuration);
    
    // Update task
    onTaskUpdate(draggingTask.id, {
      start_date: format(newStartDate, 'yyyy-MM-dd'),
      end_date: format(newEndDate, 'yyyy-MM-dd')
    });
    
    setDraggingTask(null);
    setDragOffset(0);
    document.body.style.cursor = 'default';
  };

  useEffect(() => {
    if (draggingTask) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [draggingTask, totalDays, startDate]);

  const columnWidth = viewMode === 'day' ? 60 : viewMode === 'week' ? 80 : 100;
  
  // Calculate today's position
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysFromStart = differenceInDays(today, startDate);
  const todayPosition = (daysFromStart / totalDays) * 100;

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
      <CardHeader className="border-b border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-white">Gantt Chart - {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={scrollToToday} className="border-zinc-700 text-xs">
              <Home size={14} className="mr-1" />
              Today
            </Button>
            <Button size="sm" variant="outline" onClick={expandAll} className="border-zinc-700 text-xs">
              Expand All
            </Button>
            <Button size="sm" variant="outline" onClick={collapseAll} className="border-zinc-700 text-xs">
              Collapse All
            </Button>
            <div className="text-xs text-zinc-400 flex items-center gap-1">
              <GitBranch size={12} />
              Ctrl+Click to edit dependencies
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-zinc-800 border-zinc-700 text-white h-8 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 h-8 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all" className="text-white">All Status</SelectItem>
              <SelectItem value="not_started" className="text-white">Not Started</SelectItem>
              <SelectItem value="in_progress" className="text-white">In Progress</SelectItem>
              <SelectItem value="completed" className="text-white">Completed</SelectItem>
              <SelectItem value="on_hold" className="text-white">On Hold</SelectItem>
              <SelectItem value="blocked" className="text-white">Blocked</SelectItem>
            </SelectContent>
          </Select>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 h-8 text-sm">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all" className="text-white">All Projects</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-white">
                  {p.project_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchTerm || statusFilter !== 'all' || projectFilter !== 'all') && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setProjectFilter('all');
              }}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Clear filters
            </Button>
          )}
        </div>

        {filteredTasks.length < tasks.length && (
          <div className="text-xs text-zinc-400">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto" ref={chartRef}>
          <div style={{ minWidth: `${periods.length * columnWidth}px` }}>
            {/* Timeline Header */}
            <div className="flex border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <div className="w-80 flex-shrink-0 border-r border-zinc-800 p-3 font-semibold text-sm text-white bg-zinc-900">
                TASK NAME
              </div>
              <div className="flex flex-1 relative">
                {periods.map((date, idx) => (
                  <div 
                    key={idx} 
                    className="border-r border-zinc-800 p-2 text-center text-xs text-zinc-200"
                    style={{ minWidth: `${columnWidth}px` }}
                  >
                    <div className="font-semibold">
                      {viewMode === 'day' && format(date, 'MMM d')}
                      {viewMode === 'week' && format(date, 'MMM d')}
                      {viewMode === 'month' && format(date, 'MMM yyyy')}
                    </div>
                    {viewMode === 'day' && (
                      <div className="text-[10px] text-zinc-400">{format(date, 'EEE')}</div>
                    )}
                  </div>
                ))}
                
                {/* Today indicator in header - enhanced */}
                {todayPosition >= 0 && todayPosition <= 100 && (
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-amber-500 z-20 shadow-lg"
                    style={{ left: `${todayPosition}%` }}
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[9px] font-bold px-2 py-1 rounded-b shadow">
                      TODAY
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Task Rows by Phase */}
            {phases.map(phase => {
              const phaseTasks = tasksByPhase[phase];
              if (phaseTasks.length === 0) return null;
              
              const isPhaseCollapsed = collapsedPhases.has(phase);
              
              // Separate parent and child tasks
              const parentTasks = phaseTasks.filter(t => !t.parent_task_id);
              const childTasksMap = {};
              phaseTasks.filter(t => t.parent_task_id).forEach(t => {
                if (!childTasksMap[t.parent_task_id]) childTasksMap[t.parent_task_id] = [];
                childTasksMap[t.parent_task_id].push(t);
              });

              return (
                <div key={phase} className="border-b border-zinc-800">
                  {/* Phase Header */}
                  <div className="flex bg-zinc-800/70 hover:bg-zinc-800">
                    <button
                      onClick={() => togglePhase(phase)}
                      className="w-80 flex-shrink-0 border-r border-zinc-800 p-3 font-bold text-base text-amber-400 flex items-center gap-2 text-left hover:text-amber-300 transition-colors"
                    >
                      {isPhaseCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                      {phaseLabels[phase]} ({phaseTasks.length})
                    </button>
                    <div className="flex-1" style={{ minWidth: `${periods.length * columnWidth}px` }} />
                  </div>

                  {/* Phase Tasks */}
                  {!isPhaseCollapsed && parentTasks.map((task) => {
                    const childTasks = childTasksMap[task.id] || [];
                    const hasChildren = childTasks.length > 0;
                    const isParentCollapsed = collapsedParents.has(task.id);
                    const pos = getTaskPosition(task);
                    const critical = isCritical(task.id);
                    const hasRFI = hasRFIImpact(task);
                    const hasCO = hasCOImpact(task);
                    const overdue = isOverdue(task);
                    const project = projects.find(p => p.id === task.project_id);
                    
                    return (
                      <React.Fragment key={task.id}>
                      <div className="flex border-b border-zinc-800 hover:bg-zinc-800/40 group transition-colors">
                        {/* Task Name */}
                        <div className="w-80 flex-shrink-0 border-r border-zinc-800 p-3 flex flex-col gap-1.5">
                          <div className="flex items-center gap-1">
                            {hasChildren && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleParent(task.id);
                                }}
                                className="text-zinc-400 hover:text-white transition-colors"
                              >
                                {isParentCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                              </button>
                            )}
                            <button
                              onClick={() => handleTaskClick(task)}
                              className="text-left text-sm font-medium text-white hover:text-amber-400 truncate flex-1 transition-colors"
                            >
                              {hasChildren && '📁 '}
                              {task.is_milestone ? '◆ ' : ''}
                              {task.name}
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            {project && (
                              <span className="text-xs text-zinc-300 truncate">
                                {project.name}
                              </span>
                            )}
                            {(hasRFI || hasCO) && (
                              <div className="flex gap-1">
                                {hasRFI && <LinkIcon size={12} className="text-blue-400" />}
                                {hasCO && <LinkIcon size={12} className="text-purple-400" />}
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

                          {/* Today indicator line - enhanced */}
                          {todayPosition >= 0 && todayPosition <= 100 && (
                            <div
                              className="absolute top-0 bottom-0 w-1 bg-amber-500 z-10 shadow-lg"
                              style={{ left: `${todayPosition}%` }}
                            >
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[9px] font-bold px-2 py-0.5 rounded whitespace-nowrap shadow">
                                TODAY
                              </div>
                            </div>
                          )}

                          {/* Baseline (if exists) - thin bar below actual */}
                          {task.baseline_start && task.baseline_end && (
                            <div
                              className="absolute h-2 bg-zinc-500/50 border border-zinc-400/50 rounded"
                              style={{
                                left: getTaskPosition({ start_date: task.baseline_start, end_date: task.baseline_end }).left,
                                width: getTaskPosition({ start_date: task.baseline_start, end_date: task.baseline_end }).width,
                                top: '50%',
                                transform: 'translateY(14px)',
                              }}
                              title={`Baseline: ${format(new Date(task.baseline_start), 'MMM d')} - ${format(new Date(task.baseline_end), 'MMM d')}`}
                            />
                          )}

                          {/* Critical path indicator - thick border */}
                          {critical && !task.is_milestone && (
                            <div
                              className="absolute h-9 border-2 border-red-400 rounded pointer-events-none"
                              style={{
                                ...pos,
                                top: '50%',
                                transform: 'translateY(-50%)',
                              }}
                            />
                          )}

                          {/* Task Bar */}
                          <div
                           className={`absolute h-7 rounded transition-all hover:shadow-xl overflow-hidden ${
                             task.is_milestone 
                               ? 'bg-amber-500 w-3.5 h-3.5 transform rotate-45 shadow-lg cursor-pointer' 
                               : overdue
                                 ? 'bg-red-600 border-2 border-red-400 shadow-lg animate-pulse cursor-grab active:cursor-grabbing'
                                 : critical 
                                   ? 'bg-red-500 border-2 border-red-300 shadow-lg cursor-grab active:cursor-grabbing' 
                                   : task.status === 'completed'
                                     ? 'bg-green-500 shadow-md cursor-grab active:cursor-grabbing'
                                     : task.status === 'in_progress'
                                       ? 'bg-blue-500 shadow-md cursor-grab active:cursor-grabbing'
                                       : 'bg-zinc-600 shadow-md cursor-grab active:cursor-grabbing'
                           } ${draggingTask?.id === task.id ? 'opacity-70 scale-105' : 'hover:scale-105'}`}
                           style={{
                             ...pos,
                             top: '50%',
                             transform: task.is_milestone ? 'translateY(-50%) rotate(45deg)' : 'translateY(-50%)',
                           }}
                           onMouseDown={(e) => handleDragStart(task, e)}
                           onClick={(e) => {
                             if (!draggingTask) handleTaskClick(task, e);
                           }}
                           onContextMenu={(e) => {
                             e.preventDefault();
                             setEditingDependencies(task);
                           }}
                           title={`${task.name} - ${task.progress_percent || 0}% complete${overdue ? ' (OVERDUE)' : ''}${task.is_milestone ? '' : ' (drag to reschedule)'}`}
                          >
                           {!task.is_milestone && task.progress_percent > 0 && (
                             <div 
                               className="absolute inset-0 bg-white/30 rounded-l transition-all"
                               style={{ width: `${task.progress_percent}%` }}
                             />
                           )}
                           {!task.is_milestone && (
                             <div className="absolute inset-0 flex items-center justify-between px-2">
                               <span className="text-xs font-semibold text-white truncate drop-shadow-md">
                                 {task.name}
                               </span>
                               <div className="flex items-center gap-1 ml-2">
                                 {overdue && <AlertTriangle size={12} className="text-white drop-shadow" />}
                                 <span className="text-[10px] font-bold text-white/90 drop-shadow">
                                   {task.progress_percent || 0}%
                                 </span>
                               </div>
                             </div>
                           )}
                          </div>

                          {/* Dependencies - Enhanced Visual Lines with Labels */}
                          {task.predecessor_ids?.filter(predId => filteredTasks.some(t => t.id === predId)).map(predId => {
                            const pred = filteredTasks.find(t => t.id === predId);
                            if (!pred || !pred.start_date || !pred.end_date) return null;

                            const predPos = getTaskPosition(pred);
                            const taskPos = getTaskPosition(task);

                            // Get dependency config
                            const depConfig = (task.predecessor_configs || []).find(c => c.predecessor_id === predId) || 
                              { type: 'FS', lag_days: 0 };

                            // Determine line color and style based on type
                            const typeStyles = {
                              FS: { color: 'border-blue-400 bg-blue-400', label: 'FS' },
                              SS: { color: 'border-green-400 bg-green-400', label: 'SS' },
                              FF: { color: 'border-purple-400 bg-purple-400', label: 'FF' },
                              SF: { color: 'border-amber-400 bg-amber-400', label: 'SF' }
                            };
                            const style = typeStyles[depConfig.type] || { color: 'border-zinc-500 bg-zinc-500', label: 'FS' };

                            // Calculate connection points
                            const predEndX = depConfig.type === 'SS' || depConfig.type === 'SF' 
                              ? parseFloat(predPos.left) 
                              : parseFloat(predPos.left) + parseFloat(predPos.width);
                            
                            const taskStartX = depConfig.type === 'FF' || depConfig.type === 'SF'
                              ? parseFloat(taskPos.left) + parseFloat(taskPos.width)
                              : parseFloat(taskPos.left);

                            return (
                              <React.Fragment key={predId}>
                                {/* Horizontal line */}
                                <div
                                  className={`absolute border-t-2 ${style.color} z-5`}
                                  style={{
                                    left: `${predEndX}%`,
                                    width: `${Math.abs(taskStartX - predEndX)}%`,
                                    top: '50%',
                                    transform: 'translateY(-50%)'
                                  }}
                                />
                                
                                {/* Arrow head */}
                                <div
                                  className={`absolute w-0 h-0 border-4 z-5`}
                                  style={{
                                    left: `${taskStartX}%`,
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    borderLeft: `6px solid transparent`,
                                    borderRight: `6px solid transparent`,
                                    borderTop: depConfig.type === 'SS' || depConfig.type === 'FS' 
                                      ? `6px solid ${style.color.split(' ')[1].replace('bg-', '')}` 
                                      : 'none',
                                    borderBottom: depConfig.type === 'FF' || depConfig.type === 'SF' 
                                      ? `6px solid ${style.color.split(' ')[1].replace('bg-', '')}` 
                                      : 'none',
                                  }}
                                />

                                {/* Dependency label */}
                                <div
                                  className={`absolute z-10 px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${style.color.split(' ')[1]} border ${style.color.split(' ')[0]} shadow-lg`}
                                  style={{
                                    left: `${(predEndX + taskStartX) / 2}%`,
                                    top: '50%',
                                    transform: 'translate(-50%, -150%)',
                                  }}
                                >
                                  {style.label}{depConfig.lag_days ? ` +${depConfig.lag_days}d` : ''}
                                </div>
                              </React.Fragment>
                            );
                          })}
                          </div>
                          </div>

                          {!isParentCollapsed && childTasks.map((childTask) => {
                          const childPos = getTaskPosition(childTask);
                          const childCritical = isCritical(childTask.id);
                          const childHasRFI = hasRFIImpact(childTask);
                          const childHasCO = hasCOImpact(childTask);
                          const childOverdue = isOverdue(childTask);

                          return (
                          <div key={childTask.id} className="flex border-b border-zinc-800/50 hover:bg-zinc-800/30 group transition-colors">
                           <div className="w-80 flex-shrink-0 border-r border-zinc-800 p-3 pl-10 flex flex-col gap-1.5">
                             <button
                               onClick={() => handleTaskClick(childTask)}
                               className="text-left text-sm text-zinc-300 hover:text-amber-400 truncate w-full transition-colors"
                             >
                               ↳ {childTask.name}
                             </button>
                             <div className="flex items-center gap-2">
                               {(childHasRFI || childHasCO) && (
                                 <div className="flex gap-1">
                                   {childHasRFI && <LinkIcon size={10} className="text-blue-400" />}
                                   {childHasCO && <LinkIcon size={10} className="text-purple-400" />}
                                 </div>
                               )}
                             </div>
                           </div>

                           <div className="flex-1 relative py-2" style={{ minWidth: `${periods.length * columnWidth}px` }}>
                             {periods.map((_, idx) => (
                               <div
                                 key={idx}
                                 className="absolute top-0 bottom-0 border-r border-zinc-800/50"
                                 style={{ left: `${(idx / periods.length) * 100}%` }}
                               />
                             ))}

                             {todayPosition >= 0 && todayPosition <= 100 && (
                               <div
                                 className="absolute top-0 bottom-0 w-1 bg-amber-500 z-10"
                                 style={{ left: `${todayPosition}%` }}
                               />
                             )}

                             <div
                               className={`absolute h-6 rounded transition-all hover:shadow-lg overflow-hidden cursor-grab active:cursor-grabbing ${
                                 childOverdue
                                   ? 'bg-red-600/80 border border-red-400 animate-pulse'
                                   : childCritical 
                                     ? 'bg-red-500/80 border border-red-300' 
                                     : childTask.status === 'completed'
                                       ? 'bg-green-500/80'
                                       : childTask.status === 'in_progress'
                                         ? 'bg-blue-500/80'
                                         : 'bg-zinc-600/80'
                               } ${draggingTask?.id === childTask.id ? 'opacity-70 scale-105' : 'hover:scale-105'}`}
                               style={{
                                 ...childPos,
                                 top: '50%',
                                 transform: 'translateY(-50%)',
                               }}
                               onMouseDown={(e) => handleDragStart(childTask, e)}
                               onClick={(e) => {
                                 if (!draggingTask) handleTaskClick(childTask, e);
                               }}
                               title={`${childTask.name} - ${childTask.progress_percent || 0}% complete${childOverdue ? ' (OVERDUE)' : ''} (drag to reschedule)`}
                             >
                               {childTask.progress_percent > 0 && (
                                 <div 
                                   className="absolute inset-0 bg-white/25 rounded-l transition-all"
                                   style={{ width: `${childTask.progress_percent}%` }}
                                 />
                               )}
                               <div className="absolute inset-0 flex items-center justify-between px-2">
                                 <span className="text-xs font-medium text-white truncate">
                                   {childTask.name}
                                 </span>
                                 <div className="flex items-center gap-1 ml-1">
                                   {childOverdue && <AlertTriangle size={10} className="text-white" />}
                                   <span className="text-[9px] font-bold text-white/90">
                                     {childTask.progress_percent || 0}%
                                   </span>
                                 </div>
                               </div>
                             </div>
                           </div>
                          </div>
                          );
                          })}
                          </React.Fragment>
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
              <div className="w-6 h-0.5 bg-blue-400" />
              <span className="text-zinc-200">FS Dependency</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-green-400" />
              <span className="text-zinc-200">SS Dependency</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-purple-400" />
              <span className="text-zinc-200">FF Dependency</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-amber-400" />
              <span className="text-zinc-200">SF Dependency</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-red-600 rounded border border-red-400 animate-pulse flex items-center justify-center">
                <AlertTriangle size={12} className="text-white" />
              </div>
              <span className="text-zinc-200">Overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-blue-500 rounded relative overflow-hidden">
                <div className="absolute inset-0 bg-white/30 w-3/5" />
              </div>
              <span className="text-zinc-200">Progress Bar</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-2 bg-zinc-500/50 border border-zinc-400/50 rounded" />
              <span className="text-zinc-200">Baseline</span>
            </div>
          </div>
        </div>
      </CardContent>

      {editingDependencies && (
        <DependencyEditor
          task={editingDependencies}
          tasks={tasks}
          open={!!editingDependencies}
          onOpenChange={(open) => !open && setEditingDependencies(null)}
        />
      )}
    </Card>
  );
}