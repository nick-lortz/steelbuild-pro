import React, { useMemo } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DeliveryMetricsPanel({ deliveries }) {
  const metrics = useMemo(() => {
    const received = deliveries.filter(d => ['received', 'closed'].includes(d.delivery_status));
    const onTime = received.filter(d => d.on_time);
    
    const avgUnload = received.length > 0
      ? received.reduce((sum, d) => {
          if (d.actual_arrival_date && d.actual_unload_date) {
            const arrival = new Date(d.actual_arrival_date);
            const unload = new Date(d.actual_unload_date);
            return sum + (unload - arrival) / (1000 * 60 * 60); // hours
          }
          return sum;
        }, 0) / received.length
      : 0;

    const totalWeight = deliveries.reduce((sum, d) => sum + (d.weight_tons || 0), 0);
    const delaysByReason = {};
    const lateDelivs = received.filter(d => !d.on_time);
    lateDelivs.forEach(d => {
      const reason = d.delay_reason || 'unknown';
      delaysByReason[reason] = (delaysByReason[reason] || 0) + 1;
    });

    const damageRate = received.length > 0
      ? (received.filter(d => d.exceptions?.some(e => e.type === 'damage')).length / received.length) * 100
      : 0;

    const shortageRate = received.length > 0
      ? (received.filter(d => d.exceptions?.some(e => e.type === 'shortage')).length / received.length) * 100
      : 0;

    return {
      onTimePercent: received.length > 0 ? (onTime.length / received.length) * 100 : 0,
      avgUnloadHours: avgUnload,
      totalWeight,
      delaysByReason,
      damageRate,
      shortageRate,
      totalDelivered: received.length
    };
  }, [deliveries]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* On-Time % */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase text-zinc-500">
            On-Time Delivery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-500">
            {metrics.onTimePercent.toFixed(0)}%
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            of {metrics.totalDelivered} completed deliveries
          </p>
        </CardContent>
      </Card>

      {/* Avg Unload Time */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase text-zinc-500">
            Avg Unload Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-white">
            {metrics.avgUnloadHours.toFixed(1)} hrs
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            time from arrival to cleared
          </p>
        </CardContent>
      </Card>

      {/* Total Weight Delivered */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase text-zinc-500">
            Total Weight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-white">
            {metrics.totalWeight.toFixed(0)} T
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            cumulative delivered
          </p>
        </CardContent>
      </Card>

      {/* Damage Rate */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase text-zinc-500">
            Damage Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-3xl font-bold ${metrics.damageRate > 5 ? 'text-red-500' : 'text-green-500'}`}>
            {metrics.damageRate.toFixed(1)}%
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            of deliveries with issues
          </p>
        </CardContent>
      </Card>

      {/* Shortage Rate */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase text-zinc-500">
            Shortage Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-3xl font-bold ${metrics.shortageRate > 5 ? 'text-red-500' : 'text-green-500'}`}>
            {metrics.shortageRate.toFixed(1)}%
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            piece mark shortages
          </p>
        </CardContent>
      </Card>

      {/* Delays by Reason */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase text-zinc-500">
            Top Delay Reasons
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {Object.entries(metrics.delaysByReason).slice(0, 3).map(([reason, count]) => (
            <div key={reason} className="flex justify-between items-center text-xs">
              <span className="text-zinc-400 truncate">{reason}</span>
              <Badge className="text-[10px]">{count}</Badge>
            </div>
          ))}
          {Object.keys(metrics.delaysByReason).length === 0 && (
            <p className="text-xs text-green-500">No delays</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}