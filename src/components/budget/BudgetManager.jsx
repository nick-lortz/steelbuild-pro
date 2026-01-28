import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function BudgetManager({ 
  workPackage, 
  tasks = [], 
  laborHours = [], 
  equipmentUsage = [],
  expenses = [],
  costCodes = [],
  onUpdateBudget 
}) {
  const budgetAnalysis = useMemo(() => {
    const budget = workPackage.budget_at_award || 0;
    
    // Calculate actuals from time logs
    const laborCost = tasks.reduce((sum, task) => {
      const taskLaborCost = (task.time_logs || []).reduce((logSum, log) => {
        // Assume $50/hr labor rate (should ideally come from labor category)
        return logSum + (log.hours * 50);
      }, 0);
      return sum + taskLaborCost;
    }, 0);

    // Add labor hours costs
    const laborHoursCost = laborHours
      .filter(lh => workPackage.id === lh.work_package_id)
      .reduce((sum, lh) => {
        const regularHours = lh.hours || 0;
        const otHours = lh.overtime_hours || 0;
        const rate = 50; // Default rate - should come from cost code
        return sum + ((regularHours + (otHours * 1.5)) * rate);
      }, 0);

    // Add equipment usage costs
    const equipmentCost = equipmentUsage
      .filter(eu => workPackage.id === eu.work_package_id)
      .reduce((sum, eu) => {
        const hours = eu.hours || 0;
        const days = eu.days || 0;
        const rate = eu.rate_override || 0;
        return sum + (hours * rate) + (days * rate);
      }, 0);

    // Add direct expenses
    const expenseCost = expenses
      .filter(exp => workPackage.id === exp.work_package_id)
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);

    const totalActual = laborCost + laborHoursCost + equipmentCost + expenseCost;
    const variance = budget - totalActual;
    const percentSpent = budget > 0 ? (totalActual / budget * 100) : 0;
    
    // CPI calculation
    const earnedValue = budget * (workPackage.percent_complete / 100);
    const cpi = totalActual > 0 ? (earnedValue / totalActual) : 0;
    
    // ETC - Estimate to Complete
    const etc = cpi > 0 ? ((budget - earnedValue) / cpi) : (budget - totalActual);
    const eac = totalActual + etc; // Estimate at Completion

    return {
      budget,
      totalActual,
      variance,
      percentSpent,
      cpi,
      earnedValue,
      etc,
      eac,
      breakdown: {
        laborCost,
        laborHoursCost,
        equipmentCost,
        expenseCost
      }
    };
  }, [workPackage, tasks, laborHours, equipmentUsage, expenses]);

  const isOverBudget = budgetAnalysis.variance < 0;
  const cpiStatus = budgetAnalysis.cpi >= 1 ? 'good' : budgetAnalysis.cpi >= 0.9 ? 'warning' : 'critical';

  return (
    <div className="space-y-4">
      {/* Budget Input */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm">Budget Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Budget at Award ($)</label>
            <Input
              type="number"
              value={workPackage.budget_at_award || ''}
              onChange={(e) => onUpdateBudget({ budget_at_award: parseFloat(e.target.value) || 0 })}
              className="bg-zinc-800 border-zinc-700"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Forecast at Completion ($)</label>
            <Input
              type="number"
              value={workPackage.forecast_at_completion || budgetAnalysis.eac.toFixed(2)}
              onChange={(e) => onUpdateBudget({ forecast_at_completion: parseFloat(e.target.value) || 0 })}
              className="bg-zinc-800 border-zinc-700"
              placeholder="Auto-calculated"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Auto-calculated: ${budgetAnalysis.eac.toFixed(0)} based on CPI
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className={`${isOverBudget ? 'bg-red-950/20 border-red-500/30' : 'bg-zinc-900 border-zinc-800'}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Budget Variance</div>
                <div className={`text-2xl font-bold ${isOverBudget ? 'text-red-400' : 'text-green-400'}`}>
                  ${Math.abs(budgetAnalysis.variance).toLocaleString()}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {budgetAnalysis.percentSpent.toFixed(1)}% spent
                </div>
              </div>
              {isOverBudget ? (
                <TrendingDown className="text-red-400" size={24} />
              ) : (
                <TrendingUp className="text-green-400" size={24} />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={`${
          cpiStatus === 'critical' ? 'bg-red-950/20 border-red-500/30' :
          cpiStatus === 'warning' ? 'bg-amber-950/20 border-amber-500/30' :
          'bg-green-950/20 border-green-500/30'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Cost Performance Index</div>
                <div className={`text-2xl font-bold ${
                  cpiStatus === 'critical' ? 'text-red-400' :
                  cpiStatus === 'warning' ? 'text-amber-400' :
                  'text-green-400'
                }`}>
                  {budgetAnalysis.cpi.toFixed(2)}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {cpiStatus === 'good' ? 'Under budget' : 
                   cpiStatus === 'warning' ? 'Near budget' : 
                   'Over budget'}
                </div>
              </div>
              <DollarSign className={
                cpiStatus === 'critical' ? 'text-red-400' :
                cpiStatus === 'warning' ? 'text-amber-400' :
                'text-green-400'
              } size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Breakdown */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm">Budget vs. Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded">
              <span className="text-sm text-zinc-300">Original Budget</span>
              <span className="font-mono font-bold">${budgetAnalysis.budget.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded">
              <span className="text-sm text-zinc-300">Earned Value ({workPackage.percent_complete}%)</span>
              <span className="font-mono font-bold text-blue-400">${budgetAnalysis.earnedValue.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded">
              <span className="text-sm text-zinc-300">Actual Cost</span>
              <span className="font-mono font-bold text-white">${budgetAnalysis.totalActual.toFixed(0)}</span>
            </div>
            <div className="border-t border-zinc-700 pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 pl-4">
                <span>• Labor (Time Logs)</span>
                <span className="font-mono">${budgetAnalysis.breakdown.laborCost.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400 pl-4">
                <span>• Labor Hours</span>
                <span className="font-mono">${budgetAnalysis.breakdown.laborHoursCost.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400 pl-4">
                <span>• Equipment</span>
                <span className="font-mono">${budgetAnalysis.breakdown.equipmentCost.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400 pl-4">
                <span>• Direct Expenses</span>
                <span className="font-mono">${budgetAnalysis.breakdown.expenseCost.toFixed(0)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded border-t-2 border-zinc-700">
              <span className="text-sm font-medium">Estimate to Complete</span>
              <span className="font-mono font-bold text-amber-400">${budgetAnalysis.etc.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded">
              <span className="text-sm font-medium">Estimate at Completion</span>
              <span className={`font-mono font-bold ${budgetAnalysis.eac > budgetAnalysis.budget ? 'text-red-400' : 'text-green-400'}`}>
                ${budgetAnalysis.eac.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span>Budget Utilization</span>
              <span>{budgetAnalysis.percentSpent.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  budgetAnalysis.percentSpent > 100 ? 'bg-red-500' :
                  budgetAnalysis.percentSpent > 90 ? 'bg-amber-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(budgetAnalysis.percentSpent, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {isOverBudget && (
        <Card className="bg-red-950/20 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-red-400 mb-1">Budget Overrun Alert</div>
                <p className="text-sm text-zinc-300">
                  Actual costs exceed budget by ${Math.abs(budgetAnalysis.variance).toLocaleString()}.
                  Current CPI: {budgetAnalysis.cpi.toFixed(2)}
                </p>
                <p className="text-xs text-zinc-400 mt-2">
                  Recommend: Review scope, identify cost drivers, consider change order.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {budgetAnalysis.cpi < 0.9 && !isOverBudget && (
        <Card className="bg-amber-950/20 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-amber-400 mb-1">Cost Performance Warning</div>
                <p className="text-sm text-zinc-300">
                  CPI at {budgetAnalysis.cpi.toFixed(2)} indicates inefficient cost performance.
                  Forecasted overrun: ${(budgetAnalysis.eac - budgetAnalysis.budget).toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}