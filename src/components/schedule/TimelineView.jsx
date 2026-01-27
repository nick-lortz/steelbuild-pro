import React, { useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, User, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, format, parseISO, isValid } from 'date-fns';

const getStatusColor = (status) => {
  const colors = {
    'not_started': 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    'in_progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'completed': 'bg-green-500/20 text-green-400 border-green-500/30',
    'on_hold': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'blocked': 'bg-red-500/20 text-red-400 border-red-500/30'
  };
  return colors[status] || colors['not_started'];
};

const getPhaseIcon = (phase) => {
  const icons = {
    detailing: '📐',
    fabrication: '🏭',
    delivery: '🚚',
    erection: '🏗️',
    closeout: '✅'
  };
  return icons[phase] || '📋';
};

const isAtRisk = (task) => {
  if (!task.end_date || task.status === 'completed') return false;
  const today = new Date();
  const targetDate = new Date(task.end_date + 'T00:00:00');
  const daysRemaining = differenceInDays(targetDate, today);
  return daysRemaining < 0 || (daysRemaining <= 7 && task.status !== 'not_started');
};

const getDaysRemaining = (endDate, status) => {
  if (!endDate || status === 'completed') return null;
  const today = new Date();
  const target = new Date(endDate + 'T00:00:00');
  return differenceInDays(target, today);
};

export default function TimelineView({ tasks, onTaskClick }) {
  // Group tasks by target date
  const timelineGroups = useMemo(() => {
    const groups = {
      overdue: [],
      thisWeek: [],
      thisMonth: [],
      later: [],
      noDates: []
    };

    const today = new Date();
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const monthFromNow = new Date(today);
    monthFromNow.setMonth(monthFromNow.getMonth() + 1);

    tasks.forEach(task => {
      if (!task.end_date) {
        groups.noDates.push(task);
        return;
      }

      const targetDate = new Date(task.end_date + 'T00:00:00');
      
      if (task.status === 'completed') {
        // Don't show completed tasks in timeline
        return;
      }

      if (targetDate < today) {
        groups.overdue.push(task);
      } else if (targetDate <= weekFromNow) {
        groups.thisWeek.push(task);
      } else if (targetDate <= monthFromNow) {
        groups.thisMonth.push(task);
      } else {
        groups.later.push(task);
      }
    });

    // Sort each group by date
    Object.keys(groups).forEach(key => {
      if (key !== 'noDates') {
        groups[key].sort((a, b) => {
          if (!a.end_date) return 1;
          if (!b.end_date) return -1;
          return a.end_date.localeCompare(b.end_date);
        });
      }
    });

    return groups;
  }, [tasks]);

  const renderTaskItem = (task) => {
    const atRisk = isAtRisk(task);
    const daysRemaining = getDaysRemaining(task.end_date, task.status);
    const phaseIcon = getPhaseIcon(task.phase);

    return (
      <div
        key={task.id}
        onClick={() => onTaskClick(task)}
        className={cn(
          'p-3 border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors',
          atRisk && 'bg-red-500/5'
        )}
      >
        <div className="flex items-start gap-3">
          {/* Date */}
          <div className="flex-shrink-0 text-center w-14">
            <div className={cn(
              "text-xs font-bold",
              atRisk ? 'text-red-400' : 'text-muted-foreground'
            )}>
              {task.end_date ? format(parseISO(task.end_date), 'MMM') : '—'}
            </div>
            <div className={cn(
              "text-lg font-bold",
              atRisk ? 'text-red-400' : 'text-foreground'
            )}>
              {task.end_date ? format(parseISO(task.end_date), 'd') : '—'}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-border self-stretch" />

          {/* Task Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {atRisk && <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />}
                <span className="text-xs">{phaseIcon}</span>
                <p className="text-sm font-medium truncate">
                  {task.name}
                </p>
              </div>
              <Badge className={cn('text-[10px] font-bold flex-shrink-0', getStatusColor(task.status))}>
                {task.status === 'not_started' ? 'TODO' : 
                 task.status === 'in_progress' ? 'ACTIVE' : 
                 task.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {daysRemaining !== null && (
                <span className={cn(
                  'font-semibold',
                  daysRemaining < 0 ? 'text-red-400' : 
                  daysRemaining <= 7 ? 'text-amber-400' : 
                  'text-muted-foreground'
                )}>
                  {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d left`}
                </span>
              )}
              
              <span className="capitalize">{task.phase}</span>

              {task.assigned_resources && task.assigned_resources.length > 0 && (
                <div className="flex items-center gap-1">
                  <User size={11} />
                  <span>{task.assigned_resources.length} assigned</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <Card className="bg-card border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-2xl font-bold text-foreground">
                {tasks.filter(t => t.status === 'completed').length}/{tasks.length}
              </span>
              <span className="text-sm text-muted-foreground ml-2">complete</span>
            </div>
            {timelineGroups.overdue.length > 0 && (
              <>
                <div className="h-8 w-px bg-border" />
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle size={16} />
                  <span className="text-sm font-semibold">
                    {timelineGroups.overdue.length} overdue
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Overdue */}
      {timelineGroups.overdue.length > 0 && (
        <Card className="bg-card border-border overflow-hidden">
          <div className="p-3 bg-red-500/10 border-b border-red-500/30">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">
                Overdue ({timelineGroups.overdue.length})
              </h3>
            </div>
          </div>
          {timelineGroups.overdue.map(renderTaskItem)}
        </Card>
      )}

      {/* This Week */}
      {timelineGroups.thisWeek.length > 0 && (
        <Card className="bg-card border-border overflow-hidden">
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              This Week ({timelineGroups.thisWeek.length})
            </h3>
          </div>
          {timelineGroups.thisWeek.map(renderTaskItem)}
        </Card>
      )}

      {/* This Month */}
      {timelineGroups.thisMonth.length > 0 && (
        <Card className="bg-card border-border overflow-hidden">
          <div className="p-3 bg-blue-500/10 border-b border-blue-500/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">
              This Month ({timelineGroups.thisMonth.length})
            </h3>
          </div>
          {timelineGroups.thisMonth.map(renderTaskItem)}
        </Card>
      )}

      {/* Later */}
      {timelineGroups.later.length > 0 && (
        <Card className="bg-card border-border overflow-hidden">
          <div className="p-3 border-b border-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Later ({timelineGroups.later.length})
            </h3>
          </div>
          {timelineGroups.later.map(renderTaskItem)}
        </Card>
      )}

      {/* No Dates */}
      {timelineGroups.noDates.length > 0 && (
        <Card className="bg-card border-border overflow-hidden">
          <div className="p-3 bg-zinc-500/10 border-b border-zinc-500/30">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-zinc-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                No Target Date ({timelineGroups.noDates.length})
              </h3>
            </div>
          </div>
          {timelineGroups.noDates.map(task => (
            <div
              key={task.id}
              onClick={() => onTaskClick(task)}
              className="p-3 border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs">{getPhaseIcon(task.phase)}</span>
                  <p className="text-sm font-medium truncate">{task.name}</p>
                </div>
                <Badge className={cn('text-[10px] font-bold', getStatusColor(task.status))}>
                  {task.status === 'not_started' ? 'TODO' : 
                   task.status === 'in_progress' ? 'ACTIVE' : 
                   task.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground capitalize">
                {task.phase}
                {task.assigned_resources && task.assigned_resources.length > 0 && (
                  <span> • {task.assigned_resources.length} assigned</span>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}