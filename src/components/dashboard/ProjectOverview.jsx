import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Building2, DollarSign, Calendar, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function ProjectOverview({ projects, financials, tasks, rfis, changeOrders, expenses = [], laborHours = [], resources = [] }) {
  const activeProjects = projects.filter(p => 
    p.status === 'in_progress' || p.status === 'awarded'
  );

  const getProjectHealth = (project) => {
    const projectTasks = (tasks || []).filter(t => t && t.project_id === project.id);
    const overdueTasks = projectTasks.filter(t => {
      if (t.status === 'completed' || !t.end_date) return false;
      try {
        return new Date(t.end_date) < new Date();
      } catch {
        return false;
      }
    });

    const projectRFIs = (rfis || []).filter(r => r && r.project_id === project.id && r.status !== 'closed');
    const overdueRFIs = projectRFIs.filter(r => {
      if (!r.due_date) return false;
      try {
        return new Date(r.due_date) < new Date();
      } catch {
        return false;
      }
    });

    if (overdueTasks.length > 0 || overdueRFIs.length > 0) return 'at_risk';
    if (projectRFIs.length > 5) return 'warning';
    return 'on_track';
  };

  const getProjectProgress = (project) => {
    const projectTasks = (tasks || []).filter(t => t && t.project_id === project.id);
    if (projectTasks.length === 0) return 0;
    
    // Calculate weighted average based on task hours
    const totalHours = projectTasks.reduce((sum, t) => sum + (Number(t.estimated_hours) || 1), 0);
    if (totalHours === 0) {
      // Fall back to simple average if no hours defined
      const totalProgress = projectTasks.reduce((sum, t) => sum + (Number(t.progress_percent) || 0), 0);
      return Math.round(totalProgress / projectTasks.length);
    }
    
    const weightedProgress = projectTasks.reduce((sum, t) => {
      const weight = (Number(t.estimated_hours) || 1) / totalHours;
      return sum + ((Number(t.progress_percent) || 0) * weight);
    }, 0);
    
    return Math.round(weightedProgress);
  };

  const getProjectFinancials = (project) => {
    const projectFinancials = financials.filter(f => f.project_id === project.id);
    const budget = projectFinancials.reduce((sum, f) => sum + (Number(f.budget_amount) || 0), 0);
    const committed = projectFinancials.reduce((sum, f) => sum + (Number(f.committed_amount) || 0), 0);
    const actualFromFinancials = projectFinancials.reduce((sum, f) => sum + (Number(f.actual_amount) || 0), 0);
    
    // Roll up expenses for this project
    const actualFromExpenses = (expenses || [])
      .filter(e => e && e.project_id === project.id && (e.payment_status === 'paid' || e.payment_status === 'approved'))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    
    // Roll up approved labor costs for this project
    const actualFromLabor = (laborHours || [])
      .filter(lh => lh && lh.project_id === project.id && lh.approved)
      .reduce((sum, lh) => {
        const resource = resources.find(r => r.id === lh.resource_id);
        const regularRate = Number(resource?.rate) || 0;
        const overtimeRate = regularRate * 1.5;
        const regularHours = Number(lh.hours) || 0;
        const otHours = Number(lh.overtime_hours) || 0;
        return sum + (regularHours * regularRate) + (otHours * overtimeRate);
      }, 0);
    
    const actual = actualFromFinancials + actualFromExpenses + actualFromLabor;
    const remaining = budget - actual;
    const variancePercent = budget > 0 ? ((remaining / budget) * 100) : 0;

    return { budget, committed, actual, remaining, variancePercent };
  };

  const healthColors = {
    on_track: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    at_risk: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const healthLabels = {
    on_track: 'On Track',
    warning: 'Warning',
    at_risk: 'At Risk',
  };

  const projectData = useMemo(() => 
    activeProjects.map(project => ({
      project,
      health: getProjectHealth(project),
      progress: getProjectProgress(project),
      finances: getProjectFinancials(project),
      projectRFIs: rfis.filter(r => r.project_id === project.id && r.status !== 'closed'),
      projectCOs: changeOrders.filter(co => co.project_id === project.id && co.status === 'pending'),
    })), [activeProjects, tasks, financials, rfis, changeOrders, expenses, laborHours, resources]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {projectData.map(({ project, health, progress, finances, projectRFIs, projectCOs }) => {

        return (
          <Card key={project.id} className="bg-zinc-900 border-zinc-800 hover:border-amber-500/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/20 rounded">
                    <Building2 size={20} className="text-amber-500" />
                  </div>
                  <div>
                    <Link to={createPageUrl('Projects')} className="hover:text-amber-500">
                      <CardTitle className="text-white text-base">{project.name}</CardTitle>
                    </Link>
                    <p className="text-xs text-zinc-500 mt-1">{project.project_number}</p>
                  </div>
                </div>
                <Badge variant="outline" className={healthColors[health]}>
                  {healthLabels[health]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">Overall Progress</span>
                  <span className="text-white font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-zinc-800/50 rounded">
                  <p className="text-xs text-zinc-500">Budget</p>
                  <p className="text-sm font-medium text-white">${finances.budget.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-zinc-800/50 rounded">
                  <p className="text-xs text-zinc-500">Actual</p>
                  <p className="text-sm font-medium text-amber-400">${finances.actual.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-zinc-800/50 rounded">
                  <p className="text-xs text-zinc-500">Remaining</p>
                  <p className={`text-sm font-medium ${finances.remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${Math.abs(finances.remaining).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1 text-zinc-400">
                  <Calendar size={12} />
                  <span>{projectRFIs.length} Open RFIs</span>
                </div>
                {projectCOs.length > 0 && (
                  <div className="flex items-center gap-1 text-amber-400">
                    <AlertTriangle size={12} />
                    <span>{projectCOs.length} Pending COs</span>
                  </div>
                )}
              </div>

              {/* Project Dates */}
              {project.start_date && (
                <div className="text-xs text-zinc-500">
                  Start: {new Date(project.start_date).toLocaleDateString()}
                  {project.target_completion && (
                    <> • Target: {new Date(project.target_completion).toLocaleDateString()}</>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}