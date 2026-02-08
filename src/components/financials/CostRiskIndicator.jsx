import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import CostRiskDrilldown from './CostRiskDrilldown';

export default function CostRiskIndicator({ 
  projectId,
  expenses = [],
  estimatedCosts = []
}) {
  const [showDrilldown, setShowDrilldown] = useState(false);
  
  const { data: analysis, isLoading, error } = useQuery({
    queryKey: ['cost-risk-signal', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      try {
        const response = await apiClient.functions.invoke('getCostRiskSignal', { project_id: projectId });
        return response.data;
      } catch (err) {
        console.error('Cost risk signal error:', err);
        return null;
      }
    },
    enabled: !!projectId,
    retry: false
  });

  if (isLoading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading cost risk analysis...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !analysis) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Cost risk data unavailable</p>
        </CardContent>
      </Card>
    );
  }

  const getIconAndColors = () => {
    if (analysis.risk_level === 'green') {
      return {
        icon: CheckCircle,
        iconColor: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30'
      };
    } else if (analysis.risk_level === 'yellow') {
      return {
        icon: AlertCircle,
        iconColor: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30'
      };
    } else {
      return {
        icon: AlertTriangle,
        iconColor: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30'
      };
    }
  };

  const { icon: Icon, iconColor, bgColor, borderColor } = getIconAndColors();

  return (
    <>
      <Card 
        className={cn(bgColor, borderColor, 'cursor-pointer hover:shadow-lg transition-shadow')}
        onClick={() => setShowDrilldown(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Cost Risk Status</CardTitle>
            <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full", bgColor, borderColor, 'border')}>
              <Icon size={16} className={iconColor} />
              <span className={cn("font-semibold text-sm", iconColor)}>
                {analysis.status_label}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{analysis.message}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Planned Margin</p>
              <p className="text-lg font-bold">{analysis.planned_margin_percent.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Projected Margin</p>
              <p className={cn("text-lg font-bold", iconColor)}>
                {analysis.projected_margin_percent.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Variance</p>
              <p className={cn("text-lg font-bold", iconColor)}>
                {analysis.margin_variance >= 0 ? '+' : ''}{analysis.margin_variance.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Contract</span>
              <span className="font-semibold">${analysis.total_contract.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Actual Cost to Date</span>
              <span className="font-semibold text-red-400">${analysis.actual_cost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Est Cost at Completion</span>
              <span className={cn("font-semibold", iconColor)}>
                ${analysis.estimated_cost_at_completion.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-border">
              <span className="text-muted-foreground">Projected Final Margin</span>
              <span className={cn("font-bold", iconColor)}>
                ${analysis.projected_margin.toLocaleString()}
              </span>
            </div>
          </div>

          {analysis.drivers && analysis.drivers.length > 0 && (
            <div className={cn(
              "p-3 rounded text-xs border",
              analysis.risk_level === 'red' ? 'bg-red-500/10 border-red-500/30' :
              analysis.risk_level === 'yellow' ? 'bg-amber-500/5 border-amber-500/20' :
              'bg-blue-500/5 border-blue-500/20'
            )}>
              <p className={cn(
                "font-semibold mb-2",
                analysis.risk_level === 'red' ? 'text-red-400' :
                analysis.risk_level === 'yellow' ? 'text-amber-400' :
                'text-blue-400'
              )}>
                Risk Drivers:
              </p>
              <ul className="space-y-1.5">
                {analysis.drivers.map((driver, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className={cn(
                      "inline-block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                      driver.severity === 'high' ? 'bg-red-400' : 'bg-amber-400'
                    )} />
                    <span className="text-muted-foreground flex-1">
                      {driver.description}
                      {driver.affected_sov && (
                        <span className="ml-1 font-mono text-xs">({driver.affected_sov})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-2 pt-2 border-t border-border/50">
                Click card for detailed cost breakdown
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <CostRiskDrilldown
        open={showDrilldown}
        onOpenChange={setShowDrilldown}
        expenses={expenses}
        estimatedCosts={estimatedCosts}
        totalContract={analysis.total_contract}
        actualCost={analysis.actual_cost}
        estimatedCostAtCompletion={analysis.estimated_cost_at_completion}
      />
    </>
  );
}