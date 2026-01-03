import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowRight } from 'lucide-react';

export default function ProjectBreakdownList({ projects = [], onProjectClick }) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No project financial data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => {
        const budget = project.contract_value || 0;
        const actual = project.actual_costs || 0;
        const percentage = budget ? ((actual / budget) * 100).toFixed(0) : 0;
        const isOverBudget = actual > budget;

        return (
          <Card 
            key={project.id} 
            className="border-border cursor-pointer active:scale-[0.98] transition-all"
            onClick={() => onProjectClick?.(project)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 mr-2">
                  <h3 className="font-semibold text-sm truncate">{project.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{project.project_number}</p>
                </div>
                <ArrowRight size={14} className="text-muted-foreground flex-shrink-0 mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p className="text-sm font-semibold">${(budget / 1000).toFixed(0)}K</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Actual</p>
                  <p className={`text-sm font-semibold ${isOverBudget ? 'text-red-500' : ''}`}>
                    ${(actual / 1000).toFixed(0)}K
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Utilization</span>
                  <span className={`text-xs font-semibold ${isOverBudget ? 'text-red-500' : ''}`}>
                    {percentage}%
                  </span>
                </div>
                <Progress 
                  value={Math.min(100, percentage)} 
                  className={`h-1.5 ${isOverBudget ? '[&>div]:bg-red-500' : ''}`}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}