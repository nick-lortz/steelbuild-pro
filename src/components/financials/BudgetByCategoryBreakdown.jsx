import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#6366f1'];

export default function BudgetByCategoryBreakdown({ financials, costCodes, expenses = [] }) {
  // Group by cost code category
  const categoryData = costCodes.reduce((acc, code) => {
    const category = code.category || 'other';
    const categoryFinancials = financials.filter((f) => f.cost_code_id === code.id);
    const budget = categoryFinancials.reduce((sum, f) => sum + (f.current_budget || f.budget_amount || 0), 0);
    
    // Actual costs come from Expense entity (source of truth)
    // Only count paid/approved expenses as actual cost
    const categoryExpenses = expenses.filter((e) =>
      e.cost_code_id === code.id && (
        e.payment_status === 'paid' || e.payment_status === 'approved'
      )
    );
    const actual = categoryExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    if (!acc[category]) {
      acc[category] = { budget: 0, actual: 0 };
    }
    acc[category].budget += budget;
    acc[category].actual += actual;
    return acc;
  }, {});

  const chartData = Object.entries(categoryData).map(([name, data]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    budget: data.budget,
    actual: data.actual
  })).filter((d) => d.budget > 0);

  const pieData = chartData.map((d) => ({
    name: d.name,
    value: d.budget
  }));

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-slate-50 text-lg font-semibold tracking-tight">Budget by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value">

              {pieData.map((entry, index) =>
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              )}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
              formatter={(value) => `$${value.toLocaleString()}`} />

          </PieChart>
        </ResponsiveContainer>
        
        {/* Category Table */}
        <div className="mt-4 space-y-2">
          {chartData.map((cat, idx) => {
            const variance = cat.budget - cat.actual;
            const percentSpent = cat.budget > 0 ? cat.actual / cat.budget * 100 : 0;
            return (
              <div key={cat.name} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }} />

                  <span className="text-sm text-zinc-300">{cat.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">
                    ${cat.actual.toLocaleString()} / ${cat.budget.toLocaleString()}
                  </p>
                  <p className={`text-xs ${variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {percentSpent.toFixed(0)}% spent
                  </p>
                </div>
              </div>);

          })}
        </div>
      </CardContent>
    </Card>);

}