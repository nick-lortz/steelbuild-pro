import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from '@/components/ui/StatusBadge';
import { Calendar, Clock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';

export default function TaskCard({ task, project, onClick }) {
  const isOverdue = task.end_date && isPast(new Date(task.end_date)) && task.status !== 'completed' && task.status !== 'cancelled';
  const daysUntilDue = task.end_date ? differenceInDays(new Date(task.end_date), new Date()) : null;

  return (
    <Card 
      className="border-border hover:border-amber-500/50 transition-all cursor-pointer active:scale-[0.98]"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 mr-2">
            <div className="flex items-center gap-2 mb-1">
              {task.is_milestone && (
                <CheckCircle2 size={14} className="text-amber-500 flex-shrink-0" />
              )}
              <h3 className="font-semibold text-sm truncate">{task.name}</h3>
            </div>
            {project && (
              <p className="text-xs text-muted-foreground truncate">{project.project_number}</p>
            )}
            {task.wbs_code && (
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{task.wbs_code}</p>
            )}
          </div>
          <StatusBadge status={task.status} className="text-xs flex-shrink-0" />
        </div>

        {/* Phase & Progress */}
        <div className="flex items-center gap-3 mb-3">
          {task.phase && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">
              {task.phase}
            </span>
          )}
          {task.progress_percent !== undefined && (
            <div className="flex items-center gap-1.5 flex-1">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all"
                  style={{ width: `${task.progress_percent}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{task.progress_percent}%</span>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {task.start_date && (
            <div className="flex items-center gap-1.5">
              <Calendar size={12} className="text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Start</p>
                <p className="text-xs font-medium">{format(new Date(task.start_date), 'MMM d')}</p>
              </div>
            </div>
          )}
          {task.end_date && (
            <div className="flex items-center gap-1.5">
              <Clock size={12} className={`flex-shrink-0 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-xs text-muted-foreground">Due</p>
                <p className={`text-xs font-medium ${isOverdue ? 'text-red-500' : ''}`}>
                  {format(new Date(task.end_date), 'MMM d')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Warning Indicators */}
        {(isOverdue || task.is_critical) && (
          <div className="flex items-center gap-2 mb-2">
            {isOverdue && (
              <div className="flex items-center gap-1 text-xs text-red-500">
                <AlertCircle size={12} />
                <span>Overdue {Math.abs(daysUntilDue)}d</span>
              </div>
            )}
            {task.is_critical && (
              <div className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20">
                Critical Path
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          {task.estimated_hours && (
            <p className="text-xs text-muted-foreground">
              {task.estimated_hours}h est.
            </p>
          )}
          <ArrowRight size={14} className="text-muted-foreground flex-shrink-0 ml-auto" />
        </div>
      </CardContent>
    </Card>
  );
}