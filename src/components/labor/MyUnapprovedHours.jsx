import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function MyUnapprovedHours() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Fetch unapproved hours for current user
  const { data: unapprovedHours = [], isLoading } = useQuery({
    queryKey: ['unapprovedHours', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const entries = await base44.entities.LaborHours.filter({ crew_employee: currentUser.email });
      return entries.filter(e => ['draft', 'pending', 'unapproved'].includes(e.status) || !e.approved)
        .sort((a, b) => new Date(b.work_date) - new Date(a.work_date));
    },
    enabled: !!currentUser?.email
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: workPackages = [] } = useQuery({
    queryKey: ['workPackages'],
    queryFn: () => base44.entities.WorkPackage.list()
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['costCodes'],
    queryFn: () => base44.entities.CostCode.list()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LaborHours.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unapprovedHours'] });
      toast.success('Hours updated');
      setFormOpen(false);
      setEditingEntry(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LaborHours.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unapprovedHours'] });
      toast.success('Entry deleted');
    }
  });

  const approveMutation = useMutation({
    mutationFn: (id) => base44.entities.LaborHours.update(id, {
      status: 'approved',
      approved: true,
      approved_by: currentUser?.email,
      approved_date: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unapprovedHours'] });
      toast.success('Hours approved');
    }
  });

  const handleDelete = (entry) => {
    if (window.confirm(`Delete labor entry for ${format(new Date(entry.work_date), 'MMM d, yyyy')}?`)) {
      deleteMutation.mutate(entry.id);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading hours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Unapproved Hours</h2>
          <p className="text-sm text-zinc-400 mt-1">
            {unapprovedHours.length} {unapprovedHours.length === 1 ? 'entry' : 'entries'} awaiting approval
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingEntry(null);
            setFormOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          <Plus size={16} className="mr-2" />
          Add Hours
        </Button>
      </div>

      {/* Entries List */}
      {unapprovedHours.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center">
            <Clock size={48} className="mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400 text-lg">No unapproved hours</p>
            <p className="text-zinc-500 text-sm mt-2">All your time entries are approved or you haven't logged any hours yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {unapprovedHours.map(entry => {
            const project = projects.find(p => p.id === entry.project_id);
            const workPackage = workPackages.find(wp => wp.id === entry.work_package_id);
            const costCode = costCodes.find(cc => cc.id === entry.cost_code_id);
            
            return (
              <Card key={entry.id} className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold text-white">
                          {format(new Date(entry.work_date), 'EEEE, MMMM d, yyyy')}
                        </p>
                        <Badge 
                          className={
                            entry.status === 'draft' ? 'bg-zinc-700 text-zinc-300' :
                            entry.status === 'pending' ? 'bg-blue-700 text-blue-300' :
                            'bg-yellow-700 text-yellow-300'
                          }
                        >
                          {entry.status || 'unapproved'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div>
                          <span className="text-zinc-500">Project: </span>
                          <span className="text-white">{project?.name || 'Unknown'}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Hours: </span>
                          <span className="text-white">{entry.hours}h</span>
                          {entry.overtime_hours > 0 && (
                            <span className="text-amber-500 ml-2">+{entry.overtime_hours}h OT</span>
                          )}
                        </div>
                        <div>
                          <span className="text-zinc-500">Work Package: </span>
                          <span className="text-white">{workPackage?.name || 'Unknown'}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Cost Code: </span>
                          <span className="text-white">{costCode?.name || 'Unknown'}</span>
                        </div>
                      </div>
                      
                      {entry.description && (
                        <p className="text-sm text-zinc-400 mt-2 italic">{entry.description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(entry)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Pencil size={14} className="mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => approveMutation.mutate(entry.id)}
                        className="text-green-400 hover:text-green-300"
                      >
                        <CheckCircle2 size={14} className="mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(entry)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} className="mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Hours' : 'Add Hours'}</DialogTitle>
          </DialogHeader>
          <HoursForm
            entry={editingEntry}
            projects={projects}
            workPackages={workPackages}
            costCodes={costCodes}
            currentUser={currentUser}
            onSubmit={(data) => {
              if (editingEntry) {
                updateMutation.mutate({ id: editingEntry.id, data });
              } else {
                base44.entities.LaborHours.create(data).then(() => {
                  queryClient.invalidateQueries({ queryKey: ['unapprovedHours'] });
                  toast.success('Hours added');
                  setFormOpen(false);
                });
              }
            }}
            onCancel={() => {
              setFormOpen(false);
              setEditingEntry(null);
            }}
            isLoading={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HoursForm({ entry, projects, workPackages, costCodes, currentUser, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    project_id: entry?.project_id || projects[0]?.id || '',
    work_package_id: entry?.work_package_id || workPackages[0]?.id || '',
    cost_code_id: entry?.cost_code_id || costCodes[0]?.id || '',
    work_date: entry?.work_date || new Date().toISOString().split('T')[0],
    hours: entry?.hours || 8,
    overtime_hours: entry?.overtime_hours || 0,
    description: entry?.description || '',
    status: entry?.status || 'draft',
    crew_employee: currentUser?.email || ''
  });

  const filteredWorkPackages = workPackages.filter(wp => wp.project_id === formData.project_id);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.project_id || !formData.work_package_id || !formData.cost_code_id) {
      toast.error('Project, work package, and cost code required');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Project *</label>
          <Select value={formData.project_id} onValueChange={(v) => setFormData({ ...formData, project_id: v })}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Work Package *</label>
          <Select value={formData.work_package_id} onValueChange={(v) => setFormData({ ...formData, work_package_id: v })}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {filteredWorkPackages.map(wp => (
                <SelectItem key={wp.id} value={wp.id}>{wp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Cost Code *</label>
        <Select value={formData.cost_code_id} onValueChange={(v) => setFormData({ ...formData, cost_code_id: v })}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            {costCodes.map(cc => (
              <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Date *</label>
          <Input
            type="date"
            value={formData.work_date}
            onChange={(e) => setFormData({ ...formData, work_date: e.target.value })}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Hours *</label>
          <Input
            type="number"
            step="0.5"
            value={formData.hours}
            onChange={(e) => setFormData({ ...formData, hours: parseFloat(e.target.value) || 0 })}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">OT Hours</label>
          <Input
            type="number"
            step="0.5"
            value={formData.overtime_hours}
            onChange={(e) => setFormData({ ...formData, overtime_hours: parseFloat(e.target.value) || 0 })}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Status *</label>
        <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="draft">Draft (Not ready)</SelectItem>
            <SelectItem value="pending">Pending (Submit for approval)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Work performed..."
          className="bg-zinc-800 border-zinc-700"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-amber-500 hover:bg-amber-600 text-black">
          {isLoading ? 'Saving...' : entry ? 'Update' : 'Save'}
        </Button>
      </div>
    </form>
  );
}