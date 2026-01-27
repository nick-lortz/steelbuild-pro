import React, { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, AlertTriangle, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns';

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

const isAtRisk = (task) => {
  if (!task.end_date || task.status === 'completed') return false;
  const today = new Date();
  const targetDate = new Date(task.end_date + 'T00:00:00');
  const daysRemaining = differenceInDays(targetDate, today);
  return daysRemaining < 0 || (daysRemaining <= 7 && task.status !== 'not_started');
};

const getDaysText = (endDate, status) => {
  if (!endDate || status === 'completed') return null;
  const today = new Date();
  const target = new Date(endDate + 'T00:00:00');
  const days = differenceInDays(target, today);
  
  if (days < 0) {
    return { text: `${Math.abs(days)}d overdue`, className: 'text-red-400' };
  } else if (days <= 7) {
    return { text: `${days}d left`, className: 'text-amber-400' };
  }
  return { text: `${days}d`, className: 'text-muted-foreground' };
};

const getCompletionStats = (tasks) => {
  const completed = tasks.filter(t => t.status === 'completed').length;
  const atRisk = tasks.filter(isAtRisk).length;
  return { completed, total: tasks.length, atRisk };
};

export default function PhaseGroupedView({ tasks, workPackages, onTaskClick }) {
  const [expandedPhases, setExpandedPhases] = useState(['fabrication', 'delivery']);

  const togglePhase = (phase) => {
    setExpandedPhases(prev =>
      prev.includes(phase) ? prev.filter(p => p !== phase) : [...prev, phase]
    );
  };

  // Group tasks by phase
  const groupedTasks = useMemo(() => {
    const phases = {
      detailing: [],
      fabrication: [],
      delivery: [],
      erection: [],
      closeout: []
    };

    tasks.forEach(task => {
      const phase = task.phase || 'fabrication';
      if (phases[phase]) {
        phases[phase].push(task);
      }
    });

    return phases;
  }, [tasks]);

  const phaseConfig = [
    { key: 'detailing', label: 'Detailing', icon: '📐' },
    { key: 'fabrication', label: 'Fabrication', icon: '🏭' },
    { key: 'delivery', label: 'Delivery', icon: '🚚' },
    { key: 'erection', label: 'Erection', icon: '🏗️' },
    { key: 'closeout', label: 'Closeout', icon: '✅' }
  ];

  const dataQualityIssues = useMemo(() => {
    const issues = {
      missingDates: tasks.filter(t => !t.start_date || !t.end_date).length,
      missingBaseline: tasks.filter(t => !t.baseline_start || !t.baseline_end).length,
      unassigned: tasks.filter(t => !t.assigned_resources || t.assigned_resources.length === 0).length
    };
    return issues;
  }, [tasks]);

  return (
    <div className="space-y-4">
      {/* Overall Stats */}
      <Card className="bg-card border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div>
                <span className="text-2xl font-bold text-foreground">
                  {tasks.filter(t => t.status === 'completed').length}/{tasks.length}
                </span>
                <span className="text-sm text-muted-foreground ml-2">complete</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle size={16} />
                <span className="text-sm font-semibold">
                  {tasks.filter(isAtRisk).length} at risk
                </span>
              </div>
            </div>
          </div>
          
          {(dataQualityIssues.missingDates > 0 || dataQualityIssues.unassigned > 0) && (
            <div className="text-right">
              <p className="text-xs text-amber-400 uppercase tracking-wider font-bold mb-1">Data Issues</p>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                {dataQualityIssues.missingDates > 0 && (
                  <div>{dataQualityIssues.missingDates} missing dates</div>
                )}
                {dataQualityIssues.unassigned > 0 && (
                  <div>{dataQualityIssues.unassigned} unassigned</div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Phase Groups */}
      {phaseConfig.map(({ key, label, icon }) => {
        const phaseTasks = groupedTasks[key];
        if (phaseTasks.length === 0) return null;

        const isExpanded = expandedPhases.includes(key);
        const stats = getCompletionStats(phaseTasks);

        return (
          <Card key={key} className="bg-card border-border">
            {/* Phase Header */}
            <button
              onClick={() => togglePhase(key)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-xl">{icon}</div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                      {label}
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {stats.completed}/{stats.total}
                    </Badge>
                    {stats.atRisk > 0 && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                        {stats.atRisk} at risk
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight 
                size={16} 
                className={cn(
                  'text-muted-foreground transition-transform',
                  isExpanded && 'rotate-90'
                )}
              />
            </button>

            {/* Phase Tasks */}
            {isExpanded && (
              <div className="border-t border-border">
                {phaseTasks.map((task, idx) => {
                  const atRisk = isAtRisk(task);
                  const daysInfo = getDaysText(task.end_date, task.status);
                  const hasDataIssues = !task.start_date || !task.end_date || 
                    (!task.assigned_resources || task.assigned_resources.length === 0);

                  return (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className={cn(
                        'p-3 border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors',
                        atRisk && 'bg-red-500/5'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {atRisk && <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />}
                            <p className={cn(
                              "text-sm font-medium truncate",
                              task.status === 'completed' && 'line-through text-muted-foreground'
                            )}>
                              {task.name}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {task.end_date ? (
                              <div className="flex items-center gap-1">
                                <Clock size={11} />
                                <span>Due {new Date(task.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                {daysInfo && (
                                  <span className={cn('ml-1 font-semibold', daysInfo.className)}>
                                    • {daysInfo.text}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-amber-400">No dates</span>
                            )}
                            
                            {task.assigned_resources && task.assigned_resources.length > 0 ? (
                              <div className="flex items-center gap-1">
                                <User size={11} />
                                <span className="truncate max-w-[100px]">
                                  {task.assigned_resources.length} assigned
                                </span>
                              </div>
                            ) : (
                              <span className="text-amber-400">Unassigned</span>
                            )}
                          </div>
                        </div>

                        <Badge className={cn('text-[10px] font-bold flex-shrink-0', getStatusColor(task.status))}>
                          {task.status === 'not_started' ? 'TODO' : 
                           task.status === 'in_progress' ? 'ACTIVE' : 
                           task.status === 'completed' ? 'DONE' : 
                           task.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}