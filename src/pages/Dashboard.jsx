import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Building, ArrowRight, AlertCircle, Clock, DollarSign, 
  MessageSquareWarning, Calendar, TrendingUp, CheckCircle2,
  AlertTriangle, FileText, Activity
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import ProjectPulsePanel from '@/components/dashboard/ProjectPulsePanel';

export default function Dashboard() {
  const [selectedProjectForPulse, setSelectedProjectForPulse] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis-summary'],
    queryFn: () => base44.entities.RFI.list('-created_date', 500),
    staleTime: 5 * 60 * 1000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-summary'],
    queryFn: () => base44.entities.Task.list('-created_date', 500),
    staleTime: 5 * 60 * 1000
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['change-orders-summary'],
    queryFn: () => base44.entities.ChangeOrder.list('-created_date', 500),
    staleTime: 5 * 60 * 1000
  });

  const projects = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return allProjects;
    return allProjects.filter(p =>
      p.project_manager === currentUser.email ||
      p.superintendent === currentUser.email ||
      (p.assigned_users && p.assigned_users.includes(currentUser.email))
    );
  }, [currentUser, allProjects]);

  const activeProjects = projects.filter(p => 
    p.status === 'in_progress' || p.status === 'awarded'
  );

  const portfolioMetrics = useMemo(() => {
    const totalValue = activeProjects.reduce((sum, p) => sum + (p.contract_value || 0), 0);
    
    const overdueRFIs = rfis.filter(r => 
      r.due_date && 
      !['answered', 'closed'].includes(r.status) &&
      differenceInDays(new Date(), parseISO(r.due_date)) > 0
    ).length;

    const criticalTasks = tasks.filter(t => 
      t.status !== 'completed' && 
      (t.is_critical || t.priority === 'critical')
    ).length;

    const pendingCOs = changeOrders.filter(co => 
      co.status === 'submitted' || co.status === 'under_review'
    ).length;

    return { totalValue, overdueRFIs, criticalTasks, pendingCOs };
  }, [activeProjects, rfis, tasks, changeOrders]);

  const getProjectStats = (project) => {
    const projectRFIs = rfis.filter(r => r.project_id === project.id);
    const openRFIs = projectRFIs.filter(r => !['answered', 'closed'].includes(r.status)).length;
    
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    const overdueTasks = projectTasks.filter(t => 
      t.status !== 'completed' && 
      t.end_date && 
      differenceInDays(new Date(), parseISO(t.end_date)) > 0
    ).length;

    const projectCOs = changeOrders.filter(co => co.project_id === project.id);
    const pendingCOs = projectCOs.filter(co => 
      co.status === 'submitted' || co.status === 'under_review'
    ).length;

    const hasIssues = openRFIs > 5 || overdueTasks > 3 || pendingCOs > 2;

    return { openRFIs, overdueTasks, pendingCOs, hasIssues };
  };

  const getPhaseColor = (phase) => {
    const colors = {
      planning: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      detailing: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      fabrication: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      erection: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      closeout: 'bg-green-500/20 text-green-400 border-green-500/30'
    };
    return colors[phase] || 'bg-zinc-700 text-zinc-300';
  };

  const getStatusColor = (status) => {
    const colors = {
      bidding: 'bg-zinc-700 text-zinc-300',
      awarded: 'bg-green-500/20 text-green-400 border-green-500/30',
      in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      on_hold: 'bg-red-500/20 text-red-400 border-red-500/30',
      completed: 'bg-green-600/20 text-green-300 border-green-600/30',
      closed: 'bg-zinc-800 text-zinc-500'
    };
    return colors[status] || 'bg-zinc-700';
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.05)] bg-black/95">
        <div className="max-w-[1800px] mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[#E5E7EB] tracking-tight mb-2">
                Project Command Center
              </h1>
              <p className="text-[#6B7280] text-sm">
                {currentUser.full_name || currentUser.email} • {currentUser.role}
              </p>
            </div>
            <div className="flex gap-4">
              <Link to={createPageUrl('PortfolioPulse')}>
                <Button variant="outline" className="border-[rgba(255,255,255,0.1)]">
                  <Activity size={16} className="mr-2" />
                  Portfolio Pulse
                </Button>
              </Link>
              <Link to={createPageUrl('ExecutiveRollUp')}>
                <Button variant="outline" className="border-[rgba(255,255,255,0.1)]">
                  <TrendingUp size={16} className="mr-2" />
                  Portfolio View
                </Button>
              </Link>
              <Link to={createPageUrl('Projects')}>
                <Button className="bg-gradient-to-r from-[#FF6B2C] to-[#FF9D42] text-black">
                  <Building size={16} className="mr-2" />
                  All Projects
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio KPIs */}
      <div className="border-b border-[rgba(255,255,255,0.05)]">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="grid grid-cols-4 gap-6">
            <Card className="bg-[#0A0A0A]/90 border-[rgba(255,255,255,0.05)]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Building size={20} className="text-[#FF9D42]" />
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    Active
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {activeProjects.length}
                </div>
                <p className="text-xs text-[#6B7280] uppercase tracking-widest">
                  Active Projects
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#0A0A0A]/90 border-[rgba(255,255,255,0.05)]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign size={20} className="text-green-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  ${(portfolioMetrics.totalValue / 1000000).toFixed(1)}M
                </div>
                <p className="text-xs text-[#6B7280] uppercase tracking-widest">
                  Total Contract Value
                </p>
              </CardContent>
            </Card>

            <Card className={`bg-[#0A0A0A]/90 border-[rgba(255,255,255,0.05)] ${portfolioMetrics.overdueRFIs > 0 ? 'ring-1 ring-red-500/30' : ''}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <MessageSquareWarning size={20} className={portfolioMetrics.overdueRFIs > 0 ? 'text-red-400' : 'text-[#6B7280]'} />
                  {portfolioMetrics.overdueRFIs > 0 && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      Overdue
                    </Badge>
                  )}
                </div>
                <div className={`text-3xl font-bold mb-1 ${portfolioMetrics.overdueRFIs > 0 ? 'text-red-400' : 'text-white'}`}>
                  {portfolioMetrics.overdueRFIs}
                </div>
                <p className="text-xs text-[#6B7280] uppercase tracking-widest">
                  Overdue RFIs
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#0A0A0A]/90 border-[rgba(255,255,255,0.05)]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle size={20} className={portfolioMetrics.criticalTasks > 0 ? 'text-amber-400' : 'text-[#6B7280]'} />
                  {portfolioMetrics.criticalTasks > 0 && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                      Critical
                    </Badge>
                  )}
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {portfolioMetrics.criticalTasks}
                </div>
                <p className="text-xs text-[#6B7280] uppercase tracking-widest">
                  Critical Tasks
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="max-w-[1800px] mx-auto px-8 py-8">
        {activeProjects.length === 0 ? (
          <Card className="bg-[#0A0A0A]/90 border-[rgba(255,255,255,0.05)]">
            <CardContent className="p-12 text-center">
              <Building size={64} className="mx-auto mb-4 text-[#4B5563]" />
              <h3 className="text-xl font-bold text-[#E5E7EB] mb-2">No Active Projects</h3>
              <p className="text-[#6B7280] mb-6">You don't have any active projects assigned.</p>
              <Link to={createPageUrl('Projects')}>
                <Button className="bg-gradient-to-r from-[#FF6B2C] to-[#FF9D42] text-black">
                  <Building size={16} className="mr-2" />
                  View All Projects
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white uppercase tracking-widest">
                Active Projects
              </h2>
              <p className="text-sm text-[#6B7280]">
                {activeProjects.length} project{activeProjects.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeProjects.map(project => {
                const stats = getProjectStats(project);
                const daysUntilCompletion = project.target_completion 
                  ? differenceInDays(parseISO(project.target_completion), new Date())
                  : null;

                return (
                  <Card 
                    key={project.id}
                    className="bg-[#0A0A0A]/90 border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,157,66,0.3)] transition-all group"
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-sm text-[#FF9D42]">
                              {project.project_number}
                            </span>
                            <Badge variant="outline" className={getStatusColor(project.status)}>
                              {project.status?.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline" className={getPhaseColor(project.phase)}>
                              {project.phase}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg text-white mb-1">
                            {project.name}
                          </CardTitle>
                          <p className="text-xs text-[#6B7280]">
                            {project.client}
                          </p>
                        </div>
                        {stats.hasIssues && (
                          <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Key Metrics */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-[#151515] rounded-lg border border-[rgba(255,255,255,0.03)]">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquareWarning size={14} className={stats.openRFIs > 0 ? 'text-amber-400' : 'text-[#6B7280]'} />
                            <span className={`text-lg font-bold ${stats.openRFIs > 0 ? 'text-amber-400' : 'text-white'}`}>
                              {stats.openRFIs}
                            </span>
                          </div>
                          <p className="text-[9px] text-[#6B7280] uppercase tracking-widest">
                            Open RFIs
                          </p>
                        </div>

                        <div className="p-3 bg-[#151515] rounded-lg border border-[rgba(255,255,255,0.03)]">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock size={14} className={stats.overdueTasks > 0 ? 'text-red-400' : 'text-[#6B7280]'} />
                            <span className={`text-lg font-bold ${stats.overdueTasks > 0 ? 'text-red-400' : 'text-white'}`}>
                              {stats.overdueTasks}
                            </span>
                          </div>
                          <p className="text-[9px] text-[#6B7280] uppercase tracking-widest">
                            Late Tasks
                          </p>
                        </div>

                        <div className="p-3 bg-[#151515] rounded-lg border border-[rgba(255,255,255,0.03)]">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText size={14} className={stats.pendingCOs > 0 ? 'text-blue-400' : 'text-[#6B7280]'} />
                            <span className={`text-lg font-bold ${stats.pendingCOs > 0 ? 'text-blue-400' : 'text-white'}`}>
                              {stats.pendingCOs}
                            </span>
                          </div>
                          <p className="text-[9px] text-[#6B7280] uppercase tracking-widest">
                            Pending COs
                          </p>
                        </div>
                      </div>

                      {/* Schedule & Budget */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[rgba(255,255,255,0.03)]">
                        <div>
                          <p className="text-xs text-[#6B7280] mb-1">Contract Value</p>
                          <p className="text-sm font-bold text-white">
                            ${((project.contract_value || 0) / 1000000).toFixed(2)}M
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#6B7280] mb-1">Completion</p>
                          <p className="text-sm font-bold text-white">
                            {daysUntilCompletion !== null ? (
                              daysUntilCompletion > 0 ? (
                                <span className="text-blue-400">{daysUntilCompletion} days</span>
                              ) : (
                                <span className="text-red-400">{Math.abs(daysUntilCompletion)}d overdue</span>
                              )
                            ) : (
                              <span className="text-zinc-600">Not set</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex gap-2 pt-3 border-t border-[rgba(255,255,255,0.03)]">
                        <Button
                          variant="outline"
                          className="flex-1 border-[rgba(255,255,255,0.1)] text-white hover:border-[#FF9D42] hover:text-[#FF9D42] text-xs"
                          onClick={() => setSelectedProjectForPulse(project)}
                        >
                          <Activity size={14} className="mr-1" />
                          Pulse
                        </Button>
                        <Link to={createPageUrl('ProjectDashboard') + `?project=${project.id}`} className="flex-1">
                          <Button 
                            variant="outline" 
                            className="w-full border-[rgba(255,255,255,0.1)] text-white hover:border-[#FF9D42] hover:text-[#FF9D42] text-xs"
                          >
                            Dashboard
                          </Button>
                        </Link>
                        <Link to={createPageUrl('RFIHub') + `?project=${project.id}`} className="flex-1">
                          <Button 
                            variant="outline" 
                            className="w-full border-[rgba(255,255,255,0.1)] text-white hover:border-[#FF9D42] hover:text-[#FF9D42] text-xs"
                          >
                            RFIs
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Project Pulse Modal */}
      {selectedProjectForPulse && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl mt-20">
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedProjectForPulse(null)}
                className="text-white"
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
            <ProjectPulsePanel 
              projectId={selectedProjectForPulse.id} 
              projectName={selectedProjectForPulse.name}
            />
          </div>
        </div>
      )}

      {/* Quick Access Shortcuts */}
      <div className="max-w-[1800px] mx-auto px-8 py-8">
        <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-6">
          Quick Access
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to={createPageUrl('RFIHub')}>
            <Card className="bg-[#0A0A0A]/90 border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,157,66,0.3)] transition-all cursor-pointer group">
              <CardContent className="p-6">
                <MessageSquareWarning size={32} className="text-[#FF9D42] mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-white mb-1">RFI Hub</h3>
                <p className="text-xs text-[#6B7280]">Manage all RFIs</p>
                {portfolioMetrics.overdueRFIs > 0 && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 mt-3 text-xs">
                    {portfolioMetrics.overdueRFIs} overdue
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('ChangeOrders')}>
            <Card className="bg-[#0A0A0A]/90 border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,157,66,0.3)] transition-all cursor-pointer group">
              <CardContent className="p-6">
                <FileText size={32} className="text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-white mb-1">Change Orders</h3>
                <p className="text-xs text-[#6B7280]">Track COs & impacts</p>
                {portfolioMetrics.pendingCOs > 0 && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 mt-3 text-xs">
                    {portfolioMetrics.pendingCOs} pending
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('LookAheadPlanning')}>
            <Card className="bg-[#0A0A0A]/90 border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,157,66,0.3)] transition-all cursor-pointer group">
              <CardContent className="p-6">
                <Calendar size={32} className="text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-white mb-1">Look-Ahead</h3>
                <p className="text-xs text-[#6B7280]">Constraint planning</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl('Analytics')}>
            <Card className="bg-[#0A0A0A]/90 border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,157,66,0.3)] transition-all cursor-pointer group">
              <CardContent className="p-6">
                <TrendingUp size={32} className="text-green-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-white mb-1">Analytics</h3>
                <p className="text-xs text-[#6B7280]">Performance insights</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}