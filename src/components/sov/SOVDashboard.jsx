import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Target, AlertCircle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

export default function SOVDashboard({ sovItems = [], expenses = [] }) {
  const metrics = useMemo(() => {
    const contractValue = sovItems.reduce((sum, item) => sum + (item.scheduled_value || 0), 0);
    const earnedToDate = sovItems.reduce((sum, item) => {
      const earned = ((item.scheduled_value || 0) * (item.percent_complete || 0)) / 100;
      return sum + earned;
    }, 0);
    const billedToDate = sovItems.reduce((sum, item) => sum + (item.billed_to_date || 0), 0);
    const readyToBill = earnedToDate - billedToDate;
    
    // Calculate actual costs from paid/approved expenses
    const actualCosts = expenses
      .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const remainingBudget = contractValue - actualCosts;
    const costVariance = billedToDate - actualCosts;
    const percentComplete = contractValue > 0 ? (earnedToDate / contractValue) * 100 : 0;
    const percentBilled = contractValue > 0 ? (billedToDate / contractValue) * 100 : 0;
    const burnRate = percentComplete > 0 ? actualCosts / percentComplete : 0;
    const projectedFinalCost = burnRate * 100;
    const projectedMargin = contractValue - projectedFinalCost;
    const projectedMarginPct = contractValue > 0 ? (projectedMargin / contractValue) * 100 : 0;

    return {
      contractValue,
      earnedToDate,
      billedToDate,
      readyToBill,
      actualCosts,
      remainingBudget,
      costVariance,
      percentComplete,
      percentBilled,
      projectedFinalCost,
      projectedMargin,
      projectedMarginPct
    };
  }, [sovItems, expenses]);

  const kpis = [
    {
      label: 'Contract Value',
      value: `$${metrics.contractValue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-blue-400'
    },
    {
      label: 'Earned to Date',
      value: `$${metrics.earnedToDate.toLocaleString()}`,
      subValue: `${metrics.percentComplete.toFixed(1)}% Complete`,
      icon: Target,
      color: 'text-green-400'
    },
    {
      label: 'Billed to Date',
      value: `$${metrics.billedToDate.toLocaleString()}`,
      subValue: `${metrics.percentBilled.toFixed(1)}% Billed`,
      icon: DollarSign,
      color: 'text-amber-400'
    },
    {
      label: 'Ready to Bill',
      value: `$${metrics.readyToBill.toLocaleString()}`,
      icon: metrics.readyToBill >= 0 ? TrendingUp : TrendingDown,
      color: metrics.readyToBill >= 0 ? 'text-emerald-400' : 'text-red-400'
    },
    {
      label: 'Actual Costs',
      value: `$${metrics.actualCosts.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-zinc-400'
    },
    {
      label: 'Cost Variance',
      value: `$${metrics.costVariance.toLocaleString()}`,
      subValue: metrics.costVariance >= 0 ? 'Under Budget' : 'Over Budget',
      icon: metrics.costVariance >= 0 ? TrendingUp : TrendingDown,
      color: metrics.costVariance >= 0 ? 'text-green-400' : 'text-red-400'
    },
    {
      label: 'Remaining Budget',
      value: `$${metrics.remainingBudget.toLocaleString()}`,
      icon: DollarSign,
      color: metrics.remainingBudget >= 0 ? 'text-blue-400' : 'text-red-400'
    },
    {
      label: 'Projected Margin',
      value: `$${metrics.projectedMargin.toLocaleString()}`,
      subValue: `${metrics.projectedMarginPct.toFixed(1)}%`,
      icon: metrics.projectedMargin >= 0 ? TrendingUp : AlertCircle,
      color: metrics.projectedMargin >= 0 ? 'text-green-400' : 'text-red-400'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} className="bg-card/50 border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                    <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                    {kpi.subValue && (
                      <p className="text-xs text-muted-foreground mt-1">{kpi.subValue}</p>
                    )}
                  </div>
                  <Icon size={20} className={kpi.color} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-card/50 border-border">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Project Completion</span>
                <span className="font-semibold">{metrics.percentComplete.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.percentComplete} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Billed Progress</span>
                <span className="font-semibold">{metrics.percentBilled.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.percentBilled} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}