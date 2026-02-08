import React, { useMemo } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from 'lucide-react';

export default function CrewDashboard({ laborEntries, crews }) {
  const crewMetrics = useMemo(() => {
    if (!laborEntries || !crews) return {};

    const metrics = {};
    
    crews.forEach(crew => {
      const entries = laborEntries.filter(e => e.crew_id === crew.id);
      if (entries.length === 0) return;

      const totalTons = entries.reduce((sum, e) => sum + (e.productivity?.tons_installed || 0), 0);
      const totalHours = entries.reduce((sum, e) => sum + (e.actual_hours + e.overtime_hours), 0);
      const delayedEntries = entries.filter(e => e.has_delay).length;
      const delayHours = entries.reduce((sum, e) => sum + (e.delay_hours || 0), 0);
      const avgProductivity = entries.length > 0 
        ? totalTons / (totalHours * entries[0].crew_size)
        : 0;

      // Last 7 days trend
      const sevenDaysAgo = subDays(new Date(), 7);
      const recentEntries = entries.filter(e => new Date(e.work_date) >= sevenDaysAgo);
      const recentTons = recentEntries.reduce((sum, e) => sum + (e.productivity?.tons_installed || 0), 0);
      const trend = recentEntries.length > 0 ? (recentTons / recentEntries.length) : 0;

      // Certification compliance
      const certGaps = entries.reduce((acc, e) => acc + (e.certification_gaps?.length || 0), 0);

      metrics[crew.id] = {
        crew_name: crew.crew_name,
        crew_lead: crew.crew_lead,
        crew_type: crew.crew_type,
        entries_logged: entries.length,
        total_hours: totalHours.toFixed(1),
        tons_installed: totalTons.toFixed(1),
        avg_tons_per_hour: avgProductivity.toFixed(2),
        delay_incidents: delayedEntries,
        delay_hours: delayHours.toFixed(1),
        delay_rate: (delayedEntries / entries.length * 100).toFixed(0),
        recent_trend: trend.toFixed(2),
        cert_gaps: certGaps,
        last_entry: format(parseISO(entries[entries.length - 1].work_date), 'MMM dd')
      };
    });

    return metrics;
  }, [laborEntries, crews]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Object.entries(crewMetrics).map(([crewId, metrics]) => (
        <Card key={crewId} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{metrics.crew_name}</CardTitle>
                <p className="text-xs text-zinc-500 mt-1">
                  Lead: {metrics.crew_lead} • {metrics.crew_type}
                </p>
              </div>
              <Badge variant="outline">{metrics.entries_logged} days</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Productivity Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-800 rounded">
                <p className="text-xs text-zinc-500 uppercase font-bold">Total Tons</p>
                <p className="text-2xl font-bold text-amber-500">{metrics.tons_installed}</p>
              </div>
              <div className="p-3 bg-zinc-800 rounded">
                <p className="text-xs text-zinc-500 uppercase font-bold">Total Hours</p>
                <p className="text-2xl font-bold text-white">{metrics.total_hours}</p>
              </div>
            </div>

            {/* Efficiency */}
            <div className="p-3 bg-green-900/20 border border-green-800 rounded">
              <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Productivity Rate</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-green-500">{metrics.avg_tons_per_hour}</p>
                <span className="text-xs text-zinc-400">tons/crew/hour</span>
              </div>
              <p className="text-xs text-green-400 mt-2">
                7-day avg: {metrics.recent_trend}T/day
              </p>
            </div>

            {/* Delays */}
            {metrics.delay_incidents > 0 && (
              <div className="p-3 bg-red-900/20 border border-red-800 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={14} className="text-red-500" />
                  <p className="text-xs font-bold text-red-500 uppercase">Delays</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-zinc-500">Incidents</p>
                    <p className="font-bold text-white">{metrics.delay_incidents}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Hours Lost</p>
                    <p className="font-bold text-white">{metrics.delay_hours}</p>
                  </div>
                </div>
                <p className="text-xs text-red-400 mt-2">
                  {metrics.delay_rate}% of work days affected
                </p>
              </div>
            )}

            {/* Certification Compliance */}
            {metrics.cert_gaps > 0 && (
              <div className="p-3 bg-yellow-900/20 border border-yellow-800 rounded">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-yellow-600" />
                  <p className="text-xs font-bold text-yellow-600 uppercase">
                    {metrics.cert_gaps} certification gaps
                  </p>
                </div>
              </div>
            )}

            {/* Last Entry */}
            <p className="text-xs text-zinc-500">
              Last entry: {metrics.last_entry}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}