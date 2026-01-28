import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

export default function CostVarianceReport({ 
  workPackages = [], 
  tasks = [],
  laborHours = [],
  equipmentUsage = [],
  expenses = []
}) {
  const analysis = useMemo(() => {
    return workPackages.map(wp => {
      const wpTasks = tasks.filter(t => t.work_package_id === wp.id);
      
      // Calculate actual costs from time tracking
      const laborCost = wpTasks.reduce((sum, task) => {
        const taskCost = (task.time_logs || []).reduce((logSum, log) => 
          logSum + (log.hours * 50), 0
        );
        return sum + taskCost;
      }, 0);

      const laborHoursCost = laborHours
        .filter(lh => lh.work_package_id === wp.id)
        .reduce((sum, lh) => {
          const regularHours = lh.hours || 0;
          const otHours = lh.overtime_hours || 0;
          const rate = 50;
          return sum + ((regularHours + (otHours * 1.5)) * rate);
        }, 0);

      const equipCost = equipmentUsage
        .filter(eu => eu.work_package_id === wp.id)
        .reduce((sum, eu) => {
          const hours = eu.hours || 0;
          const days = eu.days || 0;
          const rate = eu.rate_override || 0;
          return sum + (hours * rate) + (days * rate);
        }, 0);

      const expenseCost = expenses
        .filter(exp => exp.work_package_id === wp.id)
        .reduce((sum, exp) => sum + (exp.amount || 0), 0);

      const totalActual = laborCost + laborHoursCost + equipCost + expenseCost;
      const budget = wp.budget_at_award || 0;
      const earnedValue = budget * ((wp.percent_complete || 0) / 100);
      const cpi = totalActual > 0 ? (earnedValue / totalActual) : 0;
      const variance = budget - totalActual;
      const variancePercent = budget > 0 ? (variance / budget * 100) : 0;

      return {
        name: wp.title,
        wpid: wp.wpid,
        budget,
        actual: totalActual,
        earned: earnedValue,
        variance,
        variancePercent,
        cpi,
        phase: wp.phase,
        status: wp.status
      };
    });
  }, [workPackages, tasks, laborHours, equipmentUsage, expenses]);

  const chartData = analysis.map(item => ({
    name: item.wpid || item.name.substring(0, 15),
    Budget: item.budget,
    Actual: item.actual,
    Earned: item.earned
  }));

  const totalBudget = analysis.reduce((sum, a) => sum + a.budget, 0);
  const totalActual = analysis.reduce((sum, a) => sum + a.actual, 0);
  const totalVariance = totalBudget - totalActual;
  const overBudgetCount = analysis.filter(a => a.variance < 0).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Total Budget</div>
            <div className="text-2xl font-bold">${(totalBudget / 1000).toFixed(0)}K</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Actual Cost</div>
            <div className="text-2xl font-bold">${(totalActual / 1000).toFixed(0)}K</div>
          </CardContent>
        </Card>
        <Card className={totalVariance < 0 ? 'bg-red-950/20 border-red-500/30' : 'bg-green-950/20 border-green-500/30'}>
          <CardContent className="p-4">
            <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Variance</div>
            <div className={`text-2xl font-bold ${totalVariance < 0 ? 'text-red-400' : 'text-green-400'}`}>
              ${(totalVariance / 1000).toFixed(0)}K
            </div>
          </CardContent>
        </Card>
        <Card className={overBudgetCount > 0 ? 'bg-amber-950/20 border-amber-500/30' : 'bg-zinc-900 border-zinc-800'}>
          <CardContent className="p-4">
            <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Over Budget</div>
            <div className={`text-2xl font-bold ${overBudgetCount > 0 ? 'text-amber-400' : 'text-white'}`}>
              {overBudgetCount} WP
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm">Budget vs. Actual by Work Package</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" fontSize={11} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Bar dataKey="Budget" fill="#3f3f46" />
              <Bar dataKey="Actual" fill="#f59e0b" />
              <Line type="monotone" dataKey="Earned" stroke="#22c55e" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm">Cost Variance Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs text-zinc-400 uppercase tracking-wider py-2">WP</th>
                  <th className="text-right text-xs text-zinc-400 uppercase tracking-wider py-2">Budget</th>
                  <th className="text-right text-xs text-zinc-400 uppercase tracking-wider py-2">Actual</th>
                  <th className="text-right text-xs text-zinc-400 uppercase tracking-wider py-2">Variance</th>
                  <th className="text-right text-xs text-zinc-400 uppercase tracking-wider py-2">CPI</th>
                  <th className="text-left text-xs text-zinc-400 uppercase tracking-wider py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {analysis.map((item, idx) => (
                  <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="py-3">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-zinc-500">{item.wpid}</div>
                    </td>
                    <td className="text-right font-mono">${item.budget.toFixed(0)}</td>
                    <td className="text-right font-mono">${item.actual.toFixed(0)}</td>
                    <td className={`text-right font-mono font-medium ${item.variance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      ${item.variance.toFixed(0)}
                      <div className="text-xs">({item.variancePercent.toFixed(1)}%)</div>
                    </td>
                    <td className={`text-right font-mono font-bold ${
                      item.cpi >= 1 ? 'text-green-400' :
                      item.cpi >= 0.9 ? 'text-amber-400' :
                      'text-red-400'
                    }`}>
                      {item.cpi.toFixed(2)}
                    </td>
                    <td>
                      {item.variance < 0 ? (
                        <Badge className="bg-red-500/20 text-red-400">Over</Badge>
                      ) : (
                        <Badge className="bg-green-500/20 text-green-400">Under</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}