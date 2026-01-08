import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from '@/components/ui/DataTable';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CostRiskDrilldown({ 
  open, 
  onOpenChange, 
  expenses = [], 
  estimatedCosts = [],
  totalContract,
  actualCost,
  estimatedCostAtCompletion
}) {
  // Cost by category with variance
  const costByCategory = useMemo(() => {
    const categories = ['labor', 'material', 'equipment', 'subcontract', 'other'];
    return categories.map(cat => {
      const actual = expenses
        .filter(e => e.category === cat && (e.payment_status === 'paid' || e.payment_status === 'approved'))
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      
      const etc = estimatedCosts.find(ec => ec.category === cat);
      const remaining = etc?.estimated_remaining_cost || 0;
      const forecast = actual + remaining;
      
      return {
        category: cat,
        actual,
        remaining,
        forecast
      };
    }).filter(c => c.forecast > 0);
  }, [expenses, estimatedCosts]);

  // Largest variance drivers
  const varianceDrivers = useMemo(() => {
    return costByCategory
      .map(c => ({
        ...c,
        variance: c.forecast - (c.actual + c.remaining)
      }))
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
      .slice(0, 5);
  }, [costByCategory]);

  const columns = [
    { 
      header: 'Category', 
      accessor: 'category',
      render: (row) => <span className="capitalize font-medium">{row.category}</span>
    },
    { 
      header: 'Actual to Date', 
      accessor: 'actual',
      render: (row) => <span className="text-red-400">${row.actual.toLocaleString()}</span>
    },
    { 
      header: 'Est Remaining', 
      accessor: 'remaining',
      render: (row) => <span>${row.remaining.toLocaleString()}</span>
    },
    { 
      header: 'Forecast Total', 
      accessor: 'forecast',
      render: (row) => <span className="font-semibold">${row.forecast.toLocaleString()}</span>
    }
  ];

  const projectedMargin = totalContract - estimatedCostAtCompletion;
  const projectedMarginPercent = totalContract > 0 ? (projectedMargin / totalContract) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cost Risk Analysis</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Actual Cost to Date</p>
                <p className="text-2xl font-bold text-red-400">${actualCost.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Est Cost at Completion</p>
                <p className="text-2xl font-bold">${estimatedCostAtCompletion.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className={projectedMargin >= 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Projected Margin</p>
                <p className={cn("text-2xl font-bold", projectedMargin >= 0 ? 'text-green-400' : 'text-red-400')}>
                  ${projectedMargin.toLocaleString()}
                </p>
                <p className={cn("text-xs", projectedMargin >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {projectedMarginPercent.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cost by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cost Breakdown by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={costByCategory}
                emptyMessage="No cost data available"
              />
            </CardContent>
          </Card>

          {/* Remaining Budget vs Forecast */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Remaining Budget Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {costByCategory.map(cat => {
                  const remainingPercent = cat.forecast > 0 ? (cat.remaining / cat.forecast) * 100 : 0;
                  return (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{cat.category}</span>
                        <span className="text-muted-foreground">
                          {remainingPercent.toFixed(0)}% remaining
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500"
                          style={{ width: `${Math.min(100 - remainingPercent, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>${cat.actual.toLocaleString()} spent</span>
                        <span>${cat.remaining.toLocaleString()} remaining</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}