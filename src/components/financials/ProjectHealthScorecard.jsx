import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

/**
 * Calculate comprehensive project health scores
 */
export default function ProjectHealthScorecard({ financials, tasks, projects, rfis, changeOrders, selectedProject }) {
  const healthMetrics = React.useMemo(() => {
    const projectsToAnalyze = selectedProject === 'all' 
      ? projects 
      : projects.filter(p => p.id === selectedProject);

    return projectsToAnalyze.map(project => {
      const projectFinancials = financials.filter(f => f.project_id === project.id);
      const projectTasks = tasks?.filter(t => t.project_id === project.id) || [];
      const projectRFIs = rfis?.filter(r => r.project_id === project.id) || [];
      const projectCOs = changeOrders?.filter(co => co.project_id === project.id) || [];

      // Budget Health (30%) - Using CPI for performance-based scoring
      const budget = projectFinancials.reduce((sum, f) => sum + (Number(f.budget_amount) || 0), 0);
      const actual = projectFinancials.reduce((sum, f) => sum + (Number(f.actual_amount) || 0), 0);
      const avgProgress = totalTasks > 0 
        ? projectTasks.reduce((sum, t) => sum + (Number(t.progress_percent) || 0), 0) / totalTasks
        : 0;
      const earnedValue = budget * (avgProgress / 100);
      const cpi = actual > 0 ? (earnedValue / actual) : 1.0;
      const budgetScore = cpi >= 1.0 ? 100 : cpi >= 0.9 ? 70 : Math.max(0, cpi * 100);
      const budgetUtilization = budget > 0 ? (actual / budget) * 100 : 0;

      // Schedule Health (25%)
      const totalTasks = projectTasks.length;
      const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
      const now = new Date();
      now.setHours(23, 59, 59, 999); // End of day comparison
      const overdueTasks = projectTasks.filter(t => {
        if (t.status === 'completed' || !t.end_date) return false;
        const endDate = new Date(t.end_date);
        endDate.setHours(23, 59, 59, 999);
        return endDate < now;
      }).length;
      const scheduleScore = totalTasks > 0 
        ? Math.max(0, 100 - (overdueTasks / totalTasks) * 100)
        : 0; // No tasks = no schedule data

      // RFI Health (15%)
      const openRFIs = projectRFIs.filter(r => r.status !== 'answered' && r.status !== 'closed').length;
      const now2 = new Date();
      now2.setHours(23, 59, 59, 999);
      const overdueRFIs = projectRFIs.filter(r => {
        if (r.status === 'answered' || r.status === 'closed' || !r.due_date) return false;
        const dueDate = new Date(r.due_date);
        dueDate.setHours(23, 59, 59, 999);
        return dueDate < now2;
      }).length;
      const rfiScore = Math.max(0, 100 - (overdueRFIs * 20) - (openRFIs * 5));

      // Change Order Health (15%)
      const pendingCOs = projectCOs.filter(co => co.status === 'pending' || co.status === 'submitted').length;
      const coImpact = projectCOs.reduce((sum, co) => sum + Math.abs(Number(co.cost_impact) || 0), 0);
      const coImpactPercent = budget > 0 ? (coImpact / budget) * 100 : 0;
      const coScore = Math.max(0, 100 - (pendingCOs * 10) - (coImpactPercent > 10 ? 20 : 0));

      // Progress Health (15%) - Already calculated above in budget section
      const progressScore = totalTasks > 0 ? avgProgress : 0;

      // Calculate overall health score
      const overallScore = (
        (budgetScore * 0.30) +
        (scheduleScore * 0.25) +
        (rfiScore * 0.15) +
        (coScore * 0.15) +
        (progressScore * 0.15)
      );

      return {
        projectId: project.id,
        projectName: project.name,
        projectNumber: project.project_number,
        overallScore,
        budgetScore,
        scheduleScore,
        rfiScore,
        coScore,
        progressScore,
        metrics: {
          budget,
          actual,
          budgetUtilization,
          totalTasks,
          completedTasks,
          overdueTasks,
          openRFIs,
          overdueRFIs,
          pendingCOs,
          coImpact,
          avgProgress
        }
      };
    }).sort((a, b) => a.overallScore - b.overallScore); // Worst first
  }, [financials, tasks, projects, rfis, changeOrders, selectedProject]);

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBg = (score) => {
    if (score >= 85) return 'bg-green-500';
    if (score >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getHealthIcon = (score) => {
    if (score >= 85) return <CheckCircle className="text-green-400" size={20} />;
    if (score >= 70) return <AlertCircle className="text-amber-400" size={20} />;
    return <AlertTriangle className="text-red-400" size={20} />;
  };

  const overallAverage = healthMetrics.length > 0
    ? healthMetrics.reduce((sum, m) => sum + m.overallScore, 0) / healthMetrics.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Overall Health Summary */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            Project Health Overview
            {getHealthIcon(overallAverage)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{healthMetrics.length}</p>
              <p className="text-xs text-zinc-500 mt-1">Total Projects</p>
            </div>
            <div className="text-center">
              <p className={`text-3xl font-bold ${getScoreColor(overallAverage)}`}>
                {overallAverage.toFixed(0)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Avg Health Score</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-400">
                {healthMetrics.filter(m => m.overallScore >= 85).length}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Healthy</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-400">
                {healthMetrics.filter(m => m.overallScore >= 70 && m.overallScore < 85).length}
              </p>
              <p className="text-xs text-zinc-500 mt-1">At Risk</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-400">
                {healthMetrics.filter(m => m.overallScore < 70).length}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Critical</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Project Scorecards */}
      <div className="space-y-4">
        {healthMetrics.map((metric) => (
          <Card key={metric.projectId} className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-white">{metric.projectNumber}</h3>
                  <p className="text-sm text-zinc-400">{metric.projectName}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getHealthIcon(metric.overallScore)}
                  <span className={`text-2xl font-bold ${getScoreColor(metric.overallScore)}`}>
                    {metric.overallScore.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-zinc-400">Budget</span>
                    <span className={`text-xs font-medium ${getScoreColor(metric.budgetScore)}`}>
                      {metric.budgetScore.toFixed(0)}
                    </span>
                  </div>
                  <Progress value={metric.budgetScore} className="h-2" />
                  <p className="text-xs text-zinc-500 mt-1">
                    {metric.metrics.budgetUtilization.toFixed(1)}% utilized
                  </p>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-zinc-400">Schedule</span>
                    <span className={`text-xs font-medium ${getScoreColor(metric.scheduleScore)}`}>
                      {metric.scheduleScore.toFixed(0)}
                    </span>
                  </div>
                  <Progress value={metric.scheduleScore} className="h-2" />
                  <p className="text-xs text-zinc-500 mt-1">
                    {metric.metrics.overdueTasks} overdue
                  </p>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-zinc-400">RFIs</span>
                    <span className={`text-xs font-medium ${getScoreColor(metric.rfiScore)}`}>
                      {metric.rfiScore.toFixed(0)}
                    </span>
                  </div>
                  <Progress value={metric.rfiScore} className="h-2" />
                  <p className="text-xs text-zinc-500 mt-1">
                    {metric.metrics.openRFIs} open
                  </p>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-zinc-400">Change Orders</span>
                    <span className={`text-xs font-medium ${getScoreColor(metric.coScore)}`}>
                      {metric.coScore.toFixed(0)}
                    </span>
                  </div>
                  <Progress value={metric.coScore} className="h-2" />
                  <p className="text-xs text-zinc-500 mt-1">
                    {metric.metrics.pendingCOs} pending
                  </p>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-zinc-400">Progress</span>
                    <span className={`text-xs font-medium ${getScoreColor(metric.progressScore)}`}>
                      {metric.progressScore.toFixed(0)}
                    </span>
                  </div>
                  <Progress value={metric.progressScore} className="h-2" />
                  <p className="text-xs text-zinc-500 mt-1">
                    {metric.metrics.completedTasks}/{metric.metrics.totalTasks} tasks
                  </p>
                </div>
              </div>

              {/* Critical Issues Alert */}
              {metric.overallScore < 70 && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-400 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    Critical Issues Detected
                  </p>
                  <ul className="text-xs text-zinc-400 mt-2 space-y-1 ml-6">
                    {metric.budgetScore < 70 && (
                      <li>Budget overrun: {metric.metrics.budgetUtilization.toFixed(1)}% spent</li>
                    )}
                    {metric.scheduleScore < 70 && (
                      <li>Schedule delays: {metric.metrics.overdueTasks} tasks overdue</li>
                    )}
                    {metric.rfiScore < 70 && (
                      <li>RFI backlog: {metric.metrics.overdueRFIs} overdue RFIs</li>
                    )}
                    {metric.coScore < 70 && (
                      <li>Change order impact: ${metric.metrics.coImpact.toLocaleString()}</li>
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {healthMetrics.length === 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-8 text-center text-zinc-500">
            No project data available for health analysis
          </CardContent>
        </Card>
      )}
    </div>
  );
}