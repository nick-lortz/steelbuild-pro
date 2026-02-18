import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, DollarSign, RefreshCw, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function ResponseLagDashboard({ projectId }) {
  const queryClient = useQueryClient();
  const [useBizDays, setUseBizDays] = useState(true);

  const { data: lagEvents = [] } = useQuery({
    queryKey: ['response-lags', projectId],
    queryFn: () => base44.entities.ResponseLagEvent.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const computeMutation = useMutation({
    mutationFn: () => base44.functions.invoke('computeResponseLag', { 
      project_id: projectId,
      use_business_days: useBizDays
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['response-lags', projectId] });
    }
  });

  // Calculate summary stats
  const pending = lagEvents.filter(l => l.status === 'pending');
  const overdue = lagEvents.filter(l => l.is_overdue && l.status !== 'responded');
  const totalCostExposure = lagEvents.reduce((sum, l) => sum + (l.cost_exposure || 0), 0);
  const totalFloatConsumed = lagEvents.reduce((sum, l) => sum + (l.float_consumed_days || 0), 0);

  // Group by responsible party
  const byParty = {};
  for (const lag of lagEvents) {
    const party = lag.responsible_party || 'unknown';
    if (!byParty[party]) {
      byParty[party] = {
        count: 0,
        total_lag: 0,
        cost_exposure: 0,
        overdue_count: 0,
        events: []
      };
    }
    byParty[party].count++;
    byParty[party].total_lag += lag.lag_days || 0;
    byParty[party].cost_exposure += lag.cost_exposure || 0;
    if (lag.is_overdue && lag.status !== 'responded') {
      byParty[party].overdue_count++;
    }
    byParty[party].events.push(lag);
  }

  // Calculate averages and sort by cost exposure
  const partyStats = Object.entries(byParty).map(([party, stats]) => ({
    party,
    ...stats,
    avg_lag: stats.total_lag / stats.count
  })).sort((a, b) => b.cost_exposure - a.cost_exposure);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Response Lag Analysis</h2>
          <p className="text-sm text-zinc-500">External party accountability tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={useBizDays ? 'default' : 'outline'}
            onClick={() => setUseBizDays(!useBizDays)}
          >
            {useBizDays ? 'Business Days' : 'Calendar Days'}
          </Button>
          <Button
            onClick={() => computeMutation.mutate()}
            disabled={computeMutation.isPending}
          >
            <RefreshCw size={16} className={cn("mr-2", computeMutation.isPending && "animate-spin")} />
            Update
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-amber-400" />
              <span className="text-xs text-zinc-500">Pending</span>
            </div>
            <div className="text-2xl font-bold text-white">{pending.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="text-xs text-zinc-500">Overdue</span>
            </div>
            <div className="text-2xl font-bold text-red-400">{overdue.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-blue-400" />
              <span className="text-xs text-zinc-500">Float Consumed</span>
            </div>
            <div className="text-2xl font-bold text-white">{totalFloatConsumed}d</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-green-400" />
              <span className="text-xs text-zinc-500">Cost Exposure</span>
            </div>
            <div className="text-2xl font-bold text-white">
              ${totalCostExposure.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By Party Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Lag by Responsible Party</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {partyStats.map(({ party, count, avg_lag, cost_exposure, overdue_count }) => (
              <div 
                key={party}
                className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-zinc-800"
              >
                <div className="flex-1">
                  <div className="font-medium text-white mb-1">{party}</div>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span>{count} items</span>
                    <span>•</span>
                    <span>Avg: {avg_lag.toFixed(1)}d</span>
                    {overdue_count > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-red-400">{overdue_count} overdue</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-red-400">
                    ${cost_exposure.toLocaleString()}
                  </div>
                  <div className="text-xs text-zinc-500">Cost Exposure</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Overdue Items */}
      {overdue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-400" />
              Overdue Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdue.slice(0, 10).map(lag => (
                <div 
                  key={lag.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-red-950/20 border border-red-500/30"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{lag.entity_type}</Badge>
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                        {lag.responsible_party}
                      </Badge>
                    </div>
                    <div className="text-sm text-zinc-400">
                      Submitted {format(new Date(lag.requested_at), 'MMM d, yyyy')}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {lag.lag_days}d elapsed • SLA: {lag.sla_days}d • {lag.float_consumed_days}d float consumed
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-red-400">
                      ${lag.cost_exposure.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}