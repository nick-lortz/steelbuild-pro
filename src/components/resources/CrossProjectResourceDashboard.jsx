import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, TrendingUp, TrendingDown, Calendar, BarChart3, Users } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';

export default function CrossProjectResourceDashboard({ resources, projects, tasks, allocations }) {
  const [timeRange, setTimeRange] = useState('4-weeks');
  const [viewBy, setViewBy] = useState('resource');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all');

  // Calculate portfolio-wide metrics
  const portfolioMetrics = useMemo(() => {
    const activeProjects = projects.filter(p => 
      p.status === 'in_progress' || p.status === 'awarded'
    );

    const totalResources = resources.length;
    const assignedResources = new Set();
    const overallocated = [];
    const underutilized = [];

    resources.forEach(resource => {
      const assignedTasks = tasks.filter(t => {
        const assignedRes = t.assigned_resources || [];
        const assignedEquip = t.assigned_equipment || [];
        return (assignedRes.includes(resource.id) || assignedEquip.includes(resource.id)) &&
               (t.status === 'in_progress' || t.status === 'not_started');
      });

      if (assignedTasks.length > 0) {
        assignedResources.add(resource.id);
      }

      const maxConcurrent = resource.max_concurrent_assignments || 3;
      if (assignedTasks.length > maxConcurrent) {
        overallocated.push({ ...resource, taskCount: assignedTasks.length });
      }

      if (assignedTasks.length === 0 && resource.status === 'available' && resource.type === 'labor') {
        underutilized.push(resource);
      }
    });

    const utilizationRate = totalResources > 0 ? (assignedResources.size / totalResources) * 100 : 0;

    return {
      totalProjects: activeProjects.length,
      totalResources,
      assignedCount: assignedResources.size,
      availableCount: totalResources - assignedResources.size,
      overallocatedCount: overallocated.length,
      underutilizedCount: underutilized.length,
      utilizationRate: Math.round(utilizationRate),
      overallocated,
      underutilized
    };
  }, [resources, projects, tasks]);

  // Generate timeline data
  const timelineData = useMemo(() => {
    const now = new Date();
    const weeks = timeRange === '4-weeks' ? 4 : timeRange === '8-weeks' ? 8 : 12;
    const timeline = [];

    for (let i = 0; i < weeks; i++) {
      const weekStart = startOfWeek(addDays(now, i * 7));
      const weekEnd = endOfWeek(weekStart);
      
      timeline.push({
        weekStart,
        weekEnd,
        label: format(weekStart, 'MMM d'),
        resources: []
      });
    }

    const filteredResources = resourceTypeFilter === 'all' 
      ? resources 
      : resources.filter(r => r.type === resourceTypeFilter);

    filteredResources.forEach(resource => {
      const resourceTasks = tasks.filter(t => {
        const assignedRes = t.assigned_resources || [];
        const assignedEquip = t.assigned_equipment || [];
        return (assignedRes.includes(resource.id) || assignedEquip.includes(resource.id)) &&
               t.start_date && t.end_date;
      });

      timeline.forEach(week => {
        const tasksInWeek = resourceTasks.filter(t => {
          try {
            const taskStart = parseISO(t.start_date);
            const taskEnd = parseISO(t.end_date);
            return isWithinInterval(week.weekStart, { start: taskStart, end: taskEnd }) ||
                   isWithinInterval(week.weekEnd, { start: taskStart, end: taskEnd }) ||
                   (taskStart <= week.weekStart && taskEnd >= week.weekEnd);
          } catch {
            return false;
          }
        });

        const projectsInWeek = [...new Set(tasksInWeek.map(t => t.project_id))];
        const maxConcurrent = resource.max_concurrent_assignments || 3;
        const loadPercent = Math.min((tasksInWeek.length / maxConcurrent) * 100, 150);

        week.resources.push({
          resourceId: resource.id,
          resourceName: resource.name,
          resourceType: resource.type,
          taskCount: tasksInWeek.length,
          projectCount: projectsInWeek.length,
          loadPercent,
          status: loadPercent > 100 ? 'overallocated' : 
                  loadPercent > 70 ? 'high' : 
                  loadPercent > 30 ? 'medium' : 'low'
        });
      });
    });

    return timeline;
  }, [resources, tasks, timeRange, resourceTypeFilter]);

  // Project-level allocation summary
  const projectAllocationSummary = useMemo(() => {
    return projects.map(project => {
      const projectTasks = tasks.filter(t => t.project_id === project.id);
      const resourcesUsed = new Set();

      projectTasks.forEach(task => {
        (task.assigned_resources || []).forEach(rid => resourcesUsed.add(rid));
        (task.assigned_equipment || []).forEach(eid => resourcesUsed.add(eid));
      });

      const laborCount = [...resourcesUsed].filter(rid => {
        const r = resources.find(res => res.id === rid);
        return r && r.type === 'labor';
      }).length;

      const equipmentCount = [...resourcesUsed].filter(rid => {
        const r = resources.find(res => res.id === rid);
        return r && r.type === 'equipment';
      }).length;

      return {
        project,
        totalResources: resourcesUsed.size,
        laborCount,
        equipmentCount,
        taskCount: projectTasks.length
      };
    }).sort((a, b) => b.totalResources - a.totalResources);
  }, [projects, tasks, resources]);

  const getLoadColor = (status) => {
    switch (status) {
      case 'overallocated': return 'bg-red-500';
      case 'high': return 'bg-amber-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-zinc-700';
      default: return 'bg-zinc-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Portfolio KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Portfolio Utilization</p>
                <p className="text-2xl font-bold text-white mt-1">{portfolioMetrics.utilizationRate}%</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {portfolioMetrics.assignedCount} / {portfolioMetrics.totalResources} assigned
                </p>
              </div>
              <div className={`p-2 rounded ${
                portfolioMetrics.utilizationRate > 80 ? 'bg-green-500/10' :
                portfolioMetrics.utilizationRate > 50 ? 'bg-amber-500/10' :
                'bg-red-500/10'
              }`}>
                <BarChart3 size={20} className={
                  portfolioMetrics.utilizationRate > 80 ? 'text-green-500' :
                  portfolioMetrics.utilizationRate > 50 ? 'text-amber-500' :
                  'text-red-500'
                } />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Active Projects</p>
                <p className="text-2xl font-bold text-white mt-1">{portfolioMetrics.totalProjects}</p>
                <p className="text-xs text-zinc-500 mt-1">Requiring resources</p>
              </div>
              <div className="p-2 rounded bg-blue-500/10">
                <Calendar size={20} className="text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Overallocated</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{portfolioMetrics.overallocatedCount}</p>
                <p className="text-xs text-zinc-500 mt-1">Needs rebalancing</p>
              </div>
              <div className="p-2 rounded bg-red-500/10">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Available</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{portfolioMetrics.availableCount}</p>
                <p className="text-xs text-zinc-500 mt-1">Ready to deploy</p>
              </div>
              <div className="p-2 rounded bg-green-500/10">
                <Users size={20} className="text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          <TabsTrigger value="projects">By Project</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>

        {/* Timeline View */}
        <TabsContent value="timeline" className="space-y-4">
          <div className="flex gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4-weeks">4 Weeks</SelectItem>
                <SelectItem value="8-weeks">8 Weeks</SelectItem>
                <SelectItem value="12-weeks">12 Weeks</SelectItem>
              </SelectContent>
            </Select>

            <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
              <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="labor">Labor Only</SelectItem>
                <SelectItem value="equipment">Equipment Only</SelectItem>
                <SelectItem value="subcontractor">Subcontractors Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base">Cross-Project Resource Load</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Header */}
                  <div className="flex border-b border-zinc-800 pb-2 mb-2">
                    <div className="w-48 flex-shrink-0 text-xs text-zinc-500 font-semibold uppercase">Resource</div>
                    <div className="flex-1 flex gap-1">
                      {timelineData.map((week, idx) => (
                        <div key={idx} className="flex-1 text-center text-xs text-zinc-500">
                          {week.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resource Rows */}
                  <div className="space-y-1">
                    {resources
                      .filter(r => resourceTypeFilter === 'all' || r.type === resourceTypeFilter)
                      .map(resource => {
                        const maxLoad = Math.max(
                          ...timelineData.map(week => {
                            const resData = week.resources.find(r => r.resourceId === resource.id);
                            return resData?.loadPercent || 0;
                          })
                        );

                        return (
                          <div key={resource.id} className="flex items-center hover:bg-zinc-800/30 py-1 rounded">
                            <div className="w-48 flex-shrink-0">
                              <div className="text-xs font-medium text-white truncate">{resource.name}</div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">
                                  {resource.type}
                                </Badge>
                                {maxLoad > 100 && (
                                  <Badge className="bg-red-500/20 text-red-400 text-[10px] px-1 py-0">
                                    OVER
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 flex gap-1">
                              {timelineData.map((week, idx) => {
                                const resData = week.resources.find(r => r.resourceId === resource.id);
                                const load = resData?.loadPercent || 0;
                                const status = resData?.status || 'low';

                                return (
                                  <div
                                    key={idx}
                                    className="flex-1 h-8 rounded relative group cursor-pointer"
                                    title={`${resData?.taskCount || 0} tasks across ${resData?.projectCount || 0} projects`}
                                  >
                                    <div
                                      className={`h-full rounded ${getLoadColor(status)} transition-opacity group-hover:opacity-80`}
                                      style={{ opacity: Math.max(0.2, Math.min(1, load / 100)) }}
                                    />
                                    {load > 0 && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-[10px] font-bold text-white">
                                          {Math.round(load)}%
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800">
                    <span className="text-xs text-zinc-500 uppercase tracking-wider">Load:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-zinc-700" />
                      <span className="text-xs text-zinc-400">0-30%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-blue-500" />
                      <span className="text-xs text-zinc-400">31-70%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-amber-500" />
                      <span className="text-xs text-zinc-400">71-100%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-red-500" />
                      <span className="text-xs text-zinc-400">&gt;100%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Project View */}
        <TabsContent value="projects" className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base">Resource Allocation by Project</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {projectAllocationSummary.slice(0, 15).map(item => (
                  <div key={item.project.id} className="p-3 bg-zinc-800/50 rounded hover:bg-zinc-800 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-white">
                          {item.project.project_number} - {item.project.name}
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {item.taskCount} tasks • Phase: {item.project.phase}
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {item.totalResources} resources
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <Users size={12} className="text-blue-400" />
                        <span className="text-zinc-400">{item.laborCount} labor</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp size={12} className="text-purple-400" />
                        <span className="text-zinc-400">{item.equipmentCount} equipment</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forecast View */}
        <TabsContent value="forecast" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Underutilized Resources */}
            <Card className="bg-blue-950/20 border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown size={18} className="text-blue-400" />
                  Available Capacity ({portfolioMetrics.underutilizedCount})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {portfolioMetrics.underutilized.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-4">All resources deployed</p>
                ) : (
                  <div className="space-y-2">
                    {portfolioMetrics.underutilized.slice(0, 10).map(resource => (
                      <div key={resource.id} className="p-2 bg-zinc-900 rounded flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-white">{resource.name}</p>
                          <p className="text-xs text-zinc-500 capitalize">{resource.type}</p>
                        </div>
                        <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                          AVAILABLE
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Overallocated Resources */}
            <Card className="bg-red-950/20 border-red-500/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-400" />
                  Overallocated ({portfolioMetrics.overallocatedCount})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {portfolioMetrics.overallocated.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-4">Balanced allocation</p>
                ) : (
                  <div className="space-y-2">
                    {portfolioMetrics.overallocated.slice(0, 10).map(resource => (
                      <div key={resource.id} className="p-2 bg-zinc-900 rounded flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-white">{resource.name}</p>
                          <p className="text-xs text-zinc-500 capitalize">{resource.type}</p>
                        </div>
                        <Badge className="bg-red-500/20 text-red-400 text-xs">
                          {resource.taskCount} / {resource.max_concurrent_assignments || 3}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}