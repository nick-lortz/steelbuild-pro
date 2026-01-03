import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, Clock, Target, TrendingUp } from 'lucide-react';
import { format, startOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';

export default function PortfolioOverview({ projects, financials, tasks, expenses }) {
  // Portfolio financial trends over last 12 months
  const financialTrends = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(now, 11),
      end: now
    });

    return months.map(month => {
      const monthStr = format(month, 'yyyy-MM');
      const monthStart = startOfMonth(month);
      
      // Get expenses for this month
      const monthExpenses = expenses.filter(e => {
        if (!e.expense_date) return false;
        return format(new Date(e.expense_date), 'yyyy-MM') === monthStr;
      });
      
      const actualSpend = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      
      // Get committed amounts (simplified - in reality you'd track when commitments were made)
      const monthFinancials = financials.filter(f => {
        const project = projects.find(p => p.id === f.project_id);
        if (!project || !project.start_date) return false;
        return format(new Date(project.start_date), 'yyyy-MM') <= monthStr;
      });
      
      const committed = monthFinancials.reduce((sum, f) => sum + (Number(f.committed_amount) || 0), 0);
      const budget = monthFinancials.reduce((sum, f) => sum + (Number(f.budget_amount) || 0), 0);

      return {
        month: format(month, 'MMM'),
        budget: budget / 1000,
        committed: committed / 1000,
        actual: actualSpend / 1000
      };
    });
  }, [projects, financials, expenses]);

  // Schedule performance trends
  const scheduleData = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'in_progress');
    
    return activeProjects.map(project => {
      const projectTasks = tasks.filter(t => t.project_id === project.id);
      const total = projectTasks.length;
      const completed = projectTasks.filter(t => t.status === 'completed').length;
      const overdue = projectTasks.filter(t => {
        if (t.status === 'completed') return false;
        if (!t.end_date) return false;
        return new Date(t.end_date) < new Date();
      }).length;

      const onTime = total > 0 ? Math.round(((total - overdue) / total) * 100) : 100;

      return {
        name: project.project_number || project.name.substring(0, 15),
        onTime,
        overdue: Math.round((overdue / (total || 1)) * 100),
        completion: Math.round((completed / (total || 1)) * 100)
      };
    }).slice(0, 10);
  }, [projects, tasks]);

  // Portfolio health metrics
  const portfolioMetrics = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'in_progress');
    
    const totalBudget = financials.reduce((sum, f) => sum + (Number(f.budget_amount) || 0), 0);
    const totalActual = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalCommitted = financials.reduce((sum, f) => sum + (Number(f.committed_amount) || 0), 0);
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'completed') return false;
      if (!t.end_date) return false;
      return new Date(t.end_date) < new Date();
    }).length;

    return {
      activeProjects: activeProjects.length,
      totalBudget,
      totalActual,
      totalCommitted,
      budgetUtilization: totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0,
      scheduleAdherence: totalTasks > 0 ? ((totalTasks - overdueTasks) / totalTasks) * 100 : 100,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    };
  }, [projects, financials, expenses, tasks]);

  // Project value by phase
  const phaseData = useMemo(() => {
    const phases = ['bidding', 'awarded', 'in_progress', 'completed'];
    return phases.map(phase => {
      const phaseProjects = projects.filter(p => p.status === phase);
      const value = phaseProjects.reduce((sum, p) => sum + (Number(p.contract_value) || 0), 0);
      
      return {
        phase: phase.replace('_', ' ').toUpperCase(),
        value: value / 1000,
        count: phaseProjects.length
      };
    });
  }, [projects]);

  const formatCurrency = (value) => `$${value.toFixed(0)}K`;
  const formatPercent = (value) => `${value.toFixed(0)}%`;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs font-medium">Active Projects</p>
                <p className="text-2xl font-bold text-white mt-1">{portfolioMetrics.activeProjects}</p>
              </div>
              <Target className="text-blue-500" size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs font-medium">Budget Utilization</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">
                  {portfolioMetrics.budgetUtilization.toFixed(0)}%
                </p>
              </div>
              <DollarSign className="text-amber-500" size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs font-medium">Schedule Adherence</p>
                <p className={`text-2xl font-bold mt-1 ${portfolioMetrics.scheduleAdherence >= 80 ? 'text-green-400' : 'text-red-400'}`}>
                  {portfolioMetrics.scheduleAdherence.toFixed(0)}%
                </p>
              </div>
              <Clock className="text-blue-500" size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs font-medium">Task Completion</p>
                <p className="text-2xl font-bold text-green-400 mt-1">
                  {portfolioMetrics.completionRate.toFixed(0)}%
                </p>
              </div>
              <TrendingUp className="text-green-500" size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Trends */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="border-b border-zinc-800">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <DollarSign size={18} className="text-amber-500" />
            Financial Trends (12 Months)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={financialTrends}>
              <defs>
                <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCommitted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="month" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" tickFormatter={formatCurrency} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                formatter={formatCurrency}
              />
              <Legend />
              <Area type="monotone" dataKey="budget" stroke="#60a5fa" fillOpacity={1} fill="url(#colorBudget)" name="Budget" />
              <Area type="monotone" dataKey="committed" stroke="#f59e0b" fillOpacity={1} fill="url(#colorCommitted)" name="Committed" />
              <Area type="monotone" dataKey="actual" stroke="#10b981" fillOpacity={1} fill="url(#colorActual)" name="Actual" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schedule Performance by Project */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock size={18} className="text-blue-500" />
              Schedule Performance by Project
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={scheduleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="name" stroke="#a1a1aa" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#a1a1aa" tickFormatter={formatPercent} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                  formatter={formatPercent}
                />
                <Legend />
                <Bar dataKey="onTime" fill="#10b981" name="On Time %" />
                <Bar dataKey="completion" fill="#60a5fa" name="Completion %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Contract Value by Phase */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Target size={18} className="text-purple-500" />
              Contract Value by Phase
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={phaseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="phase" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" tickFormatter={formatCurrency} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                  formatter={(value, name) => {
                    if (name === 'value') return formatCurrency(value);
                    return value;
                  }}
                />
                <Legend />
                <Bar dataKey="value" fill="#a855f7" name="Value ($K)" />
                <Bar dataKey="count" fill="#f59e0b" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}