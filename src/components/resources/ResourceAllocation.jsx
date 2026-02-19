import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Calendar, Edit, Trash2, Award, Users } from 'lucide-react';
import { format, isWithinInterval } from 'date-fns';
import AllocationForm from './AllocationForm';
import SkillBasedMatcher from './SkillBasedMatcher';
import CrossProjectAvailability from './CrossProjectAvailability';
import DetailedCapacityPlanner from './DetailedCapacityPlanner';
import ResourceLevelingPanel from './ResourceLevelingPanel';
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

export default function ResourceAllocation() {
  const [showForm, setShowForm] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [deleteAllocation, setDeleteAllocation] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [skillMatcherOpen, setSkillMatcherOpen] = useState(false);
  const [requiredSkills, setRequiredSkills] = useState([]);
  const [requiredClassification, setRequiredClassification] = useState('');
  const [planningStartDate, setPlanningStartDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [planningEndDate, setPlanningEndDate] = useState(
    format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );

  const queryClient = useQueryClient();

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list('name'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['resourceAllocations'],
    queryFn: () => base44.entities.ResourceAllocation.list('-start_date'),
  });

  const { data: workPackages = [] } = useQuery({
    queryKey: ['work-packages'],
    queryFn: () => base44.entities.WorkPackage.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => base44.entities.Task.list(),
    staleTime: 5 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ResourceAllocation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resourceAllocations'] });
      setShowForm(false);
      setSelectedAllocation(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ResourceAllocation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resourceAllocations'] });
      setShowForm(false);
      setSelectedAllocation(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ResourceAllocation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resourceAllocations'] });
      setDeleteAllocation(null);
    },
  });

  const handleSubmit = (data) => {
    if (selectedAllocation) {
      updateMutation.mutate({ id: selectedAllocation.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Group allocations by resource with task-based allocation
  const allocationsByResource = resources.map(resource => {
    const resourceAllocations = allocations.filter(a => a.resource_id === resource.id);
    
    // Calculate from task assignments
    const assignedTasks = allTasks.filter(t => {
      const assignedResources = Array.isArray(t.assigned_resources) ? t.assigned_resources : [];
      const assignedEquipment = Array.isArray(t.assigned_equipment) ? t.assigned_equipment : [];
      return assignedResources.includes(resource.id) || assignedEquipment.includes(resource.id);
    });

    const activeTasks = assignedTasks.filter(t => 
      t.status === 'in_progress' || t.status === 'not_started'
    );

    // Calculate effective allocation percentage
    const taskBasedAllocation = resource.weekly_capacity > 0 
      ? Math.min(100, Math.round((activeTasks.length / resource.weekly_capacity) * 100))
      : (activeTasks.length > 0 ? Math.min(100, activeTasks.length * 20) : 0);

    const currentAllocation = resourceAllocations.find(a => 
      isWithinInterval(new Date(), {
        start: new Date(a.start_date),
        end: new Date(a.end_date)
      })
    ) || (taskBasedAllocation > 0 ? { 
      allocation_percentage: taskBasedAllocation,
      _computed: true 
    } : null);
    
    return {
      resource,
      allocations: resourceAllocations,
      currentAllocation,
      assignedTasks: assignedTasks.length,
      activeTasks: activeTasks.length
    };
  });

  const handleSkillMatch = (skills, classification) => {
    setRequiredSkills(skills);
    setRequiredClassification(classification);
    setSkillMatcherOpen(true);
  };

  const handleSelectFromMatcher = (resource) => {
    setSelectedAllocation({ resource_id: resource.id });
    setSkillMatcherOpen(false);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-white uppercase tracking-wide">Resource Allocation & Planning</h3>
        <div className="flex gap-2">
          <Button 
            onClick={() => setSkillMatcherOpen(true)}
            size="sm"
            variant="outline"
            className="border-zinc-700"
          >
            <Award size={16} className="mr-2" />
            Skill Matcher
          </Button>
          <Button 
            onClick={() => {
              setSelectedAllocation(null);
              setShowForm(true);
            }}
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            <Plus size={16} className="mr-2" />
            Allocate
          </Button>
        </div>
      </div>

      <Tabs defaultValue="allocations" className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="allocations">
            <Users size={14} className="mr-2" />
            Current Allocations
          </TabsTrigger>
          <TabsTrigger value="capacity">
            <Calendar size={14} className="mr-2" />
            Capacity Planning
          </TabsTrigger>
          <TabsTrigger value="leveling">
            <TrendingUp size={14} className="mr-2" />
            Resource Leveling
          </TabsTrigger>
        </TabsList>

        <TabsContent value="allocations" className="space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allocationsByResource.map(({ resource, allocations, currentAllocation }) => (
          <Card key={resource.id} className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{resource.name}</span>
                {currentAllocation && (
                  <span className="text-xs font-normal text-amber-400">
                    {currentAllocation.allocation_percentage}% allocated{currentAllocation._computed ? ' (auto)' : ''}
                  </span>
                )}
              </CardTitle>

            </CardHeader>
            <CardContent>
              {allocations.length === 0 ? (
                <p className="text-sm text-zinc-500">No allocations</p>
              ) : (
                <div className="space-y-2">
                  {allocations.slice(0, 3).map(allocation => {
                    const project = projects.find(p => p.id === allocation.project_id);
                    const workPackage = workPackages.find(wp => wp.id === allocation.work_package_id);
                    return (
                      <div key={allocation.id} className="p-2 bg-zinc-800/50 rounded text-sm group hover:bg-zinc-800">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-white">{project?.name}</p>
                            {workPackage && (
                              <p className="text-xs text-zinc-500 mt-0.5">{workPackage.package_number} - {workPackage.name}</p>
                            )}
                            <div className="flex items-center justify-between mt-1 text-xs text-zinc-500">
                              <span>{format(new Date(allocation.start_date), 'MMM d')} - {format(new Date(allocation.end_date), 'MMM d')}</span>
                              <span>{allocation.allocation_percentage}%</span>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAllocation(allocation);
                                setShowForm(true);
                              }}
                              className="h-6 w-6 text-zinc-500 hover:text-white"
                            >
                              <Edit size={12} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteAllocation(allocation);
                              }}
                              className="h-6 w-6 text-zinc-500 hover:text-red-500"
                            >
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="capacity">
          <DetailedCapacityPlanner
            resources={resources}
            tasks={allTasks}
            allocations={allocations}
            projects={projects}
            startDate={planningStartDate}
            endDate={planningEndDate}
          />
        </TabsContent>

        <TabsContent value="leveling">
          <ResourceLevelingPanel projectId={null} />
        </TabsContent>
      </Tabs>

      {/* Skill Matcher Dialog */}
      <Dialog open={skillMatcherOpen} onOpenChange={setSkillMatcherOpen}>
        <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Find Resources by Skills</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Required Skills (comma-separated)</Label>
                <Input
                  placeholder="e.g., Welding, Rigging, AWS D1.1"
                  onChange={(e) => setRequiredSkills(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Classification</Label>
                <Input
                  placeholder="e.g., Ironworker, Welder"
                  onChange={(e) => setRequiredClassification(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>
            
            <SkillBasedMatcher
              requiredSkills={requiredSkills}
              requiredClassification={requiredClassification}
              resources={resources}
              onSelectResource={handleSelectFromMatcher}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Allocation Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        if (!open) {
          setShowForm(false);
          setSelectedAllocation(null);
        }
      }}>
        <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAllocation ? 'Edit Allocation' : 'Allocate Resource'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <AllocationForm
                allocation={selectedAllocation}
                resources={resources}
                projects={projects}
                workPackages={workPackages}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setSelectedAllocation(null);
                }}
                isLoading={createMutation.isPending || updateMutation.isPending}
              />
            </div>
            
            {selectedAllocation?.resource_id && selectedAllocation?.start_date && selectedAllocation?.end_date && (
              <div className="col-span-1">
                <CrossProjectAvailability
                  resource={resources.find(r => r.id === selectedAllocation.resource_id)}
                  startDate={selectedAllocation.start_date}
                  endDate={selectedAllocation.end_date}
                  allocations={allocations.filter(a => a.id !== selectedAllocation.id)}
                  tasks={allTasks}
                  projects={projects}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

        </TabsContent>

        <TabsContent value="capacity">
          <DetailedCapacityPlanner
            resources={resources}
            tasks={allTasks}
            allocations={allocations}
            projects={projects}
            startDate={planningStartDate}
            endDate={planningEndDate}
          />
        </TabsContent>

        <TabsContent value="leveling">
          <ResourceLevelingPanel projectId={null} />
          <p className="text-xs text-zinc-500 mt-3">
            Resource leveling analyzes allocation conflicts and suggests task delays or reassignments to optimize resource usage.
          </p>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteAllocation} onOpenChange={() => setDeleteAllocation(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Allocation?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will remove the allocation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteAllocation.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}