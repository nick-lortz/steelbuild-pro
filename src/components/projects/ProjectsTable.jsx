import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Eye, Pencil, Trash2, AlertCircle, TrendingUp, Clock, Settings } from 'lucide-react';
import { SafeText } from '@/components/shared/sanitization';
import { cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns';
import ProjectCard from './ProjectCard';

const getStatusConfig = (status) => {
  const configs = {
    'in_progress': { label: 'Active', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
    'awarded': { label: 'Awarded', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    'bidding': { label: 'Bidding', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    'on_hold': { label: 'Hold', className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
    'completed': { label: 'Complete', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    'closed': { label: 'Closed', className: 'bg-zinc-700/20 text-zinc-500 border-zinc-700/30' }
  };
  return configs[status] || configs['bidding'];
};

const formatCurrency = (value) => {
  if (!value) return '$0';
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (absValue >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
};

const DaysIndicator = ({ targetDate }) => {
  if (!targetDate) return <span className="text-xs text-muted-foreground">—</span>;

  try {
    const target = new Date(targetDate + 'T00:00:00');
    const today = new Date();
    const daysRemaining = differenceInDays(target, today);

    if (daysRemaining < 0) {
      return (
        <div className="inline-flex items-center gap-1 text-xs text-[#EF4444] font-semibold">
          <Clock size={12} />
          {Math.abs(daysRemaining)}d overdue
        </div>
      );
    } else if (daysRemaining <= 7) {
      return (
        <div className="inline-flex items-center gap-1 text-xs text-[#FF9D42] font-semibold">
          <Clock size={12} />
          {daysRemaining}d
        </div>
      );
    } else {
      return (
        <div className="inline-flex items-center gap-1 text-xs text-[#9CA3AF]">
          <Clock size={12} />
          {daysRemaining}d
        </div>
      );
    }
  } catch (error) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
};

export default function ProjectsTable({ projects, onView, onEdit, onDelete, onSettings, canEdit }) {
  return (
    <>
      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onSettings={onSettings}
            canEdit={canEdit}
          />
        ))}
        {projects.length === 0 && (
          <Card className="py-12">
            <p className="text-sm text-[#9CA3AF] text-center">No projects found</p>
          </Card>
        )}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.05)]">
              <th className="text-left px-4 py-3">
                <span className="text-[10px] uppercase tracking-widest text-[#6B7280] font-bold">Project</span>
              </th>
              <th className="text-left px-4 py-3">
                <span className="text-[10px] uppercase tracking-widest text-[#6B7280] font-bold">Client</span>
              </th>
              <th className="text-left px-4 py-3">
                <span className="text-[10px] uppercase tracking-widest text-[#6B7280] font-bold">Status</span>
              </th>
              <th className="text-right px-4 py-3">
                <span className="text-[10px] uppercase tracking-widest text-[#6B7280] font-bold">Value</span>
              </th>
              <th className="text-left px-4 py-3">
                <span className="text-[10px] uppercase tracking-widest text-[#6B7280] font-bold">Target</span>
              </th>
              <th className="text-center px-4 py-3">
                <span className="text-[10px] uppercase tracking-widest text-[#6B7280] font-bold">Progress</span>
              </th>
              <th className="text-left px-4 py-3">
                <span className="text-[10px] uppercase tracking-widest text-[#6B7280] font-bold">PM</span>
              </th>
              <th className="text-center px-4 py-3 w-28">
                <span className="text-[10px] uppercase tracking-widest text-[#6B7280] font-bold">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const statusConfig = getStatusConfig(project.status);
              const isOverdue = project.target_completion && 
                new Date(project.target_completion + 'T00:00:00') < new Date();
              const isUrgent = project.target_completion && 
                differenceInDays(new Date(project.target_completion + 'T00:00:00'), new Date()) <= 7;

              return (
                <tr 
                  key={project.id}
                  className={cn(
                    "border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,157,66,0.03)] transition-colors cursor-pointer",
                    isOverdue && "bg-[#EF4444]/5"
                  )}
                  onClick={() => onView(project)}
                >
                  {/* Project Name & Number */}
                  <td className="px-4 py-3">
                    <div className="min-w-[200px]">
                      <div className="flex items-start gap-1.5">
                        {isOverdue && <AlertCircle className="w-3.5 h-3.5 text-[#EF4444] mt-0.5 flex-shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#E5E7EB] truncate leading-tight">
                            <SafeText content={project.name} />
                          </p>
                          <p className="text-[10px] text-[#6B7280] font-mono mt-0.5">
                            {project.project_number}
                          </p>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Client */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-[#E5E7EB] truncate max-w-[140px] inline-block">
                      <SafeText content={project.client || '—'} />
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <Badge className={cn("text-[10px] font-bold uppercase px-2 py-0.5", statusConfig.className)}>
                      {statusConfig.label}
                    </Badge>
                  </td>

                  {/* Value */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-[#E5E7EB] tabular-nums">
                      {formatCurrency(project.contract_value)}
                    </span>
                  </td>

                  {/* Target Date & Days */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {project.target_completion ? (
                        <>
                          <span className="text-xs text-[#E5E7EB] font-medium">
                            {new Date(project.target_completion).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                          <DaysIndicator targetDate={project.target_completion} />
                        </>
                      ) : (
                        <span className="text-xs text-[#9CA3AF]">—</span>
                      )}
                    </div>
                  </td>

                  {/* Progress */}
                  <td className="px-4 py-3">
                    <div className="w-20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-[#E5E7EB] tabular-nums">
                          {project.progress || 0}%
                        </span>
                      </div>
                      <Progress value={project.progress || 0} className="h-1.5" />
                    </div>
                  </td>

                  {/* PM */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-[#E5E7EB] truncate max-w-[100px] inline-block">
                      {project.project_manager || '—'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          onView(project);
                        }}
                        title="View Dashboard"
                      >
                        <Eye size={14} />
                      </Button>
                      {canEdit && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(project);
                            }}
                            title="Edit Project"
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSettings(project);
                            }}
                            title="Project Settings"
                          >
                            <Settings size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-[#EF4444] hover:text-[#FCA5A5] hover:bg-[#EF4444]/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(project);
                            }}
                            title="Delete Project"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {projects.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-[#9CA3AF]">No projects found</p>
          </div>
        )}
      </div>
    </Card>
    </>
  );
}