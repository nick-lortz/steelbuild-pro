import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Clock, TrendingUp, FileText, Target } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

export default function RFIHubKPIs({ rfis, groupedRFIs }) {
  const kpis = useMemo(() => {
    const total = rfis.length;
    const open = rfis.filter(r => !['answered', 'closed'].includes(r.status)).length;
    const closed = rfis.filter(r => ['answered', 'closed'].includes(r.status)).length;
    const atRisk = rfis.filter(r => r.is_at_risk).length;
    
    // Average response time for closed RFIs
    const closedWithDates = rfis.filter(r => 
      ['answered', 'closed'].includes(r.status) && 
      r.created_date && 
      r.response_date
    );
    
    let avgResponseTime = 0;
    if (closedWithDates.length > 0) {
      const totalDays = closedWithDates.reduce((sum, r) => {
        const created = parseISO(r.created_date);
        const responded = parseISO(r.response_date);
        return sum + differenceInDays(responded, created);
      }, 0);
      avgResponseTime = Math.round(totalDays / closedWithDates.length);
    }

    const openPercentage = total > 0 ? Math.round((open / total) * 100) : 0;
    const closedPercentage = total > 0 ? Math.round((closed / total) * 100) : 0;

    return {
      total,
      open,
      closed,
      atRisk,
      avgResponseTime,
      openPercentage,
      closedPercentage
    };
  }, [rfis]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Total RFIs</p>
            <FileText size={14} className="text-zinc-600" />
          </div>
          <p className="text-2xl font-bold text-white">{kpis.total}</p>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Open</p>
            <Clock size={14} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-400">{kpis.open}</p>
          <p className="text-xs text-zinc-600 mt-1">{kpis.openPercentage}%</p>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Closed</p>
            <CheckCircle2 size={14} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-400">{kpis.closed}</p>
          <p className="text-xs text-zinc-600 mt-1">{kpis.closedPercentage}%</p>
        </CardContent>
      </Card>

      <Card className={`bg-zinc-900 ${kpis.atRisk > 0 ? 'border-red-800' : 'border-zinc-800'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">At Risk</p>
            <AlertTriangle size={14} className={kpis.atRisk > 0 ? 'text-red-500' : 'text-zinc-600'} />
          </div>
          <p className={`text-2xl font-bold ${kpis.atRisk > 0 ? 'text-red-400' : 'text-white'}`}>
            {kpis.atRisk}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Avg Response</p>
            <TrendingUp size={14} className="text-zinc-600" />
          </div>
          <p className="text-2xl font-bold text-white">{kpis.avgResponseTime}</p>
          <p className="text-xs text-zinc-600 mt-1">days</p>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Awaiting</p>
            <Target size={14} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-400">{groupedRFIs.awaiting.length}</p>
        </CardContent>
      </Card>
    </div>
  );
}