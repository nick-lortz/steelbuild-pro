import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, Clock, Users } from 'lucide-react';

export default function RFIImpactDashboard({ rfis = [], tasks = [], crews = [] }) {
  const impactMetrics = useMemo(() => {
    const metrics = {
      total_rfis: rfis.length,
      open_rfis: rfis.filter(r => !['closed', 'answered'].includes(r.status)).length,
      critical_blockers: rfis.filter(r => r.blocker_info?.is_blocker && r.priority === 'critical').length,
      fab_blocked: rfis.filter(r => r.blocker_info?.blocked_work === 'fabrication').length,
      erection_blocked: rfis.filter(r => r.blocker_info?.blocked_work === 'erection').length,
      overdue_count: 0,
      crews_impacted: new Set(),
      avg_response_days: 0
    };

    let totalResponseDays = 0;
    let responseCount = 0;

    rfis.forEach(rfi => {
      // Overdue check
      if (rfi.due_date && new Date(rfi.due_date) < new Date() && !['closed', 'answered'].includes(rfi.status)) {
        metrics.overdue_count++;
      }

      // Crews impacted
      if (rfi.blocker_info?.blocked_team) {
        const crew = crews.find(c => c.crew_name === rfi.blocker_info.blocked_team);
        if (crew) metrics.crews_impacted.add(crew.id);
      }

      // Avg response time
      if (rfi.response_days_actual) {
        totalResponseDays += rfi.response_days_actual;
        responseCount++;
      }
    });

    if (responseCount > 0) {
      metrics.avg_response_days = (totalResponseDays / responseCount).toFixed(1);
    }

    metrics.crews_impacted = metrics.crews_impacted.size;

    return metrics;
  }, [rfis, tasks, crews]);

  const rfisByType = useMemo(() => {
    const typeMap = {};
    rfis.forEach(rfi => {
      const type = rfi.rfi_type || 'other';
      if (!typeMap[type]) typeMap[type] = 0;
      typeMap[type]++;
    });
    return typeMap;
  }, [rfis]);

  const costRiskRFIs = useMemo(() => {
    return rfis.filter(rfi => rfi.cost_impact === 'yes').sort((a, b) => (b.estimated_cost_impact || 0) - (a.estimated_cost_impact || 0));
  }, [rfis]);

  const scheduleRiskRFIs = useMemo(() => {
    return rfis.filter(rfi => rfi.schedule_impact === 'yes').sort((a, b) => (b.schedule_impact_days || 0) - (a.schedule_impact_days || 0));
  }, [rfis]);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4">
            <div className="text-xs text-zinc-500 uppercase font-bold">Total RFIs</div>
            <div className="text-2xl font-bold text-white mt-1">{impactMetrics.total_rfis}</div>
            <div className="text-xs text-zinc-500 mt-1">{impactMetrics.open_rfis} open</div>
          </CardContent>
        </Card>

        <Card className={`bg-zinc-900 border-zinc-800 ${impactMetrics.critical_blockers > 0 ? 'border-red-600' : ''}`}>
          <CardContent className="pt-4">
            <div className="text-xs text-red-400 uppercase font-bold flex items-center gap-1">
              <AlertTriangle size={12} /> Critical
            </div>
            <div className={`text-2xl font-bold mt-1 ${impactMetrics.critical_blockers > 0 ? 'text-red-500' : 'text-zinc-500'}`}>
              {impactMetrics.critical_blockers}
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-zinc-900 border-zinc-800 ${impactMetrics.overdue_count > 0 ? 'border-orange-600' : ''}`}>
          <CardContent className="pt-4">
            <div className="text-xs text-orange-400 uppercase font-bold flex items-center gap-1">
              <Clock size={12} /> Overdue
            </div>
            <div className={`text-2xl font-bold mt-1 ${impactMetrics.overdue_count > 0 ? 'text-orange-500' : 'text-zinc-500'}`}>
              {impactMetrics.overdue_count}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4">
            <div className="text-xs text-blue-400 uppercase font-bold">Avg Response</div>
            <div className="text-2xl font-bold text-white mt-1">{impactMetrics.avg_response_days || '—'}</div>
            <div className="text-xs text-zinc-500 mt-1">days</div>
          </CardContent>
        </Card>
      </div>

      {/* Work Impact */}
      <div className="grid grid-cols-3 gap-2">
        <Card className={`bg-zinc-900 border-zinc-800 ${impactMetrics.fab_blocked > 0 ? 'border-red-600' : ''}`}>
          <CardContent className="pt-4">
            <div className="text-xs text-zinc-400 uppercase font-bold">Fabrication Blocked</div>
            <div className={`text-2xl font-bold mt-1 ${impactMetrics.fab_blocked > 0 ? 'text-red-500' : 'text-zinc-500'}`}>
              {impactMetrics.fab_blocked}
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-zinc-900 border-zinc-800 ${impactMetrics.erection_blocked > 0 ? 'border-red-600' : ''}`}>
          <CardContent className="pt-4">
            <div className="text-xs text-zinc-400 uppercase font-bold">Erection Blocked</div>
            <div className={`text-2xl font-bold mt-1 ${impactMetrics.erection_blocked > 0 ? 'text-red-500' : 'text-zinc-500'}`}>
              {impactMetrics.erection_blocked}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-4">
            <div className="text-xs text-zinc-400 uppercase font-bold flex items-center gap-1">
              <Users size={12} /> Crews Waiting
            </div>
            <div className="text-2xl font-bold text-orange-500 mt-1">
              {impactMetrics.crews_impacted}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Impact RFIs */}
      {costRiskRFIs.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown size={16} className="text-red-500" />
              RFIs with Cost Impact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {costRiskRFIs.slice(0, 3).map(rfi => (
              <div key={rfi.id} className="flex items-center justify-between p-2 bg-zinc-800 rounded text-sm">
                <div>
                  <div className="font-semibold text-white">RFI #{rfi.rfi_number}: {rfi.subject}</div>
                  <div className="text-xs text-zinc-500">{rfi.rfi_type}</div>
                </div>
                <Badge className="bg-red-700">
                  ${rfi.estimated_cost_impact?.toLocaleString() || '?'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Schedule Impact RFIs */}
      {scheduleRiskRFIs.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock size={16} className="text-yellow-500" />
              RFIs with Schedule Impact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {scheduleRiskRFIs.slice(0, 3).map(rfi => (
              <div key={rfi.id} className="flex items-center justify-between p-2 bg-zinc-800 rounded text-sm">
                <div>
                  <div className="font-semibold text-white">RFI #{rfi.rfi_number}: {rfi.subject}</div>
                  <div className="text-xs text-zinc-500">{rfi.rfi_type}</div>
                </div>
                <Badge className="bg-yellow-700">
                  +{rfi.schedule_impact_days || 0}d
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* RFI Type Breakdown */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm">RFIs by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(rfisByType).map(([type, count]) => (
              <Badge key={type} variant="outline" className="text-xs">
                {type}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}