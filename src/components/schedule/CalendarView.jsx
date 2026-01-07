import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';

export default function CalendarView({ tasks, projects, onTaskClick }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
            
            return (
              <div
                key={idx}
                className={`min-h-32 border-b border-r border-zinc-800 p-2 ${
                  isCurrentMonth ? 'bg-zinc-900' : 'bg-zinc-900/30'
                } ${isCurrentDay ? 'ring-2 ring-amber-500 ring-inset' : ''}`}
              >
                <div className={`text-sm mb-2 ${
                  isCurrentDay 
                    ? 'text-amber-500 font-bold' 
                    : isCurrentMonth 
                      ? 'text-white' 
                      : 'text-zinc-600'
                }`}>
                  {format(day, 'd')}
                </div>
                
                {/* Tasks for this day */}
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => {
                    const startDate = parseISO(task.start_date);
                    const endDate = parseISO(task.end_date);
                    const isStartDate = isSameDay(day, startDate);
                    const isEndDate = isSameDay(day, endDate);
                    const isMidSpan = !isStartDate && !isEndDate;
                    
                    return (
                      <button
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        className={`w-full text-left px-1.5 py-1 text-xs rounded transition-all hover:shadow-md ${
                          task.status === 'completed'
                            ? 'bg-green-600/80 text-white hover:bg-green-600'
                            : task.status === 'in_progress'
                              ? 'bg-blue-600/80 text-white hover:bg-blue-600'
                              : task.status === 'blocked'
                                ? 'bg-red-600/80 text-white hover:bg-red-600'
                                : 'bg-zinc-700/80 text-white hover:bg-zinc-700'
                        } ${
                          isMidSpan ? 'rounded-none' : isStartDate ? 'rounded-r-none' : isEndDate ? 'rounded-l-none' : ''
                        }`}
                        title={`${task.name} - ${getProjectName(task.project_id)}`}
                      >
                        <div className="truncate font-medium">
                          {task.is_milestone ? '◆ ' : ''}
                          {task.name}
                        </div>
                        {isStartDate && (
                          <div className="text-[10px] text-white/80 truncate">
                            {getProjectName(task.project_id)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                  
                  {dayTasks.length > 3 && (
                    <div className="text-[10px] text-zinc-400 px-1.5">
                      +{dayTasks.length - 3} more
                    </div>
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