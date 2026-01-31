import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function BudgetForecastChart({ lineItems, expenses, budgetTotal }) {
  const chartData = useMemo(() => {
    const categories = ['labor', 'material', 'equipment', 'subcontract', 'other'];
    
    return categories.map(category => {
      const items = lineItems.filter(item => item.category === category);
      const budgeted = items.reduce((sum, item) => sum + (item.budgeted_amount || 0), 0);
      const committed = items.reduce((sum, item) => sum + (item.committed_amount || 0), 0);
      const actual = items.reduce((sum, item) => sum + (item.actual_amount || 0), 0);
      const forecast = items.reduce((sum, item) => sum + (item.forecast_amount || 0), 0);

      return {
        category: category.charAt(0).toUpperCase() + category.slice(1),
        budgeted,
        committed,
        actual,
        forecast,
        variance: budgeted - forecast
      };
    });
  }, [lineItems]);

  const trendData = useMemo(() => {
    // Group expenses by month
    const monthlyData = {};
    expenses.forEach(expense => {
      const month = expense.expense_date?.substring(0, 7) || 'Unknown';
      if (!monthlyData[month]) {
        monthlyData[month] = { month, actual: 0 };
      }
      monthlyData[month].actual += expense.amount || 0;
    });

    // Calculate cumulative
    const sorted = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    let cumulative = 0;
    return sorted.map(item => {
      cumulative += item.actual;
      return {
        month: item.month,
        actual: item.actual,
        cumulative,
        budget: budgetTotal / sorted.length // Simplified linear projection
      };
    });
  }, [expenses, budgetTotal]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Forecast by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={formatCurrency} />
              <Legend />
              <Bar dataKey="budgeted" fill="#3b82f6" name="Budgeted" />
              <Bar dataKey="actual" fill="#10b981" name="Actual" />
              <Bar dataKey="forecast" fill="#f59e0b" name="Forecast" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost Variance Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={formatCurrency} />
              <Legend />
              <Bar dataKey="variance" fill="#8b5cf6" name="Variance (Budget - Forecast)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {trendData.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Spending Trend & Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip formatter={formatCurrency} />
                <Legend />
                <Line type="monotone" dataKey="cumulative" stroke="#3b82f6" strokeWidth={2} name="Cumulative Actual" />
                <Line type="monotone" dataKey="budget" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Budgeted (Linear)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}