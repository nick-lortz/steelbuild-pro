import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, DollarSign, Clock, AlertTriangle, CheckCircle, XCircle, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from '@/components/ui/notifications';
import { cn } from '@/lib/utils';

export default function Performance() {
  const [analyzingProject, setAnalyzingProject] = useState(null);
  const [aiInsights, setAiInsights] = useState({});

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

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list(),
    staleTime: 10 * 60 * 1000,
  });

  // AI-Powered Anomaly Detection and Critical Issues
  const criticalIssues = useMemo(() => {
    const issues = [];
    const activeProjects = projects.filter(p => p.status === 'in_progress');

    activeProjects.forEach(project => {
      const projectFinancials = financials.filter(f => f.project_id === project.id);
      const projectCOs = changeOrders.filter(co => co.project_id === project.id);
      const projectRFIs = rfis.filter(r => r.project_id === project.id);
      const projectTasks = tasks.filter(t => t.project_id === project.id);

      const budget = projectFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
      const actual = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      // Positive variance = under budget, negative = over budget
      const variance = budget > 0 ? ((budget - actual) / budget) * 100 : 0;

      // Critical Issue 1: Budget Overrun (>10% over)
      if (variance < -10) {
        issues.push({
          severity: 'critical',
          type: 'budget',
          project: project,
          title: `${project.project_number} Budget Overrun`,
          description: `${Math.abs(variance).toFixed(1)}% over budget`,
          impact: `$${Math.abs(budget - actual).toLocaleString()} overrun`,
          metric: variance,
          reason: 'cost_overrun'
        });
      }

      // Critical Issue 2: Schedule Delays
      if (project.target_completion) {
        const today = new Date();
        const targetDate = new Date(project.target_completion);
        const daysToTarget = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
        
        const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
        const totalTasks = projectTasks.length;
        const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        // If less than 50% done and less than 30 days to target
        if (progressPercent < 50 && daysToTarget < 30 && daysToTarget > 0) {
          issues.push({
            severity: 'critical',
            type: 'schedule',
            project: project,
            title: `${project.project_number} Schedule Risk`,
            description: `${progressPercent.toFixed(0)}% complete, ${daysToTarget}d to target`,
            impact: `High risk of missing completion date`,
            metric: daysToTarget,
            reason: 'schedule_delay'
          });
        }

        // Already overdue
        if (daysToTarget < 0) {
          issues.push({
            severity: 'critical',
            type: 'schedule',
            project: project,
            title: `${project.project_number} Overdue`,
            description: `${Math.abs(daysToTarget)} days past target completion`,
            impact: `Project is behind schedule`,
            metric: daysToTarget,
            reason: 'overdue'
          });
        }
      }

      // Critical Issue 3: High RFI Volume (>10 open)
      const openRFIs = projectRFIs.filter(r => !['answered', 'closed'].includes(r.status));
      if (openRFIs.length > 10) {
        issues.push({
          severity: 'warning',
          type: 'quality',
          project: project,
          title: `${project.project_number} High Open RFIs`,
          description: `${openRFIs.length} open RFIs blocking progress`,
          impact: `Potential design/coordination issues`,
          metric: openRFIs.length,
          reason: 'high_rfi_volume'
        });
      }

      // Critical Issue 4: Change Order Overload (>5 pending)
      const pendingCOs = projectCOs.filter(co => co.status === 'pending' || co.status === 'submitted');
      if (pendingCOs.length > 5) {
        issues.push({
          severity: 'warning',
          type: 'change_orders',
          project: project,
          title: `${project.project_number} CO Backlog`,
          description: `${pendingCOs.length} pending change orders`,
          impact: `Scope creep and delayed approvals`,
          metric: pendingCOs.length,
          reason: 'co_backlog'
        });
      }

      // Critical Issue 5: Safety Incidents
      const projectLogs = dailyLogs.filter(log => log.project_id === project.id);
      const recentIncidents = projectLogs.filter(log => log.safety_incidents).length;
      if (recentIncidents > 0) {
        issues.push({
          severity: 'critical',
          type: 'safety',
          project: project,
          title: `${project.project_number} Safety Incidents`,
          description: `${recentIncidents} incidents recorded`,
          impact: `Safety protocol review required`,
          metric: recentIncidents,
          reason: 'safety_incidents'
        });
      }
    });

    // Sort by severity (critical first)
    return issues.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (a.severity !== 'critical' && b.severity === 'critical') return 1;
      return 0;
    });
  }, [projects, financials, changeOrders, rfis, tasks, dailyLogs]);

  // Performance Metrics with memoization
  const performanceMetrics = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'in_progress');
    const onTimeProjects = activeProjects.filter(p => {
      if (!p.target_completion) return true;
      return new Date(p.target_completion) > new Date();
    }).length;
    const onTimeRate = activeProjects.length > 0 ? ((onTimeProjects / activeProjects.length) * 100) : 100;

    const totalBudget = financials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
    const totalActual = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
    // Positive = under budget, Negative = over budget
    const budgetPerformance = totalBudget > 0 ? ((totalBudget - totalActual) / totalBudget * 100) : 0;

    const safetyIncidents = dailyLogs.filter(log => log.safety_incidents).length;
    const totalDays = dailyLogs.length;
    const safetyRate = totalDays > 0 ? ((totalDays - safetyIncidents) / totalDays * 100) : 100;

    const approvedCOs = changeOrders.filter(co => co.status === 'approved').length;
    const totalCOs = changeOrders.length;
    const coApprovalRate = totalCOs > 0 ? ((approvedCOs / totalCOs) * 100) : 0;

    const projectPerformance = activeProjects.slice(0, 6).map(project => {
      const projectFinancials = financials.filter(f => f.project_id === project.id);
      const budget = projectFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
      const actual = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
      // Variance calculation: positive = under budget, negative = over budget
      const variance = budget > 0 ? ((budget - actual) / budget * 100) : 0;
      
      return {
        name: project.project_number || project.name?.substring(0, 10),
        variance: parseFloat(variance.toFixed(1)),
        status: variance >= 0 ? 'on_budget' : 'over_budget'
      };
    });

    // Portfolio health score (0-100)
    const healthScore = Math.round(
      (onTimeRate * 0.4) + 
      ((budgetPerformance >= 0 ? 100 : Math.max(0, 100 + budgetPerformance)) * 0.3) +
      (safetyRate * 0.2) +
      (coApprovalRate * 0.1)
    );

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
      healthScore
    };
  }, [projects, financials, dailyLogs, changeOrders]);

  // AI Analysis Function
  const analyzeProjectWithAI = async (issue) => {
    setAnalyzingProject(issue.project.id);
    
    try {
      const projectFinancials = financials.filter(f => f.project_id === issue.project.id);
      const projectCOs = changeOrders.filter(co => co.project_id === issue.project.id);
      const projectRFIs = rfis.filter(r => r.project_id === issue.project.id);
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are analyzing a construction project performance issue. Provide a concise, actionable analysis.

Project: ${issue.project.name} (${issue.project.project_number})
Issue: ${issue.title}
Description: ${issue.description}
Impact: ${issue.impact}

Context:
- Budget: $${projectFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0).toLocaleString()}
- Actual Costs: $${projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0).toLocaleString()}
- Open Change Orders: ${projectCOs.filter(co => co.status !== 'approved' && co.status !== 'rejected').length}
- Open RFIs: ${projectRFIs.filter(r => !['answered', 'closed'].includes(r.status)).length}

