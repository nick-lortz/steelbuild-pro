import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, X, ExternalLink, MessageSquareWarning, Calendar, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function LinkagePanel({ changeOrder, onUpdate }) {
  const queryClient = useQueryClient();
  const [addingType, setAddingType] = useState(null);

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

  const { data: drawings = [] } = useQuery({
    queryKey: ['drawings', changeOrder.project_id],
    queryFn: () => base44.entities.DrawingSet.filter({ project_id: changeOrder.project_id }),
    enabled: !!changeOrder.project_id
  });

  const updateLinks = async (field, value) => {
    await base44.entities.ChangeOrder.update(changeOrder.id, {
      [field]: value
    });
    queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
    onUpdate();
  };

  const addLink = async (type, id) => {
    const field = `linked_${type}_ids`;
    const current = changeOrder[field] || [];
    if (current.includes(id)) {
      toast.error('Already linked');
      return;
    }
    await updateLinks(field, [...current, id]);
    toast.success('Link added');
    setAddingType(null);
  };

  const removeLink = async (type, id) => {
    const field = `linked_${type}_ids`;
    const current = changeOrder[field] || [];
    await updateLinks(field, current.filter(i => i !== id));
    toast.success('Link removed');
  };

  const linkedRFIs = (changeOrder.linked_rfi_ids || [])
    .map(id => rfis.find(r => r.id === id))
    .filter(Boolean);

  const linkedTasks = (changeOrder.linked_task_ids || [])
    .map(id => tasks.find(t => t.id === id))
    .filter(Boolean);

  const linkedDrawings = (changeOrder.linked_drawing_set_ids || [])
    .map(id => drawings.find(d => d.id === id))
    .filter(Boolean);

  const renderSection = (title, icon: React.ElementType, items, type, available) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
          {React.createElement(icon, { size: 14 })}
          {title}
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAddingType(addingType === type ? null : type)}
          className="text-zinc-400 hover:text-white"
        >
          <Plus size={14} className="mr-1" />
          Add
        </Button>
      </div>

      {addingType === type && (
        <div className="p-3 bg-zinc-800/50 rounded border border-zinc-700">
          <Select onValueChange={(id) => addLink(type, id)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder={`Select ${title.slice(0, -1).toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {available.map(item => (
                <SelectItem key={item.id} value={item.id}>
                  {item.title || item.name || item.drawing_number || item.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-zinc-600 py-2">No {title.toLowerCase()} linked</p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 bg-zinc-800/50 rounded hover:bg-zinc-800 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">
                  {type === 'rfi' ? `RFI-${item.rfi_number}` :
                   type === 'task' ? item.name :
                   item.drawing_number} - {item.title || item.subject || ''}
                </p>
                {item.status && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    {item.status}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-400 hover:text-white"
                  onClick={() => {
                    // Navigate to entity (simplified)
                    const pages = { rfi: 'RFIs', task: 'Schedule', drawing_set: 'Detailing' };
                    window.location.hash = `#${pages[type]}`;
                  }}
                >
                  <ExternalLink size={12} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-400 hover:text-red-400"
                  onClick={() => removeLink(type, item.id)}
                >
                  <X size={12} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base">Linked Items</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderSection('RFIs', MessageSquareWarning, linkedRFIs, 'rfi', rfis)}
        {renderSection('Tasks', Calendar, linkedTasks, 'task', tasks)}
        {renderSection('Drawings', FileText, linkedDrawings, 'drawing_set', drawings)}
      </CardContent>
    </Card>
  );
}