import React, { useState, useMemo, useEffect } from 'react';
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
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Plus, Search, AlertTriangle, Clock, DollarSign, Trash2, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { format, isAfter, parseISO } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

const initialFormState = {
  project_id: '',
  submittal_number: '',
  title: '',
  description: '',
  type: 'shop_drawing',
  status: 'draft',
  priority: 'medium',
  linked_task_ids: [],
  linked_rfi_id: '',
  submitted_by: '',
  submitted_date: '',
  due_date: '',
  reviewer: '',
  review_comments: '',
  file_urls: [],
  notes: ''
};

export default function Submittals() {
  const [showForm, setShowForm] = useState(false);
  const [selectedSubmittal, setSelectedSubmittal] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [deleteSubmittal, setDeleteSubmittal] = useState(null);

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name')
  });

  const { data: submittals = [] } = useQuery({
    queryKey: ['submittals'],
    queryFn: () => base44.entities.Submittal.list('submittal_number')
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list('rfi_number')
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('name')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Submittal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submittals'] });
      setShowForm(false);
      setFormData(initialFormState);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Submittal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submittals'] });
      setSelectedSubmittal(null);
      setFormData(initialFormState);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Submittal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submittals'] });
      setDeleteSubmittal(null);
    }
  });

  const getNextSubmittalNumber = (projectId) => {
    const projectSubmittals = submittals.filter((s) => s.project_id === projectId);
    const maxNumber = projectSubmittals.reduce((max, s) => Math.max(max, s.submittal_number || 0), 0);
    return maxNumber + 1;
  };

  const handleProjectChange = (projectId) => {
    const nextNumber = getNextSubmittalNumber(projectId);
    setFormData((prev) => ({
      ...prev,
      project_id: projectId,
      submittal_number: nextNumber.toString()
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      submittal_number: parseInt(formData.submittal_number) || 1
    };

    if (selectedSubmittal) {
      updateMutation.mutate({ id: selectedSubmittal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (submittal) => {
    setFormData({
      project_id: submittal.project_id || '',
      submittal_number: submittal.submittal_number?.toString() || '',
      title: submittal.title || '',
      description: submittal.description || '',
      type: submittal.type || 'shop_drawing',
      status: submittal.status || 'draft',
      priority: submittal.priority || 'medium',
      linked_task_ids: submittal.linked_task_ids || [],
      linked_rfi_id: submittal.linked_rfi_id || '',
      submitted_by: submittal.submitted_by || '',
      submitted_date: submittal.submitted_date ? submittal.submitted_date.split('T')[0] : '',
      due_date: submittal.due_date ? submittal.due_date.split('T')[0] : '',
      reviewer: submittal.reviewer || '',
      review_comments: submittal.review_comments || '',
      file_urls: submittal.file_urls || [],
      notes: submittal.notes || ''
    });
    setSelectedSubmittal(submittal);
  };

  const filteredSubmittals = useMemo(() => {
    return submittals.filter((s) => {
      const matchesSearch = s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(s.submittal_number).includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchesProject = projectFilter === 'all' || s.project_id === projectFilter;
      const matchesType = typeFilter === 'all' || s.type === typeFilter;
      return matchesSearch && matchesStatus && matchesProject && matchesType;
    }).sort((a, b) => (a.submittal_number || 0) - (b.submittal_number || 0));
  }, [submittals, searchTerm, statusFilter, projectFilter, typeFilter]);

  const submittalStats = useMemo(() => {
    const pending = filteredSubmittals.filter(s => s.status === 'submitted' || s.status === 'reviewed').length;
    const overdue = filteredSubmittals.filter(s => {
      if (!s.due_date || s.status === 'approved' || s.status === 'voided') return false;
      return isAfter(new Date(), parseISO(s.due_date));
    }).length;
    const approved = filteredSubmittals.filter(s => s.status === 'approved').length;
    return { pending, overdue, approved };
  }, [filteredSubmittals]);

  const columns = [
    {
      header: 'S#',
      accessor: 'submittal_number',
      render: (row) =>
        <span className="font-mono text-blue-400 font-bold text-sm">
          S-{String(row.submittal_number).padStart(3, '0')}
        </span>
    },
    {
      header: 'Title',
      accessor: 'title',
      render: (row) => {
        const project = projects.find((p) => p.id === row.project_id);
        return (
          <div>
            <p className="font-semibold text-sm line-clamp-1 text-white">{row.title}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{project?.name}</p>
          </div>
        );
      }
    },
    {
      header: 'Type',
      accessor: 'type',
      render: (row) => <span className="capitalize text-xs">{row.type}</span>
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Priority',
      accessor: 'priority',
      render: (row) => <StatusBadge status={row.priority} />
    },
    {
      header: 'Due Date',
      accessor: 'due_date',
      render: (row) => {
        if (!row.due_date) return <span className="text-zinc-500">—</span>;
        try {
          const dueDate = parseISO(row.due_date);
          const isOverdue = isAfter(new Date(), dueDate) && row.status !== 'approved' && row.status !== 'voided';
          return (
            <div className={isOverdue ? 'flex items-center gap-1.5' : ''}>
              {isOverdue && <AlertTriangle size={15} className="text-red-400 flex-shrink-0" />}
              <span className={isOverdue ? 'text-red-300 font-semibold' : 'text-white'}>
                {format(dueDate, 'MMM d, yyyy')}
              </span>
            </div>
          );
        } catch {
          return <span className="text-zinc-500">—</span>;
        }
      }
    },
    {
      header: 'Reviewer',
      accessor: 'reviewer',
      render: (row) => <span className="text-zinc-300">{row.reviewer || '—'}</span>
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) =>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteSubmittal(row);
          }}
          className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10">
          <Trash2 size={16} />
        </Button>
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Submittal Management</h1>
              <p className="text-xs text-zinc-600 font-mono mt-1">{filteredSubmittals.length} TOTAL • {submittalStats.pending} PENDING • {submittalStats.approved} APPROVED</p>
            </div>
            <Button
              onClick={() => {
                setFormData(initialFormState);
                setShowForm(true);
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider">
              <Plus size={14} className="mr-1" />
              NEW
            </Button>
          </div>
        </div>
      </div>

      {submittalStats.overdue > 0 && (
        <div className="border-b border-zinc-800 bg-red-950/20">
          <div className="max-w-[1600px] mx-auto px-6 py-3">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">{submittalStats.overdue} OVERDUE</span>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <Input
                placeholder="SEARCH SUBMITTALS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 placeholder:uppercase placeholder:text-xs h-9"
              />
            </div>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-zinc-900 border-zinc-800 text-white">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) =>
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                )}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-zinc-900 border-zinc-800 text-white">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="shop_drawing">Shop Drawing</SelectItem>
                <SelectItem value="material">Material</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="certification">Certification</SelectItem>
                <SelectItem value="test_report">Test Report</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-zinc-900 border-zinc-800 text-white">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="approved_with_changes">Changes Required</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={filteredSubmittals}
            onRowClick={handleEdit}
            emptyMessage="No submittals found. Create your first submittal to get started."
          />
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Submittal</DialogTitle>
          </DialogHeader>
          <SubmittalForm
            formData={formData}
            setFormData={setFormData}
            projects={projects}
            rfis={rfis}
            tasks={tasks}
            onProjectChange={handleProjectChange}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Sheet open={!!selectedSubmittal} onOpenChange={(open) => !open && setSelectedSubmittal(null)}>
        <SheetContent className="w-full sm:max-w-xl bg-zinc-900 border-zinc-800 text-white overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">
              Edit S-{String(selectedSubmittal?.submittal_number).padStart(3, '0')}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <SubmittalForm
              formData={formData}
              setFormData={setFormData}
              projects={projects}
              rfis={rfis}
              tasks={tasks}
              onProjectChange={handleProjectChange}
              onSubmit={handleSubmit}
              isLoading={updateMutation.isPending}
              isEdit
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteSubmittal} onOpenChange={() => setDeleteSubmittal(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Submittal?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete S-{String(deleteSubmittal?.submittal_number).padStart(3, '0')} "{deleteSubmittal?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteSubmittal.id)}
              className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SubmittalForm({ formData, setFormData, projects, rfis, tasks, onProjectChange, onSubmit, isLoading, isEdit }) {
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const projectRFIs = rfis.filter((r) => r.project_id === formData.project_id);
  const projectTasks = tasks.filter((t) => t.project_id === formData.project_id);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Project *</Label>
          <Select value={formData.project_id} onValueChange={onProjectChange} disabled={isEdit}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) =>
                <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Submittal # *</Label>
          <Input
            type="number"
            value={formData.submittal_number}
            onChange={(e) => handleChange('submittal_number', e.target.value)}
            className="bg-zinc-800 border-zinc-700 font-mono"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Title *</Label>
        <Input
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Submittal title"
          required
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          placeholder="Submittal details"
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Type *</Label>
          <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shop_drawing">Shop Drawing</SelectItem>
              <SelectItem value="material">Material</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="certification">Certification</SelectItem>
              <SelectItem value="test_report">Test Report</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="approved_with_changes">Changes Required</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="voided">Voided</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={formData.priority} onValueChange={(v) => handleChange('priority', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Linked RFI</Label>
          <Select value={formData.linked_rfi_id} onValueChange={(v) => handleChange('linked_rfi_id', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>None</SelectItem>
              {projectRFIs.map((r) =>
                <SelectItem key={r.id} value={r.id}>RFI-{String(r.rfi_number).padStart(3, '0')} - {r.subject}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Reviewer</Label>
          <Input
            value={formData.reviewer}
            onChange={(e) => handleChange('reviewer', e.target.value)}
            placeholder="Approver name/email"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Submitted Date</Label>
          <Input
            type="date"
            value={formData.submitted_date}
            onChange={(e) => handleChange('submitted_date', e.target.value)}
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
      </div>

      <div className="space-y-2">
        <Label>Review Comments</Label>
        <Textarea
          value={formData.review_comments}
          onChange={(e) => handleChange('review_comments', e.target.value)}
          rows={3}
          placeholder="Reviewer feedback"
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-600 text-white">
          {isLoading ? 'Saving...' : isEdit ? 'Update Submittal' : 'Create Submittal'}
        </Button>
      </div>
    </form>
  );
}