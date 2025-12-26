import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { getDrawingRisks } from '@/components/shared/drawingScheduleUtils';

export default function LookAheadSchedule({ tasks, drawingSets, weeks = 4, projects = [] }) {
  const lookAheadData = useMemo(() => {
    const today = new Date();
    const endDate = new Date(today.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);

    const upcomingTasks = tasks.filter(task => {
      const startDate = new Date(task.start_date);
      return startDate >= today && startDate <= endDate && task.status !== 'completed';
    }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    const risks = getDrawingRisks(upcomingTasks, drawingSets);

    return { upcomingTasks, risks };
  }, [tasks, drawingSets, weeks]);

  const criticalRisks = lookAheadData.risks.filter(r => r.severity === 'critical');
  const highRisks = lookAheadData.risks.filter(r => r.severity === 'high');

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp size={20} className="text-amber-500" />
            {weeks}-Week Look-Ahead
          </CardTitle>
          {(criticalRisks.length > 0 || highRisks.length > 0) && (
            <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
              {criticalRisks.length + highRisks.length} Drawing Risks
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Summary */}
        {lookAheadData.risks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              Drawing Risks
            </h4>
            <div className="space-y-2">
              {criticalRisks.map((risk, idx) => (
                <div key={idx} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-red-400 font-medium">{risk.message}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Drawing: {risk.drawing.set_number} - {risk.drawing.set_name}
                      </p>
                    </div>
                    <Badge className="bg-red-500 text-white">CRITICAL</Badge>
                  </div>
                </div>
              ))}
              {highRisks.map((risk, idx) => (
                <div key={idx} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-amber-400 font-medium">{risk.message}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Drawing: {risk.drawing.set_number} - {risk.drawing.set_name}
                      </p>
                    </div>
                    <Badge className="bg-amber-500 text-black">HIGH</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Tasks */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
            <Clock size={16} />
            Upcoming Tasks
          </h4>
          <div className="space-y-2">
            {lookAheadData.upcomingTasks.slice(0, 8).map(task => {
              const hasRisk = lookAheadData.risks.some(r => r.task.id === task.id);
              const project = projects.find(p => p.id === task.project_id);
              return (
                <div 
                  key={task.id} 
                  className={`p-3 rounded-lg border ${
                    hasRisk 
                      ? 'bg-amber-500/5 border-amber-500/20' 
                      : 'bg-zinc-800/50 border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{task.name}</p>
                      {project && (
                        <p className="text-xs text-zinc-400 mt-0.5">{project.name}</p>
                      )}
                      <p className="text-xs text-zinc-500 mt-1">
                        Starts: {format(new Date(task.start_date), 'MMM d, yyyy')} • 
                        Phase: <span className="capitalize">{task.phase}</span>
                      </p>
                    </div>
                    {hasRisk && (
                      <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {lookAheadData.upcomingTasks.length === 0 && (
          <p className="text-center text-zinc-500 py-4">
            No tasks scheduled in the next {weeks} weeks
          </p>
        )}
      </CardContent>
    </Card>
  );
}