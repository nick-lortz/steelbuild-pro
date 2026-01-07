import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Target } from 'lucide-react';

export default function FinancialKPIs({ budgetLines = [], expenses = [], invoices = [] }) {
  const originalBudget = budgetLines.reduce((sum, b) => sum + (b.original_budget || 0), 0);
  const approvedChanges = budgetLines.reduce((sum, b) => sum + (b.approved_changes || 0), 0);
  const currentBudget = originalBudget + approvedChanges;
  const actualCost = expenses.filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const costRemaining = currentBudget - actualCost;
  const costVariance = currentBudget - actualCost;
  const percentSpent = currentBudget > 0 ? (actualCost / currentBudget) * 100 : 0;
  const billingToDate = invoices.filter(i => i.payment_status === 'paid')
    .reduce((sum, i) => sum + (i.total_amount || 0), 0);

  const kpis = [
    { label: 'Original Budget', value: `$${originalBudget.toLocaleString()}`, icon: Target },
    { label: 'Approved Changes', value: `$${approvedChanges.toLocaleString()}`, icon: DollarSign, color: approvedChanges >= 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'Current Budget', value: `$${currentBudget.toLocaleString()}`, icon: DollarSign },
    { label: 'Actual Cost to Date', value: `$${actualCost.toLocaleString()}`, icon: TrendingDown },
    { label: 'Cost Remaining', value: `$${costRemaining.toLocaleString()}`, icon: DollarSign, color: costRemaining >= 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'Cost Variance', value: `$${costVariance.toLocaleString()}`, icon: costVariance >= 0 ? TrendingUp : TrendingDown, color: costVariance >= 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'Percent Spent', value: `${percentSpent.toFixed(1)}%`, icon: Target, color: percentSpent > 100 ? 'text-red-400' : percentSpent > 90 ? 'text-amber-400' : 'text-green-400' },
    { label: 'Billing to Date', value: `$${billingToDate.toLocaleString()}`, icon: DollarSign }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <Card key={idx}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className={`text-lg font-bold mt-1 ${kpi.color || ''}`}>
                    {kpi.value}
                  </p>
                </div>
                <Icon size={18} className={kpi.color || 'text-muted-foreground'} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}