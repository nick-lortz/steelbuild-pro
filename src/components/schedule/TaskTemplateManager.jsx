import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, Copy } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function TaskTemplateManager({ open, onOpenChange, onSelectTemplate }) {
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['taskTemplates'],
    queryFn: () => apiClient.entities.TaskTemplate.list('name'),
    enabled: open
  });

  const createMutation = useMutation({
    mutationFn: (data) => apiClient.entities.TaskTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] });
      setShowForm(false);
      setEditingTemplate(null);
      toast.success('Template created');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.TaskTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] });
      setShowForm(false);
      setEditingTemplate(null);
      toast.success('Template updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.entities.TaskTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] });
      toast.success('Template deleted');
    }
  });

  const categoryColors = {
    fabrication: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    erection: 'bg-red-500/20 text-red-400 border-red-500/30',
    detailing: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    delivery: 'bg-green-500/20 text-green-400 border-green-500/30',
    closeout: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    custom: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Task Templates</DialogTitle>
            <Button onClick={() => setShowForm(true)} size="sm" className="bg-amber-500 hover:bg-amber-600 text-black">
              <Plus size={16} className="mr-2" />
              New Template
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {templates.map((template) => (
            <Card key={template.id} className="bg-zinc-800 border-zinc-700">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <Badge variant="outline" className={categoryColors[template.category]}>
                        {template.category}
                      </Badge>
                    </div>
                    {template.description && (
                      <p className="text-sm text-zinc-400 mt-1">{template.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {onSelectTemplate && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onSelectTemplate(template);
                          onOpenChange(false);
                        }}
                        className="border-zinc-700"
                      >
                        <Copy size={14} className="mr-1" />
                        Use
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowForm(true);
                      }}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(template.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-zinc-500">Phase:</span>
                    <span className="ml-2 text-white">{template.phase}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Duration:</span>
                    <span className="ml-2 text-white">{template.duration_days} days</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Est. Hours:</span>
                    <span className="ml-2 text-white">{template.estimated_hours || 0}h</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {templates.length === 0 && (
            <div className="text-center py-8 text-zinc-500">
              No templates yet. Create your first template to speed up task creation.
            </div>
          )}
        </div>

        {showForm && (
          <TemplateForm
            template={editingTemplate}
            onSubmit={(data) => {
              if (editingTemplate) {
                updateMutation.mutate({ id: editingTemplate.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingTemplate(null);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TemplateForm({ template, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(template || {
    name: '',
    description: '',
    category: 'custom',
    phase: 'fabrication',
    duration_days: 1,
    estimated_hours: 0,
    estimated_cost: 0,
    is_milestone: false,
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">{template ? 'Edit Template' : 'New Template'}</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Template Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Column Fabrication Standard"
              required
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fabrication">Fabrication</SelectItem>
                  <SelectItem value="erection">Erection</SelectItem>
                  <SelectItem value="detailing">Detailing</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="closeout">Closeout</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Phase *</Label>
              <Select value={formData.phase} onValueChange={(v) => setFormData({ ...formData, phase: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="detailing">Detailing</SelectItem>
                  <SelectItem value="fabrication">Fabrication</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="erection">Erection</SelectItem>
                  <SelectItem value="closeout">Closeout</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Duration (days)</Label>
              <Input
                type="number"
                value={formData.duration_days}
                onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) || 0 })}
                min="0"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Est. Hours</Label>
              <Input
                type="number"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.5"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Est. Cost ($)</Label>
              <Input
                type="number"
                value={formData.estimated_cost}
                onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button type="button" variant="outline" onClick={onCancel} className="border-zinc-700">
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black">
              {template ? 'Update' : 'Create'} Template
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}