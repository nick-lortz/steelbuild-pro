import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function ChangeOrderImpact({ 
  project,
  sovItems = [], 
  changeOrders = [],
  expenses = [],
  estimatedCosts = []
}) {
  const analysis = useMemo(() => {
    // Original contract (baseline SOV)
    const originalContract = sovItems.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);

    // Approved change orders
    const approvedCOs = changeOrders.filter(co => co.status === 'approved');
    const approvedCOsRevenue = approvedCOs.reduce((sum, co) => sum + (co.cost_impact || 0), 0);

    // Pending change orders
    const pendingCOs = changeOrders.filter(co => co.status === 'pending' || co.status === 'submitted');
    const pendingCOsRevenue = pendingCOs.reduce((sum, co) => sum + (co.cost_impact || 0), 0);

    // Actual costs
    const actualCost = expenses
      .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // ETC
    const totalETC = estimatedCosts.reduce((sum, etc) => sum + (etc.estimated_remaining_cost || 0), 0);
    const estimatedCostAtCompletion = actualCost + totalETC;

    // BEFORE (original contract only)
    const beforeContract = originalContract;
    const beforeEstCost = estimatedCostAtCompletion;
    const beforeMargin = beforeContract - beforeEstCost;
    const beforeMarginPercent = beforeContract > 0 ? (beforeMargin / beforeContract) * 100 : 0;

    // AFTER (with approved COs)
    const afterContract = originalContract + approvedCOsRevenue;
    const afterEstCost = estimatedCostAtCompletion; // Cost impacts are typically absorbed into ETC
    const afterMargin = afterContract - afterEstCost;
    const afterMarginPercent = afterContract > 0 ? (afterMargin / afterContract) * 100 : 0;

    // DELTAS
    const contractDelta = afterContract - beforeContract;
    const costDelta = afterEstCost - beforeEstCost;
    const marginDelta = afterMargin - beforeMargin;
    const marginPercentDelta = afterMarginPercent - beforeMarginPercent;

    // WITH PENDING (what-if scenario)
    const withPendingContract = afterContract + pendingCOsRevenue;
    const withPendingMargin = withPendingContract - afterEstCost;
    const withPendingMarginPercent = withPendingContract > 0 ? (withPendingMargin / withPendingContract) * 100 : 0;

    return {
      originalContract,
      approvedCOsRevenue,
      pendingCOsRevenue,
      approvedCOsCount: approvedCOs.length,
      pendingCOsCount: pendingCOs.length,
      before: {
        contract: beforeContract,
        estCost: beforeEstCost,
        margin: beforeMargin,
        marginPercent: beforeMarginPercent
      },
      after: {
        contract: afterContract,
        estCost: afterEstCost,
        margin: afterMargin,
        marginPercent: afterMarginPercent
      },
      delta: {
        contract: contractDelta,
        cost: costDelta,
        margin: marginDelta,
        marginPercent: marginPercentDelta
      },
      withPending: {
        contract: withPendingContract,
        margin: withPendingMargin,
        marginPercent: withPendingMarginPercent
      },
      hasPending: pendingCOs.length > 0
    };
  }, [project, sovItems, changeOrders, expenses, estimatedCosts]);

  const formatCurrency = (value) => `$${value.toLocaleString()}`;
  const formatPercent = (value) => `${value.toFixed(1)}%`;
  const formatDelta = (value, isCurrency = true) => {
    const formatted = isCurrency ? formatCurrency(Math.abs(value)) : formatPercent(Math.abs(value));
    if (value > 0) return `+${formatted}`;
    if (value < 0) return `-${formatted}`;
    return formatted;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Order Impact Analysis</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Margin impact of approved change orders vs baseline contract
          </p>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-secondary rounded">
              <p className="text-xs text-muted-foreground">Approved COs</p>
              <p className="text-lg font-bold text-green-400">
                {analysis.approvedCOsCount}
              </p>
              <p className="text-xs text-green-400">
                {formatCurrency(analysis.approvedCOsRevenue)} revenue
              </p>
            </div>
            <div className="p-3 bg-secondary rounded">
              <p className="text-xs text-muted-foreground">Pending COs</p>
              <p className="text-lg font-bold text-amber-400">
                {analysis.pendingCOsCount}
              </p>
              <p className="text-xs text-amber-400">
                {formatCurrency(analysis.pendingCOsRevenue)} potential
              </p>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/50">
                  <th className="text-left p-3 font-semibold">Metric</th>
                  <th className="text-right p-3 font-semibold">Before COs</th>
                  <th className="text-right p-3 font-semibold">After Approved COs</th>
                  <th className="text-right p-3 font-semibold">Delta</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="p-3">Contract Value</td>
                  <td className="p-3 text-right font-mono">
                    {formatCurrency(analysis.before.contract)}
                  </td>
                  <td className="p-3 text-right font-mono font-semibold">
                    {formatCurrency(analysis.after.contract)}
                  </td>
                  <td className={cn(
                    "p-3 text-right font-mono font-semibold",
                    analysis.delta.contract > 0 ? 'text-green-400' : 
                    analysis.delta.contract < 0 ? 'text-red-400' : ''
                  )}>
                    {formatDelta(analysis.delta.contract)}
                  </td>
                </tr>

                <tr className="border-t border-border">
                  <td className="p-3">Estimated Cost</td>
                  <td className="p-3 text-right font-mono">
                    {formatCurrency(analysis.before.estCost)}
                  </td>
                  <td className="p-3 text-right font-mono font-semibold">
                    {formatCurrency(analysis.after.estCost)}
                  </td>
                  <td className={cn(
                    "p-3 text-right font-mono font-semibold",
                    analysis.delta.cost < 0 ? 'text-green-400' : 
                    analysis.delta.cost > 0 ? 'text-red-400' : ''
                  )}>
                    {formatDelta(analysis.delta.cost)}
                  </td>
                </tr>

                <tr className="border-t border-border bg-secondary/30">
                  <td className="p-3 font-semibold">Projected Margin ($)</td>
                  <td className="p-3 text-right font-mono">
                    {formatCurrency(analysis.before.margin)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold">
                    {formatCurrency(analysis.after.margin)}
                  </td>
                  <td className={cn(
                    "p-3 text-right font-mono font-bold flex items-center justify-end gap-1",
                    analysis.delta.margin > 0 ? 'text-green-400' : 
                    analysis.delta.margin < 0 ? 'text-red-400' : ''
                  )}>
                    {analysis.delta.margin > 0 ? <TrendingUp size={14} /> : 
                     analysis.delta.margin < 0 ? <TrendingDown size={14} /> : null}
                    {formatDelta(analysis.delta.margin)}
                  </td>
                </tr>

                <tr className="border-t border-border bg-secondary/30">
                  <td className="p-3 font-semibold">Projected Margin (%)</td>
                  <td className="p-3 text-right font-mono">
                    {formatPercent(analysis.before.marginPercent)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold">
                    {formatPercent(analysis.after.marginPercent)}
                  </td>
                  <td className={cn(
                    "p-3 text-right font-mono font-bold",
                    analysis.delta.marginPercent > 0 ? 'text-green-400' : 
                    analysis.delta.marginPercent < 0 ? 'text-red-400' : ''
                  )}>
                    {formatDelta(analysis.delta.marginPercent, false)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pending COs Impact */}
          {analysis.hasPending && (
            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle size={16} className="text-amber-400 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-400">
                    Pending Change Orders ({analysis.pendingCOsCount})
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    What-if scenario if all pending COs are approved
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Contract Value</p>
                  <p className="font-mono font-semibold">
                    {formatCurrency(analysis.withPending.contract)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Projected Margin</p>
                  <p className="font-mono font-semibold">
                    {formatCurrency(analysis.withPending.margin)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Margin %</p>
                  <p className="font-mono font-semibold">
                    {formatPercent(analysis.withPending.marginPercent)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}