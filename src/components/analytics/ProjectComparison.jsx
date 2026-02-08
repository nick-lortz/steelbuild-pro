import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function ProjectComparison({ projects = [], financials = [], tasks = [] }) {
  const [metric, setMetric] = useState('budget');

  const comparisonData = useMemo(() => {
    return projects.slice(0, 8).map(project => {
      const projFinancials = financials.filter(f => f.project_id === project.id);
      const projTasks = tasks.filter(t => t.project_id === project.id);
      
      const budget = projFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
      const actual = projFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      const variance = budget > 0 ? ((actual - budget) / budget) * 100 : 0;
      
      const completedTasks = projTasks.filter(t => t.status === 'completed').length;
      const progress = projTasks.length > 0 ? (completedTasks / projTasks.length) * 100 : 0;
      
      let daysSlip = 0;
      if (project.target_completion) {
        const target = new Date(project.target_completion);
        const latestEnd = projTasks
          .filter(t => t.end_date)
          .map(t => new Date(t.end_date))
          .sort((a, b) => b - a)[0];
        if (latestEnd && latestEnd > target) {
          daysSlip = Math.ceil((latestEnd - target) / (1000 * 60 * 60 * 24));
        }
      }
      
      return {
        name: project.project_number || project.name?.substring(0, 8),
        fullName: project.name,
        budget,
        actual,
        variance: parseFloat(variance.toFixed(1)),
        progress: parseFloat(progress.toFixed(1)),
        daysSlip,
        status: project.status
      };
    });
  }, [projects, financials, tasks]);

  const chartData = metric === 'budget' 
    ? comparisonData
    : metric === 'progress'
    ? comparisonData.sort((a, b) => b.progress - a.progress)
    : comparisonData.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

  const stats = useMemo(() => {
    const variances = comparisonData.map(p => p.variance);
    const avgVariance = variances.reduce((a, b) => a + b, 0) / variances.length;
    const overBudget = comparisonData.filter(p => p.variance > 0).length;
    
    const progress = comparisonData.map(p => p.progress);
    const avgProgress = progress.reduce((a, b) => a + b, 0) / progress.length;
    
    return { avgVariance, overBudget, avgProgress };
  }, [comparisonData]);

  return (
    <div className="space-y-4">
      {/* Metric Selector */}
      <div className="flex gap-2">
        <Button 
          onClick={() => setMetric('budget')}
          className={`text-xs ${metric === 'budget' ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-300'}`}
        >
          <DollarSign size={14} className="mr-1" />
          Budget
        </Button>
        <Button 
          onClick={() => setMetric('progress')}
          className={`text-xs ${metric === 'progress' ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-300'}`}
        >
          <TrendingUp size={14} className="mr-1" />
          Progress
        </Button>
        <Button 
          onClick={() => setMetric('variance')}
          className={`text-xs ${metric === 'variance' ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-300'}`}
        >
          <TrendingDown size={14} className="mr-1" />
          Variance
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-xs text-zinc-400">Avg Variance</p>
            <p className={`text-lg font-bold ${stats.avgVariance > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {stats.avgVariance > 0 ? '+' : ''}{stats.avgVariance.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-xs text-zinc-400">Over Budget</p>
            <p className="text-lg font-bold text-red-400">{stats.overBudget} / {comparisonData.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-3">
            <p className="text-xs text-zinc-400">Avg Progress</p>
            <p className="text-lg font-bold text-green-400">{stats.avgProgress.toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm">Multi-Project Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            {metric === 'budget' ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
                <Legend />
                <Bar dataKey="budget" fill="#3b82f6" name="Budget" />
                <Bar dataKey="actual" fill="#f59e0b" name="Actual" />
              </BarChart>
            ) : metric === 'progress' ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
                <Bar dataKey="progress" fill="#10b981" name="Progress %" />
              </BarChart>
            ) : (
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="budget" name="Budget" stroke="#888" />
                <YAxis dataKey="variance" name="Variance %" stroke="#888" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                  cursor={{ strokeDasharray: '3 3' }}
                />
                <Scatter name="Projects" data={chartData} fill="#f59e0b" />
              </ScatterChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm">Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {chartData.map((proj, idx) => (
              <div key={idx} className="p-2 bg-zinc-950 border border-zinc-800 rounded text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-semibold text-white">{proj.name}</span>
                  <Badge className={proj.variance > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
                    {proj.variance > 0 ? '+' : ''}{proj.variance}%
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-zinc-400">
                  <span>Budget: ${(proj.budget / 1000).toFixed(0)}K</span>
                  <span>Progress: {proj.progress.toFixed(0)}%</span>
                  <span>{proj.daysSlip > 0 ? `${proj.daysSlip}d slip` : 'On track'}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}