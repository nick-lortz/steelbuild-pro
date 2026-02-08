import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock, DollarSign } from 'lucide-react';
import { parseISO, isAfter } from 'date-fns';

export default function RFITrackingDashboard({ rfis, projects }) {
  const metrics = useMemo(() => {
    const now = new Date();
    
    const stats = {
      total: rfis.length,
      open: rfis.filter(r => ['submitted', 'assigned', 'in_review'].includes(r.status)).length,
      overdue: rfis.filter(r => {
        if (!r.due_date || ['closed', 'void'].includes(r.status)) return false;
        return isAfter(now, parseISO(r.due_date));
      }).length,
      escalated: rfis.filter(r => r.escalation_flag).length,
      answered: rfis.filter(r => r.status === 'answered').length,
      closed: rfis.filter(r => r.status === 'closed').length,
      totalEstimatedImpact: rfis.reduce((sum, r) => sum + (r.estimated_cost_impact || 0), 0),
      avgResponseTime: rfis
        .filter(r => r.response_days_actual)
        .reduce((sum, r, _, arr) => sum + r.response_days_actual / arr.length, 0)
        .toFixed(1),
      slaCompliance: rfis
        .filter(r => ['answered', 'closed'].includes(r.status) && r.response_days_actual)
        .filter(r => r.response_days_actual <= (r.days_to_respond || 5)).length,
      slaTotal: rfis.filter(r => ['answered', 'closed'].includes(r.status) && r.response_days_actual).length
    };

    stats.slaPercent = stats.slaTotal > 0 ? ((stats.slaCompliance / stats.slaTotal) * 100).toFixed(0) : 'N/A';

    return stats;
  }, [rfis]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs uppercase tracking-widest text-zinc-400">Open / Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-white">
            {metrics.open}<span className="text-lg text-zinc-400">/{metrics.total}</span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">{metrics.answered} answered</p>
        </CardContent>
      </Card>

      <Card className={`${metrics.overdue > 0 ? 'bg-red-950/30 border-red-800/50' : 'bg-zinc-900 border-zinc-800'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs uppercase tracking-widest text-zinc-400 flex items-center gap-1">
            <AlertTriangle size={14} className={metrics.overdue > 0 ? 'text-red-400' : ''} />
            Overdue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${metrics.overdue > 0 ? 'text-red-400' : 'text-white'}`}>
            {metrics.overdue}
          </div>
          <p className="text-xs text-zinc-500 mt-1">{metrics.escalated} escalated</p>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs uppercase tracking-widest text-zinc-400 flex items-center gap-1">
            <DollarSign size={14} /> Cost Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-white">
            ${(metrics.totalEstimatedImpact / 1000).toFixed(0)}K
          </div>
          <p className="text-xs text-zinc-500 mt-1">Estimated</p>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs uppercase tracking-widest text-zinc-400 flex items-center gap-1">
            <Clock size={14} /> SLA Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-white">
            {metrics.slaPercent}%
          </div>
          <p className="text-xs text-zinc-500 mt-1">Avg {metrics.avgResponseTime} days</p>
        </CardContent>
      </Card>
    </div>
  );
}