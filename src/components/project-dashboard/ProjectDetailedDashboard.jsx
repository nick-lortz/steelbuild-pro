import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Settings, TrendingUp, Users, Clock, AlertTriangle, MessageSquare } from 'lucide-react';
import GanttChart from '@/components/schedule/GanttChart';
import RiskRegister from '@/components/project-dashboard/RiskRegister';
import ProjectHealthScorecard from '@/components/financials/ProjectHealthScorecard';
import DashboardCustomizer from '@/components/project-dashboard/DashboardCustomizer';
import CommunicationLog from '@/components/project-dashboard/CommunicationLog';
import ResourceAllocationView from '@/components/project-dashboard/ResourceAllocationView';

export default function ProjectDetailedDashboard({ projectId }) {
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [visibleMetrics, setVisibleMetrics] = useState(() => {
    const saved = localStorage.getItem(`dashboard_${projectId}`);
    return saved ? JSON.parse(saved) : {
      gantt: true,
      resources: true,
      risks: true,
      communications: true,
      health: true
    };
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiClient.entities.Project.filter({ id: projectId }),
    select: (data) => data?.[0],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => apiClient.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: risks = [] } = useQuery({
    queryKey: ['risks', projectId],
    queryFn: () => apiClient.entities.ProjectRisk.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => apiClient.entities.Resource.list(),
    staleTime: 10 * 60 * 1000
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', projectId],
    queryFn: () => apiClient.entities.RFI.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000
  });

  const { data: financials = [] } = useQuery({
    queryKey: ['financials', projectId],
    queryFn: () => apiClient.entities.Financial.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['change-orders', projectId],
    queryFn: () => apiClient.entities.ChangeOrder.filter({ project_id: projectId }),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000
  });

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = tasks?.filter(t => {
      if (t.status === 'completed') return false;
      if (!t.end_date) return false;
      return t.end_date < today;
    }).length || 0;

    const topRisks = (risks || [])
      .filter(r => r.status !== 'closed')
      .sort((a, b) => (b.probability || 0) * (b.impact || 1) - (a.probability || 0) * (a.impact || 1))
      .slice(0, 5);

    return {
      totalTasks,
      completedTasks,
      completionPercent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      overdueTasks,
      openRFIs: (rfis || []).filter(r => !['answered', 'implemented', 'closed', 'void'].includes(r.status)).length,
      topRisks
    };
  }, [tasks, risks, rfis]);

  const handleMetricsChange = (newMetrics) => {
    setVisibleMetrics(newMetrics);
    localStorage.setItem(`dashboard_${projectId}`, JSON.stringify(newMetrics));
  };

  if (!project) {
    return <div className="text-center py-8">Loading project...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">{project.project_number}</p>
        </div>
        <Button variant="outline" onClick={() => setShowCustomizer(!showCustomizer)}>
          <Settings className="w-4 h-4 mr-2" />
          Customize
        </Button>
      </div>

      {showCustomizer && (
        <DashboardCustomizer
          visibleMetrics={visibleMetrics}
          onChange={handleMetricsChange}
          onClose={() => setShowCustomizer(false)}
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{metrics.completionPercent}%</div>
              <p className="text-xs text-muted-foreground mt-1">Schedule Progress</p>
              <p className="text-xs text-muted-foreground">{metrics.completedTasks}/{metrics.totalTasks} tasks</p>
            </div>
          </CardContent>
        </Card>

        <Card className={metrics.overdueTasks > 0 ? 'border-red-500' : ''}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${metrics.overdueTasks > 0 ? 'text-red-500' : ''}`}>
                {metrics.overdueTasks}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Overdue Tasks</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{metrics.openRFIs}</div>
              <p className="text-xs text-muted-foreground mt-1">Open RFIs</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{metrics.topRisks.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Active Risks</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{project.phase}</div>
              <p className="text-xs text-muted-foreground mt-1">Phase</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="gantt" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          {visibleMetrics.gantt && <TabsTrigger value="gantt"><Clock className="w-4 h-4 mr-2" />Timeline</TabsTrigger>}
          {visibleMetrics.resources && <TabsTrigger value="resources"><Users className="w-4 h-4 mr-2" />Resources</TabsTrigger>}
          {visibleMetrics.risks && <TabsTrigger value="risks"><AlertTriangle className="w-4 h-4 mr-2" />Risks</TabsTrigger>}
          {visibleMetrics.communications && <TabsTrigger value="comms"><MessageSquare className="w-4 h-4 mr-2" />Comms</TabsTrigger>}
          {visibleMetrics.health && <TabsTrigger value="health"><TrendingUp className="w-4 h-4 mr-2" />Health</TabsTrigger>}
        </TabsList>

        {visibleMetrics.gantt && (
          <TabsContent value="gantt">
            <Card>
              <CardHeader>
                <CardTitle>Project Timeline</CardTitle>
                <CardDescription>Gantt chart showing task dependencies and critical path</CardDescription>
              </CardHeader>
              <CardContent>
                <GanttChart projectId={projectId} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {visibleMetrics.resources && (
          <TabsContent value="resources">
            <Card>
              <CardHeader>
                <CardTitle>Resource Allocation</CardTitle>
                <CardDescription>Team and equipment assignments by task</CardDescription>
              </CardHeader>
              <CardContent>
                <ResourceAllocationView projectId={projectId} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {visibleMetrics.risks && (
          <TabsContent value="risks">
            <Card>
              <CardHeader>
                <CardTitle>Risk Management</CardTitle>
                <CardDescription>Top 5 active risks and mitigation status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.topRisks.length > 0 ? (
                    <RiskRegister projectId={projectId} limitToTop={5} />
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No active risks identified</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {visibleMetrics.communications && (
          <TabsContent value="comms">
            <Card>
              <CardHeader>
                <CardTitle>Stakeholder Communications</CardTitle>
                <CardDescription>RFIs, meetings, and key decisions</CardDescription>
              </CardHeader>
              <CardContent>
                <CommunicationLog projectId={projectId} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {visibleMetrics.health && (
          <TabsContent value="health">
            <ProjectHealthScorecard 
              financials={financials}
              tasks={tasks}
              projects={project ? [project] : []}
              rfis={rfis}
              changeOrders={changeOrders}
              selectedProject={projectId}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}