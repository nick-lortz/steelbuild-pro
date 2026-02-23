import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, Clock, AlertTriangle, DollarSign, 
  TrendingUp, Users, Package, Truck 
} from 'lucide-react';

export default function PMDashboard({ projectId }) {
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => base44.entities.Task.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: workPackages } = useQuery({
    queryKey: ['workPackages', projectId],
    queryFn: () => base44.entities.WorkPackage.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: rfis } = useQuery({
    queryKey: ['rfis', projectId],
    queryFn: () => base44.entities.RFI.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: deliveries } = useQuery({
    queryKey: ['deliveries', projectId],
    queryFn: () => base44.entities.Delivery.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const kpis = React.useMemo(() => {
    if (!tasks || !workPackages || !rfis || !deliveries) return null;

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const taskCompletionRate = tasks.length > 0 ? (completedTasks / tasks.length * 100).toFixed(1) : 0;

    const overdueTasks = tasks.filter(t => 
      t.status !== 'completed' && t.end_date && new Date(t.end_date) < new Date()
    ).length;

    const openRFIs = rfis.filter(r => ['submitted', 'under_review'].includes(r.status)).length;
    const criticalRFIs = rfis.filter(r => r.priority === 'critical' && r.status !== 'closed').length;

    const readyWPs = workPackages.filter(wp => wp.install_ready).length;
    const wpReadinessRate = workPackages.length > 0 ? (readyWPs / workPackages.length * 100).toFixed(1) : 0;

    const onSiteDeliveries = deliveries.filter(d => d.delivery_status === 'arrived_on_site').length;
    const inTransitDeliveries = deliveries.filter(d => d.delivery_status === 'in_transit').length;

    return {
      taskCompletionRate,
      overdueTasks,
      openRFIs,
      criticalRFIs,
      wpReadinessRate,
      onSiteDeliveries,
      inTransitDeliveries
    };
  }, [tasks, workPackages, rfis, deliveries]);

  const getScheduleHealth = () => {
    if (!project?.start_date || !project?.target_completion) return 'unknown';
    
    const start = new Date(project.start_date);
    const target = new Date(project.target_completion);
    const now = new Date();
    
    const totalDuration = target - start;
    const elapsed = now - start;
    const percentElapsed = (elapsed / totalDuration) * 100;
    
    const completionRate = parseFloat(kpis?.taskCompletionRate || 0);
    
    if (completionRate >= percentElapsed - 5) return 'on-track';
    if (completionRate >= percentElapsed - 15) return 'at-risk';
    return 'behind';
  };

  const scheduleHealth = getScheduleHealth();
  const healthColors = {
    'on-track': 'text-green-400 bg-green-500/10 border-green-500/30',
    'at-risk': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    'behind': 'text-red-400 bg-red-500/10 border-red-500/30',
    'unknown': 'text-gray-400 bg-gray-500/10 border-gray-500/30'
  };

  return (
    <div className="space-y-6">
      {/* Project Health Summary */}
      <Card className="border-[rgba(255,157,66,0.2)]">
        <CardHeader>
          <CardTitle className="text-lg">Project Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#9CA3AF]">Overall Status</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={healthColors[scheduleHealth]}>
                  {scheduleHealth.toUpperCase()}
                </Badge>
                {project?.status && (
                  <Badge variant="outline" className="text-blue-400 bg-blue-500/10 border-blue-500/30">
                    {project.status}
                  </Badge>
                )}
              </div>
            </div>
            {project && (
              <div className="text-right">
                <p className="text-sm text-[#9CA3AF]">Phase</p>
                <p className="text-lg font-semibold text-white capitalize mt-1">
                  {project.phase || 'Planning'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to={createPageUrl('ResourceManagement')}>
          <Button variant="outline" className="w-full">
            <Users size={16} className="mr-2" />
            Resource Management
          </Button>
        </Link>
        <Link to={createPageUrl('Schedule') + `?project=${projectId}`}>
          <Button variant="outline" className="w-full">
            <Clock size={16} className="mr-2" />
            Schedule View
          </Button>
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-2xl font-bold text-white">{kpis?.taskCompletionRate}%</span>
            </div>
            <p className="text-sm text-[#9CA3AF]">Task Completion</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-red-400" />
              <span className="text-2xl font-bold text-white">{kpis?.overdueTasks || 0}</span>
            </div>
            <p className="text-sm text-[#9CA3AF]">Overdue Tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <span className="text-2xl font-bold text-white">{kpis?.openRFIs || 0}</span>
            </div>
            <p className="text-sm text-[#9CA3AF]">Open RFIs</p>
            {kpis?.criticalRFIs > 0 && (
              <p className="text-xs text-red-400 mt-1">{kpis.criticalRFIs} critical</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-5 h-5 text-blue-400" />
              <span className="text-2xl font-bold text-white">{kpis?.wpReadinessRate}%</span>
            </div>
            <p className="text-sm text-[#9CA3AF]">Install Ready</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Truck className="w-5 h-5 text-amber-400" />
              <span className="text-2xl font-bold text-white">{kpis?.onSiteDeliveries || 0}</span>
            </div>
            <p className="text-sm text-[#9CA3AF]">On Site</p>
            {kpis?.inTransitDeliveries > 0 && (
              <p className="text-xs text-amber-400 mt-1">{kpis.inTransitDeliveries} in transit</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-2xl font-bold text-white">
                {project?.contract_value ? `$${(project.contract_value / 1000000).toFixed(1)}M` : 'N/A'}
              </span>
            </div>
            <p className="text-sm text-[#9CA3AF]">Contract Value</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-purple-400" />
              <span className="text-2xl font-bold text-white">
                {project?.assigned_users?.length || 0}
              </span>
            </div>
            <p className="text-sm text-[#9CA3AF]">Team Members</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <span className="text-2xl font-bold text-white">
                {workPackages?.length || 0}
              </span>
            </div>
            <p className="text-sm text-[#9CA3AF]">Work Packages</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}