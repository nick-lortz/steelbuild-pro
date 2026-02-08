import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

/**
 * Calculate Earned Value Management metrics
 * @param {Array} financials - Financial data
 * @param {Array} tasks - Task data for progress tracking
 * @param {Array} projects - Project data
 */
export default function EarnedValueMetrics({ financials, tasks, projects, selectedProject }) {
  const metrics = React.useMemo(() => {
    const filtered = selectedProject === 'all' 
      ? financials 
      : financials.filter(f => f.project_id === selectedProject);

    // Planned Value (PV) - Budget
    const PV = filtered.reduce((sum, f) => sum + (Number(f.budget_amount) || 0), 0);
    
    // Actual Cost (AC)
    const AC = filtered.reduce((sum, f) => sum + (Number(f.actual_amount) || 0), 0);
    
    // Calculate Earned Value (EV) based on task completion
    let EV = 0;
    if (tasks && tasks.length > 0) {
      const projectTasks = selectedProject === 'all' 
        ? tasks 
        : tasks.filter(t => t.project_id === selectedProject);
      
      const totalEstimatedHours = projectTasks.reduce((sum, t) => sum + (Number(t.estimated_hours) || 0), 0);
      
      if (totalEstimatedHours > 0) {
        const earnedHours = projectTasks.reduce((sum, t) => {
          const progress = Number(t.progress_percent) || 0;
          const hours = Number(t.estimated_hours) || 0;
          return sum + (hours * progress / 100);
        }, 0);
        
        const overallProgress = earnedHours / totalEstimatedHours;
        EV = PV * overallProgress;
      } else {
        // Fallback to simple average if no hours
        const avgProgress = projectTasks.reduce((sum, t) => sum + (Number(t.progress_percent) || 0), 0) / (projectTasks.length || 1);
        EV = PV * (avgProgress / 100);
      }
    }

    // Cost Variance (CV) = EV - AC
    const CV = EV - AC;
    
    // Schedule Variance (SV) = EV - PV
    const SV = EV - PV;
    
    // Cost Performance Index (CPI) = EV / AC
    const CPI = AC > 0 ? EV / AC : 1;
    
    // Schedule Performance Index (SPI) = EV / PV
    const SPI = PV > 0 ? EV / PV : 1;
    
    // Budget at Completion (BAC) = Total Budget
    const BAC = PV;
    
    // Estimate at Completion (EAC) = BAC / CPI
    const EAC = CPI > 0 ? BAC / CPI : BAC;
    
    // Variance at Completion (VAC) = BAC - EAC
    const VAC = BAC - EAC;
    
    // To-Complete Performance Index (TCPI) = (BAC - EV) / (BAC - AC)
    const TCPI = (BAC - AC) > 0 ? (BAC - EV) / (BAC - AC) : 1;
    
    // Percent Complete
    const percentComplete = PV > 0 ? (EV / PV) * 100 : 0;
    
    // Percent Spent
    const percentSpent = PV > 0 ? (AC / PV) * 100 : 0;

    return {
      PV, AC, EV, CV, SV, CPI, SPI, BAC, EAC, VAC, TCPI,
      percentComplete, percentSpent,
      onBudget: CPI >= 0.95,
      onSchedule: SPI >= 0.95
    };
  }, [financials, tasks, selectedProject]);

  const chartData = [
    {
      name: 'Planned',
      value: metrics.PV,
    },
    {
      name: 'Earned',
      value: metrics.EV,
    },
    {
      name: 'Actual',
      value: metrics.AC,
    },
  ];

  const performanceData = [
    { name: 'CPI', value: metrics.CPI, threshold: 1.0 },
    { name: 'SPI', value: metrics.SPI, threshold: 1.0 },
    { name: 'TCPI', value: metrics.TCPI, threshold: 1.0 },
  ];

  return (
    <div className="space-y-6">
      {/* EVM Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Cost Performance Index</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-2xl font-bold ${metrics.CPI >= 1 ? 'text-green-400' : metrics.CPI >= 0.95 ? 'text-amber-400' : 'text-red-400'}`}>
                  {metrics.CPI.toFixed(2)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {metrics.CPI >= 1 ? 'Under Budget' : 'Over Budget'}
                </p>
              </div>
              {metrics.CPI >= 1 ? (
                <CheckCircle className="text-green-400" size={24} />
              ) : (
                <AlertTriangle className="text-red-400" size={24} />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Schedule Performance Index</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-2xl font-bold ${metrics.SPI >= 1 ? 'text-green-400' : metrics.SPI >= 0.95 ? 'text-amber-400' : 'text-red-400'}`}>
                  {metrics.SPI.toFixed(2)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {metrics.SPI >= 1 ? 'Ahead of Schedule' : 'Behind Schedule'}
                </p>
              </div>
              {metrics.SPI >= 1 ? (
                <TrendingUp className="text-green-400" size={24} />
              ) : (
                <TrendingDown className="text-red-400" size={24} />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Estimate at Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-2xl font-bold text-white">${(metrics.EAC || 0).toLocaleString()}</p>
              <p className={`text-xs mt-1 ${metrics.VAC >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                VAC: ${Math.abs(metrics.VAC || 0).toLocaleString()} {metrics.VAC >= 0 ? 'under' : 'over'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">To-Complete Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p className={`text-2xl font-bold ${metrics.TCPI <= 1 ? 'text-green-400' : metrics.TCPI <= 1.1 ? 'text-amber-400' : 'text-red-400'}`}>
                {metrics.TCPI.toFixed(2)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Required efficiency to meet BAC
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-white">Cost Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-3xl font-bold ${metrics.CV >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${Math.abs(metrics.CV || 0).toLocaleString()}
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  {metrics.CV >= 0 ? 'Under budget by' : 'Over budget by'}
                </p>
                <p className="text-xs text-zinc-500 mt-2">
                  EV: ${(metrics.EV || 0).toLocaleString()} | AC: ${(metrics.AC || 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className={metrics.CV >= 0 ? 'text-green-400' : 'text-red-400'} size={32} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-white">Schedule Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-3xl font-bold ${metrics.SV >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${Math.abs(metrics.SV || 0).toLocaleString()}
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  {metrics.SV >= 0 ? 'Ahead by' : 'Behind by'}
                </p>
                <p className="text-xs text-zinc-500 mt-2">
                  PV: ${(metrics.PV || 0).toLocaleString()} | EV: ${(metrics.EV || 0).toLocaleString()}
                </p>
              </div>
              {metrics.SV >= 0 ? (
                <TrendingUp className="text-green-400" size={32} />
              ) : (
                <TrendingDown className="text-red-400" size={32} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-white">Earned Value Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="name" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                  formatter={(value) => `$${value.toLocaleString()}`}
                />
                <Bar dataKey="value" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-white">Performance Indices</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="name" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" domain={[0, 2]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                  formatter={(value) => value.toFixed(2)}
                />
                <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
                <Line type="monotone" dataKey="threshold" stroke="#22c55e" strokeDasharray="5 5" strokeWidth={1} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Progress Summary */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm text-white">Progress Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-zinc-400">Work Complete</span>
              <span className="text-sm font-medium text-white">{metrics.percentComplete.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-3">
              <div 
                className={`h-3 rounded-full ${metrics.percentComplete >= 90 ? 'bg-green-500' : metrics.percentComplete >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(metrics.percentComplete, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-zinc-400">Budget Spent</span>
              <span className={`text-sm font-medium ${metrics.percentSpent > metrics.percentComplete + 5 ? 'text-red-400' : 'text-white'}`}>
                {metrics.percentSpent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-3">
              <div 
                className={`h-3 rounded-full ${metrics.percentSpent > metrics.percentComplete + 5 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(metrics.percentSpent, 100)}%` }}
              />
            </div>
          </div>

          {metrics.percentSpent > metrics.percentComplete + 5 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">Budget Warning</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Spending is ahead of work completion by {(metrics.percentSpent - metrics.percentComplete).toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}