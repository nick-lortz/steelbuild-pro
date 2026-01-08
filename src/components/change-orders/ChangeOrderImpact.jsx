import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/ui/StatusBadge";

export default function ChangeOrderImpact({ 
  project,
  sovItems = [], 
  changeOrders = [],
  expenses = [],
  estimatedCosts = []
}) {
  const [selectedCO, setSelectedCO] = useState(null);

  const analysis = useMemo(() => {
    // Original contract (baseline SOV)
    const originalContract = sovItems.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);

    // Actual costs
    const actualCost = expenses
      .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // ETC
    const totalETC = estimatedCosts.reduce((sum, etc) => sum + (etc.estimated_remaining_cost || 0), 0);
    const baseEAC = actualCost + totalETC;

    // Build cumulative contract value and EAC as COs are approved
    let runningContract = originalContract;
    let runningEAC = baseEAC;

    // Process each CO in order (sorted by approved date or created date)
    const sortedCOs = [...changeOrders].sort((a, b) => {
      const dateA = a.approved_date || a.created_date || '';
      const dateB = b.approved_date || b.created_date || '';
      return dateA.localeCompare(dateB);
    });

    const coAnalysis = sortedCOs.map((co) => {
      // Before this CO
      const beforeContract = runningContract;
      const beforeEAC = runningEAC;
      const beforeMargin = beforeContract - beforeEAC;
      const beforeMarginPercent = beforeContract > 0 ? (beforeMargin / beforeContract) * 100 : 0;

      // Revenue impact
      const revenueValue = co.cost_impact || 0;

      // Estimated cost impact (from cost_breakdown or assume 70% of revenue if not specified)
      let estimatedCost = 0;
      if (co.cost_breakdown && co.cost_breakdown.length > 0) {
        estimatedCost = co.cost_breakdown.reduce((sum, item) => sum + (item.amount || 0), 0);
      } else {
        // Default assumption: 70% of revenue is cost
        estimatedCost = revenueValue * 0.7;
      }

      // After this CO (only apply if approved)
      let afterContract = beforeContract;
      let afterEAC = beforeEAC;
      if (co.status === 'approved') {
        afterContract = beforeContract + revenueValue;
        afterEAC = beforeEAC + estimatedCost;
        // Update running totals
        runningContract = afterContract;
        runningEAC = afterEAC;
      } else {
        // Proposed/Pending: show forecast but don't update running totals
        afterContract = beforeContract + revenueValue;
        afterEAC = beforeEAC + estimatedCost;
      }

      const afterMargin = afterContract - afterEAC;
      const afterMarginPercent = afterContract > 0 ? (afterMargin / afterContract) * 100 : 0;

      // Net impact
      const netMarginImpact = afterMargin - beforeMargin;
      const marginPercentDelta = afterMarginPercent - beforeMarginPercent;

      // Status color
      let impactStatus = 'neutral';
      if (netMarginImpact > 0) {
        impactStatus = 'positive';
      } else if (netMarginImpact < -1000) {
        impactStatus = 'negative';
      }

      return {
        ...co,
        revenueValue,
        estimatedCost,
        netMarginImpact,
        before: {
          contract: beforeContract,
          eac: beforeEAC,
          margin: beforeMargin,
          marginPercent: beforeMarginPercent
        },
        after: {
          contract: afterContract,
          eac: afterEAC,
          margin: afterMargin,
          marginPercent: afterMarginPercent
        },
        marginPercentDelta,
        impactStatus
      };
    });

    // Final totals (approved COs only)
    const approvedCOs = coAnalysis.filter(co => co.status === 'approved');
    const finalContract = runningContract;
    const finalEAC = runningEAC;
    const finalMargin = finalContract - finalEAC;
    const finalMarginPercent = finalContract > 0 ? (finalMargin / finalContract) * 100 : 0;

    const originalMargin = originalContract - baseEAC;
    const originalMarginPercent = originalContract > 0 ? (originalMargin / originalContract) * 100 : 0;

    return {
      originalContract,
      baseEAC,
      originalMargin,
      originalMarginPercent,
      finalContract,
      finalEAC,
      finalMargin,
      finalMarginPercent,
      totalMarginDelta: finalMargin - originalMargin,
      totalMarginPercentDelta: finalMarginPercent - originalMarginPercent,
      coAnalysis,
      approvedCount: approvedCOs.length,
      pendingCount: coAnalysis.filter(co => co.status === 'pending' || co.status === 'submitted').length,
      rejectedCount: coAnalysis.filter(co => co.status === 'rejected').length
    };
  }, [sovItems, changeOrders, expenses, estimatedCosts]);

  const formatCurrency = (value) => {
    if (value === undefined || value === null) return '$0';
    return `$${Math.abs(value).toLocaleString()}`;
  };
  
  const formatPercent = (value) => {
    if (value === undefined || value === null) return '0.0%';
    return `${value.toFixed(1)}%`;
  };
  
  const formatDelta = (value, isCurrency = true) => {
    if (value === undefined || value === null || value === 0) return isCurrency ? '$0' : '0.0%';
    const formatted = isCurrency ? formatCurrency(value) : formatPercent(Math.abs(value));
    if (value > 0) return `+${formatted}`;
    if (value < 0) return `-${formatted}`;
    return formatted;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return CheckCircle;
      case 'pending':
      case 'submitted': return Clock;
      case 'rejected': return XCircle;
      default: return AlertCircle;
    }
  };

  const getImpactColor = (impactStatus) => {
    switch (impactStatus) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Order Impact Analysis</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Before/After margin impact for each change order
          </p>
        </CardHeader>
        <CardContent>
          {/* Summary Panel */}
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-secondary/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Before COs</p>
              <p className="text-sm font-mono">{formatCurrency(analysis.originalContract)}</p>
              <p className="text-lg font-bold">{formatCurrency(analysis.originalMargin)}</p>
              <p className="text-xs text-muted-foreground">{formatPercent(analysis.originalMarginPercent)} margin</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">After COs</p>
              <p className="text-sm font-mono">{formatCurrency(analysis.finalContract)}</p>
              <p className="text-lg font-bold">{formatCurrency(analysis.finalMargin)}</p>
              <p className="text-xs text-muted-foreground">{formatPercent(analysis.finalMarginPercent)} margin</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase mb-1">Net Change</p>
              <p className="text-sm font-mono">
                {formatDelta(analysis.finalContract - analysis.originalContract)}
              </p>
              <p className={cn(
                "text-lg font-bold flex items-center gap-1",
                analysis.totalMarginDelta > 0 ? 'text-green-400' : 
                analysis.totalMarginDelta < 0 ? 'text-red-400' : ''
              )}>
                {analysis.totalMarginDelta > 0 ? <TrendingUp size={16} /> : 
                 analysis.totalMarginDelta < 0 ? <TrendingDown size={16} /> : null}
                {formatDelta(analysis.totalMarginDelta)}
              </p>
              <p className={cn(
                "text-xs",
                analysis.totalMarginPercentDelta > 0 ? 'text-green-400' : 
                analysis.totalMarginPercentDelta < 0 ? 'text-red-400' : 'text-muted-foreground'
              )}>
                {formatDelta(analysis.totalMarginPercentDelta, false)} margin
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-2 bg-green-500/10 border border-green-500/30 rounded text-center">
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="text-lg font-bold text-green-400">{analysis.approvedCount}</p>
            </div>
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-center">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-lg font-bold text-amber-400">{analysis.pendingCount}</p>
            </div>
            <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-center">
              <p className="text-xs text-muted-foreground">Rejected</p>
              <p className="text-lg font-bold text-red-400">{analysis.rejectedCount}</p>
            </div>
          </div>

          {/* CO Line Detail Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left p-2 font-semibold">CO#</th>
                    <th className="text-left p-2 font-semibold">Description</th>
                    <th className="text-center p-2 font-semibold">Status</th>
                    <th className="text-right p-2 font-semibold">Revenue</th>
                    <th className="text-right p-2 font-semibold">Est Cost</th>
                    <th className="text-right p-2 font-semibold">Margin Before</th>
                    <th className="text-right p-2 font-semibold">Margin After</th>
                    <th className="text-right p-2 font-semibold">Net Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.coAnalysis.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        No change orders found
                      </td>
                    </tr>
                  ) : (
                    analysis.coAnalysis.map((co) => {
                      const StatusIcon = getStatusIcon(co.status);
                      return (
                        <tr 
                          key={co.id} 
                          className="border-t border-border hover:bg-secondary/30 transition-colors"
                        >
                          <td className="p-2 font-mono font-semibold">
                            CO-{co.co_number}
                          </td>
                          <td className="p-2 max-w-xs truncate">
                            {co.title || co.description || 'Untitled'}
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <StatusIcon size={12} className={cn(
                                co.status === 'approved' ? 'text-green-400' :
                                co.status === 'rejected' ? 'text-red-400' :
                                'text-amber-400'
                              )} />
                              <StatusBadge status={co.status} />
                            </div>
                          </td>
                          <td className="p-2 text-right font-mono">
                            {formatCurrency(co.revenueValue)}
                          </td>
                          <td className="p-2 text-right font-mono text-red-400">
                            {formatCurrency(co.estimatedCost)}
                          </td>
                          <td className="p-2 text-right font-mono text-muted-foreground">
                            {formatCurrency(co.before.margin)}
                            <span className="text-xs ml-1">
                              ({formatPercent(co.before.marginPercent)})
                            </span>
                          </td>
                          <td className="p-2 text-right font-mono">
                            {formatCurrency(co.after.margin)}
                            <span className="text-xs ml-1">
                              ({formatPercent(co.after.marginPercent)})
                            </span>
                          </td>
                          <td className={cn(
                            "p-2 text-right font-mono font-bold",
                            getImpactColor(co.impactStatus)
                          )}>
                            <div className="flex items-center justify-end gap-1">
                              {co.netMarginImpact > 0 ? <TrendingUp size={12} /> : 
                               co.netMarginImpact < -1000 ? <TrendingDown size={12} /> : null}
                              {formatDelta(co.netMarginImpact)}
                            </div>
                            <div className="text-xs">
                              {formatDelta(co.marginPercentDelta, false)}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending CO Warning */}
          {analysis.pendingCount > 0 && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-amber-400">
                  {analysis.pendingCount} Pending CO{analysis.pendingCount > 1 ? 's' : ''}
                </p>
                <p className="text-muted-foreground mt-1">
                  Margin impacts shown are forecasts only. Approve to update contract value and SOV.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}