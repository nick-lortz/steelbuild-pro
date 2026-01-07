import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatusBadge from '@/components/ui/StatusBadge';
import { Building2, DollarSign, Calendar, TrendingUp, ArrowRight } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import QuickStatusUpdate from './QuickStatusUpdate';

export default function ProjectCard({ project, progress, onClick, onDelete }) {
  const daysUntilCompletion = project.target_completion 
    ? differenceInDays(new Date(project.target_completion), new Date())
    : null;

  return (
    <Card 
      className="border-border hover:border-amber-500/50 transition-all cursor-pointer active:scale-[0.98]"
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 mr-2">
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={16} className="text-amber-500 flex-shrink-0" />
              <h3 className="font-semibold text-sm truncate">{project.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground font-mono">{project.project_number}</p>
            {project.client && (
              <p className="text-xs text-muted-foreground truncate mt-1">{project.client}</p>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <QuickStatusUpdate project={project} compact />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Contract Value */}
          {project.contract_value && (
            <div className="flex items-start gap-2">
              <DollarSign size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Value</p>
                <p className="text-sm font-semibold truncate">
                  ${project.contract_value.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Target Date */}
          {project.target_completion && (
            <div className="flex items-start gap-2">
              <Calendar size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Target</p>
                <p className="text-sm font-semibold truncate">
                  {format(new Date(project.target_completion), 'MMM d')}
                </p>
                {daysUntilCompletion !== null && (
                  <p className={`text-xs ${daysUntilCompletion < 30 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                    {daysUntilCompletion > 0 ? `${daysUntilCompletion}d left` : 'Overdue'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {progress !== undefined && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <TrendingUp size={12} className="text-amber-500" />
                <span className="text-xs text-muted-foreground">Progress</span>
              </div>
              <span className="text-xs font-semibold">{progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          {project.project_manager && (
            <p className="text-xs text-muted-foreground truncate flex-1 mr-2">
              PM: {project.project_manager}
            </p>
          )}
          <ArrowRight size={14} className="text-muted-foreground flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}