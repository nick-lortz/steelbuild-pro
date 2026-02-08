import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RISK_THRESHOLDS } from '@/components/shared/businessRules';

const ProjectHealthRow = React.memo(function ProjectHealthRow({ project, onClick }) {
  const isAtRisk = 
    project.costHealth < RISK_THRESHOLDS.cost_warning || 
    project.daysSlip > RISK_THRESHOLDS.schedule_warning || 
    project.overdueTasks >= RISK_THRESHOLDS.tasks_overdue_warning;

  const statusColors = {
    'in_progress': 'bg-green-500/20 text-green-400 border-green-500/30',
    'awarded': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'bidding': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'on_hold': 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    'completed': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'closed': 'bg-zinc-700/20 text-zinc-500 border-zinc-700/30'
  };

  return (
    <div
      onClick={() => onClick(project.id)}
      className={cn(
        "p-4 border border-zinc-800 rounded-lg hover:border-amber-500/30 transition-colors cursor-pointer bg-zinc-900/40",
        isAtRisk && "border-amber-500/20"
      )}
    >
      <div className="grid grid-cols-6 gap-4 items-center">
        {/* Project Info */}
        <div className="col-span-2">
          <div className="flex items-center gap-2">
            {isAtRisk && <AlertTriangle size={14} className="text-amber-500" />}
            <h3 className="text-sm font-semibold text-white">{project.name}</h3>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">{project.project_number}</p>
          <Badge className={cn("mt-1 text-[10px]", statusColors[project.status])}>
            {project.status?.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Progress */}
        <div>
          <div className="text-xs text-zinc-500 mb-1">Progress</div>
          <div className="flex items-center gap-2">
            <Progress value={project.progress} className="h-1.5 flex-1" />
            <span className="text-xs font-bold text-white tabular-nums">{project.progress}%</span>
          </div>
          <p className="text-[10px] text-zinc-600 mt-1">
            {project.completedTasks}/{project.totalTasks} tasks
          </p>
        </div>

        {/* Cost Health */}
        <div>
          <div className="text-xs text-zinc-500 mb-1">Cost Health</div>
          <div className="flex items-center gap-1">
            {project.costHealth >= 0 ? (
              <TrendingUp size={12} className="text-green-500" />
            ) : (
              <TrendingDown size={12} className="text-red-500" />
            )}
            <span className={cn(
              "text-sm font-bold tabular-nums",
              project.costHealth >= RISK_THRESHOLDS.cost_warning ? "text-green-500" :
              project.costHealth >= RISK_THRESHOLDS.cost_critical ? "text-amber-500" : "text-red-500"
            )}>
              {project.costHealth > 0 ? '+' : ''}{project.costHealth.toFixed(1)}%
            </span>
          </div>
          <p className="text-[10px] text-zinc-600 mt-1">
            {project.budgetVsActual}% utilized
          </p>
        </div>

        {/* Schedule */}
        <div>
          <div className="text-xs text-zinc-500 mb-1">Schedule</div>
          <span className={cn(
            "text-sm font-bold tabular-nums",
            project.daysSlip === 0 ? "text-green-500" :
            project.daysSlip <= RISK_THRESHOLDS.schedule_warning ? "text-amber-500" : "text-red-500"
          )}>
            {project.daysSlip > 0 ? `+${project.daysSlip}` : project.daysSlip} days
          </span>
          {project.overdueTasks > 0 && (
            <p className="text-[10px] text-red-400 mt-1">
              {project.overdueTasks} overdue
            </p>
          )}
        </div>

        {/* Issues */}
        <div>
          <div className="text-xs text-zinc-500 mb-1">Open Issues</div>
          <div className="flex gap-2">
            {project.openRFIs > 0 && (
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                {project.openRFIs} RFIs
              </Badge>
            )}
            {project.pendingCOs > 0 && (
              <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">
                {project.pendingCOs} COs
              </Badge>
            )}
            {project.openRFIs === 0 && project.pendingCOs === 0 && (
              <span className="text-xs text-zinc-600">None</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ProjectHealthRow;