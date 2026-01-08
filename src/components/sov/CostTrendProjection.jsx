import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function CostTrendProjection({ 
  sovItems = [], 
  expenses = [],
  costCodes = [],
  mappings = []
}) {
  const projections = useMemo(() => {
    return sovItems.map(sov => {
      const scheduledValue = sov.scheduled_value || 0;
      const earnedToDate = (scheduledValue * ((sov.percent_complete || 0) / 100));
      
      // Find cost codes mapped to this SOV
      const sovMappings = mappings.filter(m => m.sov_item_id === sov.id);
      
      // Calculate actual cost
      const costCodeBreakdown = sovMappings.map(mapping => {
        const ccExpenses = expenses.filter(e => 
          e.cost_code_id === mapping.cost_code_id &&
          (e.payment_status === 'paid' || e.payment_status === 'approved')
        );
        const actualCost = ccExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        return actualCost * (mapping.allocation_percent / 100);
      });

      // Include unmapped expenses
      const unmappedExpenses = expenses.filter(e => 
        e.sov_code === sov.sov_code &&
        (e.payment_status === 'paid' || e.payment_status === 'approved') &&
        !sovMappings.find(m => m.cost_code_id === e.cost_code_id)
      );
      const unmappedCost = unmappedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      const actualCostToDate = costCodeBreakdown.reduce((sum, c) => sum + c, 0) + unmappedCost;

      // Calculate burn rate and projections
      let costBurnRate = 0;
      let projectedFinalCost = 0;
      let projectedMargin = 0;
      let projectionStatus = 'insufficient_data';
      let trend = 'stable';

      if (earnedToDate > 0) {
        costBurnRate = actualCostToDate / earnedToDate;
        projectedFinalCost = costBurnRate * scheduledValue;
        projectedMargin = scheduledValue - projectedFinalCost;

        const currentMargin = earnedToDate - actualCostToDate;
        const currentMarginPercent = earnedToDate > 0 ? (currentMargin / earnedToDate) * 100 : 0;
        const projectedMarginPercent = scheduledValue > 0 ? (projectedMargin / scheduledValue) * 100 : 0;

        projectionStatus = 'valid';

        // Determine trend
        const marginDelta = projectedMarginPercent - currentMarginPercent;
        if (Math.abs(marginDelta) < 1) {
          trend = 'stable';
        } else if (marginDelta > 1) {
          trend = 'improving';
        } else {
          trend = 'deteriorating';
        }

        // Check for front-loaded cost (optimism flag)
        const percentComplete = sov.percent_complete || 0;
        if (percentComplete < 30 && projectedMargin < 0) {
          trend = 'front_loaded';
        }

        // Check for back-loaded cost (optimism bias flag)
        if (percentComplete > 70 && currentMarginPercent > projectedMarginPercent + 5) {
          trend = 'back_loaded';
        }
      }

      const remainingEarned = scheduledValue - earnedToDate;
      const remainingProjectedCost = projectedFinalCost - actualCostToDate;

      return {
        ...sov,
        earnedToDate,
        actualCostToDate,
        costBurnRate,
        projectedFinalCost,
        projectedMargin,
        projectedMarginPercent: scheduledValue > 0 ? (projectedMargin / scheduledValue) * 100 : 0,
        currentMargin: earnedToDate - actualCostToDate,
        currentMarginPercent: earnedToDate > 0 ? ((earnedToDate - actualCostToDate) / earnedToDate) * 100 : 0,
        remainingEarned,
        remainingProjectedCost,
        projectionStatus,
        trend
      };
    });
  }, [sovItems, expenses, costCodes, mappings]);

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return TrendingUp;
      case 'deteriorating': return TrendingDown;
      case 'front_loaded':
      case 'back_loaded': return AlertCircle;
      default: return Minus;
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'improving': return 'text-green-400';
      case 'deteriorating': return 'text-red-400';
      case 'front_loaded':
      case 'back_loaded': return 'text-amber-400';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendLabel = (trend) => {
    switch (trend) {
      case 'improving': return 'Improving';
      case 'deteriorating': return 'Deteriorating';
      case 'stable': return 'Stable';
      case 'front_loaded': return 'Front-Loaded';
      case 'back_loaded': return 'Back-Loaded';
      default: return 'Unknown';
    }
  };

  const formatCurrency = (value) => `$${Math.abs(value).toLocaleString()}`;
  const formatPercent = (value) => `${value.toFixed(1)}%`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cost Trend Projections</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Projected final cost and margin based on current burn rate
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-secondary/50 rounded text-xs font-semibold text-muted-foreground">
            <div className="col-span-1">SOV</div>
            <div className="col-span-2">Description</div>
            <div className="col-span-1 text-right">Earned</div>
            <div className="col-span-1 text-right">Actual Cost</div>
            <div className="col-span-1 text-right">Burn Rate</div>
            <div className="col-span-2 text-right">Projected Cost</div>
            <div className="col-span-2 text-right">Projected Margin</div>
            <div className="col-span-2 text-center">Trend</div>
          </div>

          {/* Data Rows */}
          {projections.map((proj) => {
            const TrendIcon = getTrendIcon(proj.trend);
            return (
              <div 
                key={proj.id}
                className="grid grid-cols-12 gap-2 px-3 py-2.5 hover:bg-secondary/50 transition-colors rounded"
              >
                <div className="col-span-1 font-mono text-sm font-semibold">
                  {proj.sov_code}
                </div>
                <div className="col-span-2 text-sm truncate">
                  {proj.description}
                </div>
                <div className="col-span-1 text-right text-sm">
                  {formatCurrency(proj.earnedToDate)}
                </div>
                <div className="col-span-1 text-right text-sm text-red-400">
                  {formatCurrency(proj.actualCostToDate)}
                </div>
                <div className="col-span-1 text-right text-sm font-mono">
                  {proj.projectionStatus === 'valid' ? 
                    `${proj.costBurnRate.toFixed(2)}x` : 
                    <span className="text-muted-foreground">-</span>
                  }
                </div>
                <div className="col-span-2 text-right">
                  {proj.projectionStatus === 'valid' ? (
                    <>
                      <div className="text-sm font-semibold">
                        {formatCurrency(proj.projectedFinalCost)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(proj.remainingProjectedCost)} remaining
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-muted-foreground">No data</div>
                  )}
                </div>
                <div className="col-span-2 text-right">
                  {proj.projectionStatus === 'valid' ? (
                    <>
                      <div className={cn(
                        "text-sm font-semibold",
                        proj.projectedMargin >= 0 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {formatCurrency(proj.projectedMargin)}
                      </div>
                      <div className={cn(
                        "text-xs",
                        proj.projectedMargin >= 0 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {formatPercent(proj.projectedMarginPercent)}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-muted-foreground">-</div>
                  )}
                </div>
                <div className="col-span-2 flex items-center justify-center gap-1.5">
                  {proj.projectionStatus === 'valid' ? (
                    <>
                      <TrendIcon size={14} className={getTrendColor(proj.trend)} />
                      <span className={cn("text-xs font-medium", getTrendColor(proj.trend))}>
                        {getTrendLabel(proj.trend)}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Insufficient</span>
                  )}
                </div>
              </div>
            );
          })}

          {projections.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No SOV data available
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-5 gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={12} className="text-green-400" />
            <span className="text-muted-foreground">Improving</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Minus size={12} className="text-muted-foreground" />
            <span className="text-muted-foreground">Stable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingDown size={12} className="text-red-400" />
            <span className="text-muted-foreground">Deteriorating</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertCircle size={12} className="text-amber-400" />
            <span className="text-muted-foreground">Front-Loaded</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertCircle size={12} className="text-amber-400" />
            <span className="text-muted-foreground">Back-Loaded</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}