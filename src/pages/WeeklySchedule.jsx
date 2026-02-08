import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import LookAheadCore from '@/components/schedule/LookAheadCore';
import SteelGanttChart from '@/components/schedule/SteelGanttChart';
import ErectionSequencingPanel from '@/components/schedule/ErectionSequencingPanel';
import WorkPackageScheduleView from '@/components/schedule/WorkPackageScheduleView';

export default function WeeklySchedule() {
  const { activeProjectId } = useActiveProject();
  const [view, setView] = useState('lookahead');

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return null;
      const projects = await base44.entities.Project.filter({ id: activeProjectId });
      return projects[0];
    },
    enabled: !!activeProjectId
  });

  if (!activeProjectId) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500">Select a project to view schedule</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{project?.name}</CardTitle>
              <p className="text-xs text-zinc-400 mt-1">Phase: {project?.phase}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={view} onValueChange={setView} className="w-full">
        <TabsList className="bg-zinc-800 border-zinc-700 grid w-full grid-cols-4">
          <TabsTrigger value="lookahead">Look-Ahead (6w)</TabsTrigger>
          <TabsTrigger value="gantt">Gantt</TabsTrigger>
          <TabsTrigger value="erection">Erection</TabsTrigger>
          <TabsTrigger value="workpackage">Work Packages</TabsTrigger>
        </TabsList>

        <TabsContent value="lookahead" className="mt-4">
          <LookAheadCore projectId={activeProjectId} />
        </TabsContent>

        <TabsContent value="gantt" className="mt-4">
          <SteelGanttChart projectId={activeProjectId} />
        </TabsContent>

        <TabsContent value="erection" className="mt-4">
          <ErectionSequencingPanel projectId={activeProjectId} />
        </TabsContent>

        <TabsContent value="workpackage" className="mt-4">
          <WorkPackageScheduleView projectId={activeProjectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}