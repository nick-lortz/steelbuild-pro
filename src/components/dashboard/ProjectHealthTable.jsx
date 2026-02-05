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
    return [...projects].sort((a, b) => {
      const aRisk = (a.costHealth < -5 || a.daysSlip > 3 || a.overdueTasks > 0) ? 1 : 0;
      const bRisk = (b.costHealth < -5 || b.daysSlip > 3 || b.overdueTasks > 0) ? 1 : 0;
      if (bRisk !== aRisk) return bRisk - aRisk;
      if (b.overdueTasks !== a.overdueTasks) return b.overdueTasks - a.overdueTasks;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [projects]);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden card-elevated">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-6 py-3.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Project</span>
              </th>
              <th className="text-left px-4 py-3.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Status</span>
              </th>
              <th className="text-left px-4 py-3.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Progress</span>
              </th>
              <th className="text-left px-4 py-3.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Cost Health</span>
              </th>
              <th className="text-left px-4 py-3.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Schedule</span>
              </th>
              <th className="text-center px-4 py-3.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Tasks</span>
              </th>
              <th className="text-right px-4 py-3.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Budget</span>
              </th>
              <th className="text-right px-6 py-3.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedProjects.map((project, idx) => {
              const isAtRisk = project.costHealth < -5 || project.daysSlip > 3 || project.overdueTasks > 0;
              const statusConfig = getStatusConfig(project.status);

              return (
                <tr 
                  key={project.id} 
                  className={cn(
                    "border-b border-border transition-smooth",
                    "hover:bg-muted/40",
                    isAtRisk && "bg-destructive/5"
                  )}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2.5">
                      {isAtRisk && <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground mb-0.5">{project.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{project.project_number}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <Badge variant="outline" className={cn("text-[10px] font-semibold", statusConfig.className)}>
                      {statusConfig.label}
                    </Badge>
                  </td>

                  <td className="px-4 py-4">
                    <div className="w-28">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-foreground tabular-nums">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <HealthIndicator value={project.costHealth} type="cost" />
                  </td>

                  <td className="px-4 py-4">
                    <ScheduleHealth daysSlip={project.daysSlip} />
                  </td>

                  <td className="px-4 py-4 text-center">
                    <div className="inline-flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground tabular-nums">
                        {project.completedTasks}/{project.totalTasks}
                      </span>
                      {project.overdueTasks > 0 && (
                        <span className="text-[10px] text-destructive font-semibold">
                          {project.overdueTasks} overdue
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-right">
                    <div className="inline-flex flex-col items-end gap-0.5">
                      <span className={cn(
                        "text-sm font-medium tabular-nums",
                        project.budgetVsActual > 100 ? "text-destructive" : 
                        project.budgetVsActual > 95 ? "text-warning" : "text-success"
                      )}>
                        {project.budgetVsActual}%
                      </span>
                      {project.budgetVsActual > 100 && (
                        <span className="text-[10px] text-destructive font-medium">over budget</span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <Link to={createPageUrl('ProjectDashboard') + `?project=${project.id}`}>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 px-3 text-xs font-medium hover:bg-primary/10 hover:text-primary"
                      >
                        <Eye size={14} className="mr-1.5" />
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
    </div>
  );
}