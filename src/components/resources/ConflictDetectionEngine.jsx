import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, MapPin, Users } from 'lucide-react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import ConflictResolutionWizard from './ConflictResolutionWizard';

export default function ConflictDetectionEngine({ resources, tasks, projects, onResolveConflict }) {
  const [selectedConflict, setSelectedConflict] = useState(null);

  const conflicts = useMemo(() => {
    const detected = [];

    resources.forEach(resource => {
      const assignedTasks = tasks.filter(t => {
        const assignedRes = t.assigned_resources || [];
        const assignedEquip = t.assigned_equipment || [];
        return (assignedRes.includes(resource.id) || assignedEquip.includes(resource.id)) &&
               (t.status !== 'completed' && t.status !== 'cancelled');
      });

      // Detect date overlaps
      for (let i = 0; i < assignedTasks.length; i++) {
        for (let j = i + 1; j < assignedTasks.length; j++) {
          const t1 = assignedTasks[i];
          const t2 = assignedTasks[j];

          if (!t1.start_date || !t1.end_date || !t2.start_date || !t2.end_date) continue;

          try {
            const overlap = isWithinInterval(parseISO(t1.start_date), {
              start: parseISO(t2.start_date),
              end: parseISO(t2.end_date)
            }) || isWithinInterval(parseISO(t2.start_date), {
              start: parseISO(t1.start_date),
              end: parseISO(t1.end_date)
            });

            if (overlap) {
              const project1 = projects.find(p => p.id === t1.project_id);
              const project2 = projects.find(p => p.id === t2.project_id);
              const isCrossProject = t1.project_id !== t2.project_id;

              detected.push({
                id: `${resource.id}-${t1.id}-${t2.id}`,
                resource,
                task1: { ...t1, project: project1 },
                task2: { ...t2, project: project2 },
                conflictType: isCrossProject ? 'cross-project' : 'same-project',
                severity: isCrossProject ? 'high' : 'medium',
                overlapDays: calculateOverlapDays(t1, t2)
              });
            }
          } catch (e) {
            // Invalid dates
          }
        }
      }
    });

    return detected.sort((a, b) => 
      a.severity === 'high' && b.severity !== 'high' ? -1 :
      a.severity !== 'high' && b.severity === 'high' ? 1 : 0
    );
  }, [resources, tasks, projects]);

  if (conflicts.length === 0) {
    return (
      <Card className="bg-green-950/20 border-green-500/30">
        <CardContent className="p-6 text-center">
          <div className="text-green-400 mb-2">✓</div>
          <p className="text-sm text-green-400 font-semibold">NO SCHEDULING CONFLICTS</p>
          <p className="text-xs text-zinc-500 mt-1">All resources properly allocated</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card className="bg-red-950/20 border-red-500/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-red-400">
          <AlertTriangle size={18} />
          Resource Conflicts Detected ({conflicts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {conflicts.map(conflict => (
            <div key={conflict.id} className="p-3 bg-zinc-900 rounded border border-zinc-800">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-red-400" />
                  <span className="font-semibold text-white">{conflict.resource.name}</span>
                  <Badge className={
                    conflict.conflictType === 'cross-project'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }>
                    {conflict.conflictType === 'cross-project' ? 'CROSS-PROJECT' : 'SAME PROJECT'}
                  </Badge>
                </div>
                <Badge variant="outline" className="text-xs">
                  {conflict.overlapDays}d overlap
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 bg-zinc-800/50 rounded">
                  <div className="text-xs font-semibold text-white mb-1">{conflict.task1.name}</div>
                  <div className="text-xs text-zinc-500">
                    {conflict.task1.project?.project_number}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-zinc-400">
                    <Calendar size={10} />
                    {format(parseISO(conflict.task1.start_date), 'MMM d')} - {format(parseISO(conflict.task1.end_date), 'MMM d')}
                  </div>
                </div>

                <div className="p-2 bg-zinc-800/50 rounded">
                  <div className="text-xs font-semibold text-white mb-1">{conflict.task2.name}</div>
                  <div className="text-xs text-zinc-500">
                    {conflict.task2.project?.project_number}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-zinc-400">
                    <Calendar size={10} />
                    {format(parseISO(conflict.task2.start_date), 'MMM d')} - {format(parseISO(conflict.task2.end_date), 'MMM d')}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-800">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedConflict(conflict)}
                  className="w-full border-zinc-700 text-xs"
                >
                  Resolve Conflict
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {selectedConflict && (
      <ConflictResolutionWizard
        conflict={{
          resource: selectedConflict.resource,
          tasks: [selectedConflict.task1, selectedConflict.task2],
          overlap_days: selectedConflict.overlapDays,
          severity: selectedConflict.severity,
          conflict_type: selectedConflict.conflictType
        }}
        allResources={resources}
        onClose={() => setSelectedConflict(null)}
        onResolved={() => {
          setSelectedConflict(null);
          onResolveConflict?.(selectedConflict);
        }}
      />
    )}
    </>
  );
}

function calculateOverlapDays(task1, task2) {
  try {
    const start1 = parseISO(task1.start_date);
    const end1 = parseISO(task1.end_date);
    const start2 = parseISO(task2.start_date);
    const end2 = parseISO(task2.end_date);

    const overlapStart = start1 > start2 ? start1 : start2;
    const overlapEnd = end1 < end2 ? end1 : end2;

    if (overlapStart >= overlapEnd) return 0;

    return Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}