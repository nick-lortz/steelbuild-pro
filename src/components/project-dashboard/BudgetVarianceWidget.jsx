import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, ChevronDown, ChevronRight } from 'lucide-react';

export default function BudgetVarianceWidget({ financials, costCodes, expenses }) {
  const [expandedCodes, setExpandedCodes] = useState(new Set());

  const budgetData = useMemo(() => {
    const codeMap = new Map();

    financials.forEach(financial => {
      const costCode = costCodes.find(c => c.id === financial.cost_code_id);
      if (!costCode) return;

      const budget = Number(financial.budget_amount) || 0;
      const actualFromFinancial = Number(financial.actual_amount) || 0;
      
      // Roll up expenses
      const relatedExpenses = expenses.filter(exp => 
        exp.project_id === financial.project_id && 
        exp.cost_code_id === financial.cost_code_id &&
        (exp.payment_status === 'paid' || exp.payment_status === 'approved')
      );
      const expenseTotal = relatedExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
      
      const actual = actualFromFinancial + expenseTotal;
      const variance = budget - actual;
      const variancePercent = budget > 0 ? ((variance / budget) * 100) : 0;

      codeMap.set(costCode.id, {
        code: costCode.code,
        name: costCode.name,
        budget,
        actual,
        variance,
        variancePercent,
        category: costCode.category,
      });
    });

    return Array.from(codeMap.values())
      .sort((a, b) => Math.abs(a.variancePercent) - Math.abs(b.variancePercent))
      .reverse()
      .slice(0, 10);
  }, [financials, costCodes, expenses]);

  const toggleCode = (code) => {
    const newExpanded = new Set(expandedCodes);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpandedCodes(newExpanded);
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp size={18} className="text-amber-500" />
          Budget Variance by Cost Code (Top 10)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={budgetData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis type="number" stroke="#a1a1aa" />
            <YAxis type="category" dataKey="code" stroke="#a1a1aa" width={80} />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
              labelStyle={{ color: '#f4f4f5' }}
              formatter={(value) => `${value.toFixed(1)}%`}
            />
            <Bar dataKey="variancePercent" radius={[0, 4, 4, 0]}>
              {budgetData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.variance >= 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Detailed List */}
        <div className="mt-6 space-y-2">
          {budgetData.map((item) => (
            <div key={item.code} className="border border-zinc-800 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCode(item.code)}
                className="w-full p-3 bg-zinc-900 hover:bg-zinc-800 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {expandedCodes.has(item.code) ? (
                    <ChevronDown size={16} className="text-zinc-400" />
                  ) : (
                    <ChevronRight size={16} className="text-zinc-400" />
                  )}
                  <div className="text-left">
                    <p className="font-mono text-amber-500 text-sm">{item.code}</p>
                    <p className="text-xs text-zinc-400">{item.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">Variance</p>
                    <p className={`text-sm font-medium ${item.variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {item.variance >= 0 ? '+' : ''}${Math.abs(item.variance).toLocaleString()}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 ${item.variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {item.variance >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <span className="text-sm font-medium">{Math.abs(item.variancePercent).toFixed(1)}%</span>
                  </div>
                </div>
              </button>
              
              {expandedCodes.has(item.code) && (
                <div className="p-4 bg-zinc-950 border-t border-zinc-800">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-400 text-xs mb-1">Budget</p>
                      <p className="text-white font-medium">${item.budget.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-xs mb-1">Actual</p>
                      <p className="text-white font-medium">${item.actual.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-xs mb-1">Category</p>
                      <p className="text-white font-medium capitalize">{item.category}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}