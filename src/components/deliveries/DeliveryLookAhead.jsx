import React, { useMemo } from 'react';
import { format, startOfToday, addDays, parseISO } from 'date-fns';
import { Truck, AlertTriangle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DeliveryLookAhead({ deliveries, projects, onSelectDelivery }) {
  const today = startOfToday();
  const periods = [
    { label: 'TODAY', start: today, end: today },
    { label: 'THIS WEEK', start: addDays(today, 1), end: addDays(today, 6) },
    { label: 'NEXT 2 WEEKS', start: addDays(today, 7), end: addDays(today, 20) }
  ];

  const deliveriesByPeriod = useMemo(() => {
    const grouped = {};
    periods.forEach(p => {
      grouped[p.label] = deliveries.filter(d => {
        const date = d.confirmed_date || d.scheduled_date || d.requested_date;
        if (!date) return false;
        const deliveryDate = parseISO(date);
        return deliveryDate >= p.start && deliveryDate <= p.end;
      });
    });
    return grouped;
  }, [deliveries]);

  const getConflictIndicators = (delivery) => {
    const indicators = [];
    
    // Check crane conflicts (same crane, overlapping dates)
    if (delivery.required_crane) {
      const sameGearDate = deliveries.filter(d =>
        d.id !== delivery.id &&
        d.required_crane === delivery.required_crane &&
        d.delivery_status !== 'cancelled'
      ).length > 1;
      if (sameGearDate) indicators.push('crane');
    }

    // Check crew conflicts
    if (delivery.required_crew) {
      const sameCrewDate = deliveries.filter(d =>
        d.id !== delivery.id &&
        d.required_crew === delivery.required_crew &&
        d.delivery_status !== 'cancelled'
      ).length > 1;
      if (sameCrewDate) indicators.push('crew');
    }

    // Check if many deliveries same day
    const sameDay = deliveries.filter(d => {
      const d1 = d.confirmed_date || d.scheduled_date;
      const d2 = delivery.confirmed_date || delivery.scheduled_date;
      return d1 === d2 && d.delivery_status !== 'cancelled';
    }).length;
    if (sameDay > 3) indicators.push('overload');

    return indicators;
  };

  return (
    <div className="space-y-4">
      {periods.map(period => {
        const delivs = deliveriesByPeriod[period.label];
        if (delivs.length === 0) return null;

        return (
          <Card key={period.label} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-white uppercase tracking-wide">
                  {period.label}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {delivs.length} load{delivs.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {delivs.map(d => {
                  const project = projects.find(p => p.id === d.project_id);
                  const conflicts = getConflictIndicators(d);
                  const date = d.confirmed_date || d.scheduled_date;

                  return (
                    <button
                      key={d.id}
                      onClick={() => onSelectDelivery(d)}
                      className="p-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded text-left transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-amber-400 text-xs font-bold">
                              {d.delivery_number}
                            </span>
                            <Badge className="text-[10px] h-5">
                              {d.delivery_status === 'arrived_on_site' ? '✓ HERE' : d.delivery_status}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-white truncate">
                            {d.package_name}
                          </p>
                          <p className="text-xs text-zinc-400 truncate">
                            {project?.project_number} • {d.vendor_supplier || 'TBD'}
                          </p>
                          {d.gridlines_zone && (
                            <p className="text-xs text-zinc-500 mt-1">
                              Zone: {d.gridlines_zone}
                            </p>
                          )}
                        </div>

                        {/* Conflict indicators */}
                        {conflicts.length > 0 && (
                          <div className="flex flex-col gap-1">
                            {conflicts.includes('crane') && (
                              <div title="Crane conflict" className="bg-red-500/20 p-1 rounded">
                                <AlertTriangle size={12} className="text-red-400" />
                              </div>
                            )}
                            {conflicts.includes('crew') && (
                              <div title="Crew conflict" className="bg-orange-500/20 p-1 rounded">
                                <AlertCircle size={12} className="text-orange-400" />
                              </div>
                            )}
                            {conflicts.includes('overload') && (
                              <div title="Overloaded day" className="bg-yellow-500/20 p-1 rounded">
                                <Truck size={12} className="text-yellow-400" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-700/50">
                        <span className="text-[10px] text-zinc-500 uppercase font-mono">
                          {date && format(parseISO(date), 'MMM d, HH:mm')}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {d.weight_tons || 0}T • {d.piece_count || 0} pcs
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}