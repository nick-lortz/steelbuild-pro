import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";

export default function RiskIndicators({ conflicts, laborEntries, equipment, deliveries }) {
  const indicators = useMemo(() => {
    const critical = conflicts?.filter(c => c.severity === 'critical') || [];
    const warnings = conflicts?.filter(c => c.severity === 'warning') || [];
    
    const craneUtilization = equipment?.filter(e => e.equipment_type?.includes('crane')).length || 0;
    const avgCrewSize = laborEntries?.length > 0 
      ? (laborEntries.reduce((sum, l) => sum + (l.crew_size || 0), 0) / laborEntries.length).toFixed(0)
      : 0;
    
    const onTimeDeliveries = deliveries?.filter(d => d.on_time).length || 0;
    const totalDeliveries = deliveries?.length || 0;
    const onTimeRate = totalDeliveries > 0 ? ((onTimeDeliveries / totalDeliveries) * 100).toFixed(0) : '-';

    return {
      critical_count: critical.length,
      warning_count: warnings.length,
      crane_capacity: craneUtilization,
      avg_crew_size: avgCrewSize,
      on_time_rate: onTimeRate,
      pending_deliveries: deliveries?.filter(d => ['requested', 'confirmed', 'in_transit'].includes(d.delivery_status)).length || 0
    };
  }, [conflicts, laborEntries, equipment, deliveries]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
      <Card className={`bg-zinc-900 border-zinc-800 ${indicators.critical_count > 0 ? 'border-red-700' : ''}`}>
        <CardContent className="pt-4">
          <div className="text-xs text-zinc-500 uppercase font-bold">Critical Risks</div>
          <div className={`text-2xl font-bold ${indicators.critical_count > 0 ? 'text-red-500' : 'text-green-500'}`}>
            {indicators.critical_count}
          </div>
        </CardContent>
      </Card>

      <Card className={`bg-zinc-900 border-zinc-800 ${indicators.warning_count > 0 ? 'border-yellow-700' : ''}`}>
        <CardContent className="pt-4">
          <div className="text-xs text-zinc-500 uppercase font-bold">Warnings</div>
          <div className={`text-2xl font-bold ${indicators.warning_count > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
            {indicators.warning_count}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-4">
          <div className="text-xs text-zinc-500 uppercase font-bold">Cranes</div>
          <div className="text-2xl font-bold text-amber-500">{indicators.crane_capacity}</div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-4">
          <div className="text-xs text-zinc-500 uppercase font-bold">Avg Crew</div>
          <div className="text-2xl font-bold text-blue-500">{indicators.avg_crew_size}</div>
        </CardContent>
      </Card>

      <Card className={`bg-zinc-900 border-zinc-800 ${parseInt(indicators.on_time_rate) < 80 ? 'border-orange-700' : ''}`}>
        <CardContent className="pt-4">
          <div className="text-xs text-zinc-500 uppercase font-bold">On-Time %</div>
          <div className={`text-2xl font-bold ${parseInt(indicators.on_time_rate) >= 80 ? 'text-green-500' : 'text-orange-500'}`}>
            {indicators.on_time_rate}%
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-4">
          <div className="text-xs text-zinc-500 uppercase font-bold">In Transit</div>
          <div className="text-2xl font-bold text-green-500">{indicators.pending_deliveries}</div>
        </CardContent>
      </Card>
    </div>
  );
}