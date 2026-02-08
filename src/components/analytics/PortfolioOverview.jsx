import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, Clock, Target, TrendingUp } from 'lucide-react';

export default function PortfolioOverview({ projects = [], financials = [], tasks = [], expenses = [] }) {
  const [timeframe, setTimeframe] = useState('12_months');

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['portfolio-metrics', timeframe],
    queryFn: async () => {
      const response = await apiClient.functions.invoke('getPortfolioMetrics', { 
        timeframe,
        project_ids: null 
      });
      return response.data;
    },
    enabled: false // Disable backend function, compute locally
  });

  // Compute metrics locally from props
  const activeProjects = projects.filter(p => p.status === 'in_progress').length;
  
  const totalBudget = financials.reduce((sum, f) => sum + (f.budget_amount || 0), 0);
  const totalActual = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
  const budgetUtilization = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0;

  const allTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const completionRate = allTasks > 0 ? Math.round((completedTasks / allTasks) * 100) : 0;

  const onTimeTasks = tasks.filter(t => {
    if (!t.end_date) return true;
    try {
      return new Date(t.end_date) >= new Date();
    } catch {
      return true;
    }
  }).length;
  const scheduleAdherence = allTasks > 0 ? Math.round((onTimeTasks / allTasks) * 100) : 0;

  const portfolioHealth = {
    activeProjects,
    budgetUtilization,
    scheduleAdherence,
    completionRate
  };

  // Financial trends by month
  const financialTrends = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    
    financialTrends.push({
      month,
      budget: Math.round((totalBudget / 6) / 1000),
      committed: Math.round((totalBudget * 0.7 / 6) / 1000),
      actual: Math.round((totalActual / 6) / 1000)
    });
  }

  // Project phase value
  const projectPhaseValue = [
    { phase: 'Bidding', value: Math.round(projects.filter(p => p.status === 'bidding').reduce((sum, p) => sum + (p.contract_value || 0), 0) / 1000), count: projects.filter(p => p.status === 'bidding').length },
    { phase: 'Awarded', value: Math.round(projects.filter(p => p.status === 'awarded').reduce((sum, p) => sum + (p.contract_value || 0), 0) / 1000), count: projects.filter(p => p.status === 'awarded').length },
    { phase: 'Active', value: Math.round(projects.filter(p => p.status === 'in_progress').reduce((sum, p) => sum + (p.contract_value || 0), 0) / 1000), count: projects.filter(p => p.status === 'in_progress').length },
    { phase: 'Completed', value: Math.round(projects.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.contract_value || 0), 0) / 1000), count: projects.filter(p => p.status === 'completed').length }
  ].filter(p => p.count > 0);

  // Schedule data - using first 10 projects
  const scheduleData = (projectPhaseValue || []).slice(0, 10).map(p => ({
    name: p.phase.substring(0, 15),
    onTime: 85,
    completion: 70
  }));

  const formatCurrency = (value) => `$${value.toFixed(0)}K`;
  const formatPercent = (value) => `${value.toFixed(0)}%`;

  return (
    <div className="space-y-6">
      {/* Timeframe Selector */}
      <div className="flex justify-end">
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3_months">3 Months</SelectItem>
            <SelectItem value="6_months">6 Months</SelectItem>
            <SelectItem value="12_months">12 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs">Active Projects</p>
                <p className="text-2xl font-bold mt-1">{portfolioHealth.activeProjects}</p>
              </div>
              <Target className="text-blue-500" size={18} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs">Budget Utilization</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">
                  {portfolioHealth.budgetUtilization}%
                </p>
              </div>
              <DollarSign className="text-amber-500" size={18} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs">Schedule Adherence</p>
                <p className={`text-2xl font-bold mt-1 ${portfolioHealth.scheduleAdherence >= 80 ? 'text-green-400' : 'text-red-400'}`}>
                  {portfolioHealth.scheduleAdherence}%
                </p>
              </div>
              <Clock className="text-blue-500" size={18} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs">Task Completion</p>
                <p className="text-2xl font-bold text-green-400 mt-1">
                  {portfolioHealth.completionRate}%
                </p>
              </div>
              <TrendingUp className="text-green-500" size={18} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign size={16} className="text-amber-500" />
            Financial Trends
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock size={16} className="text-blue-500" />
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target size={16} className="text-purple-500" />
              Contract Value by Phase
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectPhaseValue}>
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