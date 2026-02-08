import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle } from 'lucide-react';
import { format, eachWeekOfInterval, parseISO, differenceInDays, startOfWeek, endOfWeek } from 'date-fns';

export default function LookAheadTimeline({ activities, dateFrom, dateTo, onActivityClick }) {
  const weeks = useMemo(() => {
    if (!dateFrom || !dateTo) return [];
    try {
      const start = startOfWeek(parseISO(dateFrom));
      const end = endOfWeek(parseISO(dateTo));
      return eachWeekOfInterval({ start, end });
    } catch {
      return [];
    }
  }, [dateFrom, dateTo]);

  const totalDays = useMemo(() => {
    if (!dateFrom || !dateTo) return 1;
    try {
      return differenceInDays(parseISO(dateTo), parseISO(dateFrom)) || 1;
    } catch {
      return 1;
    }
  }, [dateFrom, dateTo]);

  const getActivityPosition = (activity) => {
    if (!activity.start_date || !activity.end_date || !dateFrom || !dateTo) {
      return { left: '0%', width: '2%' };
    }
    try {
      const activityStart = parseISO(activity.start_date);
      const activityEnd = parseISO(activity.end_date);
      const rangeStart = parseISO(dateFrom);
      const rangeEnd = parseISO(dateTo);

      const startOffset = Math.max(0, differenceInDays(activityStart, rangeStart));
      const endOffset = Math.min(totalDays, differenceInDays(activityEnd, rangeStart));
      
      const left = (startOffset / totalDays) * 100;
      const width = ((endOffset - startOffset) / totalDays) * 100;

      return { left: `${left}%`, width: `${Math.max(width, 2)}%` };
    } catch {
      return { left: '0%', width: '2%' };
    }
  };

  const getStatusColor = (status, isCritical) => {
    if (isCritical) return 'bg-red-500 border-red-400';
    switch (status) {
      case 'completed': return 'bg-green-500 border-green-400';
      case 'in_progress': return 'bg-blue-500 border-blue-400';
      case 'delayed': return 'bg-amber-500 border-amber-400';
      default: return 'bg-zinc-600 border-zinc-500';
    }
  };

  const groupedActivities = useMemo(() => {
    const groups = {};
    activities.forEach(activity => {
      if (!groups[activity.phase]) {
        groups[activity.phase] = [];
      }
      groups[activity.phase].push(activity);
    });
    return groups;
  }, [activities]);

  const phaseOrder = ['detailing', 'fabrication', 'delivery', 'erection', 'closeout'];

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar size={18} className="text-amber-500" />
          Project Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Week Headers */}
        <div className="mb-4 flex border-b border-zinc-800 pb-2">
          {weeks.map((week, idx) => (
            <div key={idx} className="flex-1 text-center">
              <p className="text-xs font-semibold text-zinc-400">
                {format(week, 'MMM d')}
              </p>
            </div>
          ))}
        </div>

        {/* Timeline Rows by Phase */}
        {activities.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <AlertCircle className="mx-auto mb-2" size={32} />
            <p className="text-sm">No activities in selected date range</p>
          </div>
        ) : (
          <div className="space-y-6">
            {phaseOrder.map(phase => {
              const phaseActivities = groupedActivities[phase] || [];
              if (phaseActivities.length === 0) return null;

              return (
                <div key={phase}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    {phase}
                  </h4>
                  <div className="space-y-1 relative">
                    {phaseActivities.map((activity, idx) => {
                      const position = getActivityPosition(activity);
                      const color = getStatusColor(activity.status, activity.is_critical);

                      return (
                        <div
                          key={activity.id}
                          className="relative h-8 group cursor-pointer"
                          onClick={() => onActivityClick(activity)}
                        >
                          {/* Background grid */}
                          <div className="absolute inset-0 flex">
                            {weeks.map((_, wIdx) => (
                              <div key={wIdx} className="flex-1 border-r border-zinc-800/50" />
                            ))}
                          </div>

                          {/* Activity bar */}
                          <div
                            className={`absolute h-6 top-1 rounded ${color} border transition-all group-hover:opacity-80`}
                            style={position}
                          >
                            <div className="px-2 flex items-center h-full">
                              <span className="text-xs font-medium text-white truncate">
                                {activity.name}
                              </span>
                              {activity.is_critical && (
                                <Badge variant="outline" className="ml-auto text-[8px] px-1 h-4 bg-red-600/20 border-red-500">
                                  CRITICAL
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Tooltip on hover */}
                          <div className="absolute left-0 top-full mt-1 z-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                            <div className="bg-black border border-zinc-700 rounded p-2 text-xs whitespace-nowrap shadow-lg">
                              <p className="font-semibold">{activity.name}</p>
                              <p className="text-zinc-400">
                                {activity.start_date && activity.end_date ? 
                                  `${format(parseISO(activity.start_date), 'MMM d')} - ${format(parseISO(activity.end_date), 'MMM d')}` : 
                                  'No dates set'
                                }
                              </p>
                              <p className="text-zinc-400">
                                Status: <span className="capitalize">{(activity.status || 'unknown').replace('_', ' ')}</span> ({activity.progress_percent || 0}%)
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}