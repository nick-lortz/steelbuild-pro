import React, { useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Eye, AlertCircle, CheckCircle2, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

const getStatusConfig = (status) => {
  const configs = {
    'in_progress': { label: 'In Progress', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    'awarded': { label: 'Awarded', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
    'bidding': { label: 'Bidding', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    'on_hold': { label: 'On Hold', className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
    'completed': { label: 'Complete', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    'closed': { label: 'Closed', className: 'bg-zinc-700/20 text-zinc-500 border-zinc-700/30' }
  };
  return configs[status] || { label: status, className: 'bg-zinc-500/20 text-zinc-400' };
};

const HealthIndicator = ({ value, type = 'cost' }) => {
  if (value === null || value === undefined) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const status = value < -10 ? 'critical' : value < -5 ? 'warning' : value < 5 ? 'good' : 'excellent';
  
  const configs = {
    critical: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    warning: { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    good: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
    excellent: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' }
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded border", config.bg, config.border)}>
      <Icon className={cn("w-3 h-3", config.color)} />
      <span className={cn("text-xs font-semibold", config.color)}>
        {value > 0 ? '+' : ''}{value.toFixed(1)}%
      </span>
    </div>
  );
};

const ScheduleHealth = ({ daysSlip }) => {
  if (!daysSlip && daysSlip !== 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const status = daysSlip > 7 ? 'delayed' : daysSlip > 0 ? 'slipping' : 'on_track';
  
  const configs = {
    delayed: { label: `${daysSlip}d late`, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    slipping: { label: `${daysSlip}d slip`, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    on_track: { label: 'On Track', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' }
  };

  const config = configs[status];

  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-semibold", config.bg, config.border, config.color)}>
      {config.label}
    </div>
  );
};

export default function ProjectHealthTable({ projects, onProjectClick }) {
  const sortedProjects = useMemo(() => {
    // Sort by risk level, then overdue tasks, then name
    return [...projects].sort((a, b) => {
      // Risk first
      const aRisk = (a.costHealth < -5 || a.daysSlip > 3 || a.overdueTasks > 0) ? 1 : 0;
      const bRisk = (b.costHealth < -5 || b.daysSlip > 3 || b.overdueTasks > 0) ? 1 : 0;
      if (bRisk !== aRisk) return bRisk - aRisk;

      // Then overdue
      if (b.overdueTasks !== a.overdueTasks) return b.overdueTasks - a.overdueTasks;

      // Then alphabetical
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [projects]);

  return (
    <Card className="bg-card border-border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Project</span>
              </th>
              <th className="text-left px-4 py-3">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Status</span>
              </th>
              <th className="text-left px-4 py-3">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Progress</span>
              </th>
              <th className="text-left px-4 py-3">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Cost Health</span>
              </th>
              <th className="text-left px-4 py-3">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Schedule</span>
              </th>
              <th className="text-center px-4 py-3">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Tasks</span>
              </th>
              <th className="text-right px-4 py-3">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Budget vs Actual</span>
              </th>
              <th className="text-center px-4 py-3">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedProjects.map((project) => {
              const isAtRisk = project.costHealth < -5 || project.daysSlip > 3 || project.overdueTasks > 0;
              const statusConfig = getStatusConfig(project.status);

              return (
                <tr 
                  key={project.id} 
                  className={cn(
                    "border-b border-border hover:bg-muted/50 transition-colors",
                    isAtRisk && "bg-red-500/5"
                  )}
                >
                  {/* Project Name & Number */}
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      {isAtRisk && <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{project.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{project.project_number}</p>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <Badge className={cn("text-[10px] font-bold uppercase", statusConfig.className)}>
                      {statusConfig.label}
                    </Badge>
                  </td>

                  {/* Progress */}
                  <td className="px-4 py-3">
                    <div className="w-24">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-1.5" />
                    </div>
                  </td>

                  {/* Cost Health */}
                  <td className="px-4 py-3">
                    <HealthIndicator value={project.costHealth} type="cost" />
                  </td>

                  {/* Schedule Health */}
                  <td className="px-4 py-3">
                    <ScheduleHealth daysSlip={project.daysSlip} />
                  </td>

                  {/* Tasks */}
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-foreground">
                        {project.completedTasks}/{project.totalTasks}
                      </span>
                      {project.overdueTasks > 0 && (
                        <span className="text-[10px] text-red-400 font-bold">
                          {project.overdueTasks} late
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Budget vs Actual */}
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex flex-col items-end gap-0.5">
                      <span className={cn(
                        "text-xs font-semibold",
                        project.budgetVsActual > 100 ? "text-red-400" : 
                        project.budgetVsActual > 95 ? "text-amber-400" : "text-green-400"
                      )}>
                        {project.budgetVsActual}%
                      </span>
                      {project.budgetVsActual > 100 && (
                        <span className="text-[10px] text-red-400">over</span>
                      )}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 text-center">
                    <Link to={createPageUrl('ProjectDashboard') + `?project=${project.id}`}>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                        <Eye size={14} className="mr-1" />
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}