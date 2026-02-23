import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, CheckCircle2, Circle, Calendar as CalendarIcon, Trash2, Paperclip, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import DocumentPicker from '@/components/documents/DocumentPicker';

export default function MilestoneTracker({ projectId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    target_date: null,
    description: ''
  });
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [currentMilestoneId, setCurrentMilestoneId] = useState(null);

  const { data: milestones, isLoading } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: async () => {
      const tasks = await base44.entities.Task.filter({
        project_id: projectId,
        task_type: 'milestone'
      });
      return tasks.sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
    },
    enabled: !!projectId
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: async () => {
      return await base44.entities.Document.filter({ project_id: projectId });
    },
    enabled: !!projectId
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Task.create({
        project_id: projectId,
        title: data.title,
        description: data.description,
        task_type: 'milestone',
        status: 'not_started',
        end_date: data.target_date,
        priority: 'high'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
      toast.success('Milestone created');
      setShowForm(false);
      setFormData({ title: '', target_date: null, description: '' });
    },
    onError: () => toast.error('Failed to create milestone')
  });

  const toggleMutation = useMutation({
    mutationFn: async (milestone) => {
      return await base44.entities.Task.update(milestone.id, {
        status: milestone.status === 'completed' ? 'not_started' : 'completed'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
      toast.success('Milestone updated');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.Task.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
      toast.success('Milestone deleted');
    }
  });

  const handleLinkDocuments = async (docs) => {
    if (!currentMilestoneId) return;
    if (!Array.isArray(docs)) docs = [docs];
    
    for (const doc of docs) {
      await base44.entities.Document.update(doc.id, { task_id: currentMilestoneId });
    }
    
    queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
    toast.success(`${docs.length} document(s) linked`);
    setShowDocPicker(false);
    setCurrentMilestoneId(null);
  };

  const getLinkedDocs = (milestoneId) => {
    return documents.filter(d => d.task_id === milestoneId);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.target_date) {
      toast.error('Title and target date are required');
      return;
    }
    createMutation.mutate(formData);
  };

  const getMilestoneStatus = (milestone) => {
    if (milestone.status === 'completed') return 'completed';
    const targetDate = new Date(milestone.end_date);
    const now = new Date();
    if (targetDate < now) return 'overdue';
    const daysUntil = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 7) return 'upcoming';
    return 'on-track';
  };

  const statusColors = {
    completed: 'text-green-400 bg-green-500/10 border-green-500/30',
    overdue: 'text-red-400 bg-red-500/10 border-red-500/30',
    upcoming: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    'on-track': 'text-blue-400 bg-blue-500/10 border-blue-500/30'
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Project Milestones</CardTitle>
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Milestone
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && (
            <form onSubmit={handleSubmit} className="p-4 bg-[#0A0A0A] rounded-lg border border-[rgba(255,255,255,0.1)] space-y-4">
              <Input
                placeholder="Milestone title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
              <Input
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {formData.target_date ? format(formData.target_date, 'PPP') : 'Pick target date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.target_date}
                    onSelect={(date) => setFormData({ ...formData, target_date: date })}
                  />
                </PopoverContent>
              </Popover>
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {milestones?.length === 0 ? (
            <div className="text-center py-12 text-[#9CA3AF]">
              <p>No milestones yet. Add your first milestone to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {milestones?.map((milestone) => {
                const status = getMilestoneStatus(milestone);
                return (
                  <div
                    key={milestone.id}
                    className="p-4 rounded-lg border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,157,66,0.2)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <button
                          onClick={() => toggleMutation.mutate(milestone)}
                          disabled={toggleMutation.isPending}
                          className="mt-1"
                        >
                          {milestone.status === 'completed' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                          ) : (
                            <Circle className="w-5 h-5 text-[#6B7280]" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-medium ${milestone.status === 'completed' ? 'line-through text-[#6B7280]' : 'text-white'}`}>
                              {milestone.title}
                            </h4>
                            <Badge variant="outline" className={statusColors[status]}>
                              {status.replace('-', ' ')}
                            </Badge>
                          </div>
                          {milestone.description && (
                            <p className="text-sm text-[#9CA3AF] mb-2">{milestone.description}</p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                            <CalendarIcon className="w-3 h-3" />
                            <span>Target: {format(new Date(milestone.end_date), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(milestone.id)}
                        disabled={deleteMutation.isPending}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentPicker
        open={showDocPicker}
        onOpenChange={setShowDocPicker}
        projectId={projectId}
        onSelect={handleLinkDocuments}
        multiSelect={true}
      />
    </div>
  );
}