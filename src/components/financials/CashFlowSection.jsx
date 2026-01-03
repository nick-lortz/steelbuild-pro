import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function CashFlowSection({ expenses = [], changeOrders = [], clientInvoices = [] }) {
  // Group expenses by month
  const monthlyData = expenses.reduce((acc, expense) => {
    if (!expense.expense_date) return acc;
    const month = new Date(expense.expense_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    if (!acc[month]) {
      acc[month] = { month, expenses: 0, income: 0 };
    }
    if (expense.payment_status === 'paid') {
      acc[month].expenses += expense.amount || 0;
    }
    return acc;
  }, {});

  // Add paid client invoices as income
  clientInvoices.forEach((inv) => {
    if (inv.payment_status === 'paid' && inv.paid_date) {
      const month = new Date(inv.paid_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (!monthlyData[month]) {
        monthlyData[month] = { month, expenses: 0, income: 0 };
      }
      monthlyData[month].income += inv.total_amount || 0;
    }
  });

  // Add approved change orders as income
  changeOrders.forEach((co) => {
    if (co.status === 'approved' && co.approved_date) {
      const month = new Date(co.approved_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (monthlyData[month]) {
        monthlyData[month].income += co.cost_impact || 0;
      }
    }
  });

  const chartData = Object.values(monthlyData).slice(-6);

  const totalCashOut = chartData.reduce((sum, d) => sum + d.expenses, 0);
  const totalCashIn = chartData.reduce((sum, d) => sum + d.income, 0);
  const netCashFlow = totalCashIn - totalCashOut;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Cash Out</p>
                <p className="text-xl font-bold text-red-400">
                  ${totalCashOut.toLocaleString()}
                </p>
              </div>
              <TrendingDown className="text-red-500" size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Cash In</p>
                <p className="text-xl font-bold text-green-400">
                  ${totalCashIn.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="text-green-500" size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className={`${netCashFlow >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Net Flow</p>
                <p className={`text-xl font-bold ${netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {netCashFlow >= 0 ? '+' : ''}${netCashFlow.toLocaleString()}
                </p>
              </div>
              <DollarSign className={netCashFlow >= 0 ? 'text-green-500' : 'text-red-500'} size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-slate-50 text-lg font-semibold tracking-tight">Cash Flow Trend (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="month" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                formatter={(value) => `$${value.toLocaleString()}`} />

              <Legend />
              <Bar dataKey="income" fill="#10b981" name="Cash In" />
              <Bar dataKey="expenses" fill="#ef4444" name="Cash Out" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>);

}