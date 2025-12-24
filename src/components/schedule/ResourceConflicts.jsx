import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function ResourceConflicts({ conflicts, tasks, resources, projects }) {
  if (conflicts.length === 0) {
    return (
      <Card className="bg-green-500/10 border-green-500/20">
        <CardContent className="p-8 text-center">
          <Users size={32} className="mx-auto text-green-400 mb-3" />
          <p className="text-green-400 font-medium">No Resource Conflicts Detected</p>
          <p className="text-xs text-zinc-500 mt-1">All resources are properly allocated</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="bg-amber-500/10 border-amber-500/20">
        <CardHeader>
          <CardTitle className="text-sm text-amber-400 flex items-center gap-2">
            <AlertTriangle size={16} />
            {conflicts.length} Resource Conflict{conflicts.length !== 1 ? 's' : ''} Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-300">
            The following resources are double-booked. Adjust task schedules or reassign resources.
          </p>
        </CardContent>
      </Card>

      {/* Conflicts List */}
      <div className="space-y-4">
        {conflicts.map((conflict, idx) => {
          const resource = resources.find(r => r.id === conflict.resourceId);
          const task1 = conflict.task1;
          const task2 = conflict.task2;
          const project1 = projects.find(p => p.id === task1.project_id);
          const project2 = projects.find(p => p.id === task2.project_id);

          return (
            <Card key={idx} className="bg-zinc-900/50 border-red-500/30">
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-400" />
                    <span>{resource?.name || 'Unknown Resource'}</span>
                  </div>
                  <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                    Conflict #{idx + 1}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-zinc-400">
                  <span className="text-zinc-500">Conflict Period:</span>{' '}
                  {format(conflict.overlapStart, 'MMM d')} - {format(conflict.overlapEnd, 'MMM d, yyyy')}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Task 1 */}
                  <div className="p-3 bg-zinc-800/50 rounded border border-zinc-700">
                    <p className="font-medium text-white mb-1">{task1.name}</p>
                    <p className="text-xs text-zinc-500 mb-2">{project1?.name}</p>
                    <div className="text-xs text-zinc-400 space-y-1">
                      <div>
                        <span className="text-zinc-500">Phase:</span>{' '}
                        <Badge variant="outline" className="text-xs ml-1">
                          {task1.phase}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-zinc-500">Period:</span>{' '}
                        {format(new Date(task1.start_date), 'MMM d')} - {format(new Date(task1.end_date), 'MMM d')}
                      </div>
                    </div>
                  </div>

                  {/* Task 2 */}
                  <div className="p-3 bg-zinc-800/50 rounded border border-zinc-700">
                    <p className="font-medium text-white mb-1">{task2.name}</p>
                    <p className="text-xs text-zinc-500 mb-2">{project2?.name}</p>
                    <div className="text-xs text-zinc-400 space-y-1">
                      <div>
                        <span className="text-zinc-500">Phase:</span>{' '}
                        <Badge variant="outline" className="text-xs ml-1">
                          {task2.phase}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-zinc-500">Period:</span>{' '}
                        {format(new Date(task2.start_date), 'MMM d')} - {format(new Date(task2.end_date), 'MMM d')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-700">
                  <p className="text-xs text-amber-400">
                    ⚠ Recommendation: Adjust one of these task schedules or assign a different resource
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}