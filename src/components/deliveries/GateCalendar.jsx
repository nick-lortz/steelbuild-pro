import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Truck, Package, Weight, AlertTriangle, MapPin } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, addDays, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';

export default function GateCalendar({ loads, onSelectLoad, onRefresh }) {
  // Group loads by day
  const loadsByDay = useMemo(() => {
    const today = startOfDay(new Date());
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const day = addDays(today, i);
      const dayLoads = loads.filter(l => {
        if (!l.planned_arrival_start) return false;
        const arrivalDate = startOfDay(parseISO(l.planned_arrival_start));
        return arrivalDate.getTime() === day.getTime() && 
               ['scheduled', 'in_transit', 'arrived', 'unloading'].includes(l.status);
      }).sort((a, b) => 
        new Date(a.planned_arrival_start) - new Date(b.planned_arrival_start)
      );
      
      if (dayLoads.length > 0 || i === 0) { // Always show today even if empty
        days.push({ day, loads: dayLoads });
      }
    }
    
    return days;
  }, [loads]);

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-600 text-white',
      in_transit: 'bg-amber-500 text-black',
      arrived: 'bg-green-600 text-white',
      unloading: 'bg-purple-600 text-white'
    };
    return colors[status] || 'bg-zinc-600 text-zinc-200';
  };

  const getETAStatus = (load) => {
    if (load.status !== 'in_transit' || !load.estimated_eta || !load.planned_arrival_end) return null;
    
    const eta = parseISO(load.estimated_eta);
    const windowEnd = parseISO(load.planned_arrival_end);
    const minutesUntil = differenceInMinutes(eta, new Date());
    
    if (eta > windowEnd) return { label: 'LATE', color: 'text-red-500' };
    if (minutesUntil < 30) return { label: `${minutesUntil}m`, color: 'text-green-500' };
    return { label: `${Math.floor(minutesUntil / 60)}h ${minutesUntil % 60}m`, color: 'text-zinc-400' };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {loadsByDay.map(({ day, loads: dayLoads }) => {
        const dayLabel = isToday(day) ? 'Today' : 
                        isTomorrow(day) ? 'Tomorrow' : 
                        format(day, 'EEEE, MMM d');
        
        return (
          <Card key={day.toISOString()} className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider flex items-center justify-between">
                <span className={cn(
                  isToday(day) && "text-amber-500",
                  isTomorrow(day) && "text-blue-500"
                )}>
                  {dayLabel}
                </span>
                <Badge variant="outline" className="border-zinc-700">
                  {dayLoads.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dayLoads.length === 0 ? (
                <div className="text-center py-8 text-zinc-600 text-sm">
                  No deliveries scheduled
                </div>
              ) : (
                dayLoads.map(load => {
                  const etaStatus = getETAStatus(load);
                  
                  return (
                    <div
                      key={load.id}
                      onClick={() => onSelectLoad(load)}
                      className="p-3 bg-zinc-800/50 border border-zinc-700 rounded hover:border-amber-500 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={cn("text-xs font-bold", getStatusColor(load.status))}>
                              {load.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {load.is_osow && (
                              <Badge variant="outline" className="text-[10px] border-orange-500 text-orange-500">
                                OSOW
                              </Badge>
                            )}
                          </div>
                          <p className="font-bold text-white text-sm">{load.load_number}</p>
                          <p className="text-xs text-zinc-500 font-mono">{load.truck_id || 'Truck TBD'}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono font-bold text-white">
                            {format(parseISO(load.planned_arrival_start), 'HH:mm')}
                          </div>
                          {etaStatus && (
                            <div className={cn("text-xs font-mono font-bold mt-1", etaStatus.color)}>
                              ETA: {etaStatus.label}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs text-zinc-500 mt-3">
                        <div className="flex items-center gap-1">
                          <Package size={12} />
                          <span className="text-white font-semibold">{load.pieceCount}</span>
                          <span>pcs</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Weight size={12} />
                          <span className="text-white font-semibold">{load.totalWeight?.toFixed(1) || '0'}t</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin size={12} />
                          <span className="text-white font-semibold">{load.sequences?.length || 0}</span>
                          <span>seq</span>
                        </div>
                      </div>

                      {load.sequences && load.sequences.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-zinc-700">
                          <div className="text-[10px] text-zinc-600 mb-1">SEQUENCES:</div>
                          <div className="flex flex-wrap gap-1">
                            {load.sequences.slice(0, 3).map((seq, idx) => (
                              <Badge key={idx} variant="outline" className="text-[10px] border-zinc-600 text-zinc-400">
                                {seq}
                              </Badge>
                            ))}
                            {load.sequences.length > 3 && (
                              <Badge variant="outline" className="text-[10px] border-zinc-600 text-zinc-400">
                                +{load.sequences.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {load.equipment && load.equipment.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-zinc-700">
                          <div className="text-[10px] text-zinc-600 mb-1">EQUIPMENT:</div>
                          <div className="flex flex-wrap gap-1">
                            {load.equipment.slice(0, 2).map((eq, idx) => (
                              <Badge key={idx} variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">
                                {eq.equipment_type.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {(load.openIssues > 0 || load.criticalIssues > 0) && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
                          <AlertTriangle size={12} />
                          {load.criticalIssues > 0 ? (
                            <span className="font-bold">{load.criticalIssues} CRITICAL</span>
                          ) : (
                            <span>{load.openIssues} issue{load.openIssues > 1 ? 's' : ''}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}