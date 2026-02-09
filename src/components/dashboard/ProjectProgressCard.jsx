import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProjectProgressCard({ project, onClick }) {
  const { 
    name, 
    project_number, 
    progress = 0, 
    completedTasks = 0, 
    overdueTasks = 0, 
    openRFIs = 0,
    daysSlip = 0,
    phase,
    status
  } = project;

  const isAtRisk = overdueTasks > 0 || daysSlip > 5 || openRFIs > 5;
  const totalTasks = completedTasks + overdueTasks;

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]",
        "bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700",
        isAtRisk && "border-red-500/30"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-mono text-zinc-500">{project_number}</p>
              {isAtRisk && <AlertTriangle size={12} className="text-red-400" />}
            </div>
            <h3 className="font-bold text-white text-sm line-clamp-2">{name}</h3>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Overall Progress</span>
            <span className="font-bold text-white">{progress}%</span>
          </div>
          <Progress 
            value={progress} 
            className={cn(
              "h-2",
              progress < 30 && "bg-zinc-700",
              progress >= 30 && progress < 70 && "bg-zinc-700",
              progress >= 70 && "bg-zinc-700"
            )}
          />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 bg-zinc-800/50 rounded">
            <div className="flex items-center gap-1 mb-1">
              <CheckCircle2 size={10} className="text-green-400" />
              <p className="text-[9px] text-zinc-500 uppercase font-bold">Done</p>
            </div>
            <p className="text-lg font-bold text-green-400">{completedTasks}</p>
          </div>

          <div className="p-2 bg-zinc-800/50 rounded">
            <div className="flex items-center gap-1 mb-1">
              <Clock size={10} className={overdueTasks > 0 ? "text-red-400" : "text-zinc-500"} />
              <p className="text-[9px] text-zinc-500 uppercase font-bold">Late</p>
            </div>
            <p className={cn(
              "text-lg font-bold",
              overdueTasks > 0 ? "text-red-400" : "text-zinc-500"
            )}>
              {overdueTasks}
            </p>
          </div>

          <div className="p-2 bg-zinc-800/50 rounded">
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle size={10} className={openRFIs > 0 ? "text-amber-400" : "text-zinc-500"} />
              <p className="text-[9px] text-zinc-500 uppercase font-bold">RFIs</p>
            </div>
            <p className={cn(
              "text-lg font-bold",
              openRFIs > 0 ? "text-amber-400" : "text-zinc-500"
            )}>
              {openRFIs}
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] capitalize">
            {phase || status}
          </Badge>
          {daysSlip > 0 && (
            <Badge className="bg-red-600 text-[10px]">
              {daysSlip}d behind
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}