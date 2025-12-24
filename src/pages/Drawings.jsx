import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Plus, Search, FileText, Clock, History } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';

const initialFormState = {
  project_id: '',
  set_name: '',
  set_number: '',
  current_revision: '',
  status: 'IFA',
  issue_date: '',
  due_date: '',
  received_date: '',
  discipline: 'structural',
  notes: '',
};

export default function Drawings() {
  const [showForm, setShowForm] = useState(false);
  const [selectedDrawing, setSelectedDrawing] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
  });

  const { data: drawings = [] } = useQuery({
    queryKey: ['drawings'],
    queryFn: () => base44.entities.DrawingSet.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DrawingSet.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawings'] });
      setShowForm(false);
      setFormData(initialFormState);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DrawingSet.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawings'] });
      setSelectedDrawing(null);
      setFormData(initialFormState);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // If updating and revision changed, add to history
    let data = { ...formData };
    if (selectedDrawing && formData.current_revision !== selectedDrawing.current_revision) {
      const history = selectedDrawing.revision_history || [];
      data.revision_history = [
        ...history,
        {
          revision: selectedDrawing.current_revision,
          date: new Date().toISOString().split('T')[0],
          notes: `Updated from ${selectedDrawing.current_revision} to ${formData.current_revision}`
        }
      ];
    }

    if (selectedDrawing) {
      updateMutation.mutate({ id: selectedDrawing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (drawing) => {
    setFormData({
      project_id: drawing.project_id || '',
      set_name: drawing.set_name || '',
      set_number: drawing.set_number || '',
      current_revision: drawing.current_revision || '',
      status: drawing.status || 'IFA',
      issue_date: drawing.issue_date || '',
      due_date: drawing.due_date || '',
      received_date: drawing.received_date || '',
      discipline: drawing.discipline || 'structural',
      notes: drawing.notes || '',
    });
    setSelectedDrawing(drawing);
  };

  const filteredDrawings = drawings.filter(d => {
    const matchesSearch = 
      d.set_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.set_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesProject = projectFilter === 'all' || d.project_id === projectFilter;
    return matchesSearch && matchesStatus && matchesProject;
  });

  const columns = [
    {
      header: 'Set Number',
      accessor: 'set_number',
      render: (row) => (
        <span className="font-mono text-amber-500">{row.set_number || '-'}</span>
      ),
    },
    {
      header: 'Set Name',
      accessor: 'set_name',
      render: (row) => {
        const project = projects.find(p => p.id === row.project_id);
        return (
          <div>
            <p className="font-medium">{row.set_name}</p>
            <p className="text-xs text-zinc-500">{project?.name}</p>
          </div>
        );
      },
    },
    {
      header: 'Revision',
      accessor: 'current_revision',
      render: (row) => (
        <span className="font-mono">{row.current_revision || '-'}</span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Discipline',
      accessor: 'discipline',
      render: (row) => row.discipline?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || '-',
    },
    {
      header: 'Due Date',
      accessor: 'due_date',
      render: (row) => {
        if (!row.due_date) return '-';
        const isOverdue = new Date(row.due_date) < new Date() && row.status !== 'FFF' && row.status !== 'As-Built';
        return (
          <span className={isOverdue ? 'text-red-400' : ''}>
            {format(new Date(row.due_date), 'MMM d, yyyy')}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Drawing Sets"
        subtitle="Manage drawing submissions and revisions"
        actions={
          <Button 
            onClick={() => {
              setFormData(initialFormState);
              setShowForm(true);
            }}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            <Plus size={18} className="mr-2" />
            New Drawing Set
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search drawings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800 text-white"
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-zinc-900 border-zinc-800 text-white">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-zinc-900 border-zinc-800 text-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="IFA">IFA</SelectItem>
            <SelectItem value="BFA">BFA</SelectItem>
            <SelectItem value="BFS">BFS</SelectItem>
            <SelectItem value="FFF">FFF</SelectItem>
            <SelectItem value="As-Built">As-Built</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredDrawings}
        onRowClick={handleEdit}
        emptyMessage="No drawing sets found. Add your first drawing set to get started."
      />

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>New Drawing Set</DialogTitle>
          </DialogHeader>
          <DrawingForm
            formData={formData}
            setFormData={setFormData}
            projects={projects}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Sheet */}
      <Sheet open={!!selectedDrawing} onOpenChange={(open) => !open && setSelectedDrawing(null)}>
        <SheetContent className="w-full sm:max-w-xl bg-zinc-900 border-zinc-800 text-white overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Edit Drawing Set</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <DrawingForm
              formData={formData}
              setFormData={setFormData}
              projects={projects}
              onSubmit={handleSubmit}
              isLoading={updateMutation.isPending}
              isEdit
            />
            
            {/* Revision History */}
            {selectedDrawing?.revision_history?.length > 0 && (
              <div className="mt-6 pt-6 border-t border-zinc-800">
                <h4 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                  <History size={16} />
                  Revision History
                </h4>
                <div className="space-y-2">
                  {selectedDrawing.revision_history.map((rev, idx) => (
                    <div key={idx} className="p-3 bg-zinc-800/50 rounded-lg text-sm">
                      <div className="flex justify-between">
                        <span className="font-mono text-amber-500">{rev.revision}</span>
                        <span className="text-zinc-500">{rev.date}</span>
                      </div>
                      {rev.notes && <p className="text-zinc-400 mt-1">{rev.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DrawingForm({ formData, setFormData, projects, onSubmit, isLoading, isEdit }) {
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Project *</Label>
        <Select value={formData.project_id} onValueChange={(v) => handleChange('project_id', v)}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Set Number</Label>
          <Input
            value={formData.set_number}
            onChange={(e) => handleChange('set_number', e.target.value)}
            placeholder="e.g., S-100"
            className="bg-zinc-800 border-zinc-700 font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label>Current Revision</Label>
          <Input
            value={formData.current_revision}
            onChange={(e) => handleChange('current_revision', e.target.value)}
            placeholder="e.g., Rev 1"
            className="bg-zinc-800 border-zinc-700 font-mono"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Set Name *</Label>
        <Input
          value={formData.set_name}
          onChange={(e) => handleChange('set_name', e.target.value)}
          placeholder="e.g., Structural Steel - Level 1"
          required
          className="bg-zinc-800 border-zinc-700"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IFA">IFA - Issued for Approval</SelectItem>
              <SelectItem value="BFA">BFA - Back from Approval</SelectItem>
              <SelectItem value="BFS">BFS - Back from Shop</SelectItem>
              <SelectItem value="FFF">FFF - Fit for Fabrication</SelectItem>
              <SelectItem value="As-Built">As-Built</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Discipline</Label>
          <Select value={formData.discipline} onValueChange={(v) => handleChange('discipline', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="structural">Structural</SelectItem>
              <SelectItem value="misc_metals">Misc Metals</SelectItem>
              <SelectItem value="stairs">Stairs</SelectItem>
              <SelectItem value="handrails">Handrails</SelectItem>
              <SelectItem value="connections">Connections</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Issue Date</Label>
          <Input
            type="date"
            value={formData.issue_date}
            onChange={(e) => handleChange('issue_date', e.target.value)}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input
            type="date"
            value={formData.due_date}
            onChange={(e) => handleChange('due_date', e.target.value)}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
        <div className="space-y-2">
          <Label>Received Date</Label>
          <Input
            type="date"
            value={formData.received_date}
            onChange={(e) => handleChange('received_date', e.target.value)}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={2}
          className="bg-zinc-800 border-zinc-700"
        />
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          {isLoading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}