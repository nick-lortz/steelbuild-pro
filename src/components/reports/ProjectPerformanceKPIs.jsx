import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Clock, Target, Users } from 'lucide-react';

export default function ProjectPerformanceKPIs({ projects, financials, tasks, detailed = false }) {
  const kpis = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'in_progress');
    
    // Budget performance
    const totalBudget = projects.reduce((sum, p) => sum + (p.contract_value || 0), 0);
    const totalActual = financials.reduce((sum, f) => sum + (f.actual_amount || 0), 0);
    const budgetVariance = ((totalActual - totalBudget) / totalBudget) * 100;
    
    // Schedule adherence
    const completedOnTime = tasks.filter(t => 
      t.status === 'completed' && 
      new Date(t.actual_completion) <= new Date(t.target_completion)
    ).length;
    const totalCompleted = tasks.filter(t => t.status === 'completed').length;
    const scheduleAdherence = totalCompleted > 0 ? (completedOnTime / totalCompleted) * 100 : 100;
    
    // Resource utilization
    const tasksInProgress = tasks.filter(t => t.status === 'in_progress');
    const resourceUtilization = tasksInProgress.length > 0 ? 
      (tasksInProgress.filter(t => t.assigned_resources?.length > 0).length / tasksInProgress.length) * 100 : 0;
    
    return {
      activeProjects: activeProjects.length,
      totalBudget,
      totalActual,
      budgetVariance,
      scheduleAdherence,
      resourceUtilization,
      completedTasks: totalCompleted,
      avgProjectHealth: projects.length > 0 ? 
        projects.reduce((sum, p) => sum + (p.health_score || 85), 0) / projects.length : 85
    };
  }, [projects, financials, tasks]);

  const formatCurrency = (val) => `$${(val / 1000000).toFixed(2)}M`;
  const formatPercent = (val) => `${val.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Budget vs Actual</p>
              <DollarSign size={16} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-white mb-1">{formatCurrency(kpis.totalActual)}</p>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={kpis.budgetVariance > 0 
                  ? "bg-red-500/20 text-red-400 border-red-500/30" 
                  : "bg-green-500/20 text-green-400 border-green-500/30"
                }
              >
                {kpis.budgetVariance > 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                {formatPercent(Math.abs(kpis.budgetVariance))}
              </Badge>
              <span className="text-xs text-zinc-500">vs {formatCurrency(kpis.totalBudget)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Schedule Adherence</p>
              <Clock size={16} className="text-green-500" />
            </div>
            <p className="text-2xl font-bold text-white mb-2">{formatPercent(kpis.scheduleAdherence)}</p>
            <Progress value={kpis.scheduleAdherence} className="h-2" />
            <p className="text-xs text-zinc-500 mt-2">{kpis.completedTasks} tasks completed</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Resource Utilization</p>
              <Users size={16} className="text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-white mb-2">{formatPercent(kpis.resourceUtilization)}</p>
            <Progress value={kpis.resourceUtilization} className="h-2" />
            <p className="text-xs text-zinc-500 mt-2">Active task allocation</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Avg Health Score</p>
              <Target size={16} className="text-cyan-500" />
            </div>
            <p className="text-2xl font-bold text-white mb-2">{formatPercent(kpis.avgProjectHealth)}</p>
            <Progress value={kpis.avgProjectHealth} className="h-2" />
            <p className="text-xs text-zinc-500 mt-2">{kpis.activeProjects} active projects</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      {detailed && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base">Project-Level Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projects.filter(p => p.status === 'in_progress').map(project => {
                const projectFinancials = financials.filter(f => f.project_id === project.id);
                const projectTasks = tasks.filter(t => t.project_id === project.id);
                const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
                const totalTasks = projectTasks.length;
                const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

                return (
                  <div key={project.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-white">{project.name}</p>
                        <p className="text-xs text-zinc-500 mt-1">{project.project_number}</p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {project.phase}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Progress</p>
                        <p className="text-lg font-bold text-blue-400">{progress.toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Budget</p>
                        <p className="text-lg font-bold text-green-400">
                          ${((project.contract_value || 0) / 1000).toFixed(0)}K
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Health</p>
                        <p className="text-lg font-bold text-amber-400">{project.health_score || 85}%</p>
                      </div>
                    </div>
                    
                    <Progress value={progress} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}