Provide:
1. Root Cause (1-2 sentences)
2. Immediate Actions (2-3 bullet points)
3. Risk Mitigation (1-2 strategies)

Be direct and construction-industry specific.`
      });

      setAiInsights(prev => ({
        ...prev,
        [issue.project.id]: response
      }));
      
      toast.success('AI analysis complete');
    } catch (error) {
      console.error('AI analysis failed:', error);
      toast.error('Failed to generate AI insights');
    } finally {
      setAnalyzingProject(null);
    }
  };

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
    <div className="min-h-screen bg-black">
      {/* Header Bar */}
      <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-600/10 via-zinc-900/50 to-amber-600/5">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Executive Command Center</h1>
              <p className="text-xs text-zinc-400 font-mono mt-1">
                AI-POWERED PORTFOLIO INTELLIGENCE • {activeProjects.length} ACTIVE PROJECTS
              </p>
            </div>
            <Badge className={cn(
              "text-base px-4 py-2 font-bold",
              performanceMetrics.healthScore >= 80 ? "bg-green-500" : 
              performanceMetrics.healthScore >= 60 ? "bg-amber-500" : "bg-red-500"
            )}>
              {performanceMetrics.healthScore}% HEALTH
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* CRITICAL ISSUES SECTION */}
        {criticalIssues.length > 0 && (
          <Card className="bg-red-950/20 border-red-500/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="text-red-500" size={24} />
                  <div>
                    <CardTitle className="text-lg text-red-400 uppercase tracking-wider">
                      Critical Issues Detected
                    </CardTitle>
                    <p className="text-xs text-zinc-500 mt-1">
                      What's going wrong, where, and why - AI-powered anomaly detection
                    </p>
                  </div>
                </div>
                <Badge variant="destructive" className="text-lg px-4 py-2">
                  {criticalIssues.filter(i => i.severity === 'critical').length} CRITICAL
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {criticalIssues.map((issue, idx) => (
                  <Card key={idx} className={cn(
                    "border-l-4",
                    issue.severity === 'critical' ? "border-l-red-500 bg-red-950/30" : "border-l-amber-500 bg-amber-950/20"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {issue.type === 'budget' && <DollarSign size={16} className="text-red-400" />}
                            {issue.type === 'schedule' && <Clock size={16} className="text-red-400" />}
                            {issue.type === 'quality' && <AlertTriangle size={16} className="text-amber-400" />}
                            {issue.type === 'change_orders' && <Target size={16} className="text-amber-400" />}
                            {issue.type === 'safety' && <XCircle size={16} className="text-red-400" />}
                            <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                              {issue.title}
                            </h3>
                            <Badge variant="outline" className={cn(
                              "text-[10px] ml-2",
                              issue.severity === 'critical' ? "border-red-500 text-red-400" : "border-amber-500 text-amber-400"
                            )}>
                              {issue.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-zinc-300 mb-1">{issue.description}</p>
                          <p className="text-xs text-zinc-500">Impact: {issue.impact}</p>

                          {/* AI Insights */}
                          {aiInsights[issue.project.id] && (
                            <div className="mt-3 p-3 bg-zinc-950 border border-zinc-800 rounded">
                              <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={14} className="text-amber-500" />
                                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                                  AI Analysis
                                </span>
                              </div>
                              <div className="text-xs text-zinc-300 whitespace-pre-wrap">
                                {aiInsights[issue.project.id]}
                              </div>
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          onClick={() => analyzeProjectWithAI(issue)}
                          disabled={analyzingProject === issue.project.id}
                          className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs uppercase"
                        >
                          {analyzingProject === issue.project.id ? (
                            <>
                              <Loader2 size={14} className="mr-1 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} className="mr-1" />
                              AI Analyze
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Issues - Green Light */}
        {criticalIssues.length === 0 && (
          <Card className="bg-green-950/20 border-green-500/30">
            <CardContent className="p-6 text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-bold text-green-400 uppercase tracking-wide mb-2">
                Portfolio Running Clean
              </h3>
              <p className="text-sm text-zinc-400">
                No critical issues detected across active projects
              </p>
            </CardContent>
          </Card>
        )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Trend Anomalies Section */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base uppercase tracking-wider">Trend Deviations & Anomalies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {projectPerformance
              .filter(p => p.status === 'over_budget')
              .slice(0, 5)
              .map((project, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded">
                  <div>
                    <p className="font-semibold text-white text-sm">{project.name}</p>
                    <p className="text-xs text-zinc-500">Budget variance trending negative</p>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {project.variance}% variance
                  </Badge>
                </div>
              ))}
            {projectPerformance.filter(p => p.status === 'over_budget').length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-4">No negative budget trends detected</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    const budget = projectFinancials.reduce((sum, f) => sum + (f.current_budget || 0), 0);
                    const actual = projectFinancials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
                    // At risk if spent >95% of budget
                    return budget > 0 && actual > budget * 0.95;
                  }).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Health Breakdown */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base uppercase tracking-wider">Portfolio Health Breakdown</CardTitle>
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

            {/* Portfolio Health Meter */}
            <div className="mt-6 p-4 bg-zinc-950 border border-zinc-800 rounded">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Overall Portfolio Health</span>
                <span className={cn(
                  "text-2xl font-bold",
                  performanceMetrics.healthScore >= 80 ? "text-green-400" : 
                  performanceMetrics.healthScore >= 60 ? "text-amber-400" : "text-red-400"
                )}>
                  {performanceMetrics.healthScore}/100
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-4 overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all",
                    performanceMetrics.healthScore >= 80 ? "bg-green-500" : 
                    performanceMetrics.healthScore >= 60 ? "bg-amber-500" : "bg-red-500"
                  )}
                  style={{ width: `${performanceMetrics.healthScore}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Composite score: Schedule (40%) + Budget (30%) + Safety (20%) + CO Efficiency (10%)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      </div>
    </div>
  );
}