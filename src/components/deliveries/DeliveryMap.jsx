import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Clock, AlertTriangle } from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';

export default function DeliveryMap({ loads, project, onSelectLoad }) {
  // In a real implementation, this would integrate with Google Maps or similar
  // For now, we'll show a list view with location data
  
  const activeLoads = loads.filter(l => ['in_transit', 'arrived'].includes(l.status));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Map Placeholder */}
      <Card className="lg:col-span-2 bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
            <MapPin size={16} className="text-amber-500" />
            Live Truck Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-zinc-800 rounded-lg h-[600px] flex items-center justify-center border border-zinc-700">
            <div className="text-center">
              <MapPin size={48} className="mx-auto mb-4 text-zinc-600" />
              <p className="text-zinc-500 mb-2">Map Integration</p>
              <p className="text-xs text-zinc-600">
                Connect GPS/telematics to display real-time truck locations
              </p>
              {project?.site_address && (
                <div className="mt-4 p-3 bg-zinc-900 rounded border border-zinc-700 max-w-sm mx-auto">
                  <div className="text-xs text-zinc-500 mb-1">Site Location:</div>
                  <div className="text-sm text-white">{project.site_address}</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Trucks List */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Navigation size={16} />
              Active Trucks
            </span>
            <Badge variant="outline" className="border-zinc-700">
              {activeLoads.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
          {activeLoads.length === 0 ? (
            <div className="text-center py-12 text-zinc-600 text-sm">
              No trucks in transit
            </div>
          ) : (
            activeLoads.map(load => {
              const minutesUntil = load.estimated_eta 
                ? differenceInMinutes(parseISO(load.estimated_eta), new Date())
                : null;
              
              const isLate = load.planned_arrival_end && load.estimated_eta &&
                parseISO(load.estimated_eta) > parseISO(load.planned_arrival_end);

              return (
                <div
                  key={load.id}
                  onClick={() => onSelectLoad(load)}
                  className="p-3 bg-zinc-800/50 border border-zinc-700 rounded hover:border-amber-500 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-bold text-white text-sm">{load.load_number}</p>
                      <p className="text-xs text-zinc-500">{load.truck_id || 'Truck ID TBD'}</p>
                    </div>
                    <Badge className={cn(
                      "text-xs",
                      load.status === 'in_transit' ? 'bg-amber-500 text-black' : 'bg-green-600 text-white'
                    )}>
                      {load.status === 'in_transit' ? 'EN ROUTE' : 'ARRIVED'}
                    </Badge>
                  </div>

                  {minutesUntil !== null && load.status === 'in_transit' && (
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-1 text-zinc-500">
                        <Clock size={12} />
                        <span>ETA:</span>
                      </div>
                      <span className={cn(
                        "font-mono font-bold",
                        isLate ? "text-red-500" :
                        minutesUntil < 30 ? "text-green-500" : "text-zinc-400"
                      )}>
                        {minutesUntil > 60 
                          ? `${Math.floor(minutesUntil / 60)}h ${minutesUntil % 60}m`
                          : `${minutesUntil}m`
                        }
                        {isLate && ' LATE'}
                      </span>
                    </div>
                  )}

                  {load.planned_arrival_start && (
                    <div className="text-xs text-zinc-500">
                      Window: {format(parseISO(load.planned_arrival_start), 'HH:mm')}
                      {load.planned_arrival_end && ` - ${format(parseISO(load.planned_arrival_end), 'HH:mm')}`}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-700">
                    <span>{load.pieceCount} pieces</span>
                    <span>•</span>
                    <span>{load.totalWeight?.toFixed(1) || '0'}t</span>
                    {load.sequences?.length > 0 && (
                      <>
                        <span>•</span>
                        <span>{load.sequences.length} seq</span>
                      </>
                    )}
                  </div>

                  {load.criticalIssues > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
                      <AlertTriangle size={12} />
                      <span className="font-bold">{load.criticalIssues} CRITICAL</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}