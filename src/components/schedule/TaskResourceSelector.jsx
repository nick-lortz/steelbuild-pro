import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Users, AlertTriangle } from 'lucide-react';

export default function TaskResourceSelector({ projectId, assignedResources = [], onChange }) {
  const [selectedResourceId, setSelectedResourceId] = useState('');

  const { data: availableResources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.filter({ status: 'available' })
  });

  const { data: resourceAllocations = [] } = useQuery({
    queryKey: ['resource-allocations'],
    queryFn: () => base44.entities.ResourceAllocation.filter({})
  });

  const handleAdd = () => {
    if (!selectedResourceId || assignedResources.includes(selectedResourceId)) return;
    onChange([...assignedResources, selectedResourceId]);
    setSelectedResourceId('');
  };

  const handleRemove = (resourceId) => {
    onChange(assignedResources.filter(id => id !== resourceId));
  };

  const getResourceInfo = (resourceId) => {
    const resource = availableResources.find(r => r.id === resourceId);
    if (!resource) return { name: 'Unknown', workload: 0, overloaded: false };

    // Count current allocations
    const allocations = resourceAllocations.filter(a => a.resource_id === resourceId);
    const workload = allocations.reduce((sum, a) => sum + (a.allocation_percentage || 100), 0);
    
    return {
      name: resource.name,
      role: resource.role || resource.classification,
      workload,
      overloaded: workload > 100,
      status: resource.status
    };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase">
        <Users size={14} />
        Assigned Resources
      </div>

      {assignedResources.length > 0 && (
        <div className="space-y-2">
          {assignedResources.map((resourceId) => {
            const info = getResourceInfo(resourceId);
            return (
              <div key={resourceId} className="flex items-center gap-2 p-2 bg-zinc-800 rounded border border-zinc-700">
                <div className="flex-1">
                  <p className="text-xs font-medium text-white">{info.name}</p>
                  <div className="flex gap-2 mt-1">
                    {info.role && (
                      <Badge variant="outline" className="text-[10px]">{info.role}</Badge>
                    )}
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] ${info.overloaded ? 'border-red-500 text-red-400' : 'border-green-500 text-green-400'}`}
                    >
                      {info.workload}% allocated
                    </Badge>
                  </div>
                </div>
                {info.overloaded && (
                  <AlertTriangle size={14} className="text-red-400" />
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemove(resourceId)}
                  className="h-6 w-6 p-0"
                >
                  <X size={14} />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Select value={selectedResourceId} onValueChange={setSelectedResourceId}>
          <SelectTrigger className="bg-zinc-700 border-zinc-600 flex-1">
            <SelectValue placeholder="Select resource..." />
          </SelectTrigger>
          <SelectContent>
            {availableResources.map(resource => {
              const info = getResourceInfo(resource.id);
              return (
                <SelectItem key={resource.id} value={resource.id}>
                  <div className="flex items-center gap-2">
                    {resource.name}
                    {info.overloaded && <AlertTriangle size={12} className="text-red-400" />}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!selectedResourceId}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus size={14} />
        </Button>
      </div>
    </div>
  );
}