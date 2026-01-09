import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, RefreshCw, Filter, Users as UsersIcon, Plus, Edit, Trash2 } from 'lucide-react';
import ScreenContainer from '@/components/layout/ScreenContainer';
import ResourceCard from '@/components/resources/ResourceCard';
import ResourceDetailView from '@/components/resources/ResourceDetailView';
import ResourceForm from '@/components/resources/ResourceForm';
import Pagination from '@/components/ui/Pagination';
import { usePagination } from '@/components/shared/hooks/usePagination';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import ExportButton from '@/components/shared/ExportButton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from '@/components/ui/notifications';

export default function Resources() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [deleteResource, setDeleteResource] = useState(null);

  const queryClient = useQueryClient();

  const { data: resources = [], refetch: refetchResources, isLoading } = useQuery({
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

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Resource.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setShowForm(false);
      setEditingResource(null);
      toast.success('Resource created successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Resource.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setShowForm(false);
      setEditingResource(null);
      setSelectedResource(null);
      toast.success('Resource updated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Resource.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setDeleteResource(null);
      setSelectedResource(null);
      toast.success('Resource deleted successfully');
    },
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetchResources();
    setIsRefreshing(false);
  }, [refetchResources]);

  const handleSubmit = (data) => {
    if (editingResource) {
      updateMutation.mutate({ id: editingResource.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

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

  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedResources,
    handlePageChange,
    totalItems,
  } = usePagination(filteredResources, 20);

  const handleResourceClick = useCallback((resource) => {
    setSelectedResource(resource);
  }, []);

  const resourceStats = useMemo(() => ({
    labor: resources.filter(r => r.type === 'labor').length,
    equipment: resources.filter(r => r.type === 'equipment').length,
    subcontractor: resources.filter(r => r.type === 'subcontractor').length,
  }), [resources]);

  return (
    <div className="min-h-screen bg-black">
      {/* Header Bar */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Resource Directory</h1>
              <p className="text-xs text-zinc-600 font-mono mt-1">{filteredResources.length} RESOURCES</p>
            </div>
            <div className="flex gap-2">
              <ExportButton
                data={filteredResources}
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'type', label: 'Type' },
                  { key: 'classification', label: 'Classification' },
                  { key: 'status', label: 'Status' },
                  { key: 'rate', label: 'Rate' },
                  { key: 'rate_type', label: 'Rate Type' },
                  { key: 'contact_name', label: 'Contact' },
                  { key: 'contact_phone', label: 'Phone' }
                ]}
                filename="resources"
              />
              <Button
                onClick={() => {
                  setEditingResource(null);
                  setShowForm(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs uppercase tracking-wider"
              >
                <Plus size={14} className="mr-1" />
                ADD
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">AVAILABLE</div>
              <div className="text-2xl font-bold font-mono text-green-500">{statusCounts.available}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">ASSIGNED</div>
              <div className="text-2xl font-bold font-mono text-white">{statusCounts.assigned}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">LABOR</div>
              <div className="text-2xl font-bold font-mono text-blue-500">{resourceStats.labor}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">EQUIPMENT</div>
              <div className="text-2xl font-bold font-mono text-purple-500">{resourceStats.equipment}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <Input
                placeholder="SEARCH RESOURCES..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 placeholder:uppercase placeholder:text-xs h-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800 text-white">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="labor">Labor</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="subcontractor">Subcontractor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800 text-white">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-xs text-zinc-600 uppercase tracking-widest">LOADING...</p>
            </div>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-xs text-zinc-600 uppercase tracking-widest">NO RESOURCES FOUND</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 mb-4">
              {paginatedResources.map((resource) => {
                const project = projects.find(p => p.id === resource.current_project_id);
                const allocation = resourceAllocations[resource.id];
                
                return (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    project={project}
                    allocation={allocation}
                    onClick={handleResourceClick}
                  />
                );
              })}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                pageSize={20}
                totalItems={totalItems}
              />
            )}
          </>
        )}
      </div>

      {/* Resource Detail Sheet */}
      <Sheet open={!!selectedResource} onOpenChange={(open) => !open && setSelectedResource(null)}>
        <SheetContent className="w-full overflow-y-auto">
          <SheetHeader className="flex flex-row items-center justify-between">
            <SheetTitle>Resource Details</SheetTitle>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  setEditingResource(selectedResource);
                  setShowForm(true);
                }}
              >
                <Edit size={16} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setDeleteResource(selectedResource)}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 size={16} />
              </Button>
            </div>
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

      {/* Resource Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        if (!open) {
          setShowForm(false);
          setEditingResource(null);
        }
      }}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingResource ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
          </DialogHeader>
          <ResourceForm
            resource={editingResource}
            projects={projects}
            onSubmit={handleSubmit}
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
              Are you sure you want to delete "{deleteResource?.name}"? This action cannot be undone.
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