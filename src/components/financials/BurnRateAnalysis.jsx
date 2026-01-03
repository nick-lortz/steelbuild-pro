import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Calendar, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { differenceInDays, format, addDays } from 'date-fns';

/**
 * Track spending velocity and project runway
 */
export default function BurnRateAnalysis({ expenses, financials, projects, selectedProject }) {
  const analysis = React.useMemo(() => {
    const filtered = selectedProject === 'all'
      ? expenses
      : expenses.filter(e => e.project_id === selectedProject);

    const projectFinancials = selectedProject === 'all'
      ? financials
      : financials.filter(f => f.project_id === selectedProject);

    // Sort expenses by date
    const sortedExpenses = [...filtered]
      .filter(e => e.expense_date && (e.payment_status === 'paid' || e.payment_status === 'approved'))
      .sort((a, b) => new Date(a.expense_date) - new Date(b.expense_date));

    if (sortedExpenses.length === 0) {
      return {
        dailyBurnRate: 0,
        weeklyBurnRate: 0,
        monthlyBurnRate: 0,
        remainingBudget: 0,
        daysRemaining: 0,
        projectedCompletion: null,
        trend: 'stable',
        chartData: [],
        cumulativeData: []
      };
    }

    // Calculate total budget and spent
    const totalBudget = projectFinancials.reduce((sum, f) => sum + (Number(f.budget_amount) || 0), 0);
    const totalSpent = projectFinancials.reduce((sum, f) => sum + (Number(f.actual_amount) || 0), 0);
    const remainingBudget = totalBudget - totalSpent;

    // Calculate time period
    const firstExpense = new Date(sortedExpenses[0].expense_date);
    const lastExpense = new Date(sortedExpenses[sortedExpenses.length - 1].expense_date);
    const daysPassed = Math.max(1, differenceInDays(lastExpense, firstExpense));

    // Calculate burn rates
    const dailyBurnRate = totalSpent / daysPassed;
    const weeklyBurnRate = dailyBurnRate * 7;
    const monthlyBurnRate = dailyBurnRate * 30;

    // Calculate runway
    const daysRemaining = dailyBurnRate > 0 ? remainingBudget / dailyBurnRate : Infinity;
    const projectedCompletion = dailyBurnRate > 0 ? addDays(new Date(), daysRemaining) : null;

    // Calculate trend (last 30 days vs previous 30 days)
    const thirtyDaysAgo = addDays(new Date(), -30);
    const sixtyDaysAgo = addDays(new Date(), -60);
    
    const recentExpenses = sortedExpenses.filter(e => new Date(e.expense_date) >= thirtyDaysAgo);
    const previousExpenses = sortedExpenses.filter(e => {
      const date = new Date(e.expense_date);
      return date >= sixtyDaysAgo && date < thirtyDaysAgo;
    });

    const recentTotal = recentExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const previousTotal = previousExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    let trend = 'stable';
    if (recentTotal > previousTotal * 1.1) trend = 'increasing';
    else if (recentTotal < previousTotal * 0.9) trend = 'decreasing';

    // Generate daily spending chart data
    const dailySpending = {};
    sortedExpenses.forEach(e => {
      const date = format(new Date(e.expense_date), 'yyyy-MM-dd');
      dailySpending[date] = (dailySpending[date] || 0) + (Number(e.amount) || 0);
    });

    const chartData = Object.entries(dailySpending)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-90) // Last 90 days
      .map(([date, amount]) => ({
        date: format(new Date(date), 'MMM d'),
        fullDate: date,
        spending: amount
      }));

    // Generate cumulative spending data
    let cumulative = 0;
    const cumulativeData = chartData.map(item => {
      cumulative += item.spending;
      return {
        ...item,
        cumulative,
        budget: totalBudget
      };
    });

    return {
      dailyBurnRate,
      weeklyBurnRate,
      monthlyBurnRate,
      remainingBudget,
      daysRemaining,
      projectedCompletion,
      trend,
      totalBudget,
      totalSpent,
      chartData,
      cumulativeData
    };
  }, [expenses, financials, selectedProject]);

  const getTrendIcon = () => {
    if (analysis.trend === 'increasing') return <TrendingUp className="text-red-400" size={20} />;
    if (analysis.trend === 'decreasing') return <TrendingDown className="text-green-400" size={20} />;
    return <div className="w-5 h-5 border-b-2 border-amber-400" />;
  };

  const getTrendColor = () => {
    if (analysis.trend === 'increasing') return 'text-red-400';
    if (analysis.trend === 'decreasing') return 'text-green-400';
    return 'text-amber-400';
  };

  return (
    <div className="space-y-6">
      {/* Burn Rate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Daily Burn Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">
                  ${(analysis.dailyBurnRate || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-zinc-500 mt-1">per day</p>
              </div>
              <DollarSign className="text-amber-400" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Weekly Burn Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">
                  ${(analysis.weeklyBurnRate || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-zinc-500 mt-1">per week</p>
              </div>
              <DollarSign className="text-blue-400" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Monthly Burn Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">
                  ${(analysis.monthlyBurnRate || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-zinc-500 mt-1">per month</p>
              </div>
              <DollarSign className="text-purple-400" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-2xl font-bold ${getTrendColor()}`}>
                  {analysis.trend}
                </p>
                <p className="text-xs text-zinc-500 mt-1">30-day comparison</p>
              </div>
              {getTrendIcon()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Runway Analysis */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar size={20} />
            Budget Runway
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-zinc-400 mb-2">Remaining Budget</p>
              <p className={`text-3xl font-bold ${analysis.remainingBudget < 0 ? 'text-red-400' : 'text-white'}`}>
                ${Math.abs(analysis.remainingBudget || 0).toLocaleString()}
              </p>
              {analysis.remainingBudget < 0 && (
                <p className="text-xs text-red-400 mt-1">Over budget</p>
              )}
            </div>

            <div>
              <p className="text-sm text-zinc-400 mb-2">Days Remaining</p>
              <p className={`text-3xl font-bold ${
                analysis.daysRemaining < 30 ? 'text-red-400' : 
                analysis.daysRemaining < 90 ? 'text-amber-400' : 
                'text-green-400'
              }`}>
                {analysis.daysRemaining === Infinity ? '∞' : Math.floor(analysis.daysRemaining)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {analysis.daysRemaining !== Infinity && `≈ ${Math.floor(analysis.daysRemaining / 30)} months`}
              </p>
            </div>

            <div>
              <p className="text-sm text-zinc-400 mb-2">Projected Depletion</p>
              <p className="text-xl font-bold text-white">
                {analysis.projectedCompletion ? format(analysis.projectedCompletion, 'MMM d, yyyy') : 'N/A'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">at current burn rate</p>
            </div>
          </div>

          {analysis.daysRemaining < 60 && analysis.daysRemaining !== Infinity && (
            <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">Budget Runway Critical</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Less than 60 days of runway remaining at current spending rate
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spending Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-white">Daily Spending (Last 90 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={analysis.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis 
                  dataKey="date" 
                  stroke="#a1a1aa" 
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#a1a1aa" 
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                  formatter={(value) => `$${value.toLocaleString()}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="spending" 
                  stroke="#f59e0b" 
                  fill="#f59e0b" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-white">Cumulative Spending vs Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analysis.cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis 
                  dataKey="date" 
                  stroke="#a1a1aa" 
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#a1a1aa" 
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                  formatter={(value) => `$${value.toLocaleString()}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={false}
                  name="Spent"
                />
                <Line 
                  type="monotone" 
                  dataKey="budget" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Budget"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}