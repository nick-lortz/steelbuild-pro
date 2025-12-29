import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, 
  DollarSign, 
  FileText, 
  MessageSquareWarning, 
  FileCheck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Target,
  Calendar,
  Shield,
  Truck,
  Activity,
  BarChart3,
  Settings
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import WeatherWidget from '@/components/weather/WeatherWidget';
import { format, differenceInDays, addDays, isAfter, isBefore } from 'date-fns';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DashboardKPIs from '@/components/dashboard/DashboardKPIs';
import ProjectOverview from '@/components/dashboard/ProjectOverview';
import RecentActivity from '@/components/dashboard/RecentActivity';

function formatFinancial(value) {
  if (!value || value === 0) return '$0';
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (absValue >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  
  return `$${value.toFixed(0)}`;
}

function StatCard({ title, value, icon: Icon, trend, trendValue, variant = "default", onClick }) {
  const bgColors = {
    default: "bg-zinc-900 border-zinc-800",
    amber: "bg-amber-500/5 border-amber-500/20",
    green: "bg-green-500/5 border-green-500/20",
    red: "bg-red-500/5 border-red-500/20",
    blue: "bg-blue-500/5 border-blue-500/20",
  };
  
  return (
    <Card 
      className={`${bgColors[variant]} border ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-zinc-400 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                trend === 'up' ? 'text-green-400' : 'text-red-400'
              }`}>
                {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {trendValue}
              </div>
            )}
          </div>
          <div className="p-2.5 bg-zinc-800 rounded-lg">
            <Icon size={20} className="text-amber-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  
  const [widgetConfig, setWidgetConfig] = useState({
    showFinancial: true,
    showSafety: true,
    showSchedule: true,
    showDeliveries: true,
    showAtRisk: true,
    showCharts: true
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: rfis = [], isLoading: rfisLoading } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: changeOrders = [], isLoading: changeOrdersLoading } = useQuery({
    queryKey: ['changeOrders'],
    queryFn: () => base44.entities.ChangeOrder.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: financials = [], isLoading: financialsLoading } = useQuery({
    queryKey: ['financials'],
    queryFn: () => base44.entities.Financial.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: drawings = [], isLoading: drawingsLoading } = useQuery({
    queryKey: ['drawings'],
    queryFn: () => base44.entities.DrawingSet.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: dailyLogs = [], isLoading: dailyLogsLoading } = useQuery({
    queryKey: ['dailyLogs'],
    queryFn: () => base44.entities.DailyLog.list('-log_date'),
    staleTime: 10 * 60 * 1000,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('start_date'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
    staleTime: 10 * 60 * 1000,
  });

  // Calculate all derived data with useMemo BEFORE any conditional returns
  const activeProjects = useMemo(() => 
    projects.filter(p => p.status === 'in_progress'), 
    [projects]
  );
  
  const pendingRFIs = useMemo(() => 
    rfis.filter(r => r.status === 'pending' || r.status === 'submitted'), 
    [rfis]
  );
  
  const pendingCOs = useMemo(() => 
    changeOrders.filter(co => co.status === 'pending' || co.status === 'submitted'), 
    [changeOrders]
  );
  
  const financialTotals = useMemo(() => {
    const totalBudget = financials.reduce((sum, f) => sum + (f.budget_amount || 0), 0);
    const actualFromFinancials = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
    const actualFromExpenses = expenses
      .filter(e => e.payment_status === 'paid' || e.payment_status === 'approved')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalActual = actualFromFinancials + actualFromExpenses;
    const totalCommitted = financials.reduce((sum, f) => sum + (f.committed_amount || 0), 0);
    const totalForecast = financials.reduce((sum, f) => {
      const forecast = f.forecast_amount || 0;
      return sum + (forecast > 0 ? forecast : (f.actual_amount || 0) + (f.committed_amount || 0));
    }, 0);
    const budgetVariance = totalBudget - totalActual;
    const budgetVariancePercent = totalBudget > 0 ? ((budgetVariance / totalBudget) * 100).toFixed(1) : 0;
    
    return { totalBudget, totalActual, totalCommitted, totalForecast, budgetVariance, budgetVariancePercent };
  }, [financials, expenses]);
  
  const { totalBudget, totalActual, totalCommitted, totalForecast, budgetVariance, budgetVariancePercent } = financialTotals;

  const overdueDocs = useMemo(() => 
    drawings.filter(d => {
      if (!d.due_date) return false;
      return new Date(d.due_date) < new Date() && d.status !== 'FFF' && d.status !== 'As-Built';
    }), 
    [drawings]
  );

  const safetyMetrics = useMemo(() => {
    const incidents = dailyLogs.filter(log => log.safety_incidents).length;
    const delays = dailyLogs.filter(log => log.delays).slice(0, 30).length;
    return { incidents, delays };
  }, [dailyLogs]);
  
  const safetyIncidents = safetyMetrics.incidents;
  const recentDelays = safetyMetrics.delays;

  // At Risk Projects
  const atRiskProjects = useMemo(() => 
    activeProjects.filter(project => {
      const projectFinancials = financials.filter(f => f.project_id === project.id);
      const projectBudget = projectFinancials.reduce((sum, f) => sum + (f.budget_amount || 0), 0);
      const projectActual = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      const variance = projectBudget > 0 ? ((projectActual / projectBudget) * 100) : 0;
      
      const projectRFIs = rfis.filter(r => r.project_id === project.id && (r.status === 'pending' || r.status === 'submitted'));
      const overdueRFIs = projectRFIs.filter(r => r.due_date && new Date(r.due_date) < new Date()).length;
      
      return variance > 95 || overdueRFIs > 3 || overdueDocs.filter(d => d.project_id === project.id).length > 2;
    }), 
    [activeProjects, financials, rfis, overdueDocs]
  );

  // Change Order Chart Data
  const coChartData = useMemo(() => [
    { name: 'Pending', value: changeOrders.filter(co => co.status === 'pending').length, color: '#f59e0b' },
    { name: 'Submitted', value: changeOrders.filter(co => co.status === 'submitted').length, color: '#3b82f6' },
    { name: 'Approved', value: changeOrders.filter(co => co.status === 'approved').length, color: '#10b981' },
    { name: 'Rejected', value: changeOrders.filter(co => co.status === 'rejected').length, color: '#ef4444' },
  ], [changeOrders]);

  // Project Status Chart
  const statusChartData = useMemo(() => [
    { name: 'Bidding', value: projects.filter(p => p.status === 'bidding').length },
    { name: 'Awarded', value: projects.filter(p => p.status === 'awarded').length },
    { name: 'In Progress', value: projects.filter(p => p.status === 'in_progress').length },
    { name: 'Completed', value: projects.filter(p => p.status === 'completed').length },
  ], [projects]);

  // Financial Progress by Project
  const projectFinancialData = useMemo(() => 
    activeProjects.slice(0, 5).map(project => {
      const projectFinancials = financials.filter(f => f.project_id === project.id);
      const budget = projectFinancials.reduce((sum, f) => sum + (f.budget_amount || 0), 0);
      const actual = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      return {
        name: project.project_number,
        Budget: budget,
        Actual: actual,
      };
    }), 
    [activeProjects, financials]
  );

  // Schedule Metrics
  const upcomingMilestones = useMemo(() => 
    activeProjects.filter(p => {
      if (!p.target_completion) return false;
      const daysUntil = differenceInDays(new Date(p.target_completion), new Date());
      return daysUntil >= 0 && daysUntil <= 30;
    }), 
    [activeProjects]
  );

  // Mock upcoming deliveries (you can replace with actual data from a deliveries entity)
  const upcomingDeliveries = useMemo(() => 
    dailyLogs
      .filter(log => log.materials_delivered && log.log_date)
      .slice(0, 5)
      .map(log => ({
        id: log.id,
        project_id: log.project_id,
        date: log.log_date,
        items: log.materials_delivered
      })), 
    [dailyLogs]
  );

  // Loading check AFTER all hooks
  const isLoading = projectsLoading || rfisLoading || changeOrdersLoading || 
                     financialsLoading || drawingsLoading || dailyLogsLoading || tasksLoading || expensesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="Dashboard" 
        subtitle="Project command center"
        actions={
          <Select value="default" onValueChange={() => {}}>
            <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800 text-white">
              <Settings size={16} className="mr-2" />
              <SelectValue placeholder="Customize" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default View</SelectItem>
              <SelectItem value="executive">Executive</SelectItem>
              <SelectItem value="operations">Operations</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Enhanced KPI Cards */}
      <DashboardKPIs 
        projects={projects}
        financials={financials}
        drawings={drawings}
        rfis={rfis}
        tasks={tasks}
        expenses={expenses}
      />

      {/* Progress Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Completed</p>
                <p className="text-xl font-bold text-green-400">
                  {projects.filter(p => p.status === 'completed').length}
                </p>
              </div>
              <Target className="text-green-500" size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">On Time</p>
                <p className="text-xl font-bold text-blue-400">
                  {activeProjects.filter(p => {
                    if (!p.target_completion) return true;
                    return new Date(p.target_completion) > new Date();
                  }).length}
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
                <p className="text-zinc-400 text-sm">Committed</p>
                <p className="text-xl font-bold text-white">
                  {formatFinancial(totalCommitted)}
                </p>
              </div>
              <Activity className="text-zinc-500" size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Forecast</p>
                <p className="text-xl font-bold text-amber-400">
                  {formatFinancial(totalForecast > 0 ? totalForecast : (totalActual + totalCommitted))}
                </p>
              </div>
              <TrendingUp className="text-amber-500" size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Overview */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-4">Active Projects</h2>
        <ProjectOverview
          projects={projects}
          financials={financials}
          tasks={tasks}
          rfis={rfis}
          changeOrders={changeOrders}
          expenses={expenses}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Recent Activity */}
        <RecentActivity
          drawings={drawings}
          rfis={rfis}
          changeOrders={changeOrders}
          tasks={tasks}
        />

        {/* Weather Widget */}
        <WeatherWidget 
          tasks={tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled')} 
          projectLocation="Chicago,US"
        />

        {/* At Risk List */}
        {widgetConfig.showAtRisk && (
          <Card className="bg-red-500/5 border-red-500/20">
            <CardHeader className="border-b border-red-500/20 pb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={18} />
                <CardTitle className="text-lg font-semibold text-white">
                  At Risk Projects ({atRiskProjects.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {atRiskProjects.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="All Projects On Track"
                  description="Great news! No projects are currently at risk. Keep monitoring budgets, schedules, and RFIs to maintain healthy project status."
                  variant="subtle"
                />
              ) : (
                <div className="divide-y divide-red-500/10">
                  {atRiskProjects.map((project) => {
                    const projectFinancials = financials.filter(f => f.project_id === project.id);
                    const projectBudget = projectFinancials.reduce((sum, f) => sum + (f.budget_amount || 0), 0);
                    const projectActual = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
                    const spendPercent = projectBudget > 0 ? ((projectActual / projectBudget) * 100).toFixed(0) : 0;
                    
                    return (
                      <div 
                        key={project.id} 
                        className="p-4 hover:bg-red-500/5 cursor-pointer transition-colors"
                        onClick={() => window.location.href = `/ProjectDashboard?id=${project.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-white">{project.name}</p>
                            <p className="text-sm text-zinc-400">{project.project_number}</p>
                          </div>
                          <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                            {spendPercent}% spent
                          </Badge>
                        </div>
                        <div className="flex gap-2 text-xs">
                          {rfis.filter(r => r.project_id === project.id && r.status === 'pending').length > 0 && (
                            <span className="text-amber-400">
                              {rfis.filter(r => r.project_id === project.id && r.status === 'pending').length} open RFIs
                            </span>
                          )}
                          {overdueDocs.filter(d => d.project_id === project.id).length > 0 && (
                            <span className="text-red-400">
                              {overdueDocs.filter(d => d.project_id === project.id).length} overdue drawings
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Financial Section */}
        {widgetConfig.showFinancial && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="border-b border-zinc-800 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <DollarSign size={18} />
                  Financial Overview
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Total Budget</span>
                  <span className="text-xl font-bold text-white">{formatFinancial(totalBudget)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Actual Spent</span>
                  <span className="text-xl font-bold text-amber-400">{formatFinancial(totalActual)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Committed</span>
                  <span className="text-xl font-bold text-blue-400">{formatFinancial(totalCommitted)}</span>
                </div>
                <div className="h-px bg-zinc-800" />
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Remaining</span>
                  <span className={`text-xl font-bold ${budgetVariance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatFinancial(Math.abs(budgetVariance))}
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full transition-all"
                    style={{ width: `${Math.min((totalActual / totalBudget) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-zinc-500 text-center">
                  {((totalActual / totalBudget) * 100).toFixed(1)}% of budget utilized
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Row */}
      {widgetConfig.showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Change Order Chart */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="border-b border-zinc-800 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-white">Change Orders by Status</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(createPageUrl('ChangeOrders'))}
                  className="text-amber-500 hover:text-amber-400 text-xs"
                >
                  View All →
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={coChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    onClick={() => navigate(createPageUrl('ChangeOrders'))}
                    style={{ cursor: 'pointer' }}
                  >
                    {coChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Project Status Chart */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="border-b border-zinc-800 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-white">Project Status Distribution</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(createPageUrl('Projects'))}
                  className="text-amber-500 hover:text-amber-400 text-xs"
                >
                  View All →
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statusChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="name" stroke="#a1a1aa" />
                  <YAxis stroke="#a1a1aa" />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
                  <Bar 
                    dataKey="value" 
                    fill="#f59e0b"
                    onClick={() => navigate(createPageUrl('Projects'))}
                    style={{ cursor: 'pointer' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Safety Section */}
        {widgetConfig.showSafety && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="border-b border-zinc-800 pb-4">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Shield size={18} className="text-green-500" />
                Safety Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Total Incidents (30d)</span>
                  <Badge variant="outline" className={safetyIncidents === 0 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
                    {safetyIncidents}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Days Since Incident</span>
                  <span className="text-xl font-bold text-green-400">
                    {(() => {
                      const incidentIndex = dailyLogs.findIndex(log => log.safety_incidents);
                      return incidentIndex === -1 ? dailyLogs.length : incidentIndex;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Delays Reported</span>
                  <span className="text-lg font-medium text-amber-400">{recentDelays}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schedule Widget */}
        {widgetConfig.showSchedule && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="border-b border-zinc-800 pb-4">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar size={18} className="text-blue-500" />
                Schedule Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Milestones (30d)</span>
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {upcomingMilestones.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {upcomingMilestones.slice(0, 3).map(project => {
                    const targetDate = project.target_completion ? new Date(project.target_completion) : null;
                    const isValidDate = targetDate && !isNaN(targetDate.getTime());

                    return (
                      <div key={project.id} className="text-sm">
                        <p className="text-white font-medium">{project.name}</p>
                        <p className="text-zinc-500">
                          {isValidDate ? format(targetDate, 'MMM d, yyyy') : 'No date'} 
                          {isValidDate && (
                            <span className="text-amber-400 ml-2">
                              ({differenceInDays(targetDate, new Date())}d)
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Deliveries */}
        {widgetConfig.showDeliveries && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="border-b border-zinc-800 pb-4">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Truck size={18} className="text-purple-500" />
                Recent Materials
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {upcomingDeliveries.length === 0 ? (
                  <div className="text-center py-4">
                    <Truck className="text-zinc-600 mx-auto mb-2" size={24} />
                    <p className="text-zinc-500 text-sm">No recent material deliveries logged.</p>
                    <p className="text-zinc-600 text-xs mt-1">Track deliveries in Daily Logs</p>
                  </div>
                ) : (
                  upcomingDeliveries.map(delivery => {
                    const project = projects.find(p => p.id === delivery.project_id);
                    const deliveryDate = delivery.date ? new Date(delivery.date) : null;
                    const isValidDate = deliveryDate && !isNaN(deliveryDate.getTime());

                    return (
                      <div key={delivery.id} className="text-sm">
                        <p className="text-zinc-400 text-xs">
                          {isValidDate ? format(deliveryDate, 'MMM d') : 'No date'}
                        </p>
                        <p className="text-white font-medium">{project?.name}</p>
                        <p className="text-zinc-500 line-clamp-1">{delivery.items}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Original Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="border-b border-zinc-800 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-white">Active Projects</CardTitle>
              <Link 
                to={createPageUrl('Projects')} 
                className="text-sm text-amber-500 hover:text-amber-400"
              >
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {activeProjects.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No Active Projects"
                description="Get started by creating your first project. Track progress, manage budgets, and coordinate with your team."
                actionLabel="Create Project"
                actionPage="Projects"
                variant="subtle"
              />
            ) : (
              <div className="divide-y divide-zinc-800">
                {activeProjects.slice(0, 5).map((project) => (
                  <div
                    key={project.id}
                    onClick={() => window.location.href = `/ProjectDashboard?id=${project.id}`}
                    className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="font-medium text-white">{project.name}</p>
                      <p className="text-sm text-zinc-400">{project.project_number} • {project.client}</p>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending RFIs */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="border-b border-zinc-800 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-white">Pending RFIs</CardTitle>
              <Link 
                to={createPageUrl('RFIs')} 
                className="text-sm text-amber-500 hover:text-amber-400"
              >
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {pendingRFIs.length === 0 ? (
              <EmptyState
                icon={MessageSquareWarning}
                title="No Pending RFIs"
                description="Request for Information (RFI) helps clarify project details. Create an RFI when you need answers from the GC or architect."
                actionLabel="Create RFI"
                actionPage="RFIs"
                variant="subtle"
              />
            ) : (
              <div className="divide-y divide-zinc-800">
                {pendingRFIs.slice(0, 5).map((rfi) => {
                  const project = projects.find(p => p.id === rfi.project_id);
                  return (
                    <Link 
                      key={rfi.id}
                      to={createPageUrl(`RFIs?id=${rfi.id}`)}
                      className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-white">RFI-{String(rfi.rfi_number).padStart(3, '0')}</p>
                        <p className="text-sm text-zinc-400 line-clamp-1">{rfi.subject}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={rfi.priority} />
                        {rfi.due_date && (() => {
                          const dueDate = new Date(rfi.due_date);
                          return !isNaN(dueDate.getTime()) && (
                            <span className="text-xs text-zinc-500">
                              {format(dueDate, 'MMM d')}
                            </span>
                          );
                        })()}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Drawings */}
        {overdueDocs.length > 0 && (
          <Card className="bg-red-500/5 border-red-500/20">
            <CardHeader className="border-b border-red-500/20 pb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={18} />
                <CardTitle className="text-lg font-semibold text-white">Overdue Drawing Sets</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-red-500/10">
                {overdueDocs.slice(0, 5).map((drawing) => {
                  const project = projects.find(p => p.id === drawing.project_id);
                  return (
                    <div key={drawing.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{drawing.set_name}</p>
                          <p className="text-sm text-zinc-400">{project?.name || 'Unknown Project'}</p>
                        </div>
                        <div className="text-right">
                          <StatusBadge status={drawing.status} />
                          {drawing.due_date && (() => {
                            const dueDate = new Date(drawing.due_date);
                            return !isNaN(dueDate.getTime()) && (
                              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                <Clock size={12} />
                                Due: {format(dueDate, 'MMM d')}
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Change Orders */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="border-b border-zinc-800 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-white">Recent Change Orders</CardTitle>
              <Link 
                to={createPageUrl('ChangeOrders')} 
                className="text-sm text-amber-500 hover:text-amber-400"
              >
                View all →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {changeOrders.length === 0 ? (
              <EmptyState
                icon={FileCheck}
                title="No Change Orders"
                description="Track scope changes and cost impacts. Change orders document modifications to the original project scope and budget."
                actionLabel="Create Change Order"
                actionPage="ChangeOrders"
                variant="subtle"
              />
            ) : (
              <div className="divide-y divide-zinc-800">
                {changeOrders.slice(0, 5).map((co) => {
                  const project = projects.find(p => p.id === co.project_id);
                  return (
                    <Link 
                      key={co.id}
                      to={createPageUrl(`ChangeOrders?id=${co.id}`)}
                      className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-white">CO-{String(co.co_number).padStart(3, '0')}</p>
                        <p className="text-sm text-zinc-400 line-clamp-1">{co.title}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={co.status} />
                        <p className={`text-sm mt-1 ${(co.cost_impact || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(co.cost_impact || 0) >= 0 ? '+' : ''}${(co.cost_impact || 0).toLocaleString()}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}