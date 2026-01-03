import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export default function FinancialSummary({ project, financials, costCodes, expenses, changeOrders }) {
  // Calculate totals
  const budgetTotal = financials.reduce((sum, f) => sum + (Number(f.budget_amount) || 0), 0);
  const committedTotal = financials.reduce((sum, f) => sum + (Number(f.committed_amount) || 0), 0);
  const actualTotal = financials.reduce((sum, f) => sum + (Number(f.actual_amount) || 0), 0);
  const forecastTotal = financials.reduce((sum, f) => sum + (Number(f.forecast_amount) || 0), 0);

  const expenseTotal = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const approvedCOTotal = changeOrders
    .filter(co => co.status === 'approved')
    .reduce((sum, co) => sum + (Number(co.cost_impact) || 0), 0);

  const totalBudget = budgetTotal + approvedCOTotal;
  const remaining = totalBudget - actualTotal;
  const variance = totalBudget - forecastTotal;
  const percentSpent = totalBudget > 0 ? (actualTotal / totalBudget) * 100 : 0;

  // Cash flow projection (simplified - by month over next 6 months)
  const cashFlowData = generateCashFlowProjection(totalBudget, actualTotal, committedTotal, project);

  // Budget breakdown by category
  const categoryBreakdown = generateCategoryBreakdown(financials, costCodes);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 flex items-center gap-2">
              <DollarSign size={16} />
              Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">${totalBudget.toLocaleString()}</p>
            <p className="text-xs text-zinc-500 mt-1">Contract + Approved COs</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400">Committed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-400">${committedTotal.toLocaleString()}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {totalBudget > 0 ? ((committedTotal / totalBudget) * 100).toFixed(1) : 0}% of budget
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400">Actual Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-400">${actualTotal.toLocaleString()}</p>
            <Progress value={percentSpent} className="mt-2 h-2" />
            <p className="text-xs text-zinc-500 mt-1">{percentSpent.toFixed(1)}% spent</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 flex items-center gap-2">
              {variance >= 0 ? <TrendingUp size={16} className="text-green-500" /> : <TrendingDown size={16} className="text-red-500" />}
              Variance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {variance >= 0 ? '+' : ''}${variance.toLocaleString()}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Budget vs Forecast</p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Projection */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Cash Flow Projection (6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" stroke="#71717a" />
              <YAxis stroke="#71717a" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                labelStyle={{ color: '#a1a1aa' }}
                formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
              />
              <Area type="monotone" dataKey="projected" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Projected Spend" />
              <Area type="monotone" dataKey="actual" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Actual Spend" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Budget Breakdown by Category */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Budget vs Actual by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="category" stroke="#71717a" />
              <YAxis stroke="#71717a" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                labelStyle={{ color: '#a1a1aa' }}
                formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
              />
              <Legend />
              <Bar dataKey="budget" fill="#f59e0b" name="Budget" />
              <Bar dataKey="actual" fill="#3b82f6" name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Forecast Warning */}
      {forecastTotal > totalBudget && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
              <div>
                <p className="font-semibold text-red-400">Budget Overrun Warning</p>
                <p className="text-sm text-zinc-300 mt-1">
                  Forecast at completion (${forecastTotal.toLocaleString()}) exceeds budget by ${(forecastTotal - totalBudget).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function generateCashFlowProjection(totalBudget, actualSpent, committed, project) {
  const months = [];
  const startDate = new Date();
  const targetDate = project?.target_completion ? new Date(project.target_completion) : new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000);
  
  const monthsRemaining = Math.max(1, Math.ceil((targetDate - startDate) / (30 * 24 * 60 * 60 * 1000)));
  const remainingBudget = totalBudget - actualSpent;
  const monthlyProjected = remainingBudget / Math.min(monthsRemaining, 6);

  let cumulativeActual = actualSpent;
  let cumulativeProjected = actualSpent;

  for (let i = 0; i < 6; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    cumulativeProjected += monthlyProjected;
    cumulativeActual = i === 0 ? actualSpent : cumulativeActual;

    months.push({
      month: monthName,
      projected: Math.round(Math.min(cumulativeProjected, totalBudget)),
      actual: i === 0 ? Math.round(cumulativeActual) : null
    });
  }

  return months;
}

function generateCategoryBreakdown(financials, costCodes) {
  const categories = {};

  financials.forEach(f => {
    const costCode = costCodes.find(cc => cc.id === f.cost_code_id);
    const category = costCode?.category || 'Other';
    
    if (!categories[category]) {
      categories[category] = { budget: 0, actual: 0 };
    }
    
    categories[category].budget += Number(f.budget_amount) || 0;
    categories[category].actual += Number(f.actual_amount) || 0;
  });

  return Object.entries(categories).map(([category, data]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    budget: Math.round(data.budget),
    actual: Math.round(data.actual)
  }));
}