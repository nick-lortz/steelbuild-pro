import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, RefreshCw, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const IMPACT_COLORS = {
  Rework: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  InstallBlocked: 'bg-red-500/20 text-red-400 border-red-500/30',
  DeliveryWaste: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  FabSlip: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  EquipmentIdle: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
};

export default function MarginRiskWidget({ projectId }) {
  const queryClient = useQueryClient();

  const { data: snapshot, isLoading } = useQuery({
    queryKey: ['margin-snapshot', projectId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const snapshots = await base44.entities.InstallMarginSnapshot.filter({
        project_id: projectId,
        snapshot_date: today
      });
      return snapshots[0] || null;
    },
    enabled: !!projectId,
    refetchInterval: 60000 // Refresh every minute
  });

  const { data: activeRisks = [] } = useQuery({
    queryKey: ['active-margin-risks', projectId],
    queryFn: () => base44.entities.MarginRiskEvent.filter({
      project_id: projectId,
      risk_status: 'Active'
    }),
    enabled: !!projectId
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      return await base44.functions.invoke('calculateMarginRisk', { project_id: projectId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['margin-snapshot', projectId] });
      queryClient.invalidateQueries({ queryKey: ['active-margin-risks', projectId] });
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Install Margin Risk</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zinc-500">Loading margin data...</div>
        </CardContent>
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Install Margin Risk</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">No margin data calculated yet.</p>
            <Button
              size="sm"
              onClick={() => recalculateMutation.mutate()}
              disabled={recalculateMutation.isPending}
            >
              <RefreshCw size={14} className="mr-2" />
              Calculate Margin Risk
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const marginDelta = snapshot.current_margin_percent - snapshot.projected_margin_percent;
  const isAtRisk = snapshot.margin_at_risk_dollars > 1000;

  return (
    <Card className={cn(
      "border-l-4 transition-all",
      isAtRisk ? "border-l-red-500" : "border-l-green-500"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          {isAtRisk && <AlertTriangle size={18} className="text-red-400" />}
          Install Margin Risk
        </CardTitle>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => recalculateMutation.mutate()}
          disabled={recalculateMutation.isPending}
        >
          <RefreshCw size={14} className={recalculateMutation.isPending ? 'animate-spin' : ''} />
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Margin Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-zinc-500 mb-1">Current Margin</div>
            <div className="text-2xl font-bold text-green-400">
              {snapshot.current_margin_percent.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">Projected Margin</div>
            <div className={cn(
              "text-2xl font-bold",
              snapshot.projected_margin_percent < snapshot.current_margin_percent ? 'text-red-400' : 'text-green-400'
            )}>
              {snapshot.projected_margin_percent.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* At Risk Amount */}
        {isAtRisk && (
          <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-red-400 mb-1">Margin at Risk</div>
                <div className="text-xl font-bold text-red-400">
                  ${snapshot.margin_at_risk_dollars.toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-1 text-red-400">
                <TrendingDown size={16} />
                <span className="text-sm font-medium">-{marginDelta.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Active Risk Drivers */}
        {snapshot.top_drivers && snapshot.top_drivers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Top Risk Drivers
              </div>
              <Badge variant="outline" className="text-xs">
                {snapshot.risk_event_count} Active
              </Badge>
            </div>
            
            <div className="space-y-2">
              {snapshot.top_drivers.map((driver, idx) => (
                <div 
                  key={idx}
                  className="flex items-start justify-between gap-2 p-2 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn("text-xs", IMPACT_COLORS[driver.category])}>
                        {driver.category}
                      </Badge>
                    </div>
                    <div className="text-sm text-zinc-300 truncate">
                      {driver.description}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-red-400 whitespace-nowrap">
                    -${driver.impact.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
          <div>
            <div className="text-xs text-zinc-500 mb-1">Earned Revenue</div>
            <div className="text-sm font-semibold text-zinc-300">
              ${snapshot.earned_revenue.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">Actual Cost</div>
            <div className="text-sm font-semibold text-zinc-300">
              ${snapshot.actual_install_cost.toLocaleString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}