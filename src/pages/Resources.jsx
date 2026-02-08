import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataTable from '@/components/ui/DataTable';
import ResourceForm from '@/components/resources/ResourceForm';
import { Plus, Search, Users, AlertTriangle, Calendar, Trash2, Edit, MapPin, TrendingUp } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { format, parseISO, isWithinInterval } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Resources() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [deleteResource, setDeleteResource] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => apiClient.entities.Resource.list('name'),
    staleTime: 5 * 60 * 1000
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiClient.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiClient.entities.Task.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items'],
    queryFn: () => apiClient.entities.SOVItem.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['resourceAllocations'],
    queryFn: () => apiClient.entities.ResourceAllocation.list(),
    staleTime: 2 * 60 * 1000
  });

  // Real-time subscriptions
  useEffect(() => {
    const unsub = apiClient.entities.Resource.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    });
    return unsub;
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: (data) => apiClient.entities.Resource.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setShowForm(false);
      toast.success('Resource created');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.Resource.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setShowForm(false);
      setEditingResource(null);
      toast.success('Resource updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.entities.Resource.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setDeleteResource(null);
      toast.success('Resource deleted');
    }
  });

  // Calculate conflicts and utilization
  const resourcesWithMetrics = useMemo(() => {
    return resources.map(resource => {
      // Task-based assignments
      const assignedTasks = tasks.filter(t => {
        const assignedRes = Array.isArray(t.assigned_resources) ? t.assigned_resources : [];
        const assignedEquip = Array.isArray(t.assigned_equipment) ? t.assigned_equipment : [];
        return assignedRes.includes(resource.id) || assignedEquip.includes(resource.id);
      });

      const activeTasks = assignedTasks.filter(t => 
        t.status === 'in_progress' || t.status === 'not_started'
      );

      // SOV-based assignments
      const sovAssignments = sovItems.filter(item => {
        const resources = item.assigned_resources || [];
        return resources.includes(resource.id);
      });

      // Allocation-based data
      const currentAllocations = allocations.filter(a => 
        a.resource_id === resource.id &&
        isWithinInterval(new Date(), {
          start: new Date(a.start_date),
          end: new Date(a.end_date)
        })
      );

      const totalAllocationPercent = currentAllocations.reduce((sum, a) => 
        sum + (a.allocation_percentage || 0), 0
      );

      // Detect conflicts (same resource on multiple projects/tasks with overlapping dates)
      const conflicts = [];
      for (let i = 0; i < activeTasks.length; i++) {
        for (let j = i + 1; j < activeTasks.length; j++) {
          const t1 = activeTasks[i];
          const t2 = activeTasks[j];
          
          if (t1.start_date && t1.end_date && t2.start_date && t2.end_date) {
            try {
              const overlap = isWithinInterval(new Date(t1.start_date), {
                start: new Date(t2.start_date),
                end: new Date(t2.end_date)
              }) || isWithinInterval(new Date(t2.start_date), {
                start: new Date(t1.start_date),
                end: new Date(t1.end_date)
              });

              if (overlap) {
                conflicts.push({
                  task1: t1,
                  task2: t2,
                  type: t1.project_id !== t2.project_id ? 'cross-project' : 'same-project'
                });
              }
            } catch (e) {
              // Invalid date
            }
          }
        }
      }

      const maxConcurrent = resource.max_concurrent_assignments || 3;
      const utilization = Math.min((activeTasks.length / maxConcurrent) * 100, 100);
      const isOverallocated = activeTasks.length > maxConcurrent || totalAllocationPercent > 100;

      return {
        ...resource,
        assignedTasks: assignedTasks.length,
        activeTasks: activeTasks.length,
        sovAssignments: sovAssignments.length,
        utilization: Math.round(utilization),
        totalAllocationPercent,
        conflicts,
        isOverallocated,
        projectsCount: [...new Set(assignedTasks.map(t => t.project_id))].length
      };
    });
  }, [resources, tasks, sovItems, allocations]);

  const filteredResources = useMemo(() => {
    return resourcesWithMetrics.filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           r.classification?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || r.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [resourcesWithMetrics, searchTerm, typeFilter, statusFilter]);

  const conflictedResources = resourcesWithMetrics.filter(r => r.conflicts.length > 0);
  const overallocatedResources = resourcesWithMetrics.filter(r => r.isOverallocated);

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <div className="font-semibold text-white">{row.name}</div>
          {row.classification && (
            <div className="text-xs text-zinc-500">{row.classification}</div>
          )}
        </div>
      )
    },
    {
      header: 'Type',
      accessor: 'type',
      render: (row) => <Badge variant="outline" className="capitalize">{row.type}</Badge>
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <Badge className={
          row.status === 'available' ? 'bg-green-500/20 text-green-400' :
          row.status === 'assigned' ? 'bg-blue-500/20 text-blue-400' :
          'bg-zinc-700 text-zinc-400'
        }>
          {row.status}
        </Badge>
      )
    },
    {
      header: 'Utilization',
      accessor: 'utilization',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                row.utilization > 80 ? 'bg-red-500' :
                row.utilization > 50 ? 'bg-amber-500' :
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(row.utilization, 100)}%` }}
            />
          </div>
          <span className="text-sm font-mono">{row.utilization}%</span>
        </div>
      )
    },
    {
      header: 'Tasks',
      accessor: 'activeTasks',
      render: (row) => (
        <div className="text-sm">
          <span className={row.activeTasks > row.max_concurrent_assignments ? 'text-red-400 font-bold' : 'text-white'}>
            {row.activeTasks}
          </span>
          <span className="text-zinc-500"> / {row.max_concurrent_assignments}</span>
        </div>
      )
    },
    {
      header: 'Projects',
      accessor: 'projectsCount',
      render: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.projectsCount} {row.projectsCount === 1 ? 'project' : 'projects'}
        </Badge>
      )
    },
    {
      header: 'Alerts',
      accessor: 'alerts',
      render: (row) => (
        <div className="flex gap-1">
          {row.isOverallocated && (
            <Badge className="bg-red-500/20 text-red-400 text-xs">
              OVER
            </Badge>
          )}
          {row.conflicts.length > 0 && (
            <Badge className="bg-amber-500/20 text-amber-400 text-xs">
              {row.conflicts.length} conflicts
            </Badge>
          )}
        </div>
      )
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setEditingResource(row);
              setShowForm(true);
            }}
            className="h-8 w-8 text-zinc-400 hover:text-white"
          >
            <Edit size={14} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteResource(row);
            }}
            className="h-8 w-8 text-zinc-400 hover:text-red-400"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-600/10 via-zinc-900/50 to-amber-600/5">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Resources</h1>
              <p className="text-xs text-zinc-400 font-mono mt-1">
                {resources.length} TOTAL • {conflictedResources.length} CONFLICTS • {overallocatedResources.length} OVERALLOCATED
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingResource(null);
                setShowForm(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
            >
              <Plus size={16} className="mr-2" />
              NEW RESOURCE
            </Button>
          </div>
        </div>
      </div>

      {/* Alerts Bar */}
      {(conflictedResources.length > 0 || overallocatedResources.length > 0) && (
        <div className="border-b border-red-800 bg-red-950/20">
          <div className="max-w-[1800px] mx-auto px-6 py-3">
            <div className="flex items-center gap-4">
              {conflictedResources.length > 0 && (
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {conflictedResources.length} SCHEDULING CONFLICTS
                  </span>
                </div>
              )}
              {overallocatedResources.length > 0 && (
                <div className="flex items-center gap-2 text-amber-400">
                  <TrendingUp size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {overallocatedResources.length} OVERALLOCATED
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="all">All Resources</TabsTrigger>
            <TabsTrigger value="conflicts">
              Conflicts ({conflictedResources.length})
            </TabsTrigger>
            <TabsTrigger value="overallocated">
              Overallocated ({overallocatedResources.length})
            </TabsTrigger>
          </TabsList>

          {/* All Resources Tab */}
          <TabsContent value="all" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <Input
                  placeholder="SEARCH RESOURCES..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 placeholder:uppercase placeholder:text-xs"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="labor">Labor</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="subcontractor">Subcontractor</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DataTable
              columns={columns}
              data={filteredResources}
              emptyMessage="No resources found. Add your first resource to begin tracking."
            />
          </TabsContent>

          {/* Conflicts Tab */}
          <TabsContent value="conflicts" className="space-y-4">
            {conflictedResources.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-12 text-center">
                  <Users size={48} className="mx-auto mb-4 text-green-500" />
                  <p className="text-sm text-zinc-400 uppercase tracking-widest">NO CONFLICTS DETECTED</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {conflictedResources.map(resource => (
                  <Card key={resource.id} className="bg-red-950/20 border-red-500/30">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle size={18} className="text-red-400" />
                          <span className="text-white">{resource.name}</span>
                          <Badge variant="outline" className="capitalize">{resource.type}</Badge>
                        </div>
                        <Badge className="bg-red-500/20 text-red-400">
                          {resource.conflicts.length} conflicts
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {resource.conflicts.map((conflict, idx) => {
                          const project1 = projects.find(p => p.id === conflict.task1.project_id);
                          const project2 = projects.find(p => p.id === conflict.task2.project_id);
                          
                          return (
                            <div key={idx} className="p-3 bg-zinc-900 rounded border border-zinc-800">
                              <div className="flex items-start justify-between mb-2">
                                <Badge className={
                                  conflict.type === 'cross-project' 
                                    ? 'bg-red-500/20 text-red-400' 
                                    : 'bg-amber-500/20 text-amber-400'
                                }>
                                  {conflict.type === 'cross-project' ? 'Cross-Project' : 'Same Project'}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="p-2 bg-zinc-800/50 rounded">
                                  <div className="font-semibold text-white mb-1">{conflict.task1.name}</div>
                                  <div className="text-zinc-500">{project1?.project_number}</div>
                                  <div className="text-zinc-500">
                                    {format(new Date(conflict.task1.start_date), 'MMM d')} - {format(new Date(conflict.task1.end_date), 'MMM d')}
                                  </div>
                                </div>
                                <div className="p-2 bg-zinc-800/50 rounded">
                                  <div className="font-semibold text-white mb-1">{conflict.task2.name}</div>
                                  <div className="text-zinc-500">{project2?.project_number}</div>
                                  <div className="text-zinc-500">
                                    {format(new Date(conflict.task2.start_date), 'MMM d')} - {format(new Date(conflict.task2.end_date), 'MMM d')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Overallocated Tab */}
          <TabsContent value="overallocated" className="space-y-4">
            {overallocatedResources.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-12 text-center">
                  <TrendingUp size={48} className="mx-auto mb-4 text-green-500" />
                  <p className="text-sm text-zinc-400 uppercase tracking-widest">ALL RESOURCES BALANCED</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {overallocatedResources.map(resource => {
                  const assignedTasks = tasks.filter(t => {
                    const assignedRes = t.assigned_resources || [];
                    const assignedEquip = t.assigned_equipment || [];
                    return (assignedRes.includes(resource.id) || assignedEquip.includes(resource.id)) &&
                           (t.status === 'in_progress' || t.status === 'not_started');
                  });

                  return (
                    <Card key={resource.id} className="bg-amber-950/20 border-amber-500/30">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <TrendingUp size={18} className="text-amber-400" />
                            <span className="text-white">{resource.name}</span>
                            <Badge variant="outline" className="capitalize">{resource.type}</Badge>
                          </div>
                          <Badge className="bg-amber-500/20 text-amber-400">
                            {resource.activeTasks} / {resource.max_concurrent_assignments} tasks
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {assignedTasks.map(task => {
                            const project = projects.find(p => p.id === task.project_id);
                            return (
                              <div key={task.id} className="p-2 bg-zinc-900 rounded flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-white">{task.name}</div>
                                  <div className="text-xs text-zinc-500">
                                    {project?.project_number} • {task.start_date && format(new Date(task.start_date), 'MMM d')} - {task.end_date && format(new Date(task.end_date), 'MMM d')}
                                  </div>
                                </div>
                                <Badge className={
                                  task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-zinc-700 text-zinc-400'
                                }>
                                  {task.status}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Resource Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) setEditingResource(null);
      }}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingResource ? 'Edit Resource' : 'New Resource'}</DialogTitle>
          </DialogHeader>
          <ResourceForm
            resource={editingResource}
            projects={projects}
            onSubmit={(data) => {
              if (editingResource) {
                updateMutation.mutate({ id: editingResource.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingResource(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteResource} onOpenChange={() => setDeleteResource(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Resource?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Delete {deleteResource?.name}? This will remove all task assignments and allocations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteResource.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}