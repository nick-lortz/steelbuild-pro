import React, { useState } from 'react';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, Target, Users, Calendar } from 'lucide-react';
import PMDashboard from '@/components/pm/PMDashboard';
import MilestoneTracker from '@/components/pm/MilestoneTracker';
import TaskAssignments from '@/components/pm/TaskAssignments';
import ProjectGantt from '@/components/pm/ProjectGantt';

export default function ProjectManagement() {
  const { activeProjectId } = useActiveProject();
  const [activeTab, setActiveTab] = useState('dashboard');

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
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-[#9CA3AF]">Select a project to view project management tools</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Project Management</h1>
        {project && (
          <p className="text-[#9CA3AF]">
            {project.project_number} - {project.name}
          </p>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#0A0A0A] border border-[rgba(255,255,255,0.05)]">
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="milestones" className="gap-2">
            <Target className="w-4 h-4" />
            Milestones
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2">
            <Users className="w-4 h-4" />
            Task Assignments
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2">
            <Calendar className="w-4 h-4" />
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <PMDashboard projectId={activeProjectId} />
        </TabsContent>

        <TabsContent value="milestones" className="space-y-6">
          <MilestoneTracker projectId={activeProjectId} />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <TaskAssignments projectId={activeProjectId} />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <ProjectGantt projectId={activeProjectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}