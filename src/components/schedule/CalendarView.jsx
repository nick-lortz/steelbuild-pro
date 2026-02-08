import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, parseISO, addDays, differenceInDays } from 'date-fns';

export default function CalendarView({ tasks, projects, onTaskClick, onTaskUpdate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragSource, setDragSource] = useState(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get tasks for each day
  const tasksByDate = useMemo(() => {
    const dateMap = {};
    
    tasks.forEach(task => {
      if (!task.start_date || !task.end_date) return;
      
      try {
        const taskStart = parseISO(task.start_date);
        const taskEnd = parseISO(task.end_date);
        
        // Add task to each date it spans
        daysInMonth.forEach(day => {
          if (day >= taskStart && day <= taskEnd) {
            const dateKey = format(day, 'yyyy-MM-dd');
            if (!dateMap[dateKey]) {
              dateMap[dateKey] = [];
            }
            dateMap[dateKey].push(task);
          }
        });
      } catch (error) {
        console.error('Error parsing task dates:', error);
      }
    });
    
    return dateMap;
  }, [tasks, daysInMonth]);

  // Start calendar on Sunday
  const startDay = monthStart.getDay();
  const paddingDays = Array(startDay).fill(null);

  const getTasksForDate = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return tasksByDate[dateKey] || [];
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.project_number : 'N/A';
  };

  const groupTasksByPhase = (dayTasks) => {
    const grouped = {};
    dayTasks.forEach(task => {
      const phase = task.phase || 'unassigned';
      if (!grouped[phase]) grouped[phase] = [];
      grouped[phase].push(task);
    });
    return grouped;
  };

  const handleDragStart = (e, task, sourceDate) => {
    setDraggedTask(task);
    setDragSource(sourceDate);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('ring-2', 'ring-amber-400');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('ring-2', 'ring-amber-400');
  };

  const handleDrop = (e, targetDate) => {
    e.preventDefault();
    e.currentTarget.classList.remove('ring-2', 'ring-amber-400');
    
    if (!draggedTask || !dragSource || !onTaskUpdate) return;
    
    const sourceDate = new Date(dragSource);
    const targetDateObj = new Date(targetDate);
    const daysDiff = differenceInDays(targetDateObj, sourceDate);
    
    if (daysDiff !== 0) {
      const taskStart = parseISO(draggedTask.start_date);
      const taskEnd = parseISO(draggedTask.end_date);
      const newStart = addDays(taskStart, daysDiff);
      const newEnd = addDays(taskEnd, daysDiff);
      
      onTaskUpdate(draggedTask.id, {
        start_date: format(newStart, 'yyyy-MM-dd'),
        end_date: format(newEnd, 'yyyy-MM-dd')
      });
    }
    
    setDraggedTask(null);
    setDragSource(null);
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg">
            {format(currentMonth, 'MMMM yyyy')}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="border-zinc-700"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
              className="border-zinc-700"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="border-zinc-700"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              className="text-center py-3 text-xs font-semibold text-zinc-400 border-b border-zinc-800 bg-zinc-900/70"
            >
              {day}
            </div>
          ))}
          
          {/* Empty padding cells */}
          {paddingDays.map((_, idx) => (
            <div
              key={`padding-${idx}`}
              className="min-h-32 border-b border-r border-zinc-800 bg-zinc-900/30"
            />
          ))}
          
          {/* Day cells */}
          {daysInMonth.map((day, idx) => {
            const dayTasks = getTasksForDate(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isCurrentDay = isToday(day);
            const groupedTasks = groupTasksByPhase(dayTasks);
            const dateStr = format(day, 'yyyy-MM-dd');

            return (
              <div
                key={idx}
                className={`min-h-32 border-b border-r border-zinc-800 p-2 transition-colors ${
                  isCurrentMonth ? 'bg-zinc-900' : 'bg-zinc-900/30'
                } ${isCurrentDay ? 'ring-2 ring-amber-500 ring-inset' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dateStr)}
              >
                <div className={`text-sm mb-2 font-semibold ${
                  isCurrentDay 
                    ? 'text-amber-500' 
                    : isCurrentMonth 
                      ? 'text-white' 
                      : 'text-zinc-600'
                }`}>
                  {format(day, 'd')}
                </div>

                {/* Grouped tasks by phase */}
                <div className="space-y-1.5 text-[11px]">
                  {Object.entries(groupedTasks).map(([phase, phaseTasks]) => (
                    <div key={phase} className="space-y-1">
                      {phaseTasks.length > 0 && (
                        <div className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider px-1">
                          {phase}
                        </div>
                      )}
                      {phaseTasks.slice(0, 3).map((task) => {
                        const startDate = parseISO(task.start_date);
                        const endDate = parseISO(task.end_date);
                        const isStartDate = isSameDay(day, startDate);
                        const isEndDate = isSameDay(day, endDate);
                        const isMidSpan = !isStartDate && !isEndDate;

                        return (
                          <div
                            key={task.id}
                            draggable={!task.is_milestone && isStartDate}
                            onDragStart={(e) => handleDragStart(e, task, dateStr)}
                            className={`w-full text-left px-1.5 py-1 rounded transition-all cursor-move flex items-center gap-1 ${
                              task.status === 'completed'
                                ? 'bg-green-600/80 text-white hover:bg-green-600'
                                : task.status === 'in_progress'
                                  ? 'bg-blue-600/80 text-white hover:bg-blue-600'
                                  : task.status === 'blocked'
                                    ? 'bg-red-600/80 text-white hover:bg-red-600'
                                    : 'bg-zinc-700/80 text-white hover:bg-zinc-700'
                            } ${
                              isMidSpan ? 'rounded-none' : isStartDate ? 'rounded-r-none' : isEndDate ? 'rounded-l-none' : ''
                            } ${draggedTask?.id === task.id ? 'opacity-50' : ''}`}
                            onClick={() => onTaskClick(task)}
                            title={`${task.name} - ${getProjectName(task.project_id)}${isStartDate ? ' (drag to reschedule)' : ''}`}
                          >
                            {isStartDate && !task.is_milestone && (
                              <GripVertical size={10} className="flex-shrink-0 opacity-60" />
                            )}
                            <span className="truncate font-medium flex-1">
                              {task.is_milestone ? '◆' : ''}
                              {task.name.length > 20 ? task.name.substring(0, 18) + '…' : task.name}
                            </span>
                          </div>
                        );
                      })}
                      {phaseTasks.length > 3 && (
                        <div className="text-[9px] text-zinc-500 px-1.5">
                          +{phaseTasks.length - 3}
                        </div>
                      )}
                    </div>
                  ))}
                  {dayTasks.length === 0 && isCurrentMonth && (
                    <div className="text-[10px] text-zinc-600 italic px-1">—</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}