import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay, isWithinInterval } from 'date-fns';

export default function EquipmentCalendar({ equipmentId, equipmentName }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const queryClient = useQueryClient();

  const { data: bookings = [] } = useQuery({
    queryKey: ['equipmentBookings', equipmentId],
    queryFn: () => apiClient.entities.EquipmentBooking.list(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.entities.Project.list('name'),
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const equipmentBookings = bookings.filter(b => b.resource_id === equipmentId);

  const getBookingForDate = (date) => {
    return equipmentBookings.find(booking => {
      if (!booking.start_date || !booking.end_date) return false;
      return isWithinInterval(date, {
        start: new Date(booking.start_date),
        end: new Date(booking.end_date)
      });
    });
  };

  const nextMonth = () => setCurrentMonth(addDays(monthStart, 35));
  const prevMonth = () => setCurrentMonth(addDays(monthStart, -10));

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon size={18} />
            {equipmentName} Availability
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={prevMonth}
              className="border-zinc-700"
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={nextMonth}
              className="border-zinc-700"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-zinc-500 py-2">
              {day}
            </div>
          ))}
          
          {monthDays.map(day => {
            const booking = getBookingForDate(day);
            const isBooked = !!booking;
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            
            return (
              <div
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={`
                  aspect-square p-2 text-center text-sm rounded cursor-pointer transition-all
                  ${!isSameMonth(day, currentMonth) ? 'text-zinc-700' : 'text-zinc-300'}
                  ${isBooked ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-zinc-800/50 hover:bg-zinc-800'}
                  ${isSelected ? 'ring-2 ring-amber-500' : ''}
                  ${isSameDay(day, new Date()) ? 'font-bold' : ''}
                `}
              >
                <div className="text-xs">{format(day, 'd')}</div>
                {isBooked && (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mx-auto mt-1" />
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Date Info */}
        {selectedDate && (
          <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
            <p className="text-sm font-medium text-white mb-2">
              {format(selectedDate, 'MMMM d, yyyy')}
            </p>
            {(() => {
              const booking = getBookingForDate(selectedDate);
              if (booking) {
                const project = projects.find(p => p.id === booking.project_id);
                return (
                  <div>
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 mb-2">
                      Booked
                    </Badge>
                    <p className="text-sm text-zinc-400">
                      Project: {project?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {format(new Date(booking.start_date), 'MMM d')} - {format(new Date(booking.end_date), 'MMM d')}
                    </p>
                    {booking.operator && (
                      <p className="text-xs text-zinc-500 mt-1">
                        Operator: {booking.operator}
                      </p>
                    )}
                  </div>
                );
              }
              return (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Available
                </Badge>
              );
            })()}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded bg-zinc-800/50" />
            <span className="text-zinc-500">Available</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40" />
            <span className="text-zinc-500">Booked</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}