import React, { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  format,
  isSameMonth,
  isToday,
  parseISO,
  isSameDay
} from 'date-fns';
import { cn } from '@/lib/utils';
import CalendarEvent from './CalendarEvent';

export default function CalendarGrid({ currentDate, events, projects, resources, onEventDrop }) {
  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    const days = [];
    let day = calStart;

    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentDate]);

  // Group events by day
  const eventsByDay = useMemo(() => {
    const grouped = {};

    calendarDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped[dayKey] = [];
    });

    events.forEach(event => {
      if (!event.start_date) return;

      const eventStart = parseISO(event.start_date);
      const eventEnd = event.end_date ? parseISO(event.end_date) : eventStart;

      // Add event to all days it spans
      calendarDays.forEach(day => {
        if (day >= eventStart && day <= eventEnd) {
          const dayKey = format(day, 'yyyy-MM-dd');
          if (grouped[dayKey]) {
            grouped[dayKey].push({
              ...event,
              isStart: isSameDay(day, eventStart),
              isEnd: isSameDay(day, eventEnd),
            });
          }
        }
      });
    });

    return grouped;
  }, [calendarDays, events]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const eventId = result.draggableId;
    const newDate = result.destination.droppableId;
    
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const eventStart = event.start_date ? parseISO(event.start_date) : null;
    const eventEnd = event.end_date ? parseISO(event.end_date) : eventStart;
    
    if (!eventStart) return;

    // Calculate duration and new end date
    const duration = eventEnd ? Math.round((eventEnd - eventStart) / (1000 * 60 * 60 * 24)) : 0;
    const newEndDate = format(addDays(parseISO(newDate), duration), 'yyyy-MM-dd');

    onEventDrop(event, newDate, newEndDate);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-800/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-semibold text-zinc-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay[dayKey] || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);

            return (
              <Droppable key={dayKey} droppableId={dayKey}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'min-h-[120px] border-r border-b border-zinc-800 p-2',
                      !isCurrentMonth && 'bg-zinc-900/30',
                      snapshot.isDraggingOver && 'bg-amber-500/10',
                      isTodayDate && 'bg-blue-500/5'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isTodayDate ? 'bg-amber-500 text-black rounded-full w-6 h-6 flex items-center justify-center text-xs' :
                          isCurrentMonth ? 'text-white' : 'text-zinc-600'
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event, index) => (
                        <Draggable
                          key={event.id}
                          draggableId={event.id}
                          index={index}
                          isDragDisabled={event.type === 'review' || event.type === 'meeting'}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <CalendarEvent
                                event={event}
                                isCompact
                                isDragging={snapshot.isDragging}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-zinc-500 pl-2">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>

                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}