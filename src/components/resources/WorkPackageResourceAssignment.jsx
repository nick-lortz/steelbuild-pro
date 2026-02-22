import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, UserPlus, X, Search, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

export default function WorkPackageResourceAssignment({ workPackage, onClose }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResources, setSelectedResources] = useState([]);

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list()
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations', workPackage.id],
    queryFn: () => base44.entities.ResourceAllocation.filter({ work_package_id: workPackage.id })
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  // Get currently assigned resource IDs
  const assignedResourceIds = useMemo(() => 
    allocations.map(a => a.resource_id), 
    [allocations]
  );

  // Filter resources (labor + subcontractors)
  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      const matchesSearch = !searchTerm || 
        r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.classification?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.contact_name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch && (r.type === 'labor' || r.type === 'subcontractor');
    });
  }, [resources, searchTerm]);

  // Assign resources mutation
  const assignMutation = useMutation({
    mutationFn: async (resourceIds) => {
      const promises = resourceIds.map(resourceId => 
        base44.entities.ResourceAllocation.create({
          resource_id: resourceId,
          project_id: workPackage.project_id,
          work_package_id: workPackage.id,
          start_date: workPackage.start_date || new Date().toISOString().split('T')[0],
          end_date: workPackage.end_date || workPackage.target_date || new Date().toISOString().split('T')[0],
          allocation_percentage: 100
        })
      );
      return await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      toast.success('Resources assigned to work package');
      setSelectedResources([]);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to assign resources');
    }
  });

  // Remove allocation mutation
  const removeMutation = useMutation({
    mutationFn: async (resourceId) => {
      const allocation = allocations.find(a => a.resource_id === resourceId);
      if (allocation) {
        await base44.entities.ResourceAllocation.delete(allocation.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      toast.success('Resource removed');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove resource');
    }
  });

  const handleAssign = () => {
    if (selectedResources.length === 0) {
      toast.error('Select at least one resource');
      return;
    }
    assignMutation.mutate(selectedResources);
  };

  const toggleSelection = (resourceId) => {
    setSelectedResources(prev => 
      prev.includes(resourceId) 
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={20} />
            Assign Resources to {workPackage.title}
          </DialogTitle>
        </DialogHeader>

        {/* Currently Assigned */}
        {allocations.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Currently Assigned</Label>
            <div className="space-y-2">
              {allocations.map(allocation => {
                const resource = resources.find(r => r.id === allocation.resource_id);
                return (
                  <div key={allocation.id} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <div>
                        <div className="font-medium text-white flex items-center gap-2">
                          {resource?.name || 'Unknown'}
                          {resource?.type === 'subcontractor' && (
                            <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-400 border-purple-500/30">
                              SUB
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {resource?.classification} • {allocation.allocation_percentage}% allocated
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeMutation.mutate(allocation.resource_id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Resources */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Available Resources (Labor + Subcontractors)</Label>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  placeholder="Search labor or subs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64 h-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8 text-zinc-500">Loading resources...</div>
            ) : filteredResources.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">No resources found</div>
            ) : (
              filteredResources.map(resource => {
                const isAssigned = assignedResourceIds.includes(resource.id);
                const isSelected = selectedResources.includes(resource.id);
                
                return (
                  <div
                    key={resource.id}
                    onClick={() => !isAssigned && toggleSelection(resource.id)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
                      isAssigned && "opacity-50 cursor-not-allowed bg-zinc-900 border-zinc-800",
                      !isAssigned && isSelected && "bg-blue-500/20 border-blue-500/50",
                      !isAssigned && !isSelected && "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                        isSelected ? "bg-blue-500 border-blue-500" : "border-zinc-600"
                      )}>
                        {isSelected && <CheckCircle2 size={12} className="text-white" />}
                      </div>
                      <div>
                        <div className="font-medium text-white flex items-center gap-2">
                          {resource.name}
                          {resource.type === 'subcontractor' && (
                            <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-400 border-purple-500/30">
                              SUB
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {resource.type === 'subcontractor' 
                            ? `${resource.classification || 'Subcontractor'} • ${resource.contact_name || 'No contact'}`
                            : `${resource.classification} • ${resource.skill_level || 'N/A'}`
                          }
                          {resource.skills?.length > 0 && (
                            <span> • {resource.skills.slice(0, 2).join(', ')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={resource.status === 'available' ? 'success' : 'secondary'}
                        className="text-[10px]"
                      >
                        {resource.status}
                      </Badge>
                      {isAssigned && (
                        <Badge variant="outline" className="text-[10px]">
                          Already Assigned
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-700">
          <div className="text-sm text-zinc-400">
            {selectedResources.length} selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={selectedResources.length === 0 || assignMutation.isPending}
            >
              <UserPlus size={16} className="mr-2" />
              Assign {selectedResources.length > 0 && `(${selectedResources.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}