import React, { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import CalendarEvent from './CalendarEvent';

export default function CalendarEventList({ events, projects, resources, onEventDrop }) {
  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped = {};

    events.forEach(event => {
      if (!event.start_date) return;
      
      const dateKey = event.start_date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    // Sort by date
    return Object.entries(grouped)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, events]) => ({
        date,
        events: events.sort((a, b) => {
          // Sort by type priority: project > work_package > task > allocation > review > meeting
          const typePriority = {
            project: 1,
            work_package: 2,
            task: 3,
            allocation: 4,
            review: 5,
            meeting: 6,
          };
          return (typePriority[a.type] || 99) - (typePriority[b.type] || 99);
        }),
      }));
  }, [events]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const eventId = result.draggableId;
    const newDate = result.destination.droppableId;
    
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const eventStart = event.start_date ? parseISO(event.start_date) : null;
    const eventEnd = event.end_date ? parseISO(event.end_date) : eventStart;
    
    if (!eventStart) return;

    // Calculate duration
    const duration = eventEnd ? Math.round((eventEnd - eventStart) / (1000 * 60 * 60 * 24)) : 0;
    const newEndDate = format(new Date(new Date(newDate).getTime() + duration * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

    onEventDrop(event, newDate, newEndDate);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {eventsByDate.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-12 text-center">
              <p className="text-zinc-400">No events found in this time period</p>
            </CardContent>
          </Card>
        ) : (
          eventsByDate.map(({ date, events }) => (
            <Droppable key={date} droppableId={date}>
              {(provided, snapshot) => (
                <Card
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'bg-zinc-900 border-zinc-800',
                    snapshot.isDraggingOver && 'border-amber-500/50 bg-amber-500/5'
                  )}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{format(parseISO(date), 'EEEE, MMMM d, yyyy')}</span>
                      <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700">
                        {events.length} {events.length === 1 ? 'event' : 'events'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {events.map((event, index) => (
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
                              isDragging={snapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </CardContent>
                </Card>
              )}
            </Droppable>
          ))
        )}
      </div>
    </DragDropContext>
  );
}