import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/ui/PageHeader';
import { MessageSquare, Plus, Search, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export default function ProductionNotesPage() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);

  const { data: notes = [] } = useQuery({
    queryKey: ['production-notes', activeProjectId],
    queryFn: () => activeProjectId ? base44.entities.ProductionNote.filter({ project_id: activeProjectId }) : [],
    enabled: !!activeProjectId
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductionNote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-notes'] });
      toast.success('Production note created');
      setShowForm(false);
    }
  });

  const acknowledgeMutation = useMutation({
    mutationFn: ({ id, note }) => {
      const acknowledgements = note.acknowledgements || [];
      return base44.entities.ProductionNote.update(id, {
        acknowledgements: [
          ...acknowledgements,
          {
            user: currentUser.email,
            acknowledged_at: new Date().toISOString()
          }
        ]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-notes'] });
      toast.success('Acknowledged');
    }
  });

  const filteredNotes = useMemo(() => {
    return notes
      .filter(note => {
        const matchesSearch = !searchTerm || 
          note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          note.content?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || note.note_type === typeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [notes, searchTerm, typeFilter]);

  const needsAcknowledgement = useMemo(() => {
    return notes.filter(note => 
      note.acknowledgement_required && 
      !note.acknowledgements?.some(ack => ack.user === currentUser?.email)
    ).length;
  }, [notes, currentUser]);

  if (!activeProjectId) {
    return (
      <div className="p-6">
        <PageHeader title="Production Notes" />
        <Card className="mt-6">
          <CardContent className="p-12 text-center">
            <MessageSquare size={48} className="mx-auto mb-4 text-zinc-600" />
            <p className="text-zinc-400">Select a project to view production notes</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Production Notes"
        subtitle="Shop & Field Communication Hub"
        actions={
          <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600 text-black">
            <Plus size={16} className="mr-2" />
            New Note
          </Button>
        }
      />

      {needsAcknowledgement > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-amber-500" size={20} />
              <span className="text-sm font-medium">
                {needsAcknowledgement} note{needsAcknowledgement > 1 ? 's' : ''} require your acknowledgement
              </span>
            </div>
            <Button size="sm" variant="outline">View</Button>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="weld">Weld</SelectItem>
            <SelectItem value="fit_up">Fit-up</SelectItem>
            <SelectItem value="qc">QC</SelectItem>
            <SelectItem value="safety">Safety</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filteredNotes.map(note => {
          const needsMyAck = note.acknowledgement_required && 
            !note.acknowledgements?.some(ack => ack.user === currentUser?.email);
          
          return (
            <Card 
              key={note.id} 
              className={`bg-zinc-900 border-zinc-800 ${needsMyAck ? 'ring-2 ring-amber-500/50' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{note.title}</h3>
                      <Badge className="text-xs">
                        {note.note_type.replace('_', ' ')}
                      </Badge>
                      {note.priority === 'critical' && (
                        <Badge className="bg-red-500 text-xs">CRITICAL</Badge>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400 whitespace-pre-wrap">{note.content}</p>
                    {note.area_gridline && (
                      <div className="text-xs text-zinc-500 mt-2">Area: {note.area_gridline}</div>
                    )}
                  </div>
                  {needsMyAck && (
                    <Button
                      size="sm"
                      onClick={() => acknowledgeMutation.mutate({ id: note.id, note })}
                      className="bg-amber-500 hover:bg-amber-600 text-black"
                    >
                      <CheckCircle2 size={14} className="mr-1" />
                      Acknowledge
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <div className="flex items-center gap-4">
                    <span>{note.created_by}</span>
                    <span>{note.created_date ? format(parseISO(note.created_date), 'MMM d, h:mm a') : ''}</span>
                    {note.acknowledgements?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-green-500" />
                        {note.acknowledgements.length} acknowledged
                      </span>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {note.visibility.replace('_', ' ')}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredNotes.length === 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-12 text-center">
              <MessageSquare size={48} className="mx-auto mb-4 text-zinc-600" />
              <p className="text-zinc-400">No production notes found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {showForm && (
        <ProductionNoteForm
          projectId={activeProjectId}
          currentUser={currentUser}
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function ProductionNoteForm({ projectId, currentUser, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: projectId,
    note_number: Date.now(),
    title: '',
    content: '',
    note_type: 'general',
    visibility: 'both',
    priority: 'normal',
    acknowledgement_required: false,
    effective_date: new Date().toISOString().split('T')[0],
    created_by: currentUser?.email
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="bg-zinc-900 border-zinc-800 w-full max-w-2xl">
        <CardHeader>
          <CardTitle>New Production Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Content *</label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="bg-zinc-800 border-zinc-700 h-32"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-2 block">Type</label>
              <Select
                value={formData.note_type}
                onValueChange={(val) => setFormData({ ...formData, note_type: val })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="weld">Weld</SelectItem>
                  <SelectItem value="fit_up">Fit-up</SelectItem>
                  <SelectItem value="qc">QC</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-2 block">Visibility</label>
              <Select
                value={formData.visibility}
                onValueChange={(val) => setFormData({ ...formData, visibility: val })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shop_only">Shop Only</SelectItem>
                  <SelectItem value="field_only">Field Only</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                  <SelectItem value="pm_only">PM Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-2 block">Priority</label>
              <Select
                value={formData.priority}
                onValueChange={(val) => setFormData({ ...formData, priority: val })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button 
              onClick={() => onSubmit(formData)}
              disabled={!formData.title || !formData.content}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Create Note
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}