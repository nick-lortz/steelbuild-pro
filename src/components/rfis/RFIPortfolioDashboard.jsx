import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileQuestion, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  TrendingUp,
  Users
} from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

export default function RFIPortfolioDashboard({ rfis, projects }) {
  const metrics = useMemo(() => {
    const total = rfis.length;
    const open = rfis.filter(r => !['answered', 'closed'].includes(r.status)).length;
    const closed = rfis.filter(r => r.status === 'closed').length;
    const answered = rfis.filter(r => r.status === 'answered').length;
    
    // Response time calculation
    const responseTimes = rfis
      .filter(r => r.submitted_date && r.response_date)
      .map(r => differenceInDays(parseISO(r.response_date), parseISO(r.submitted_date)));
    const avgResponseTime = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;
    
    // Aging buckets
    const now = new Date();
    const aging = {
      '1-7': 0,
      '8-14': 0,
      '15-30': 0,
      '30+': 0
    };
    
    rfis.filter(r => !['answered', 'closed'].includes(r.status) && r.submitted_date).forEach(rfi => {
      const days = differenceInDays(now, parseISO(rfi.submitted_date));
      if (days <= 7) aging['1-7']++;
      else if (days <= 14) aging['8-14']++;
      else if (days <= 30) aging['15-30']++;
      else aging['30+']++;
    });
    
    // At risk (overdue by SLA)
    const atRisk = rfis.filter(r => {
      if (['answered', 'closed'].includes(r.status)) return false;
      if (!r.due_date) return false;
      return new Date(r.due_date) < now;
    }).length;
    
    // By ball in court
    const ballInCourt = rfis
      .filter(r => !['answered', 'closed'].includes(r.status))
      .reduce((acc, r) => {
        acc[r.ball_in_court || 'internal'] = (acc[r.ball_in_court || 'internal'] || 0) + 1;
        return acc;
      }, {});
    
    // By priority
    const byPriority = rfis.reduce((acc, r) => {
      acc[r.priority || 'medium'] = (acc[r.priority || 'medium'] || 0) + 1;
      return acc;
    }, {});
    
    // Critical blockers
    const blockers = rfis.filter(r => r.blocker_info?.is_blocker && !['answered', 'closed'].includes(r.status)).length;
    
    return {
      total,
      open,
      closed,
      answered,
      avgResponseTime,
      aging,
      atRisk,
      ballInCourt,
      byPriority,
      blockers
    };
  }, [rfis]);

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <FileQuestion size={14} />
              Total RFIs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <Clock size={14} />
              Open
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">{metrics.open}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <CheckCircle2 size={14} />
              Answered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{metrics.answered}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <TrendingUp size={14} />
              Avg Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.avgResponseTime}</div>
            <div className="text-xs text-muted-foreground">days</div>
          </CardContent>
        </Card>

        <Card className="border-red-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <AlertTriangle size={14} />
              At Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{metrics.atRisk}</div>
          </CardContent>
        </Card>

        <Card className="border-orange-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <AlertTriangle size={14} />
              Blockers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{metrics.blockers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Aging Buckets (Open)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">1-7 days</span>
                <Badge variant="outline">{metrics.aging['1-7']}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">8-14 days</span>
                <Badge variant="outline">{metrics.aging['8-14']}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">15-30 days</span>
                <Badge className="bg-amber-700">{metrics.aging['15-30']}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">30+ days</span>
                <Badge className="bg-red-700">{metrics.aging['30+']}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users size={14} />
              Ball in Court
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(metrics.ballInCourt).map(([party, count]) => (
                <div key={party} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground capitalize">{party}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">By Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(metrics.byPriority).sort((a, b) => {
                const order = { critical: 0, high: 1, medium: 2, low: 3 };
                return order[a[0]] - order[b[0]];
              }).map(([priority, count]) => (
                <div key={priority} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground capitalize">{priority}</span>
                  <Badge className={
                    priority === 'critical' ? 'bg-red-700' :
                    priority === 'high' ? 'bg-orange-700' :
                    priority === 'medium' ? 'bg-blue-700' : 'bg-gray-700'
                  }>
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}