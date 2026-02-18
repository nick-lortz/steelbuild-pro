import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SequenceExplanation({ pickPlanId }) {
  const { data: computationRuns = [] } = useQuery({
    queryKey: ['sequence-computation', pickPlanId],
    queryFn: () => base44.entities.SequenceComputationRun.filter({
      pick_plan_id: pickPlanId
    }),
    enabled: !!pickPlanId
  });

  const latestRun = computationRuns.sort((a, b) => 
    new Date(b.ran_at) - new Date(a.ran_at)
  )[0];

  if (!latestRun) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-zinc-500">
          Run computation to see explanation
        </CardContent>
      </Card>
    );
  }

  const explain = JSON.parse(latestRun.explain_json || '{}');
  const topDrivers = explain.top_drivers || [];
  const pickBreakdown = explain.pick_breakdown || [];
  const crewModel = explain.crew_model || {};

  return (
    <div className="space-y-6">
      {/* Crew Model Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Crew Model</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-zinc-500 mb-1">Crew Size</div>
              <div className="font-medium">{crewModel.size} workers</div>
            </div>
            <div>
              <div className="text-zinc-500 mb-1">Rate</div>
              <div className="font-medium">${crewModel.rate}/hr</div>
            </div>
            <div>
              <div className="text-zinc-500 mb-1">Efficiency</div>
              <div className="font-medium">{(crewModel.efficiency * 100).toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-zinc-500 mb-1">Tonnage/Hour</div>
              <div className="font-medium">{crewModel.tonnage_per_hour}T</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Cost Drivers */}
      {topDrivers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={16} />
              Top Cost Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topDrivers.map((driver, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      Pick {driver.pick_number}
                    </Badge>
                    <div>
                      <div className="text-sm font-medium text-white">
                        {driver.factor.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-zinc-500">
                        Severity: {driver.severity} • {driver.schedule_impact}h schedule impact
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-red-400">
                    +${Math.round(driver.cost_impact).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pick Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pick-by-Pick Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {pickBreakdown.map((pick, idx) => (
              <div 
                key={idx}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg border",
                  pick.cost_multiplier > 1.2 ? 
                    "bg-red-950/20 border-red-500/30" : 
                    "bg-zinc-900/30 border-zinc-800"
                )}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Badge variant="outline" className="text-xs">
                    #{pick.pick_number}
                  </Badge>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{pick.tonnage}T</span>
                      {pick.cost_multiplier > 1.0 && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                          {pick.cost_multiplier.toFixed(2)}x
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">
                      Base: {pick.base_hours}h → Adjusted: {pick.adjusted_hours}h
                    </div>
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-right font-medium">{pick.crane_hours}h crane</div>
                  {(pick.risk_count > 0 || pick.constraint_count > 0) && (
                    <div className="text-xs text-zinc-500">
                      {pick.risk_count} risks, {pick.constraint_count} constraints
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}