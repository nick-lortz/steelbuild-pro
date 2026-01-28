import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Clock, CheckCircle2, Phone, AlertTriangle } from 'lucide-react';
import { format, parseISO, isToday, isPast } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';

export default function TodaysDeliveries({ deliveries, onReceive, onMarkArrived, onViewDetails }) {
  const todaysDeliveries = deliveries.filter(d => {
    if (!d.confirmed_date && !d.scheduled_date && !d.requested_date) return false;
    const deliveryDate = d.confirmed_date || d.scheduled_date || d.requested_date;
    return isToday(parseISO(deliveryDate));
  }).sort((a, b) => {
    const timeA = a.confirmed_time_window || '';
    const timeB = b.confirmed_time_window || '';
    return timeA.localeCompare(timeB);
  });

  if (todaysDeliveries.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-12 text-center">
          <Truck size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500">No deliveries scheduled for today</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold uppercase tracking-wider">Today's Deliveries</h3>
        <Badge className="bg-amber-500 text-black">{todaysDeliveries.length} total</Badge>
      </div>

      <div className="grid gap-4">
        {todaysDeliveries.map(delivery => {
          const isArrived = delivery.delivery_status === 'arrived_on_site';
          const isReceived = delivery.delivery_status === 'received' || delivery.delivery_status === 'closed';
          const hasIssues = delivery.delivery_status === 'exception';

          return (
            <Card key={delivery.id} className={`border-2 ${
              hasIssues ? 'border-red-500 bg-red-950/20' :
              isReceived ? 'border-green-500 bg-green-950/20' :
              isArrived ? 'border-purple-500 bg-purple-950/20' :
              'border-zinc-700 bg-zinc-900'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold">{delivery.package_name}</p>
                      <StatusBadge status={delivery.delivery_status} />
                      {hasIssues && <AlertTriangle size={14} className="text-red-500" />}
                    </div>
                    <p className="text-xs text-zinc-400">{delivery.vendor_supplier}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm font-bold text-amber-400">
                      <Clock size={14} />
                      {delivery.confirmed_time_window || 'TBD'}
                    </div>
                    <p className="text-xs text-zinc-500">{delivery.carrier}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-xs mb-4">
                  <div>
                    <span className="text-zinc-500">Weight:</span>
                    <span className="text-white ml-1 font-mono">
                      {delivery.line_items?.reduce((sum, item) => sum + (item.weight_tons || 0), 0).toFixed(1) || '0.0'} tons
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Pieces:</span>
                    <span className="text-white ml-1 font-mono">
                      {delivery.line_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Contact:</span>
                    <span className="text-white ml-1">{delivery.contact_name || '-'}</span>
                  </div>
                </div>

                {delivery.site_constraints?.gate_hours && (
                  <div className="text-xs text-amber-400 mb-3 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Gate hours: {delivery.site_constraints.gate_hours}
                  </div>
                )}

                <div className="flex gap-2">
                  {!isReceived && !isArrived && (
                    <Button
                      size="sm"
                      onClick={() => onMarkArrived(delivery)}
                      className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
                    >
                      <MapPin size={14} className="mr-2" />
                      Arrived
                    </Button>
                  )}
                  {(isArrived || delivery.delivery_status === 'partially_received') && !isReceived && (
                    <Button
                      size="sm"
                      onClick={() => onReceive(delivery)}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    >
                      <CheckCircle2 size={14} className="mr-2" />
                      Receive
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewDetails(delivery)}
                    className="border-zinc-700"
                  >
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}