import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Lock, FileWarning, TrendingUp } from 'lucide-react';

export default function ScheduleImpactsWidget({ projectId }) {
  const { data: impacts } = useQuery({
    queryKey: ['schedule-impacts', projectId],
    queryFn: () => base44.functions.invoke('getScheduleImpacts', { project_id: projectId }),
    enabled: !!projectId,
    select: (response) => response.data
  });

  if (!impacts) return null;

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileWarning size={16} className="text-red-400" />
            <span className="text-xs text-zinc-500">RFIs Affecting Schedule</span>
          </div>
          <div className="text-2xl font-bold text-red-400">{impacts.open_rfi_count}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock size={16} className="text-amber-400" />
            <span className="text-xs text-zinc-500">Held Areas</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">{impacts.held_areas_count}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-orange-400" />
            <span className="text-xs text-zinc-500">Tasks Blocked</span>
          </div>
          <div className="text-2xl font-bold text-orange-400">{impacts.tasks_blocked_count}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-blue-400" />
            <span className="text-xs text-zinc-500">Total Tasks</span>
          </div>
          <div className="text-2xl font-bold text-white">{impacts.total_tasks}</div>
        </CardContent>
      </Card>
    </div>
  );
}