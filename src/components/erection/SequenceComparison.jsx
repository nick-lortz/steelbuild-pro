import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, DollarSign, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SequenceComparison({ projectId }) {
  const queryClient = useQueryClient();
  const [baselineId, setBaselineId] = useState(null);
  const [compareId, setCompareId] = useState(null);

  const { data: pickPlans = [] } = useQuery({
    queryKey: ['pick-plans', projectId],
    queryFn: () => base44.entities.ErectionPickPlan.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: baselinePlan } = useQuery({
    queryKey: ['pick-plan', baselineId],
    queryFn: async () => {
      const plans = await base44.entities.ErectionPickPlan.filter({ id: baselineId });
      return plans[0];
    },
    enabled: !!baselineId
  });

  const { data: comparePlan } = useQuery({
    queryKey: ['pick-plan', compareId],
    queryFn: async () => {
      const plans = await base44.entities.ErectionPickPlan.filter({ id: compareId });
      return plans[0];
    },
    enabled: !!compareId
  });

  const computeMutation = useMutation({
    mutationFn: (pick_plan_id) => base44.functions.invoke('computeSequenceCost', { pick_plan_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pick-plans', projectId] });
      queryClient.invalidateQueries({ queryKey: ['pick-plan'] });
    }
  });

  // Auto-select baseline
  React.useEffect(() => {
    if (!baselineId && pickPlans.length > 0) {
      const baseline = pickPlans.find(p => p.is_baseline) || pickPlans[0];
      setBaselineId(baseline.id);
    }
  }, [pickPlans, baselineId]);

  if (pickPlans.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-zinc-500">
          No pick plans available
        </CardContent>
      </Card>
    );
  }

  const baseline = baselinePlan || pickPlans.find(p => p.id === baselineId);
  const compare = comparePlan || pickPlans.find(p => p.id === compareId);

  const costDelta = compare && baseline ? compare.predicted_cost - baseline.predicted_cost : 0;
  const hoursDelta = compare && baseline ? compare.predicted_install_hours - baseline.predicted_install_hours : 0;
  const craneDelta = compare && baseline ? compare.predicted_crane_hours - baseline.predicted_crane_hours : 0;

  return (
    <div className="space-y-6">
      {/* Selection Controls */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="text-xs text-zinc-500 mb-2 block">Baseline Sequence</label>
          <Select value={baselineId} onValueChange={setBaselineId}>
            <SelectTrigger className="bg-zinc-900 border-zinc-700 h-11">
              <SelectValue placeholder="Select baseline" />
            </SelectTrigger>
            <SelectContent>
              {pickPlans.map(plan => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.sequence_name} {plan.is_baseline && '(Baseline)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-6">
          <ArrowRight className="text-zinc-600" size={24} />
        </div>

        <div className="flex-1">
          <label className="text-xs text-zinc-500 mb-2 block">Compare To</label>
          <Select value={compareId || ''} onValueChange={setCompareId}>
            <SelectTrigger className="bg-zinc-900 border-zinc-700 h-11">
              <SelectValue placeholder="Select sequence" />
            </SelectTrigger>
            <SelectContent>
              {pickPlans.filter(p => p.id !== baselineId).map(plan => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.sequence_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Comparison Results */}
      {baseline && compare && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost & Schedule Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <MetricDelta
                label="Total Cost"
                baseline={baseline.predicted_cost}
                compare={compare.predicted_cost}
                delta={costDelta}
                format="currency"
              />
              <MetricDelta
                label="Install Hours"
                baseline={baseline.predicted_install_hours}
                compare={compare.predicted_install_hours}
                delta={hoursDelta}
                format="hours"
              />
              <MetricDelta
                label="Crane Hours"
                baseline={baseline.predicted_crane_hours}
                compare={compare.predicted_crane_hours}
                delta={craneDelta}
                format="hours"
              />
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => computeMutation.mutate(baseline.id)}
                disabled={computeMutation.isPending}
              >
                <RefreshCw size={14} className={cn("mr-2", computeMutation.isPending && "animate-spin")} />
                Recalc Baseline
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => computeMutation.mutate(compare.id)}
                disabled={computeMutation.isPending}
              >
                <RefreshCw size={14} className={cn("mr-2", computeMutation.isPending && "animate-spin")} />
                Recalc Compare
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Side-by-side breakdown */}
      {baseline && compare && (
        <div className="grid grid-cols-2 gap-4">
          <SequenceCard plan={baseline} title="Baseline" />
          <SequenceCard plan={compare} title="Proposed" isCompare />
        </div>
      )}
    </div>
  );
}

function MetricDelta({ label, baseline, compare, delta, format }) {
  const isPositive = delta > 0;
  const formatValue = (val) => {
    if (format === 'currency') return `$${Math.round(val).toLocaleString()}`;
    if (format === 'hours') return `${Math.round(val * 10) / 10}h`;
    return val;
  };

  return (
    <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/30">
      <div className="text-xs text-zinc-500 mb-2">{label}</div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-sm text-zinc-400">{formatValue(baseline)}</div>
          <div className="text-lg font-bold text-white">{formatValue(compare)}</div>
        </div>
        <div className={cn(
          "flex items-center gap-1 text-sm font-medium",
          isPositive ? "text-red-400" : delta < 0 ? "text-green-400" : "text-zinc-500"
        )}>
          {isPositive ? <TrendingUp size={14} /> : delta < 0 ? <TrendingDown size={14} /> : null}
          {delta !== 0 && formatValue(Math.abs(delta))}
        </div>
      </div>
    </div>
  );
}

function SequenceCard({ plan, title, isCompare }) {
  return (
    <Card className={cn(isCompare && "border-l-4 border-l-blue-500")}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="outline">{plan.sequence_name}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">Picks</span>
          <span className="font-medium">{plan.picks?.length || 0}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">Total Tonnage</span>
          <span className="font-medium">
            {plan.picks?.reduce((sum, p) => sum + (p.tonnage || 0), 0).toFixed(1)}T
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">Install Hours</span>
          <span className="font-medium">{plan.predicted_install_hours}h</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">Crane Hours</span>
          <span className="font-medium">{plan.predicted_crane_hours}h</span>
        </div>
        <div className="pt-3 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Predicted Cost</span>
            <span className="text-lg font-bold text-white">
              ${plan.predicted_cost.toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}