import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { format, subDays } from 'date-fns';

export default function TrendForecast({ expenses = [], financials = [], projectId }) {
  // Generate 90-day burn rate with linear regression forecast
  const forecastData = useMemo(() => {
    if (!projectId || financials.length === 0) return [];
    
    const projectFinancials = financials.filter(f => f.project_id === projectId);
    const projectExpenses = expenses.filter(e => e.project_id === projectId);
    
    const budget = projectFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
    const today = new Date();
    const days = [];
    
    // Build 90-day historical data with cumulative costs
    for (let i = 90; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const cumulativeCost = projectExpenses
        .filter(e => e.expense_date && e.expense_date <= dateStr)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      
      days.push({
        date: format(date, 'MMM d'),
        actual: cumulativeCost,
        budget: budget
      });
    }
    
    // Linear regression for forecast
    const n = days.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = days.map(d => d.actual);
    
    const xMean = x.reduce((a, b) => a + b) / n;
    const yMean = y.reduce((a, b) => a + b) / n;
    
    const slope = x.reduce((sum, xi, i) => sum + (xi - xMean) * (y[i] - yMean), 0) / 
                  x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0);
    const intercept = yMean - slope * xMean;
    
    // Add forecast points (next 30 days)
    for (let i = 1; i <= 30; i++) {
      const forecastValue = intercept + slope * (n + i - 1);
      days.push({
        date: format(new Date(today.getTime() + i * 24 * 60 * 60 * 1000), 'MMM d'),
        forecast: Math.max(0, forecastValue),
        budget: budget,
        isForecast: true
      });
    }
    
    return days;
  }, [expenses, financials, projectId]);
  
  // ETC calculation
  const etc = useMemo(() => {
    if (!projectId || financials.length === 0) return null;
    
    const projectFinancials = financials.filter(f => f.project_id === projectId);
    const projectExpenses = expenses.filter(e => e.project_id === projectId);
    
    const budget = projectFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
    const actual = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const remaining = budget - actual;
    
    // Calculate daily burn rate from last 30 days
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    const recentExpenses = projectExpenses
      .filter(e => e.expense_date && e.expense_date >= format(thirtyDaysAgo, 'yyyy-MM-dd'))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const dailyBurnRate = recentExpenses / 30;
    const daysToComplete = dailyBurnRate > 0 ? remaining / dailyBurnRate : 0;
    
    return {
      daysToComplete: Math.max(0, daysToComplete),
      dailyBurnRate,
      remaining,
      actual,
      budget,
      percentSpent: budget > 0 ? (actual / budget) * 100 : 0
    };
  }, [expenses, financials, projectId]);

  if (!forecastData.length) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-zinc-400">No expense data for forecast</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp size={18} />
            90-Day Burn Rate & Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="#888" tick={{ fontSize: 12 }} />
              <YAxis stroke="#888" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                formatter={(value) => `$${Math.round(value).toLocaleString()}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="#10b981" 
                name="Actual Spend" 
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="forecast" 
                stroke="#f59e0b" 
                name="Forecast" 
                strokeWidth={2}
                strokeDasharray="5 5"
                isAnimationActive={false}
              />
              <Line 
                type="linear" 
                dataKey="budget" 
                stroke="#ef4444" 
                name="Budget Limit" 
                strokeWidth={1}
                strokeDasharray="3 3"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {etc && (
        <Card className={`border-l-4 ${etc.percentSpent > 90 ? 'border-l-red-500 bg-red-950/10' : 'bg-zinc-900 border-l-amber-500 border-zinc-800'}`}>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-zinc-400 mb-1">Days to Complete</p>
                <p className="text-xl font-bold text-white">{etc.daysToComplete.toFixed(0)}</p>
                <p className="text-[10px] text-zinc-500 mt-1">@ ${etc.dailyBurnRate.toFixed(0)}/day</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-1">Remaining Budget</p>
                <p className={`text-xl font-bold ${etc.remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${etc.remaining.toLocaleString()}
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">of ${etc.budget.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-1">Spent</p>
                <p className="text-xl font-bold text-white">{etc.percentSpent.toFixed(1)}%</p>
                <p className="text-[10px] text-zinc-500 mt-1">${etc.actual.toLocaleString()}</p>
              </div>
              {etc.percentSpent > 90 && (
                <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded">
                  <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-red-400">Budget alert: {(100 - etc.percentSpent).toFixed(1)}% remaining</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}