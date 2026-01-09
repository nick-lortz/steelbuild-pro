import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Target, DollarSign, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Performance() {
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials'],
    queryFn: () => base44.entities.Financial.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders'],
    queryFn: () => base44.entities.ChangeOrder.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: dailyLogs = [] } = useQuery({
    queryKey: ['dailyLogs'],
    queryFn: () => base44.entities.DailyLog.list(),
    staleTime: 10 * 60 * 1000,
  });

  // Performance Metrics with memoization
  const performanceMetrics = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'in_progress');
    const onTimeProjects = activeProjects.filter(p => {
      if (!p.target_completion) return true;
      return new Date(p.target_completion) > new Date();
    }).length;
    const onTimeRate = activeProjects.length > 0 ? ((onTimeProjects / activeProjects.length) * 100) : 100;

    const totalBudget = financials.reduce((sum, f) => sum + (f.budget_amount || 0), 0);
    const totalActual = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
    const budgetPerformance = totalBudget > 0 ? ((totalBudget - totalActual) / totalBudget * 100) : 0;

    const safetyIncidents = dailyLogs.filter(log => log.safety_incidents).length;
    const totalDays = dailyLogs.length;
    const safetyRate = totalDays > 0 ? ((totalDays - safetyIncidents) / totalDays * 100) : 100;

    const approvedCOs = changeOrders.filter(co => co.status === 'approved').length;
    const totalCOs = changeOrders.length;
    const coApprovalRate = totalCOs > 0 ? ((approvedCOs / totalCOs) * 100) : 0;

    const projectPerformance = activeProjects.slice(0, 6).map(project => {
      const projectFinancials = financials.filter(f => f.project_id === project.id);
      const budget = projectFinancials.reduce((sum, f) => sum + (f.budget_amount || 0), 0);
      const actual = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      const variance = budget > 0 ? ((budget - actual) / budget * 100) : 0;
      
      return {
        name: project.project_number,
        variance: variance.toFixed(1),
        status: variance >= 0 ? 'on_budget' : 'over_budget'
      };
    });

    return {
      activeProjects,
      onTimeProjects,
      onTimeRate,
      totalBudget,
      totalActual,
      budgetPerformance,
      safetyIncidents,
      totalDays,
      safetyRate,
      approvedCOs,
      totalCOs,
      coApprovalRate,
      projectPerformance,
    };
  }, [projects, financials, dailyLogs, changeOrders]);

  const {
    activeProjects,
    onTimeProjects,
    onTimeRate,
    totalBudget,
    totalActual,
    budgetPerformance,
    safetyIncidents,
    totalDays,
    safetyRate,
    approvedCOs,
    totalCOs,
    coApprovalRate,
    projectPerformance,
  } = performanceMetrics;

  return (
    <div>
      <PageHeader
        title="Performance Dashboard"
        subtitle="Key performance indicators and metrics"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className={`border ${onTimeRate >= 80 ? 'bg-green-500/5 border-green-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">On-Time Delivery</p>
                <p className={`text-2xl font-bold ${onTimeRate >= 80 ? 'text-green-400' : 'text-amber-400'}`}>
                  {onTimeRate.toFixed(1)}%
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {onTimeProjects} of {activeProjects.length} projects
                </p>
              </div>
              <Clock className={onTimeRate >= 80 ? 'text-green-500' : 'text-amber-500'} size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className={`border ${budgetPerformance >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Budget Performance</p>
                <p className={`text-2xl font-bold ${budgetPerformance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {budgetPerformance >= 0 ? '+' : ''}{budgetPerformance.toFixed(1)}%
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  ${(totalBudget - totalActual).toLocaleString()} variance
                </p>
              </div>
              <DollarSign className={budgetPerformance >= 0 ? 'text-green-500' : 'text-red-500'} size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className={`border ${safetyRate >= 95 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Safety Score</p>
                <p className={`text-2xl font-bold ${safetyRate >= 95 ? 'text-green-400' : 'text-red-400'}`}>
                  {safetyRate.toFixed(1)}%
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {safetyIncidents} incidents in {totalDays} days
                </p>
              </div>
              {safetyRate >= 95 ? (
                <CheckCircle className="text-green-500" size={24} />
              ) : (
                <AlertTriangle className="text-red-500" size={24} />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">CO Approval Rate</p>
                <p className="text-2xl font-bold text-white">{coApprovalRate.toFixed(1)}%</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {approvedCOs} of {totalCOs} approved
                </p>
              </div>
              <Target className="text-amber-500" size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">Project Budget Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={projectPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="name" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                  formatter={(value) => `${value}%`}
                />
                <Bar dataKey="variance" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">Monthly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded">
                <span className="text-zinc-300">Active Projects</span>
                <span className="text-xl font-bold text-white">{activeProjects.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded">
                <span className="text-zinc-300">Completed This Month</span>
                <span className="text-xl font-bold text-green-400">
                  {projects.filter(p => p.status === 'completed').length}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded">
                <span className="text-zinc-300">At Risk</span>
                <span className="text-xl font-bold text-red-400">
                  {activeProjects.filter(p => {
                    const projectFinancials = financials.filter(f => f.project_id === p.id);
                    const budget = projectFinancials.reduce((sum, f) => sum + (f.budget_amount || 0), 0);
                    const actual = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
                    return actual > budget * 0.95;
                  }).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400">Schedule Performance</span>
                <span className="text-white font-medium">{onTimeRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-full ${onTimeRate >= 80 ? 'bg-green-500' : 'bg-amber-500'}`}
                  style={{ width: `${onTimeRate}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400">Budget Efficiency</span>
                <span className="text-white font-medium">{Math.min(100, Math.abs(budgetPerformance)).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-full ${budgetPerformance >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, Math.abs(budgetPerformance))}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400">Safety Compliance</span>
                <span className="text-white font-medium">{safetyRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-full ${safetyRate >= 95 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${safetyRate}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}