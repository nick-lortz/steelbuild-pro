import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle } from 'lucide-react';

const DELAY_COLORS = {
  waiting_steel: '#ef4444',
  crane_unavailable: '#f97316',
  weather: '#3b82f6',
  site_access: '#8b5cf6',
  rework: '#ec4899',
  safety_stop: '#06b6d4',
  material_shortage: '#f59e0b',
  coordination: '#14b8a6',
  other: '#6b7280'
};

export default function DelayAnalysis({ laborEntries }) {
  const delayStats = useMemo(() => {
    if (!laborEntries) return { byReason: [], byDate: [], byCrewCost: [] };

    const delayedOnly = laborEntries.filter(e => e.has_delay);
    
    // By reason
    const byReasonMap = {};
    const byCostMap = {};
    let totalLostHours = 0;

    delayedOnly.forEach(entry => {
      const reason = entry.delay_reason || 'other';
      const hours = entry.delay_hours || 0;
      const cost = hours * (entry.crew_size || 1) * 50; // assume $50/hr blended rate

      byReasonMap[reason] = (byReasonMap[reason] || 0) + hours;
      byCostMap[reason] = (byCostMap[reason] || 0) + cost;
      totalLostHours += hours;
    });

    const byReason = Object.entries(byReasonMap).map(([reason, hours]) => ({
      name: reason.replace(/_/g, ' ').toUpperCase(),
      hours: parseFloat(hours.toFixed(1)),
      cost: parseFloat(byCostMap[reason].toFixed(0)),
      count: delayedOnly.filter(e => e.delay_reason === reason).length
    })).sort((a, b) => b.hours - a.hours);

    // By date (last 14 days)
    const byDateMap = {};
    delayedOnly.forEach(entry => {
      const date = entry.work_date;
      byDateMap[date] = (byDateMap[date] || 0) + (entry.delay_hours || 0);
    });

    const byDate = Object.entries(byDateMap)
      .map(([date, hours]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        hours: parseFloat(hours.toFixed(1))
      }))
      .slice(-14);

    return {
      byReason,
      byDate,
      totalDelayedDays: delayedOnly.length,
      totalLostHours,
      totalLostCost: delayedOnly.reduce((sum, e) => sum + (e.delay_hours || 0) * (e.crew_size || 1) * 50, 0)
    };
  }, [laborEntries]);

  if (!delayStats.byReason || delayStats.byReason.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Delay Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-500">✓ No delays recorded</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Total Lost Hours</p>
            <p className="text-3xl font-bold text-red-500">{delayStats.totalLostHours.toFixed(1)}</p>
            <p className="text-xs text-zinc-600 mt-1">${delayStats.totalLostCost.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Delay Days</p>
            <p className="text-3xl font-bold text-orange-500">{delayStats.totalDelayedDays}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Avg Per Day</p>
            <p className="text-3xl font-bold text-white">
              {(delayStats.totalLostHours / (delayStats.totalDelayedDays || 1)).toFixed(1)}h
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Delays by Reason */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Delay Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={delayStats.byReason}
              margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
              />
              <YAxis tick={{ fill: '#a1a1aa' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                formatter={(value) => value.toFixed(1)}
              />
              <Bar dataKey="hours" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>

          {/* Reason Details */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {delayStats.byReason.map((reason, idx) => (
              <div key={reason.name} className="flex items-center justify-between p-2 bg-zinc-800 rounded text-sm">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: DELAY_COLORS[Object.keys(DELAY_COLORS)[idx % Object.keys(DELAY_COLORS).length]] }}
                  />
                  <span>{reason.name}</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{reason.hours.toFixed(1)}h</Badge>
                  <Badge className="text-xs">${reason.cost}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delay Trend */}
      {delayStats.byDate.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base">Delay Trend (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={delayStats.byDate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="date" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <YAxis tick={{ fill: '#a1a1aa' }} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
                <Bar dataKey="hours" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}