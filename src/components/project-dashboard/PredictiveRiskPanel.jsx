import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, DollarSign, Clock, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PredictiveRiskPanel({ projectId }) {
  const [expandedRisk, setExpandedRisk] = React.useState(null);

  const { data: predictions, isLoading } = useQuery({
    queryKey: ['risk-predictions', projectId],
    queryFn: async () => {
      const response = await base44.functions.invoke('predictProjectRisks', { project_id: projectId });
      return response.data;
    },
    enabled: !!projectId,
    refetchInterval: 300000 // 5 min
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!predictions?.predictions?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            No Predicted Risks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Current project performance is within acceptable parameters. No significant risks detected.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { predictions: risks, summary } = predictions;

  const riskTypeLabels = {
    fabrication_rework: 'Fabrication Rework',
    erection_sequence_conflict: 'Erection Sequence Conflict',
    budget_overrun: 'Budget Overrun',
    schedule_delay: 'Schedule Delay',
    quality_issues: 'Quality Issues'
  };

  const riskTypeIcons = {
    fabrication_rework: AlertTriangle,
    erection_sequence_conflict: TrendingUp,
    budget_overrun: DollarSign,
    schedule_delay: Clock,
    quality_issues: AlertTriangle
  };

  return (
    <div className="space-y-4">
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Risks</p>
              <p className="text-2xl font-bold">{summary.total_risks}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Critical</p>
              <p className="text-2xl font-bold text-red-500">{summary.critical_risks}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">$ Exposure</p>
              <p className="text-2xl font-bold">${(summary.total_exposure_dollars / 1000).toFixed(0)}K</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Days at Risk</p>
              <p className="text-2xl font-bold">{summary.total_exposure_days}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {risks.map((risk, idx) => {
          const Icon = riskTypeIcons[risk.risk_type] || AlertTriangle;
          const isExpanded = expandedRisk === idx;

          return (
            <Card 
              key={idx}
              className={cn(
                "transition-all",
                risk.severity === 'critical' && "border-red-500/30 bg-red-500/5",
                risk.severity === 'high' && "border-amber-500/30 bg-amber-500/5"
              )}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className={cn(
                      "w-5 h-5 mt-0.5",
                      risk.severity === 'critical' && "text-red-500",
                      risk.severity === 'high' && "text-amber-500"
                    )} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base">
                          {riskTypeLabels[risk.risk_type]}
                        </CardTitle>
                        <Badge variant={risk.severity === 'critical' ? 'destructive' : 'default'}>
                          {risk.likelihood}% likely
                        </Badge>
                        <Badge variant="outline">
                          {risk.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{risk.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedRisk(isExpanded ? null : idx)}>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 space-y-4">
                  {/* Impact */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                    {risk.impact_dollars > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Cost Impact</p>
                        <p className="text-lg font-bold">${(risk.impact_dollars / 1000).toFixed(0)}K</p>
                      </div>
                    )}
                    {risk.impact_days > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Schedule Impact</p>
                        <p className="text-lg font-bold">{risk.impact_days} days</p>
                      </div>
                    )}
                    {risk.impact_percent && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Budget Variance</p>
                        <p className="text-lg font-bold">{risk.impact_percent.toFixed(1)}%</p>
                      </div>
                    )}
                  </div>

                  {/* Indicators */}
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Risk Indicators</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(risk.indicators).map(([key, value]) => (
                        <div key={key} className="flex justify-between p-2 bg-muted/30 rounded">
                          <span className="text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                          <span className="font-bold">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mitigation Strategies */}
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Mitigation Strategies</p>
                    <div className="space-y-2">
                      {risk.mitigation_strategies.map((strategy, sIdx) => (
                        <div key={sIdx} className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-sm font-medium flex-1">{strategy.strategy}</p>
                            <Badge variant="outline" className="ml-2">
                              {strategy.success_rate}% success
                            </Badge>
                          </div>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>Cost: ${Math.abs(strategy.cost).toLocaleString()}</span>
                            <span>Time: {strategy.time_impact > 0 ? '+' : ''}{strategy.time_impact} days</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}