import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, Clock, TrendingUp, RefreshCw, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function DeliveryRiskDashboard({ projectId }) {
  const queryClient = useQueryClient();

  const { data: risks = [] } = useQuery({
    queryKey: ['delivery-risks', projectId],
    queryFn: () => base44.entities.DeliveryRiskEvent.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const computeMutation = useMutation({
    mutationFn: () => base44.functions.invoke('computeDeliveryRisk', { project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-risks', projectId] });
    }
  });

  // Calculate summary
  const critical = risks.filter(r => r.severity === 'critical');
  const high = risks.filter(r => r.severity === 'high');
  const totalCost = risks.reduce((sum, r) => sum + (r.total_cost_impact || 0), 0);

  // Group by type
  const byType = {
    early_storage: { risks: [], cost: 0 },
    crew_idle: { risks: [], cost: 0 },
    double_handling: { risks: [], cost: 0 },
    sequencing: { risks: [], cost: 0 },
    late_critical: { risks: [], cost: 0 }
  };

  for (const risk of risks) {
    if (byType[risk.risk_type]) {
      byType[risk.risk_type].risks.push(risk);
      byType[risk.risk_type].cost += risk.total_cost_impact || 0;
    }
  }

  const riskTypeConfig = {
    early_storage: { label: 'Early Storage', icon: Package, color: 'text-amber-400' },
    crew_idle: { label: 'Crew Idle', icon: Clock, color: 'text-red-400' },
    double_handling: { label: 'Double Handling', icon: TrendingUp, color: 'text-orange-400' },
    sequencing: { label: 'Out of Sequence', icon: AlertTriangle, color: 'text-red-400' },
    late_critical: { label: 'Critical Late', icon: Truck, color: 'text-red-500' }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Delivery Risk Analysis</h2>
          <p className="text-sm text-zinc-500">Storage, idle crew, and sequencing risks</p>
        </div>
        <Button
          onClick={() => computeMutation.mutate()}
          disabled={computeMutation.isPending}
        >
          <RefreshCw size={16} className={cn("mr-2", computeMutation.isPending && "animate-spin")} />
          Analyze
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-500" />
              <span className="text-xs text-zinc-500">Critical</span>
            </div>
            <div className="text-2xl font-bold text-red-400">{critical.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-amber-400" />
              <span className="text-xs text-zinc-500">High Risk</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">{high.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package size={16} className="text-blue-400" />
              <span className="text-xs text-zinc-500">Total Risks</span>
            </div>
            <div className="text-2xl font-bold text-white">{risks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-green-400" />
              <span className="text-xs text-zinc-500">Cost Impact</span>
            </div>
            <div className="text-2xl font-bold text-white">${totalCost.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* By Risk Type */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(byType).map(([type, data]) => {
              if (data.risks.length === 0) return null;
              const config = riskTypeConfig[type];
              const Icon = config.icon;

              return (
                <div 
                  key={type}
                  className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-zinc-800"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} className={config.color} />
                    <div>
                      <div className="font-medium text-white">{config.label}</div>
                      <div className="text-xs text-zinc-500">
                        {data.risks.length} deliveries affected
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-400">
                      ${data.cost.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Critical Risks Detail */}
      {critical.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              Critical Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {critical.map(risk => (
                <RiskCard key={risk.id} risk={risk} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* High Risks */}
      {high.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400" />
              High Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {high.slice(0, 10).map(risk => (
                <RiskCard key={risk.id} risk={risk} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RiskCard({ risk }) {
  const severityColors = {
    critical: 'border-red-500/50 bg-red-950/20',
    high: 'border-amber-500/50 bg-amber-950/20',
    medium: 'border-yellow-500/50 bg-yellow-950/20',
    low: 'border-zinc-700 bg-zinc-900/30'
  };

  return (
    <div className={cn(
      "p-3 rounded-lg border",
      severityColors[risk.severity]
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {risk.risk_type.replace(/_/g, ' ')}
          </Badge>
          <Badge className={cn(
            "text-xs",
            risk.severity === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
            risk.severity === 'high' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
            'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
          )}>
            {risk.severity}
          </Badge>
        </div>
        <div className="text-sm font-bold text-red-400">
          ${risk.total_cost_impact.toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-zinc-500">Scheduled: </span>
          <span className="text-white">{format(new Date(risk.scheduled_delivery_date), 'MMM d')}</span>
        </div>
        <div>
          <span className="text-zinc-500">Erection: </span>
          <span className="text-white">{format(new Date(risk.erection_start_date), 'MMM d')}</span>
        </div>
        {risk.days_early > 0 && (
          <div>
            <span className="text-zinc-500">Days Early: </span>
            <span className="text-amber-400">{risk.days_early}d</span>
          </div>
        )}
        {risk.days_late > 0 && (
          <div>
            <span className="text-zinc-500">Days Late: </span>
            <span className="text-red-400">{risk.days_late}d</span>
          </div>
        )}
        <div>
          <span className="text-zinc-500">Tonnage: </span>
          <span className="text-white">{risk.tonnage_affected}T</span>
        </div>
        {risk.crew_affected && (
          <div>
            <span className="text-zinc-500">Crew: </span>
            <span className="text-white">{risk.crew_affected}</span>
          </div>
        )}
      </div>

      {risk.notes && (
        <div className="mt-2 pt-2 border-t border-zinc-800 text-xs text-zinc-400">
          {risk.notes}
        </div>
      )}
    </div>
  );
}