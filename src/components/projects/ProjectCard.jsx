import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Eye, Pencil, Trash2, AlertCircle, Clock, Settings, DollarSign, Calendar, User } from 'lucide-react';
import { SafeText } from '@/components/shared/sanitization';
import { cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns';

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

export default function ProjectCard({ project, onView, onEdit, onDelete, onSettings, canEdit }) {
  const statusConfig = getStatusConfig(project.status);
  const isOverdue = project.target_completion && 
    new Date(project.target_completion + 'T00:00:00') < new Date();
  
  const daysRemaining = project.target_completion 
    ? differenceInDays(new Date(project.target_completion + 'T00:00:00'), new Date())
    : null;

  return (
    <Card 
      className={cn(
        "bg-card border-border hover:bg-muted/30 transition-colors cursor-pointer",
        isOverdue && "border-red-500/30 bg-red-500/5"
      )}
      onClick={() => onView(project)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              {isOverdue && <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />}
              <h3 className="text-base font-semibold text-foreground truncate">
                <SafeText content={project.name} />
              </h3>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {project.project_number}
            </p>
          </div>
          <Badge className={cn("text-[10px] font-bold uppercase px-2 py-0.5", statusConfig.className)}>
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Client & Value */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <User size={12} className="text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Client</span>
            </div>
            <p className="text-sm text-foreground truncate">
              <SafeText content={project.client || '—'} />
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign size={12} className="text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Value</span>
            </div>
            <p className="text-sm font-semibold text-foreground tabular-nums">
              {formatCurrency(project.contract_value)}
            </p>
          </div>
        </div>

        {/* Target Date */}
        {project.target_completion && (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar size={12} className="text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Target</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">
                {new Date(project.target_completion).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
              {daysRemaining !== null && (
                <div className={cn(
                  "inline-flex items-center gap-1 text-xs font-semibold",
                  daysRemaining < 0 ? "text-red-400" : daysRemaining <= 7 ? "text-amber-400" : "text-muted-foreground"
                )}>
                  <Clock size={12} />
                  {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Progress</span>
            <span className="text-xs font-bold text-foreground tabular-nums">
              {project.progress || 0}%
            </span>
          </div>
          <Progress value={project.progress || 0} className="h-2" />
        </div>

        {/* PM */}
        {project.project_manager && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">PM</span>
            <p className="text-sm text-foreground mt-1">{project.project_manager}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-h-[44px]"
            onClick={(e) => {
              e.stopPropagation();
              onView(project);
            }}
          >
            <Eye size={16} className="mr-2" />
            View
          </Button>
          {canEdit && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(project);
                }}
                title="Edit"
              >
                <Pencil size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                onClick={(e) => {
                  e.stopPropagation();
                  onSettings(project);
                }}
                title="Settings"
              >
                <Settings size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-red-400 hover:text-red-300"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project);
                }}
                title="Delete"
              >
                <Trash2 size={16} />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}