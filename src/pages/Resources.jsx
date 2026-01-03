import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, RefreshCw, Filter, Plus } from 'lucide-react';
import ScreenContainer from '@/components/layout/ScreenContainer';
import ResourceCard from '@/components/resources/ResourceCard';
import ResourceDetailView from '@/components/resources/ResourceDetailView';

export default function Resources() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: resources = [], refetch: refetchResources } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list('name'),
    staleTime: 5 * 60 * 1000
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => base44.entities.Task.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: laborHours = [] } = useQuery({
    queryKey: ['labor-hours'],
    queryFn: () => base44.entities.LaborHours.list(),
    staleTime: 5 * 60 * 1000
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetchResources();
    setIsRefreshing(false);
  }, [refetchResources]);

  // Calculate allocation for each resource
  const resourceAllocations = useMemo(() => {
    const allocations = {};
    
    resources.forEach(resource => {
      // Get tasks assigned to this resource
      const assignedTasks = tasks.filter(t => 
        (t.assigned_resources || []).includes(resource.id) ||
        (t.assigned_equipment || []).includes(resource.id)
      );

      const totalHours = assignedTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
      
      // Get logged hours
      const loggedHours = laborHours
        .filter(lh => lh.resource_id === resource.id)
        .reduce((sum, lh) => sum + (lh.hours || 0) + (lh.overtime_hours || 0), 0);

      allocations[resource.id] = {
        totalHours,
        hoursUsed: loggedHours,
        taskCount: assignedTasks.length
      };
    });

    return allocations;
  }, [resources, tasks, laborHours]);

  // Filter resources
  const filteredResources = useMemo(() => {
    let filtered = [...resources];

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(r => r.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Project filter
    if (projectFilter !== 'all') {
      filtered = filtered.filter(r => r.current_project_id === projectFilter);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.name?.toLowerCase().includes(search) ||
        r.classification?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [resources, typeFilter, statusFilter, projectFilter, searchTerm]);

  const statusCounts = useMemo(() => {
    return {
      all: resources.length,
      available: resources.filter(r => r.status === 'available').length,
      assigned: resources.filter(r => r.status === 'assigned').length,
      unavailable: resources.filter(r => r.status === 'unavailable').length
    };
  }, [resources]);

  return (
    <ScreenContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Resources</h1>
          <p className="text-sm text-muted-foreground">{filteredResources.length} resources</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search resources..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="labor">Labor</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="subcontractor">Subcontractor</SelectItem>
            </SelectContent>
          </Select>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="all" className="text-xs py-2">
            All ({statusCounts.all})
          </TabsTrigger>
          <TabsTrigger value="available" className="text-xs py-2">
            Available ({statusCounts.available})
          </TabsTrigger>
          <TabsTrigger value="assigned" className="text-xs py-2">
            Assigned ({statusCounts.assigned})
          </TabsTrigger>
          <TabsTrigger value="unavailable" className="text-xs py-2">
            Out ({statusCounts.unavailable})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Resource Cards */}
      {filteredResources.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No resources found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 mb-4">
          {filteredResources.map((resource) => {
            const project = projects.find(p => p.id === resource.current_project_id);
            const allocation = resourceAllocations[resource.id];
            
            return (
              <ResourceCard
                key={resource.id}
                resource={resource}
                project={project}
                allocation={allocation}
                onClick={() => setSelectedResource(resource)}
              />
            );
          })}
        </div>
      )}

      {/* Resource Detail Sheet */}
      <Sheet open={!!selectedResource} onOpenChange={(open) => !open && setSelectedResource(null)}>
        <SheetContent className="w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Resource Details</SheetTitle>
          </SheetHeader>
          {selectedResource && (
            <ResourceDetailView
              resource={selectedResource}
              project={projects.find(p => p.id === selectedResource.current_project_id)}
              allocation={resourceAllocations[selectedResource.id]}
              tasks={tasks.filter(t => 
                (t.assigned_resources || []).includes(selectedResource.id) ||
                (t.assigned_equipment || []).includes(selectedResource.id)
              )}
              onClose={() => setSelectedResource(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </ScreenContainer>
  );
}