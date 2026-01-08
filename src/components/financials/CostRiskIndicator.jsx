import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, AlertCircle, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import CostRiskDrilldown from './CostRiskDrilldown';

export default function CostRiskIndicator({ 
  totalContract, 
  actualCost, 
  estimatedCostAtCompletion, 
  plannedMarginPercent = 15,
  expenses = [],
  estimatedCosts = [],
  sovItems = [],
  changeOrders = [],
  costCodes = [],
  mappings = []
}) {
  const [showDrilldown, setShowDrilldown] = useState(false);
  
  const analysis = useMemo(() => {
    const projectedMargin = totalContract - estimatedCostAtCompletion;
    const projectedMarginPercent = totalContract > 0 ? (projectedMargin / totalContract) * 100 : 0;
    const marginVariance = projectedMarginPercent - plannedMarginPercent;
    
    // DRIVER DETECTION
    const drivers = [];

    // 1. Cost Overrun Driver (SOV variance exceeds threshold)
    if (sovItems && sovItems.length > 0) {
      sovItems.forEach(sov => {
        const earnedToDate = (sov.scheduled_value || 0) * ((sov.percent_complete || 0) / 100);
        const sovMappings = mappings.filter(m => m.sov_item_id === sov.id);
        
        const costCodeBreakdown = sovMappings.map(mapping => {
          const ccExpenses = expenses.filter(e => 
            e.cost_code_id === mapping.cost_code_id &&
            (e.payment_status === 'paid' || e.payment_status === 'approved')
          );
          const actualCost = ccExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
          return actualCost * (mapping.allocation_percent / 100);
        });

        const unmappedExpenses = expenses.filter(e => 
          e.sov_code === sov.sov_code &&
          (e.payment_status === 'paid' || e.payment_status === 'approved') &&
          !sovMappings.find(m => m.cost_code_id === e.cost_code_id)
        );
        const unmappedCost = unmappedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const actualCost = costCodeBreakdown.reduce((sum, c) => sum + c, 0) + unmappedCost;

        const variance = earnedToDate - actualCost;
        const variancePercent = earnedToDate > 0 ? (variance / earnedToDate) * 100 : 0;

        // Flag if variance < -5% or absolute variance > $5000
        if ((variancePercent < -5 || variance < -5000) && earnedToDate > 0) {
          drivers.push({
            driver_type: 'cost_overrun',
            description: `${sov.description} exceeding allocation by $${Math.abs(variance).toLocaleString()}`,
            affected_sov: sov.sov_code,
            variance_amount: variance,
            severity: variance < -10000 ? 'high' : 'medium'
          });
        }
      });
    }

    // 2. Burn Rate Driver (increasing faster than earned)
    if (sovItems && sovItems.length > 0) {
      sovItems.forEach(sov => {
        const earnedToDate = (sov.scheduled_value || 0) * ((sov.percent_complete || 0) / 100);
        if (earnedToDate === 0) return;

        const sovMappings = mappings.filter(m => m.sov_item_id === sov.id);
        const costCodeBreakdown = sovMappings.map(mapping => {
          const ccExpenses = expenses.filter(e => 
            e.cost_code_id === mapping.cost_code_id &&
            (e.payment_status === 'paid' || e.payment_status === 'approved')
          );
          const actualCost = ccExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
          return actualCost * (mapping.allocation_percent / 100);
        });
        const unmappedExpenses = expenses.filter(e => 
          e.sov_code === sov.sov_code &&
          (e.payment_status === 'paid' || e.payment_status === 'approved') &&
          !sovMappings.find(m => m.cost_code_id === e.cost_code_id)
        );
        const unmappedCost = unmappedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const actualCost = costCodeBreakdown.reduce((sum, c) => sum + c, 0) + unmappedCost;

        const burnRate = actualCost / earnedToDate;
        if (burnRate > 1.15) {
          drivers.push({
            driver_type: 'burn_rate',
            description: `${sov.description} burn rate ${burnRate.toFixed(2)}x (${((burnRate - 1) * 100).toFixed(0)}% over)`,
            affected_sov: sov.sov_code,
            variance_amount: actualCost - earnedToDate,
            severity: burnRate > 1.3 ? 'high' : 'medium'
          });
        }
      });
    }

    // 3. Change Order Risk (negative margin impact)
    if (changeOrders && changeOrders.length > 0) {
      changeOrders
        .filter(co => co.status === 'approved')
        .forEach(co => {
          const revenueValue = co.cost_impact || 0;
          let estimatedCost = 0;
          if (co.cost_breakdown && co.cost_breakdown.length > 0) {
            estimatedCost = co.cost_breakdown.reduce((sum, item) => sum + (item.amount || 0), 0);
          } else {
            estimatedCost = revenueValue * 0.7;
          }
          const netMarginImpact = revenueValue - estimatedCost;
          
          if (netMarginImpact < -1000) {
            drivers.push({
              driver_type: 'change_order_risk',
              description: `CO-${co.co_number} approved with negative margin ($${Math.abs(netMarginImpact).toLocaleString()})`,
              affected_sov: null,
              variance_amount: netMarginImpact,
              severity: netMarginImpact < -5000 ? 'high' : 'medium'
            });
          }
        });
    }

    // 4. Unmapped Costs
    const unmappedExpenses = expenses.filter(e => 
      (e.payment_status === 'paid' || e.payment_status === 'approved') &&
      (!e.cost_code_id || !mappings.find(m => m.cost_code_id === e.cost_code_id))
    );
    const totalUnmapped = unmappedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    if (totalUnmapped > 5000) {
      drivers.push({
        driver_type: 'unmapped_costs',
        description: `$${totalUnmapped.toLocaleString()} in expenses not mapped to SOV`,
        affected_sov: null,
        variance_amount: totalUnmapped,
        severity: totalUnmapped > 10000 ? 'high' : 'medium'
      });
    }

    // Sort drivers by severity and variance amount
    drivers.sort((a, b) => {
      if (a.severity === 'high' && b.severity !== 'high') return -1;
      if (a.severity !== 'high' && b.severity === 'high') return 1;
      return Math.abs(b.variance_amount) - Math.abs(a.variance_amount);
    });

    // Take top 3 drivers
    const topDrivers = drivers.slice(0, 3);

    // Risk tier determination
    let status, statusLabel, icon, iconColor, bgColor, borderColor, message;
    
    if (marginVariance >= -2) {
      status = 'green';
      statusLabel = 'On Track';
      icon = CheckCircle;
      iconColor = 'text-green-400';
      bgColor = 'bg-green-500/10';
      borderColor = 'border-green-500/30';
      message = topDrivers.length > 0 ? 'Monitoring emerging risks' : 'Cost performance on track';
    } else if (marginVariance >= -5) {
      status = 'yellow';
      statusLabel = 'Watch Closely';
      icon = AlertCircle;
      iconColor = 'text-amber-400';
      bgColor = 'bg-amber-500/10';
      borderColor = 'border-amber-500/30';
      message = topDrivers.length > 0 ? `${topDrivers.length} cost drivers detected` : 'Cost risk emerging';
    } else {
      status = 'red';
      statusLabel = 'Overrun Likely';
      icon = AlertTriangle;
      iconColor = 'text-red-400';
      bgColor = 'bg-red-500/10';
      borderColor = 'border-red-500/30';
      message = topDrivers.length > 0 ? `${topDrivers.length} critical drivers` : 'Overrun projected';
    }

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
      estimatedCostAtCompletion,
      drivers: topDrivers
    };
  }, [totalContract, actualCost, estimatedCostAtCompletion, plannedMarginPercent, sovItems, changeOrders, expenses, costCodes, mappings]);

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

        {/* Risk Drivers */}
        {analysis.drivers.length > 0 && (
          <div className={cn(
            "p-3 rounded text-xs border",
            analysis.status === 'red' ? 'bg-red-500/10 border-red-500/30' :
            analysis.status === 'yellow' ? 'bg-amber-500/5 border-amber-500/20' :
            'bg-blue-500/5 border-blue-500/20'
          )}>
            <p className={cn(
              "font-semibold mb-2",
              analysis.status === 'red' ? 'text-red-400' :
              analysis.status === 'yellow' ? 'text-amber-400' :
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
      totalContract={totalContract}
      actualCost={actualCost}
      estimatedCostAtCompletion={estimatedCostAtCompletion}
    />
    </>
  );
}