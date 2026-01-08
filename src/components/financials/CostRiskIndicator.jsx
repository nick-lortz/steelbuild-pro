import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, AlertCircle, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import CostRiskDrilldown from './CostRiskDrilldown';

export default function CostRiskIndicator({ 
  totalContract, 
  actualCost, 
  estimatedCostAtCompletion, 
  plannedMarginPercent = 15, // Default industry standard
  expenses = [],
  estimatedCosts = []
}) {
  const [showDrilldown, setShowDrilldown] = useState(false);
  const analysis = useMemo(() => {
    const projectedMargin = totalContract - estimatedCostAtCompletion;
    const projectedMarginPercent = totalContract > 0 ? (projectedMargin / totalContract) * 100 : 0;
    const marginVariance = projectedMarginPercent - plannedMarginPercent;
    
    // Risk tier determination
    let status, statusLabel, icon, iconColor, bgColor, borderColor, message;
    
    if (marginVariance >= -2) {
      status = 'green';
      statusLabel = 'On Track';
      icon = CheckCircle;
      iconColor = 'text-green-400';
      bgColor = 'bg-green-500/10';
      borderColor = 'border-green-500/30';
      message = 'Cost performance on track';
    } else if (marginVariance >= -5) {
      status = 'yellow';
      statusLabel = 'Watch Closely';
      icon = AlertCircle;
      iconColor = 'text-amber-400';
      bgColor = 'bg-amber-500/10';
      borderColor = 'border-amber-500/30';
      message = 'Cost risk emerging – review labor & materials';
    } else {
      status = 'red';
      statusLabel = 'Overrun Likely';
      icon = AlertTriangle;
      iconColor = 'text-red-400';
      bgColor = 'bg-red-500/10';
      borderColor = 'border-red-500/30';
      message = 'Overrun projected – action required';
    }

    // Cost burn rate
    const percentComplete = totalContract > 0 ? (actualCost / estimatedCostAtCompletion) * 100 : 0;
    
    return {
      projectedMargin,
      projectedMarginPercent,
      plannedMarginPercent,
      marginVariance,
      status,
      statusLabel,
      icon: icon,
      iconColor,
      bgColor,
      borderColor,
      message,
      percentComplete,
      estimatedCostAtCompletion
    };
  }, [totalContract, actualCost, estimatedCostAtCompletion, plannedMarginPercent]);

  const Icon = analysis.icon;

  return (
    <>
      <Card 
        className={cn(analysis.bgColor, analysis.borderColor, 'cursor-pointer hover:shadow-lg transition-shadow')}
        onClick={() => setShowDrilldown(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
          <CardTitle className="text-base">Cost Risk Status</CardTitle>
          <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full", analysis.bgColor, analysis.borderColor, 'border')}>
            <Icon size={16} className={analysis.iconColor} />
            <span className={cn("font-semibold text-sm", analysis.iconColor)}>
              {analysis.statusLabel}
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
            <p className="text-lg font-bold">{analysis.plannedMarginPercent.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Projected Margin</p>
            <p className={cn("text-lg font-bold", analysis.iconColor)}>
              {analysis.projectedMarginPercent.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Variance</p>
            <p className={cn("text-lg font-bold", analysis.iconColor)}>
              {analysis.marginVariance >= 0 ? '+' : ''}{analysis.marginVariance.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-3 border-t border-border">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Contract</span>
            <span className="font-semibold">${totalContract.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Actual Cost to Date</span>
            <span className="font-semibold text-red-400">${actualCost.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Est Cost at Completion</span>
            <span className={cn("font-semibold", analysis.iconColor)}>
              ${analysis.estimatedCostAtCompletion.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-border">
            <span className="text-muted-foreground">Projected Final Margin</span>
            <span className={cn("font-bold", analysis.iconColor)}>
              ${analysis.projectedMargin.toLocaleString()}
            </span>
          </div>
        </div>

        {analysis.status === 'yellow' && (
          <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded text-xs">
            <p className="font-semibold text-amber-400 mb-1">Recommended Actions:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li>Review labor hours vs schedule</li>
              <li>Verify material costs and commitments</li>
              <li>Check for scope gaps or hidden costs</li>
            </ul>
          </div>
        )}

        {analysis.status === 'red' && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs">
            <p className="font-semibold text-red-400 mb-1">Immediate Actions Required:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li>Identify cost drivers immediately</li>
              <li>Review change order opportunities</li>
              <li>Escalate to leadership for mitigation plan</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>

    <CostRiskDrilldown
      open={showDrilldown}
      onOpenChange={setShowDrilldown}
      expenses={expenses}
      estimatedCosts={estimatedCosts}
      totalContract={totalContract}
      actualCost={actualCost}
      estimatedCostAtCompletion={estimatedCostAtCompletion}
    />
    </>
  );
}