import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Plus } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function SOVResourceAssignment({ sovItems, projectId }) {
  const queryClient = useQueryClient();
  const [editingSOVItem, setEditingSOVItem] = useState(null);
  const [selectedResources, setSelectedResources] = useState([]);

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => apiClient.entities.Resource.list('name'),
    staleTime: 5 * 60 * 1000
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.SOVItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sov-items'] });
      setEditingSOVItem(null);
      toast.success('Resources assigned to SOV line');
    }
  });

  const openAssignDialog = (sovItem) => {
    setEditingSOVItem(sovItem);
    setSelectedResources(sovItem.assigned_resources || []);
  };

  const handleSave = () => {
    if (!editingSOVItem) return;
    updateMutation.mutate({
      id: editingSOVItem.id,
      data: { assigned_resources: selectedResources }
    });
  };

  const laborResources = resources.filter(r => r.type === 'labor' || r.type === 'subcontractor');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
          Resource Assignments by SOV Line
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sovItems.map(sovItem => {
          const assignedResources = laborResources.filter(r => 
            (sovItem.assigned_resources || []).includes(r.id)
          );

          return (
            <Card key={sovItem.id} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div>
                    <span className="font-mono text-amber-400">{sovItem.sov_code}</span>
                    <span className="ml-2 text-white">{sovItem.description}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openAssignDialog(sovItem)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <Users size={14} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assignedResources.length === 0 ? (
                  <div className="text-xs text-zinc-500 text-center py-2">
                    No resources assigned
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {assignedResources.map(r => (
                      <Badge key={r.id} variant="outline" className="text-xs">
                        {r.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Assignment Dialog */}
      <Dialog open={!!editingSOVItem} onOpenChange={(open) => !open && setEditingSOVItem(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Assign Resources to {editingSOVItem?.sov_code} - {editingSOVItem?.description}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-2">
              {laborResources.map(resource => (
                <label
                  key={resource.id}
                  className="flex items-center gap-3 p-3 rounded hover:bg-zinc-800 cursor-pointer border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <Checkbox
                    checked={selectedResources.includes(resource.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedResources([...selectedResources, resource.id]);
                      } else {
                        setSelectedResources(selectedResources.filter(id => id !== resource.id));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{resource.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs capitalize">{resource.type}</Badge>
                      {resource.classification && (
                        <span className="text-xs text-zinc-500">{resource.classification}</span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
              <Button
                variant="outline"
                onClick={() => setEditingSOVItem(null)}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                Save Assignment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}