import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Truck, MessageSquareWarning, FileCheck, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const EVENT_TYPES = {
  delivery: { icon: Truck, color: 'bg-blue-500', label: 'Delivery' },
  rfi: { icon: MessageSquareWarning, color: 'bg-amber-500', label: 'RFI Due' },
  submittal: { icon: FileCheck, color: 'bg-green-500', label: 'Submittal' },
  fabrication: { icon: Wrench, color: 'bg-purple-500', label: 'Fabrication' },
  meeting: { icon: CalendarIcon, color: 'bg-orange-500', label: 'Meeting' }
};

export default function CalendarWidget({ events = [], onDateClick, onEventClick, compact = false }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const eventsByDate = useMemo(() => {
    const map = new Map();
    events.forEach(event => {
      const dateKey = format(new Date(event.date), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey).push(event);
    });
    return map;
  }, [events]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const getEventsForDay = (day) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return eventsByDate.get(dateKey) || [];
  };

  return (
    <Card className="bg-[#0A0A0A]/90 border-[rgba(255,255,255,0.05)]">
      <CardHeader className="border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-[#E5E7EB]">
            {format(currentDate, 'MMMM yyyy')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="text-xs text-[#9CA3AF] hover:text-[#FF9D42]"
            >
              Today
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                className="h-8 w-8 text-[#9CA3AF] hover:text-[#FF9D42]"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="h-8 w-8 text-[#9CA3AF] hover:text-[#FF9D42]"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              className="text-center text-xs font-semibold text-[#6B7280] uppercase tracking-wider py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(day => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isSelected = isSameDay(day, new Date());
            const hasEvents = dayEvents.length > 0;

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDateClick?.(day, dayEvents)}
                className={cn(
                  'relative aspect-square p-1 rounded-lg text-sm transition-all',
                  'border border-transparent hover:border-[rgba(255,157,66,0.2)]',
                  isCurrentMonth ? 'text-[#E5E7EB]' : 'text-[#4B5563]',
                  isSelected && 'bg-gradient-to-r from-[#FF6B2C] to-[#FF9D42] text-black font-bold',
                  !isSelected && hasEvents && 'bg-[rgba(255,157,66,0.05)]',
                  !isSelected && isToday(day) && 'border-[#FF9D42]'
                )}
              >
                <div className="text-center mb-1">
                  {format(day, 'd')}
                </div>

                {/* Event Indicators */}
                {!compact && hasEvents && (
                  <div className="flex flex-wrap gap-0.5 justify-center">
                    {dayEvents.slice(0, 3).map((event, idx) => {
                      const eventType = EVENT_TYPES[event.type] || EVENT_TYPES.meeting;
                      const Icon = eventType.icon;
                      return (
                        <div
                          key={idx}
                          className={cn(
                            'w-1 h-1 rounded-full',
                            eventType.color
                          )}
                          title={event.title}
                        />
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-[#9CA3AF]">
                        +{dayEvents.length - 3}
                      </div>
                    )}
                  </div>
                )}

                {compact && hasEvents && (
                  <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF9D42]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        {!compact && (
          <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
            <div className="flex flex-wrap gap-3">
              {Object.entries(EVENT_TYPES).map(([key, { icon: Icon, color, label }]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={cn('w-2 h-2 rounded-full', color)} />
                  <span className="text-xs text-[#9CA3AF]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}