import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

export default function BudgetVarianceAnalysis({ lineItems, categoryBreakdown }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const itemsWithVariance = useMemo(() => {
    return lineItems.map(item => ({
      ...item,
      variance: (item.budgeted_amount || 0) - (item.forecast_amount || 0),
      variancePct: item.budgeted_amount ? 
        (((item.budgeted_amount - item.forecast_amount) / item.budgeted_amount) * 100) : 0
    })).sort((a, b) => a.variance - b.variance);
  }, [lineItems]);

  const topOverruns = itemsWithVariance.filter(item => item.variance < 0).slice(0, 5);
  const topUnderruns = itemsWithVariance.filter(item => item.variance > 0).slice(-5).reverse();

  const getVarianceColor = (variance) => {
    if (variance > 0) return 'text-green-600';
    if (variance < -10) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getCategoryHealth = (category) => {
    const data = categoryBreakdown[category];
    const variance = data.budgeted - data.forecast;
    const pct = data.budgeted ? (variance / data.budgeted) * 100 : 0;
    
    if (pct > 5) return { label: 'Under Budget', color: 'bg-green-500' };
    if (pct < -10) return { label: 'Critical', color: 'bg-red-500' };
    if (pct < -5) return { label: 'Warning', color: 'bg-yellow-500' };
    return { label: 'On Track', color: 'bg-blue-500' };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Category Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(categoryBreakdown).map(([category, data]) => {
              const variance = data.budgeted - data.forecast;
              const pct = data.budgeted ? (variance / data.budgeted) * 100 : 0;
              const health = getCategoryHealth(category);

              return (
                <div key={category} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-12 rounded ${health.color}`} />
                    <div>
                      <div className="font-medium capitalize">{category}</div>
                      <div className="text-sm text-muted-foreground">
                        Budget: {formatCurrency(data.budgeted)} | Forecast: {formatCurrency(data.forecast)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getVarianceColor(pct)}`}>
                      {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                    </div>
                    <Badge className={health.color}>{health.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <CardTitle>Top Budget Overruns</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {topOverruns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No overruns detected</p>
            ) : (
              <div className="space-y-3">
                {topOverruns.map(item => (
                  <div key={item.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.description}</div>
                        <Badge variant="outline" className="mt-1 capitalize">{item.category}</Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-red-600">
                          {formatCurrency(Math.abs(item.variance))}
                        </div>
                        <div className="text-xs text-red-600">
                          {item.variancePct.toFixed(1)}% over
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Budget: {formatCurrency(item.budgeted_amount)} → Forecast: {formatCurrency(item.forecast_amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-green-500" />
              <CardTitle>Top Budget Savings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {topUnderruns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No savings identified</p>
            ) : (
              <div className="space-y-3">
                {topUnderruns.map(item => (
                  <div key={item.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.description}</div>
                        <Badge variant="outline" className="mt-1 capitalize">{item.category}</Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-600">
                          {formatCurrency(item.variance)}
                        </div>
                        <div className="text-xs text-green-600">
                          {item.variancePct.toFixed(1)}% under
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Budget: {formatCurrency(item.budgeted_amount)} → Forecast: {formatCurrency(item.forecast_amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}