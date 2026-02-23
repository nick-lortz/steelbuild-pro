import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GanttChart from '@/components/schedule/GanttChart';

export default function ProjectGantt({ projectId }) {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      const tasks = await base44.entities.Task.filter({ project_id: projectId });
      return tasks.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    },
    enabled: !!projectId
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-[#9CA3AF]">
            <p>No tasks to display. Create tasks in the Schedule to see the timeline.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Timeline</CardTitle>
        <p className="text-sm text-[#9CA3AF] mt-1">
          Gantt chart view of all project tasks and dependencies
        </p>
      </CardHeader>
      <CardContent>
        <GanttChart 
          tasks={tasks} 
          viewMode="week"
          onTaskUpdate={async () => {}}
          onTaskEdit={() => {}}
          onTaskDelete={() => {}}
        />
      </CardContent>
    </Card>
  );
}