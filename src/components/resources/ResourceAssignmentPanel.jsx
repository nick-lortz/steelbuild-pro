import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/notifications';
import { Calendar } from '@/components/ui/calendar';
import { 
  Users, Plus, Calendar as CalendarIcon, AlertTriangle, 
  CheckCircle2, Clock, X, Search, Filter 
} from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ResourceAssignmentPanel({ taskId, projectId, workPackageId, areaName }) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedResource, setSelectedResource] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(addDays(new Date(), 7));
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list()
  });

  const { data: currentAllocations = [] } = useQuery({
    queryKey: ['resource-allocations', taskId],
    queryFn: () => base44.entities.ResourceAllocation.filter({ task_id: taskId }),
    enabled: !!taskId
  });

  const { data: task } = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const tasks = await base44.entities.Task.filter({ id: taskId });
      return tasks[0];
    },
    enabled: !!taskId
  });

  const assignMutation = useMutation({
    mutationFn: (data) => base44.entities.ResourceAllocation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource assigned successfully');
      setShowDialog(false);
      setSelectedResource('');
    }
  });

  const removeMutation = useMutation({
    mutationFn: (id) => base44.entities.ResourceAllocation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource removed from assignment');
    }
  });

  const filteredResources = resources.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.classification?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || r.type === typeFilter;
    const notAlreadyAssigned = !currentAllocations.find(a => a.resource_id === r.id);
    return matchesSearch && matchesType && notAlreadyAssigned;
  });

  const handleAssign = () => {
    if (!selectedResource) return;

    const totalDays = differenceInDays(endDate, startDate) + 1;
    const totalHours = totalDays * hoursPerDay;

    assignMutation.mutate({
      resource_id: selectedResource,
      task_id: taskId,
      project_id: projectId,
      work_package_id: workPackageId,
      allocated_start_date: format(startDate, 'yyyy-MM-dd'),
      allocated_end_date: format(endDate, 'yyyy-MM-dd'),
      allocated_hours: totalHours,
      hours_per_day: hoursPerDay,
      assignment_type: task?.task_type || 'ERECTION',
      location_area: areaName || task?.erection_area || '',
      status: 'assigned'
    });
  };

  const getResourceById = (id) => resources.find(r => r.id === id);

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <Users size={20} />
            Resource Assignments
          </CardTitle>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus size={16} />
                Assign Resource
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Assign Resource</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Search & Filter */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Search</label>
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <Input
                        placeholder="Search by name or skill..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Type</label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="labor">Labor</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="subcontractor">Subcontractor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Resource Selection */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Select Resource</label>
                  <Select value={selectedResource} onValueChange={setSelectedResource}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Choose a resource" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredResources.map(resource => (
                        <SelectItem key={resource.id} value={resource.id}>
                          <div className="flex items-center gap-2">
                            <span>{resource.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {resource.classification}
                            </Badge>
                            {resource.status === 'available' && (
                              <Badge className="bg-green-500/20 text-green-400 text-xs">Available</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Start Date</label>
                    <Input
                      type="date"
                      value={format(startDate, 'yyyy-MM-dd')}
                      onChange={(e) => setStartDate(new Date(e.target.value))}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">End Date</label>
                    <Input
                      type="date"
                      value={format(endDate, 'yyyy-MM-dd')}
                      onChange={(e) => setEndDate(new Date(e.target.value))}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>

                {/* Hours per Day */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Hours per Day</label>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(Number(e.target.value))}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Total: {differenceInDays(endDate, startDate) + 1} days × {hoursPerDay} hrs = {(differenceInDays(endDate, startDate) + 1) * hoursPerDay} hours
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAssign} disabled={!selectedResource}>
                    Assign Resource
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {currentAllocations.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <Users size={40} className="mx-auto mb-3 opacity-50" />
            <p>No resources assigned yet</p>
            <p className="text-xs mt-1">Click "Assign Resource" to add resources to this task</p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentAllocations.map(allocation => {
              const resource = getResourceById(allocation.resource_id);
              if (!resource) return null;

              return (
                <div
                  key={allocation.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{resource.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {resource.classification}
                      </Badge>
                      <Badge className={cn(
                        allocation.status === 'assigned' ? 'bg-blue-500/20 text-blue-400' :
                        allocation.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400' :
                        allocation.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        'bg-zinc-700/20 text-zinc-400'
                      )}>
                        {allocation.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
                      <div className="flex items-center gap-1">
                        <CalendarIcon size={12} />
                        <span>
                          {format(new Date(allocation.allocated_start_date), 'MMM d')} - {format(new Date(allocation.allocated_end_date), 'MMM d')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{allocation.allocated_hours} hrs</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeMutation.mutate(allocation.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X size={16} />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}