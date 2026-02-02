import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertTriangle, Clock, CheckCircle2, Activity } from 'lucide-react';

export default function RFIPortfolioKPIs({ rfis, allRFIs, projects, projectMetrics }) {
  const kpis = useMemo(() => {
    const now = new Date();
    
    const total = rfis.length;
    const open = rfis.filter(r => !['closed', 'answered'].includes(r.status)).length;
    const closed = rfis.filter(r => ['closed', 'answered'].includes(r.status)).length;
    const highPriority = rfis.filter(r => ['high', 'critical'].includes(r.priority)).length;
    const blockers = rfis.filter(r => r.blocker_info?.is_blocker).length;
    
    const overdue = rfis.filter(r => 
      r.due_date && 
      new Date(r.due_date) < now && 
      !['closed', 'answered'].includes(r.status)
    ).length;
    
    const awaitingResponse = rfis.filter(r => 
      ['submitted', 'under_review'].includes(r.status)
    ).length;
    
    // Average response time (closed RFIs only)
    const closedWithDates = rfis.filter(r => 
      ['closed', 'answered'].includes(r.status) && 
      r.submitted_date && 
      r.response_date
    );
    
    let avgResponseTime = 0;
    if (closedWithDates.length > 0) {
      const totalDays = closedWithDates.reduce((sum, r) => {
        const days = Math.floor((new Date(r.response_date) - new Date(r.submitted_date)) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      avgResponseTime = Math.round(totalDays / closedWithDates.length);
    }
    
    // Aging buckets
    const aging = {
      '1-7': 0,
      '8-14': 0,
      '15-30': 0,
      '30+': 0
    };
    
    rfis.forEach(r => {
      if (!r.submitted_date || ['closed', 'answered'].includes(r.status)) return;
      const daysSince = Math.floor((now - new Date(r.submitted_date)) / (1000 * 60 * 60 * 24));
      
      if (daysSince <= 7) aging['1-7']++;
      else if (daysSince <= 14) aging['8-14']++;
      else if (daysSince <= 30) aging['15-30']++;
      else aging['30+']++;
    });
    
    // Trend (last 30 days vs previous 30 days)
    const last30 = new Date();
    last30.setDate(now.getDate() - 30);
    const prev60 = new Date();
    prev60.setDate(now.getDate() - 60);
    
    const recentRFIs = allRFIs.filter(r => new Date(r.created_date) >= last30).length;
    const previousRFIs = allRFIs.filter(r => {
      const date = new Date(r.created_date);
      return date >= prev60 && date < last30;
    }).length;
    
    const trendPercent = previousRFIs > 0 
      ? Math.round(((recentRFIs - previousRFIs) / previousRFIs) * 100)
      : 0;
    
    return {
      total,
      open,
      closed,
      highPriority,
      blockers,
      overdue,
      awaitingResponse,
      avgResponseTime,
      aging,
      trendPercent,
      recentRFIs
    };
  }, [rfis, allRFIs]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {/* Total */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-zinc-500 uppercase font-bold">Total</p>
            <Activity size={14} className="text-zinc-600" />
          </div>
          <p className="text-2xl font-bold text-white">{kpis.total}</p>
        </CardContent>
      </Card>

      {/* Open */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-zinc-500 uppercase font-bold">Open</p>
            <Clock size={14} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-500">{kpis.open}</p>
        </CardContent>
      </Card>

      {/* Closed */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-zinc-500 uppercase font-bold">Closed</p>
            <CheckCircle2 size={14} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-500">{kpis.closed}</p>
        </CardContent>
      </Card>

      {/* High Priority */}
      <Card className={`bg-zinc-900 border-zinc-800 ${kpis.highPriority > 0 ? 'border-red-800' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-zinc-500 uppercase font-bold">High Pri</p>
            <AlertTriangle size={14} className="text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-500">{kpis.highPriority}</p>
        </CardContent>
      </Card>

      {/* Blockers */}
      <Card className={`bg-zinc-900 border-zinc-800 ${kpis.blockers > 0 ? 'border-red-800' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-zinc-500 uppercase font-bold">Blockers</p>
            <AlertTriangle size={14} className="text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-500">{kpis.blockers}</p>
        </CardContent>
      </Card>

      {/* Overdue */}
      <Card className={`bg-zinc-900 border-zinc-800 ${kpis.overdue > 0 ? 'border-amber-800' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-zinc-500 uppercase font-bold">Overdue</p>
            <Clock size={14} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-500">{kpis.overdue}</p>
        </CardContent>
      </Card>

      {/* Awaiting */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-zinc-500 uppercase font-bold">Awaiting</p>
            <Clock size={14} className="text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-yellow-500">{kpis.awaitingResponse}</p>
        </CardContent>
      </Card>

      {/* Avg Response Time */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-zinc-500 uppercase font-bold">Avg Time</p>
            <TrendingUp size={14} className="text-zinc-600" />
          </div>
          <p className="text-2xl font-bold text-white">{kpis.avgResponseTime}d</p>
        </CardContent>
      </Card>

      {/* Aging Buckets - Condensed */}
      <Card className="bg-zinc-900 border-zinc-800 col-span-2 md:col-span-4">
        <CardContent className="p-4">
          <p className="text-xs text-zinc-500 uppercase font-bold mb-2">Aging (Open RFIs)</p>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <p className="text-lg font-bold text-green-500">{kpis.aging['1-7']}</p>
              <p className="text-xs text-zinc-600">1-7d</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-yellow-500">{kpis.aging['8-14']}</p>
              <p className="text-xs text-zinc-600">8-14d</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-500">{kpis.aging['15-30']}</p>
              <p className="text-xs text-zinc-600">15-30d</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-500">{kpis.aging['30+']}</p>
              <p className="text-xs text-zinc-600">30+d</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 30-Day Trend */}
      <Card className="bg-zinc-900 border-zinc-800 col-span-2">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-zinc-500 uppercase font-bold">30d Trend</p>
            {kpis.trendPercent > 0 ? (
              <TrendingUp size={14} className="text-red-500" />
            ) : (
              <TrendingDown size={14} className="text-green-500" />
            )}
          </div>
          <p className="text-2xl font-bold text-white">{kpis.recentRFIs}</p>
          <p className={`text-xs font-mono ${kpis.trendPercent > 0 ? 'text-red-500' : 'text-green-500'}`}>
            {kpis.trendPercent > 0 ? '+' : ''}{kpis.trendPercent}%
          </p>
        </CardContent>
      </Card>
    </div>
  );
}