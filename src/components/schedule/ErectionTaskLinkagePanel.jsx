import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Truck, FileText, Link as LinkIcon, Unlink } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ErectionTaskLinkagePanel({ task, projectId }) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedDeliveries, setSelectedDeliveries] = useState(new Set(task.linked_delivery_ids || []));
  const [selectedDrawings, setSelectedDrawings] = useState(new Set(task.linked_drawing_set_ids || []));
  const queryClient = useQueryClient();

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries', projectId],
    queryFn: () => base44.entities.Delivery.filter({ project_id: projectId }),
    enabled: linkDialogOpen
  });

  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawingSets', projectId],
    queryFn: () => base44.entities.DrawingSet.filter({ project_id: projectId }),
    enabled: linkDialogOpen
  });

  const { data: linkedDeliveries = [] } = useQuery({
    queryKey: ['linkedDeliveries', task.id],
    queryFn: async () => {
      if (!task.linked_delivery_ids || task.linked_delivery_ids.length === 0) return [];
      return base44.entities.Delivery.filter({
        id: { $in: task.linked_delivery_ids }
      });
    }
  });

  const { data: linkedDrawings = [] } = useQuery({
    queryKey: ['linkedDrawings', task.id],
    queryFn: async () => {
      if (!task.linked_drawing_set_ids || task.linked_drawing_set_ids.length === 0) return [];
      return base44.entities.DrawingSet.filter({
        id: { $in: task.linked_drawing_set_ids }
      });
    }
  });

  const updateLinkagesMutation = useMutation({
    mutationFn: async () => {
      await base44.asServiceRole.entities.Task.update(task.id, {
        linked_delivery_ids: Array.from(selectedDeliveries),
        linked_drawing_set_ids: Array.from(selectedDrawings)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['linkedDeliveries', task.id]);
      queryClient.invalidateQueries(['linkedDrawings', task.id]);
      setLinkDialogOpen(false);
      toast.success('Requirements updated');
    },
    onError: () => {
      toast.error('Failed to update requirements');
    }
  });

  const toggleDelivery = (deliveryId) => {
    const newSet = new Set(selectedDeliveries);
    if (newSet.has(deliveryId)) {
      newSet.delete(deliveryId);
    } else {
      newSet.add(deliveryId);
    }
    setSelectedDeliveries(newSet);
  };

  const toggleDrawing = (drawingId) => {
    const newSet = new Set(selectedDrawings);
    if (newSet.has(drawingId)) {
      newSet.delete(drawingId);
    } else {
      newSet.add(drawingId);
    }
    setSelectedDrawings(newSet);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Required for Erection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Linked Deliveries */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm flex items-center gap-1">
              <Truck size={14} />
              Deliveries ({linkedDeliveries.length})
            </h4>
          </div>
          {linkedDeliveries.length > 0 ? (
            <div className="space-y-1">
              {linkedDeliveries.map((delivery) => (
                <div key={delivery.id} className="flex items-center justify-between p-2 bg-card border rounded text-xs">
                  <div>
                    <div className="font-medium">{delivery.delivery_number}</div>
                    <div className="text-muted-foreground">{delivery.package_name}</div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      delivery.delivery_status === 'received'
                        ? 'border-green-600 text-green-400'
                        : delivery.delivery_status === 'in_transit'
                        ? 'border-blue-600 text-blue-400'
                        : 'border-yellow-600 text-yellow-400'
                    }
                  >
                    {delivery.delivery_status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">No deliveries linked</div>
          )}
        </div>

        {/* Linked Drawings */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm flex items-center gap-1">
              <FileText size={14} />
              Drawings ({linkedDrawings.length})
            </h4>
          </div>
          {linkedDrawings.length > 0 ? (
            <div className="space-y-1">
              {linkedDrawings.map((drawing) => (
                <div key={drawing.id} className="flex items-center justify-between p-2 bg-card border rounded text-xs">
                  <div>
                    <div className="font-medium">{drawing.set_name}</div>
                    <div className="text-muted-foreground">{drawing.current_revision}</div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      drawing.status === 'FFF' || drawing.status === 'As-Built'
                        ? 'border-green-600 text-green-400'
                        : 'border-yellow-600 text-yellow-400'
                    }
                  >
                    {drawing.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">No drawings linked</div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <LinkIcon size={14} className="mr-1" />
              Link Requirements
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Link Deliveries & Drawings</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 max-h-96 overflow-y-auto">
              {/* Deliveries */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-1">
                  <Truck size={16} />
                  Deliveries
                </h4>
                <ScrollArea className="border rounded">
                  <div className="p-3 space-y-2">
                    {deliveries.map((delivery) => (
                      <div key={delivery.id} className="flex items-start gap-2 p-2 hover:bg-accent rounded">
                        <Checkbox
                          checked={selectedDeliveries.has(delivery.id)}
                          onCheckedChange={() => toggleDelivery(delivery.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{delivery.delivery_number}</div>
                          <div className="text-xs text-muted-foreground">{delivery.package_name}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {delivery.delivery_status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {deliveries.length === 0 && (
                      <div className="text-sm text-muted-foreground">No deliveries</div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Drawings */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-1">
                  <FileText size={16} />
                  Drawings
                </h4>
                <ScrollArea className="border rounded">
                  <div className="p-3 space-y-2">
                    {drawingSets.map((drawing) => (
                      <div key={drawing.id} className="flex items-start gap-2 p-2 hover:bg-accent rounded">
                        <Checkbox
                          checked={selectedDrawings.has(drawing.id)}
                          onCheckedChange={() => toggleDrawing(drawing.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{drawing.set_name}</div>
                          <div className="text-xs text-muted-foreground">{drawing.current_revision}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {drawing.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {drawingSets.length === 0 && (
                      <div className="text-sm text-muted-foreground">No drawings</div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => updateLinkagesMutation.mutate()}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}