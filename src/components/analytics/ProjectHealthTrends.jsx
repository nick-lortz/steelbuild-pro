import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

export default function ProjectHealthTrends({ projects, expenses, tasks, dateRange }) {
  const trendData = useMemo(() => {
    if (!projects.length) return [];

    return projects
      .filter(p => {
        if (!dateRange?.start || !dateRange?.end) return true;
        const projectStart = p.start_date ? parseISO(p.start_date) : null;
        return projectStart && projectStart >= parseISO(dateRange.start) && projectStart <= parseISO(dateRange.end);
      })
      .map(project => {
        // Get project tasks first (used in multiple calculations)
        const projectTasks = tasks.filter(t => t.project_id === project.id);
        
        // Schedule variance
        let scheduleVariance = 0;
        let scheduleStatus = 'on-track';
        if (project.start_date && project.target_completion) {
          const start = parseISO(project.start_date);
          const target = parseISO(project.target_completion);
          const today = new Date();
          const totalDays = differenceInDays(target, start);
          const daysElapsed = differenceInDays(today, start);
          
          const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
          const totalTasks = projectTasks.length;
          const actualProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
          const expectedProgress = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;
          
          scheduleVariance = actualProgress - expectedProgress;
          scheduleStatus = scheduleVariance < -10 ? 'behind' : scheduleVariance > 10 ? 'ahead' : 'on-track';
        }

        // Budget variance
        const projectExpenses = expenses.filter(e => e.project_id === project.id);
        const actualCost = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const budgetedCost = project.contract_value || 0;
        const costVariance = budgetedCost > 0 ? ((budgetedCost - actualCost) / budgetedCost) * 100 : 0;
        const costStatus = costVariance < -5 ? 'over-budget' : costVariance > 5 ? 'under-budget' : 'on-budget';

        // Baseline hours variance
        const baselineTotal = (project.baseline_shop_hours || 0) + (project.baseline_field_hours || 0);
        const actualHours = projectTasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0);
        const hoursVariance = baselineTotal > 0 ? ((baselineTotal - actualHours) / baselineTotal) * 100 : 0;

        return {
          name: project.project_number,
          fullName: project.name,
          scheduleVariance: parseFloat(scheduleVariance.toFixed(1)),
          scheduleStatus,
          costVariance: parseFloat(costVariance.toFixed(1)),
          costStatus,
          hoursVariance: parseFloat(hoursVariance.toFixed(1)),
          actualCost,
          budgetedCost,
          actualHours,
          baselineHours: baselineTotal,
          status: project.status
        };
      })
      .filter(p => p.status === 'in_progress' || p.status === 'awarded');
  }, [projects, expenses, tasks, dateRange]);

  const summaryMetrics = useMemo(() => {
    if (!trendData.length) return null;

    const behind = trendData.filter(p => p.scheduleStatus === 'behind').length;
    const overBudget = trendData.filter(p => p.costStatus === 'over-budget').length;
    const avgScheduleVar = trendData.reduce((sum, p) => sum + p.scheduleVariance, 0) / trendData.length;
    const avgCostVar = trendData.reduce((sum, p) => sum + p.costVariance, 0) / trendData.length;

    return { behind, overBudget, avgScheduleVar, avgCostVar };
  }, [trendData]);

  if (!trendData.length) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-12 text-center">
          <p className="text-zinc-500">No active projects to display</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      {summaryMetrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Projects Behind</div>
              <div className={`text-2xl font-bold ${summaryMetrics.behind > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {summaryMetrics.behind}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Over Budget</div>
              <div className={`text-2xl font-bold ${summaryMetrics.overBudget > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {summaryMetrics.overBudget}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Avg Schedule Var</div>
              <div className={`text-2xl font-bold ${summaryMetrics.avgScheduleVar < 0 ? 'text-red-400' : 'text-green-400'}`}>
                {summaryMetrics.avgScheduleVar.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Avg Cost Var</div>
              <div className={`text-2xl font-bold ${summaryMetrics.avgCostVar < 0 ? 'text-red-400' : 'text-green-400'}`}>
                {summaryMetrics.avgCostVar.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Schedule Variance Chart */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar size={16} className="text-amber-500" />
            Schedule Performance (% Variance)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="name" stroke="#a1a1aa" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#a1a1aa" label={{ value: '% Variance', angle: -90, position: 'insideLeft', fill: '#a1a1aa' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                formatter={(value, name) => [
                  `${value > 0 ? '+' : ''}${value}%`,
                  name === 'scheduleVariance' ? 'Schedule Variance' : name
                ]}
              />
              <Legend />
              <Bar 
                dataKey="scheduleVariance" 
                fill="#3b82f6"
                name="Schedule Variance"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Budget vs Actual Chart */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign size={16} className="text-amber-500" />
            Budget vs Actual Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="name" stroke="#a1a1aa" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#a1a1aa" tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                formatter={(value, name) => [`$${value.toLocaleString()}`, name]}
              />
              <Legend />
              <Bar dataKey="budgetedCost" fill="#10b981" name="Budgeted" />
              <Bar dataKey="actualCost" fill="#ef4444" name="Actual" />
              <Line dataKey="costVariance" stroke="#f59e0b" name="Variance %" strokeWidth={2} yAxisId="variance" />
              <YAxis yAxisId="variance" orientation="right" stroke="#f59e0b" tickFormatter={(val) => `${val}%`} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Baseline Hours vs Actual */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-500" />
            Baseline Hours vs Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="name" stroke="#a1a1aa" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#a1a1aa" label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#a1a1aa' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                formatter={(value) => [`${value.toLocaleString()} hrs`, '']}
              />
              <Legend />
              <Bar dataKey="baselineHours" fill="#8b5cf6" name="Baseline" />
              <Bar dataKey="actualHours" fill="#f59e0b" name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Health Status Summary Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Project Health Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left p-3 text-xs text-zinc-400 uppercase">Project</th>
                  <th className="text-left p-3 text-xs text-zinc-400 uppercase">Schedule</th>
                  <th className="text-left p-3 text-xs text-zinc-400 uppercase">Cost</th>
                  <th className="text-right p-3 text-xs text-zinc-400 uppercase">Hours Var</th>
                </tr>
              </thead>
              <tbody>
                {trendData.map(proj => (
                  <tr key={proj.name} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="p-3">
                      <p className="font-medium text-white text-sm">{proj.name}</p>
                      <p className="text-xs text-zinc-500 truncate max-w-[200px]">{proj.fullName}</p>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {proj.scheduleVariance >= 0 ? 
                          <TrendingUp size={14} className="text-green-400" /> : 
                          <TrendingDown size={14} className="text-red-400" />
                        }
                        <span className={proj.scheduleVariance >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {proj.scheduleVariance > 0 ? '+' : ''}{proj.scheduleVariance}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {proj.costVariance >= 0 ? 
                          <TrendingUp size={14} className="text-green-400" /> : 
                          <TrendingDown size={14} className="text-red-400" />
                        }
                        <span className={proj.costVariance >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {proj.costVariance > 0 ? '+' : ''}{proj.costVariance}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span className={proj.hoursVariance >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {proj.hoursVariance > 0 ? '+' : ''}{proj.hoursVariance.toFixed(1)}%
                      </span>
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