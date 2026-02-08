import React, { useMemo } from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DeliveryConflictPanel({ deliveries, onSelectDelivery }) {
  const conflicts = useMemo(() => {
    const issues = [];

    // Crane double-booking
    const craneUsage = {};
    deliveries.forEach(d => {
      if (d.required_crane && d.delivery_status !== 'cancelled') {
        if (!craneUsage[d.required_crane]) craneUsage[d.required_crane] = [];
        craneUsage[d.required_crane].push(d);
      }
    });

    Object.entries(craneUsage).forEach(([crane, delivs]) => {
      if (delivs.length > 1) {
        const dates = {};
        delivs.forEach(d => {
          const date = d.confirmed_date || d.scheduled_date;
          if (!dates[date]) dates[date] = [];
          dates[date].push(d);
        });

        Object.entries(dates).forEach(([date, sameDay]) => {
          if (sameDay.length > 1) {
            issues.push({
              type: 'crane',
              severity: 'high',
              title: `Crane Double-Book: ${crane}`,
              detail: `${sameDay.length} loads on ${date}`,
              deliveries: sameDay
            });
          }
        });
      }
    });

    // Crew conflicts
    const crewUsage = {};
    deliveries.forEach(d => {
      if (d.required_crew && d.delivery_status !== 'cancelled') {
        if (!crewUsage[d.required_crew]) crewUsage[d.required_crew] = [];
        crewUsage[d.required_crew].push(d);
      }
    });

    Object.entries(crewUsage).forEach(([crew, delivs]) => {
      if (delivs.length > 1) {
        issues.push({
          type: 'crew',
          severity: 'medium',
          title: `Crew Overlap: ${crew}`,
          detail: `${delivs.length} concurrent assignments`,
          deliveries: delivs
        });
      }
    });

    // Overloaded days
    const dayLoads = {};
    deliveries.forEach(d => {
      const date = d.confirmed_date || d.scheduled_date;
      if (date && d.delivery_status !== 'cancelled') {
        if (!dayLoads[date]) dayLoads[date] = [];
        dayLoads[date].push(d);
      }
    });

    Object.entries(dayLoads).forEach(([date, dayDelivs]) => {
      if (dayDelivs.length > 3) {
        issues.push({
          type: 'overload',
          severity: 'medium',
          title: 'Overloaded Day',
          detail: `${dayDelivs.length} loads on ${date}`,
          deliveries: dayDelivs
        });
      }
    });

    // Deliveries before erection readiness (would need erection task status check)
    deliveries.forEach(d => {
      if (d.delivery_status === 'scheduled' && !d.erection_task_ready) {
        issues.push({
          type: 'readiness',
          severity: 'high',
          title: 'Delivery Before Erection Ready',
          detail: d.package_name,
          deliveries: [d]
        });
      }
    });

    // Not sequenced to erection order
    const withSequence = deliveries.filter(d => d.erection_sequence).length;
    const withoutSequence = deliveries.filter(d => !d.erection_sequence && d.delivery_status !== 'cancelled').length;
    if (withoutSequence > 0 && withSequence > 0) {
      issues.push({
        type: 'sequence',
        severity: 'low',
        title: 'Missing Erection Sequence',
        detail: `${withoutSequence} deliveries not sequenced`,
        deliveries: deliveries.filter(d => !d.erection_sequence)
      });
    }

    return issues;
  }, [deliveries]);

  if (conflicts.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-green-400 flex items-center justify-center gap-2">
            <span>✓</span> No conflicts detected
          </p>
        </CardContent>
      </Card>
    );
  }

  const severityIcons = {
    high: <AlertTriangle size={16} className="text-red-500" />,
    medium: <AlertCircle size={16} className="text-orange-500" />,
    low: <AlertTriangle size={16} className="text-yellow-500" />
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-red-500">
          <AlertTriangle size={16} />
          ATTENTION NEEDED ({conflicts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {conflicts.map((issue, idx) => (
          <button
            key={idx}
            onClick={() => issue.deliveries.length === 1 && onSelectDelivery?.(issue.deliveries[0])}
            className="w-full p-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded text-left transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {severityIcons[issue.severity]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">
                  {issue.title}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {issue.detail}
                </p>
                {issue.deliveries.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {issue.deliveries.slice(0, 3).map(d => (
                      <Badge key={d.id} className="text-[10px] bg-zinc-900 border border-zinc-600">
                        {d.delivery_number}
                      </Badge>
                    ))}
                    {issue.deliveries.length > 3 && (
                      <Badge className="text-[10px] bg-zinc-900 border border-zinc-600">
                        +{issue.deliveries.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}