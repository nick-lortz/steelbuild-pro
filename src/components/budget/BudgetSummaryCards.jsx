import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

export default function BudgetSummaryCards({ summary, budget }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getVarianceColor = (variance) => {
    if (variance > 0) return 'text-green-600';
    if (variance < -50000) return 'text-red-600';
    if (variance < 0) return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  const getVarianceIcon = (variance) => {
    if (variance > 0) return <TrendingDown className="w-4 h-4" />;
    if (variance < 0) return <TrendingUp className="w-4 h-4" />;
    return null;
  };

  const getHealthStatus = () => {
    const pct = summary.variancePercent;
    if (pct > 5) return { label: 'Under Budget', color: 'bg-green-500', icon: CheckCircle };
    if (pct < -10) return { label: 'Critical Overrun', color: 'bg-red-500', icon: AlertTriangle };
    if (pct < -5) return { label: 'Warning', color: 'bg-yellow-500', icon: AlertTriangle };
    return { label: 'On Track', color: 'bg-blue-500', icon: CheckCircle };
  };

  const health = getHealthStatus();
  const HealthIcon = health.icon;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
          <DollarSign className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalBudgeted)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Available: {formatCurrency(summary.available)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Committed</CardTitle>
          <DollarSign className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalCommitted)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {((summary.totalCommitted / summary.totalBudgeted) * 100).toFixed(1)}% of budget
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Actual Spent</CardTitle>
          <DollarSign className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalActual)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {((summary.totalActual / summary.totalBudgeted) * 100).toFixed(1)}% of budget
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Forecast Variance</CardTitle>
          {getVarianceIcon(summary.variance)}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getVarianceColor(summary.variance)}`}>
            {formatCurrency(Math.abs(summary.variance))}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={health.color}>
              <HealthIcon className="w-3 h-3 mr-1" />
              {health.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {summary.variancePercent > 0 ? '+' : ''}{summary.variancePercent.toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Budget Breakdown by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(summary.categoryBreakdown).map(([category, values]) => (
              <div key={category} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium capitalize">{category}</span>
                  <Badge variant="outline" className="text-xs">
                    {((values.budgeted / summary.totalBudgeted) * 100).toFixed(0)}%
                  </Badge>
                </div>
                <div className="text-sm font-bold">{formatCurrency(values.budgeted)}</div>
                <div className="text-xs text-muted-foreground">
                  Actual: {formatCurrency(values.actual)}
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                  <div 
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min((values.actual / values.budgeted) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {budget.contingency_amount > 0 && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Contingency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold">{formatCurrency(summary.contingencyRemaining)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  of {formatCurrency(budget.contingency_amount)} remaining
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">
                  {((summary.contingencyRemaining / budget.contingency_amount) * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">Available</div>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div 
                className="bg-amber-500 h-2 rounded-full transition-all"
                style={{ width: `${(budget.contingency_used / budget.contingency_amount) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}