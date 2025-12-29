import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, AlertTriangle, Clock, Search, Filter, Zap, BarChart3 } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, isAfter, isBefore, isWithinInterval, parseISO } from 'date-fns';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import ResourceLeveling from '@/components/resources/ResourceLeveling';
import ResourceForecast from '@/components/resources/ResourceForecast';

export default function ResourceManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch data
  const { data: resources = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['resourceAllocations'],
    queryFn: () => base44.entities.ResourceAllocation.list(),
    staleTime: 5 * 60 * 1000,
  });

  // Calculate resource utilization and allocation
  const resourceMetrics = useMemo(() => {
    if (!resources.length || !tasks.length) return null;

    const today = new Date();
    const metrics = {
      total: resources.length,
      available: 0,
      assigned: 0,
      unavailable: 0,
      labor: 0,
      equipment: 0,
      subcontractor: 0,
      overallocated: [],
      underutilized: [],
      utilizationByResource: [],
      allocationByProject: {},
      typeDistribution: [],
    };

    // Count by type and status
    resources.forEach(resource => {
      if (resource.status === 'available') metrics.available++;
      if (resource.status === 'assigned') metrics.assigned++;
      if (resource.status === 'unavailable') metrics.unavailable++;
      
      if (resource.type === 'labor') metrics.labor++;
      if (resource.type === 'equipment') metrics.equipment++;
      if (resource.type === 'subcontractor') metrics.subcontractor++;
    });

    // Calculate allocation per resource
    resources.forEach(resource => {
      const resourceTasks = tasks.filter(task => {
        const isAssigned = 
          (task.assigned_resources || []).includes(resource.id) ||
          (task.assigned_equipment || []).includes(resource.id);
        
        if (!isAssigned || !task.start_date || !task.end_date) return false;
        
        const taskStart = new Date(task.start_date);
        const taskEnd = new Date(task.end_date);
        
        // Check if task is active or upcoming
        return task.status !== 'completed' && task.status !== 'cancelled' &&
               !isAfter(taskStart, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // Within 30 days
      });

      const activeTaskCount = resourceTasks.filter(t => t.status === 'in_progress').length;
      
      // Calculate utilization score (active tasks / reasonable capacity)
      const utilizationScore = Math.min((activeTaskCount / 3) * 100, 100); // Assume 3 concurrent tasks is 100%
      
      metrics.utilizationByResource.push({
        id: resource.id,
        name: resource.name,
        type: resource.type,
        status: resource.status,
        activeTasks: activeTaskCount,
        totalTasks: resourceTasks.length,
        utilization: utilizationScore,
      });

      // Flag overallocated (>3 active tasks)
      if (activeTaskCount > 3) {
        metrics.overallocated.push({
          ...resource,
          taskCount: activeTaskCount,
        });
      }

      // Flag underutilized (available but no tasks)
      if (resource.status === 'available' && activeTaskCount === 0) {
        metrics.underutilized.push(resource);
      }

      // Track allocation by project
      resourceTasks.forEach(task => {
        const projectId = task.project_id;
        if (!metrics.allocationByProject[projectId]) {
          metrics.allocationByProject[projectId] = {
            projectId,
            resourceCount: 0,
            resources: new Set(),
          };
        }
        metrics.allocationByProject[projectId].resources.add(resource.id);
        metrics.allocationByProject[projectId].resourceCount = 
          metrics.allocationByProject[projectId].resources.size;
      });
    });

    // Type distribution for pie chart
    metrics.typeDistribution = [
      { name: 'Labor', value: metrics.labor, color: '#3b82f6' },
      { name: 'Equipment', value: metrics.equipment, color: '#8b5cf6' },
      { name: 'Subcontractor', value: metrics.subcontractor, color: '#10b981' },
    ].filter(item => item.value > 0);

    return metrics;
  }, [resources, tasks]);

  // Allocation chart data
  const allocationChartData = useMemo(() => {
    if (!resourceMetrics || !projects.length) return [];
    
    return Object.values(resourceMetrics.allocationByProject)
      .map(allocation => {
        const project = projects.find(p => p.id === allocation.projectId);
        return {
          name: project?.project_number || 'Unknown',
          resources: allocation.resourceCount,
        };
      })
      .sort((a, b) => b.resources - a.resources)
      .slice(0, 10);
  }, [resourceMetrics, projects]);

  // Utilization chart data
  const utilizationChartData = useMemo(() => {
    if (!resourceMetrics) return [];
    
    return resourceMetrics.utilizationByResource
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 15)
      .map(r => ({
        name: r.name.length > 20 ? r.name.substring(0, 20) + '...' : r.name,
        utilization: Math.round(r.utilization),
        activeTasks: r.activeTasks,
      }));
  }, [resourceMetrics]);

  // Filter resources
  const filteredResources = useMemo(() => {
    if (!resourceMetrics) return [];

    return resourceMetrics.utilizationByResource.filter(resource => {
      const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || resource.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || resource.status === statusFilter;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [resourceMetrics, searchTerm, typeFilter, statusFilter]);

  if (resourcesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading resources...</p>
        </div>
      </div>
    );
  }

  if (!resourceMetrics) {
    return (
      <div>
        <PageHeader title="Resource Management" subtitle="Manage and monitor resource utilization" showBackButton={false} />
        <EmptyState
          icon={Users}
          title="No Resources Available"
          description="Add resources to track utilization and allocation across projects."
          actionLabel="Manage Resources"
          actionPage="Resources"
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="Resource Management" 
        subtitle="Monitor allocation, leveling, and forecasting"
        showBackButton={false}
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="overview">
            <BarChart3 size={14} className="mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="leveling">
            <Zap size={14} className="mr-2" />
            Resource Leveling
          </TabsTrigger>
          <TabsTrigger value="forecast">
            <TrendingUp size={14} className="mr-2" />
            Forecast
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm font-medium">Total Resources</p>
                <p className="text-2xl font-bold text-white mt-1">{resourceMetrics.total}</p>
              </div>
              <div className="p-2.5 bg-zinc-800 rounded-lg">
                <Users size={20} className="text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm font-medium">Assigned</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{resourceMetrics.assigned}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {resourceMetrics.total > 0 
                    ? `${Math.round((resourceMetrics.assigned / resourceMetrics.total) * 100)}% utilized`
                    : '0% utilized'}
                </p>
              </div>
              <div className="p-2.5 bg-green-500/10 rounded-lg">
                <TrendingUp size={20} className="text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm font-medium">Available</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{resourceMetrics.available}</p>
                <p className="text-xs text-zinc-500 mt-1">Ready for assignment</p>
              </div>
              <div className="p-2.5 bg-blue-500/10 rounded-lg">
                <Clock size={20} className="text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm font-medium">Overallocated</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{resourceMetrics.overallocated.length}</p>
                <p className="text-xs text-zinc-500 mt-1">Requires attention</p>
              </div>
              <div className="p-2.5 bg-red-500/10 rounded-lg">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {(resourceMetrics.overallocated.length > 0 || resourceMetrics.underutilized.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Overallocated Resources */}
          {resourceMetrics.overallocated.length > 0 && (
            <Card className="bg-red-500/5 border-red-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="text-red-500" size={18} />
                  Overallocated Resources ({resourceMetrics.overallocated.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {resourceMetrics.overallocated.slice(0, 5).map(resource => (
                    <div key={resource.id} className="p-3 bg-zinc-900 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{resource.name}</p>
                          <p className="text-sm text-zinc-400 capitalize">{resource.type}</p>
                        </div>
                        <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                          {resource.taskCount} active tasks
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Underutilized Resources */}
          {resourceMetrics.underutilized.length > 0 && (
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="text-amber-500" size={18} />
                  Underutilized Resources ({resourceMetrics.underutilized.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {resourceMetrics.underutilized.slice(0, 5).map(resource => (
                    <div key={resource.id} className="p-3 bg-zinc-900 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{resource.name}</p>
                          <p className="text-sm text-zinc-400 capitalize">{resource.type}</p>
                        </div>
                        <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          No assignments
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Resource Type Distribution */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">Resource Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={resourceMetrics.typeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {resourceMetrics.typeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Resource Allocation by Project */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">Top 10 Projects by Resource Count</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={allocationChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="name" stroke="#a1a1aa" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#a1a1aa" />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }} />
                <Bar dataKey="resources" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Utilization Chart */}
      <Card className="bg-zinc-900 border-zinc-800 mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Resource Utilization (Top 15)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={utilizationChartData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis type="number" stroke="#a1a1aa" domain={[0, 100]} />
              <YAxis type="category" dataKey="name" stroke="#a1a1aa" width={150} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
                formatter={(value, name) => {
                  if (name === 'utilization') return [`${value}%`, 'Utilization'];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="utilization" fill="#3b82f6" name="Utilization %" />
              <Bar dataKey="activeTasks" fill="#10b981" name="Active Tasks" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
            <Input
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-800"
            />
          </div>
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-800">
            <Filter size={16} className="mr-2" />
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="labor">Labor</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
            <SelectItem value="subcontractor">Subcontractor</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="unavailable">Unavailable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resource List */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">Resource Details ({filteredResources.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredResources.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Resources Found"
              description="Try adjusting your filters."
              variant="subtle"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Active Tasks</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResources.map(resource => (
                    <tr key={resource.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-white">{resource.name}</p>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="capitalize">
                          {resource.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={resource.status} />
                      </td>
                      <td className="py-3 px-4">
                        <span className={resource.activeTasks > 3 ? 'text-red-400 font-medium' : 'text-white'}>
                          {resource.activeTasks}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 max-w-[120px]">
                            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${
                                  resource.utilization > 80 ? 'bg-red-500' :
                                  resource.utilization > 50 ? 'bg-amber-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(resource.utilization, 100)}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm text-zinc-300 min-w-[45px]">
                            {Math.round(resource.utilization)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="leveling">
          <ResourceLeveling 
            tasks={tasks}
            resources={resources}
            projects={projects}
          />
        </TabsContent>

        <TabsContent value="forecast">
          <ResourceForecast
            tasks={tasks}
            resources={resources}
            projects={projects}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}