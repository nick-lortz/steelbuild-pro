import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Link as LinkIcon, FileText, Package, CheckSquare, Truck, Plus, X } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function LinkagePanel({ changeOrder, onUpdate }) {
  const [addingType, setAddingType] = useState(null);
  const queryClient = useQueryClient();

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', changeOrder.project_id],
    queryFn: () => base44.entities.RFI.filter({ project_id: changeOrder.project_id }),
    enabled: !!changeOrder.project_id
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', changeOrder.project_id],
    queryFn: () => base44.entities.Task.filter({ project_id: changeOrder.project_id }),
    enabled: !!changeOrder.project_id
  });

  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawing-sets', changeOrder.project_id],
    queryFn: () => base44.entities.DrawingSet.filter({ project_id: changeOrder.project_id }),
    enabled: !!changeOrder.project_id
  });

  const linkMutation = useMutation({
    mutationFn: ({ field, id }) => {
      const currentIds = changeOrder[field] || [];
      return base44.entities.ChangeOrder.update(changeOrder.id, {
        [field]: [...currentIds, id]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
      setAddingType(null);
      toast.success('Link added');
      onUpdate();
    }
  });

  const unlinkMutation = useMutation({
    mutationFn: ({ field, id }) => {
      const currentIds = changeOrder[field] || [];
      return base44.entities.ChangeOrder.update(changeOrder.id, {
        [field]: currentIds.filter(i => i !== id)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
      toast.success('Link removed');
      onUpdate();
    }
  });

  const linkedRFIs = rfis.filter(r => changeOrder.linked_rfi_ids?.includes(r.id));
  const linkedTasks = tasks.filter(t => changeOrder.linked_task_ids?.includes(t.id));
  const linkedDrawings = drawingSets.filter(d => changeOrder.linked_drawing_set_ids?.includes(d.id));

  const availableRFIs = rfis.filter(r => !changeOrder.linked_rfi_ids?.includes(r.id));
  const availableTasks = tasks.filter(t => !changeOrder.linked_task_ids?.includes(t.id));
  const availableDrawings = drawingSets.filter(d => !changeOrder.linked_drawing_set_ids?.includes(d.id));

  return (
    <div className="space-y-4">
      {/* RFIs */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText size={16} className="text-cyan-400" />
              Linked RFIs ({linkedRFIs.length})
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddingType('rfi')}
              className="border-zinc-700 h-8"
            >
              <Plus size={12} className="mr-1" />
              Link RFI
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {addingType === 'rfi' && (
            <div className="flex gap-2 mb-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
              <Select onValueChange={(id) => linkMutation.mutate({ field: 'linked_rfi_ids', id })}>
                <SelectTrigger className="flex-1 bg-zinc-900 border-zinc-700 h-9">
                  <SelectValue placeholder="Select RFI..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {availableRFIs.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      RFI-{r.rfi_number} - {r.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setAddingType(null)}
                className="h-9 w-9 text-zinc-500"
              >
                <X size={14} />
              </Button>
            </div>
          )}

          {linkedRFIs.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No linked RFIs</p>
          ) : (
            linkedRFIs.map(rfi => (
              <div key={rfi.id} className="flex items-center justify-between p-2 bg-zinc-900/50 rounded">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">RFI-{rfi.rfi_number}</p>
                  <p className="text-xs text-zinc-500">{rfi.subject}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => unlinkMutation.mutate({ field: 'linked_rfi_ids', id: rfi.id })}
                  className="h-7 w-7 text-zinc-500 hover:text-red-500"
                >
                  <X size={12} />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckSquare size={16} className="text-purple-400" />
              Linked Tasks ({linkedTasks.length})
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddingType('task')}
              className="border-zinc-700 h-8"
            >
              <Plus size={12} className="mr-1" />
              Link Task
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {addingType === 'task' && (
            <div className="flex gap-2 mb-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded">
              <Select onValueChange={(id) => linkMutation.mutate({ field: 'linked_task_ids', id })}>
                <SelectTrigger className="flex-1 bg-zinc-900 border-zinc-700 h-9">
                  <SelectValue placeholder="Select task..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {availableTasks.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setAddingType(null)}
                className="h-9 w-9 text-zinc-500"
              >
                <X size={14} />
              </Button>
            </div>
          )}

          {linkedTasks.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No linked tasks</p>
          ) : (
            linkedTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-2 bg-zinc-900/50 rounded">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{task.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[9px]">{task.phase}</Badge>
                    <Badge variant="outline" className="text-[9px]">{task.status}</Badge>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => unlinkMutation.mutate({ field: 'linked_task_ids', id: task.id })}
                  className="h-7 w-7 text-zinc-500 hover:text-red-500"
                >
                  <X size={12} />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Drawing Sets */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package size={16} className="text-green-400" />
              Linked Drawings ({linkedDrawings.length})
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddingType('drawing')}
              className="border-zinc-700 h-8"
            >
              <Plus size={12} className="mr-1" />
              Link Drawing
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {addingType === 'drawing' && (
            <div className="flex gap-2 mb-3 p-3 bg-green-500/10 border border-green-500/30 rounded">
              <Select onValueChange={(id) => linkMutation.mutate({ field: 'linked_drawing_set_ids', id })}>
                <SelectTrigger className="flex-1 bg-zinc-900 border-zinc-700 h-9">
                  <SelectValue placeholder="Select drawing set..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {availableDrawings.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.set_name} ({d.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setAddingType(null)}
                className="h-9 w-9 text-zinc-500"
              >
                <X size={14} />
              </Button>
            </div>
          )}

          {linkedDrawings.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No linked drawings</p>
          ) : (
            linkedDrawings.map(drawing => (
              <div key={drawing.id} className="flex items-center justify-between p-2 bg-zinc-900/50 rounded">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{drawing.set_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[9px]">{drawing.status}</Badge>
                    <span className="text-xs text-zinc-600">{drawing.current_revision}</span>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => unlinkMutation.mutate({ field: 'linked_drawing_set_ids', id: drawing.id })}
                  className="h-7 w-7 text-zinc-500 hover:text-red-500"
                >
                  <X size={12} />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}