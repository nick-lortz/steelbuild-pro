import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Target, TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';

export default function JobStatusReport({ sovItems = [], expenses = [], changeOrders = [] }) {
  const kpis = useMemo(() => {
    // Contract Value (original SOV)
    const contractValue = sovItems.reduce((sum, s) => sum + (s.scheduled_value || 0), 0);

    // Signed Extras (approved change orders)
    const signedExtras = changeOrders
      .filter(co => co.status === 'approved')
      .reduce((sum, co) => sum + (co.cost_impact || 0), 0);

    // Total Contract = Original + Approved COs
    const totalContract = contractValue + signedExtras;

    // Earned to Date (from SOV percent complete)
    const earnedToDate = sovItems.reduce((sum, s) => 
      sum + ((s.scheduled_value || 0) * ((s.percent_complete || 0) / 100)), 0);

    // Billed to Date (from approved invoices)
    const billedToDate = sovItems.reduce((sum, s) => sum + (s.billed_to_date || 0), 0);

    // Over / Under Billed
    const overUnderBilled = billedToDate - earnedToDate;

    // Cost to Date (paid/approved expenses)
    const costToDate = expenses
      .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // Estimated Cost at Completion (against total contract not just original value)
    const totalContract = contractValue + (changeOrders.filter(co => co.status === 'approved').reduce((sum, co) => sum + (co.cost_impact || 0), 0) || 0);
    const percentComplete = totalContract > 0 ? (earnedToDate / totalContract) * 100 : 0;
    const estimatedCostAtCompletion = percentComplete > 0 
      ? (costToDate / percentComplete) * 100 
      : costToDate;

    // Profit metrics
    const projectedProfit = totalContract - estimatedCostAtCompletion;
    const projectedMargin = totalContract > 0 ? (projectedProfit / totalContract) * 100 : 0;

    // Committed costs (all expenses, not just paid/approved)
    const committedCosts = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const costRisk = committedCosts - costToDate;

    return {
      contractValue,
      signedExtras,
      totalContract,
      earnedToDate,
      billedToDate,
      overUnderBilled,
      costToDate,
      committedCosts,
      costRisk,
      estimatedCostAtCompletion,
      projectedProfit,
      projectedMargin,
      percentComplete
    };
  }, [sovItems, expenses, changeOrders]);

  const metrics = [
    { 
      label: 'Contract Value', 
      value: `$${kpis.contractValue.toLocaleString()}`, 
      icon: Target 
    },
    { 
      label: 'Signed Extras', 
      value: `$${kpis.signedExtras.toLocaleString()}`, 
      icon: DollarSign,
      color: kpis.signedExtras >= 0 ? 'text-green-400' : 'text-red-400'
    },
    { 
      label: 'Total Contract', 
      value: `$${kpis.totalContract.toLocaleString()}`, 
      icon: DollarSign 
    },
    { 
      label: 'Earned to Date', 
      value: `$${kpis.earnedToDate.toLocaleString()}`, 
      icon: TrendingUp,
      color: 'text-green-400',
      subtitle: `${kpis.percentComplete.toFixed(1)}% complete`
    },
    { 
      label: 'Billed to Date', 
      value: `$${kpis.billedToDate.toLocaleString()}`, 
      icon: DollarSign
    },
    { 
      label: 'Over / Under Billed', 
      value: `$${kpis.overUnderBilled.toLocaleString()}`, 
      icon: kpis.overUnderBilled >= 0 ? TrendingUp : TrendingDown,
      color: Math.abs(kpis.overUnderBilled) < 1000 ? '' : kpis.overUnderBilled > 0 ? 'text-amber-400' : 'text-red-400'
    },
    { 
      label: 'Cost to Date', 
      value: `$${kpis.costToDate.toLocaleString()}`, 
      icon: TrendingDown
    },
    {
      label: 'Cost at Risk',
      value: `$${kpis.costRisk.toLocaleString()}`,
      icon: AlertTriangle,
      color: kpis.costRisk > 0 ? 'text-amber-400' : 'text-green-400'
    },
    { 
      label: 'Est Cost at Completion', 
      value: `$${kpis.estimatedCostAtCompletion.toLocaleString()}`, 
      icon: DollarSign
    },
    { 
      label: 'Projected Profit', 
      value: `$${kpis.projectedProfit.toLocaleString()}`, 
      icon: kpis.projectedProfit >= 0 ? TrendingUp : TrendingDown,
      color: kpis.projectedProfit >= 0 ? 'text-green-400' : 'text-red-400',
      subtitle: `${kpis.projectedMargin.toFixed(1)}% margin`
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Job Status Report (JSR)</h3>
        {Math.abs(kpis.overUnderBilled) > 5000 && (
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <AlertTriangle size={12} />
            Billing variance detected
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <Card key={idx}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon size={16} className={metric.color || 'text-muted-foreground'} />
                </div>
                <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
                <p className={`text-lg font-bold ${metric.color || ''}`}>
                  {metric.value}
                </p>
                {metric.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">{metric.subtitle}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}