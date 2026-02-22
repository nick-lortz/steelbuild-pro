import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

export default function BudgetWidget({ projectId }) {
  const { data: financials = [], isLoading: financialsLoading } = useQuery({
    queryKey: ['financials', projectId],
    queryFn: () => base44.entities.Financial.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses', projectId],
    queryFn: () => base44.entities.Expense.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  if (financialsLoading || expensesLoading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={16} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-white">Budget vs Actual</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-zinc-800/50 rounded w-full" />
          <div className="h-6 bg-zinc-800/50 rounded w-full" />
          <div className="h-6 bg-zinc-800/50 rounded w-full" />
        </div>
      </div>
    );
  }

  const totalBudget = financials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
  const totalActual = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const variance = totalBudget - totalActual;
  const variancePercent = totalBudget > 0 ? ((variance / totalBudget) * 100) : 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <DollarSign size={16} className="text-amber-500" />
        <h3 className="text-sm font-semibold text-white">Budget vs Actual</h3>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Budget</span>
          <span className="text-lg font-bold text-white">
            ${totalBudget.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-400">Actual</span>
          <span className="text-lg font-bold text-blue-400">
            ${totalActual.toLocaleString()}
          </span>
        </div>
        <div className="border-t border-zinc-800 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-400">Variance</span>
            <div className="flex items-center gap-2">
              {variance >= 0 ? (
                <TrendingUp size={14} className="text-green-400" />
              ) : (
                <TrendingDown size={14} className="text-red-400" />
              )}
              <span className={`text-lg font-bold ${variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${Math.abs(variance).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="text-xs text-zinc-500 text-right mt-1">
            {variancePercent >= 0 ? '+' : ''}{variancePercent.toFixed(1)}%
          </div>
        </div>
        <div className="bg-zinc-800/50 rounded p-3 mt-3">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Budget Used</span>
            <span className="text-white font-medium">
              {totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}