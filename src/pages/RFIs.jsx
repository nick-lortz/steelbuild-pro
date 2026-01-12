import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle } from
"@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle } from
"@/components/ui/sheet";
import { Plus, Search, History, BarChart3, Copy, MessageSquareWarning, AlertTriangle, DollarSign, Clock, FileSpreadsheet, Trash2 } from 'lucide-react';
import CSVUpload from '@/components/shared/CSVUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import BulkRFICreator from '@/components/rfis/BulkRFICreator';
import RFIKPIDashboard from '@/components/rfis/RFIKPIDashboard';
import RFIAgingDashboard from '@/components/rfis/RFIAgingDashboard';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";

const initialFormState = {
  project_id: '',
  rfi_number: '',
  subject: '',
  question: '',
  response: '',
  status: 'draft',
  priority: 'medium',
  assigned_to: '',
  submitted_date: '',
  due_date: '',
  response_date: '',
  linked_drawing_set_id: '',
  linked_change_order_id: '',
  cost_impact: false,
  schedule_impact: false
};

export default function RFIs() {
  const [showForm, setShowForm] = useState(false);
  const [selectedRFI, setSelectedRFI] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [pmFilter, setPmFilter] = useState('all');
  const [showBulkCreator, setShowBulkCreator] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [deleteRFI, setDeleteRFI] = useState(null);

  const queryClient = useQueryClient();

  const { data: rawProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });

  const projects = useMemo(() =>
  [...rawProjects].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
  [rawProjects]
  );

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list('rfi_number'),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000 // 5 minutes
  });

  const { data: drawings = [] } = useQuery({
    queryKey: ['drawings'],
    queryFn: () => base44.entities.DrawingSet.list('set_name'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders'],
    queryFn: () => base44.entities.ChangeOrder.list('co_number'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RFI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      setShowForm(false);
      setFormData(initialFormState);
    },
    onError: (error) => {
      console.error('Failed to create RFI:', error);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RFI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      setSelectedRFI(null);
      setFormData(initialFormState);
    },
    onError: (error) => {
      console.error('Failed to update RFI:', error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RFI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      setDeleteRFI(null);
    },
    onError: (error) => {
      console.error('Failed to delete RFI:', error);
    }
  });

  const getNextRFINumber = (projectId) => {
    const projectRFIs = rfis.filter((r) => r.project_id === projectId);
    const maxNumber = projectRFIs.reduce((max, r) => Math.max(max, r.rfi_number || 0), 0);
    return maxNumber + 1;
  };

  const handleProjectChange = (projectId) => {
    const nextNumber = getNextRFINumber(projectId);
    setFormData((prev) => ({
      ...prev,
      project_id: projectId,
      rfi_number: nextNumber.toString()
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      rfi_number: parseInt(formData.rfi_number) || 1
    };

    if (selectedRFI) {
      updateMutation.mutate({ id: selectedRFI.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (rfi) => {
    setFormData({
      project_id: rfi.project_id || '',
      rfi_number: rfi.rfi_number?.toString() || '',
      subject: rfi.subject || '',
      question: rfi.question || '',
      response: rfi.response || '',
      status: rfi.status || 'draft',
      priority: rfi.priority || 'medium',
      assigned_to: rfi.assigned_to || '',
      submitted_date: rfi.submitted_date ? rfi.submitted_date.split('T')[0] : '',
      due_date: rfi.due_date ? rfi.due_date.split('T')[0] : '',
      response_date: rfi.response_date ? rfi.response_date.split('T')[0] : '',
      linked_drawing_set_id: rfi.linked_drawing_set_id || '',
      linked_change_order_id: rfi.linked_change_order_id || '',
      cost_impact: rfi.cost_impact || false,
      schedule_impact: rfi.schedule_impact || false
    });
    setSelectedRFI(rfi);
  };

  const filteredRFIs = useMemo(() => {
    return rfis.filter((r) => {
      const project = projects.find((p) => p.id === r.project_id);
      const matchesSearch =
      r.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(r.rfi_number).includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesProject = projectFilter === 'all' || r.project_id === projectFilter;
      const matchesPm = pmFilter === 'all' || project?.project_manager === pmFilter;
      return matchesSearch && matchesStatus && matchesProject && matchesPm;
    }).sort((a, b) => {
      const projectA = projects.find((p) => p.id === a.project_id);
      const projectB = projects.find((p) => p.id === b.project_id);
      const nameComparison = (projectA?.name || '').localeCompare(projectB?.name || '');
      if (nameComparison !== 0) return nameComparison;
      return (a.rfi_number || 0) - (b.rfi_number || 0);
    });
  }, [rfis, projects, searchTerm, statusFilter, projectFilter, pmFilter]);

  const uniquePMs = [...new Set(projects.map((p) => p.project_manager).filter(Boolean))].sort();

  const columns = [
  {
    header: 'RFI #',
    accessor: 'rfi_number',
    render: (row) =>
    <span className="font-mono text-amber-400 font-bold text-sm">
          RFI-{String(row.rfi_number).padStart(3, '0')}
        </span>

  },
  {
    header: 'Subject',
    accessor: 'subject',
    render: (row) => {
      const project = projects.find((p) => p.id === row.project_id);
      return (
        <div>
            <p className="font-semibold text-sm line-clamp-1 text-white">{row.subject}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{project?.name}</p>
          </div>);

    }
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
    header: 'Impact',
    accessor: 'impact',
    render: (row) =>
    <div className="flex gap-1.5">
          {row.cost_impact &&
      <span className="p-1.5 bg-green-500/30 rounded border border-green-500/40" title="Cost Impact">
              <DollarSign size={15} className="text-green-300" />
            </span>
      }
          {row.schedule_impact &&
      <span className="p-1.5 bg-orange-500/30 rounded border border-orange-500/40" title="Schedule Impact">
              <Clock size={15} className="text-orange-300" />
            </span>
      }
        </div>

  },
  {
    header: 'Due Date',
    accessor: 'due_date',
    render: (row) => {
      if (!row.due_date) return <span className="text-zinc-500">—</span>;
      try {
        const dueDate = new Date(row.due_date);
        if (isNaN(dueDate.getTime())) return <span className="text-zinc-500">—</span>;
        const isOverdue = dueDate < new Date() && row.status !== 'answered' && row.status !== 'closed';
        return (
          <div className={isOverdue ? 'flex items-center gap-1.5' : ''}>
              {isOverdue && <AlertTriangle size={15} className="text-red-400 flex-shrink-0" />}
              <span className={isOverdue ? 'text-red-300 font-semibold' : 'text-white'}>
                {format(dueDate, 'MMM d, yyyy')}
              </span>
            </div>);

      } catch {
        return <span className="text-zinc-500">—</span>;
      }
    }
  },
  {
    header: 'Assigned To',
    accessor: 'assigned_to',
    render: (row) => <span className="text-zinc-300">{row.assigned_to || '—'}</span>
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
        setDeleteRFI(row);
      }}
      className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10">

          <Trash2 size={16} />
        </Button>

  }];


  const projectDrawings = drawings.filter((d) => d.project_id === formData.project_id);
  const projectCOs = changeOrders.filter((co) => co.project_id === formData.project_id);

  const rfiStats = useMemo(() => {
    const pending = filteredRFIs.filter(r => r.status === 'pending' || r.status === 'submitted').length;
    const overdue = filteredRFIs.filter(r => {
      if (!r.due_date || r.status === 'answered' || r.status === 'closed') return false;
      return new Date(r.due_date) < new Date();
    }).length;
    const withImpact = filteredRFIs.filter(r => r.cost_impact || r.schedule_impact).length;
    return { pending, overdue, withImpact };
  }, [filteredRFIs]);

  return (
    <div className="min-h-screen bg-black">
      {/* Header Bar */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">RFI Management</h1>
              <p className="text-xs text-zinc-600 font-mono mt-1">{filteredRFIs.length} TOTAL • {rfiStats.pending} PENDING</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowCSVImport(true)}
                variant="outline"
                className="border-zinc-700 text-white hover:bg-zinc-800 text-xs uppercase tracking-wider">
                <FileSpreadsheet size={14} className="mr-1" />
                IMPORT
              </Button>
              <Button
                onClick={() => setShowBulkCreator(true)}
                variant="outline"
                className="border-zinc-700 text-white hover:bg-zinc-800 text-xs uppercase tracking-wider"
                disabled={projectFilter === 'all'}>
                <Copy size={14} className="mr-1" />
                BULK
              </Button>
              <Button
                onClick={() => {
                  setFormData(initialFormState);
                  setShowForm(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs uppercase tracking-wider">
                <Plus size={14} className="mr-1" />
                NEW
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      {rfiStats.overdue > 0 && (
        <div className="border-b border-zinc-800 bg-red-950/20">
          <div className="max-w-[1600px] mx-auto px-6 py-3">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">{rfiStats.overdue} OVERDUE</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <Tabs defaultValue="list" className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="list">RFI List</TabsTrigger>
            <TabsTrigger value="dashboard">
              <BarChart3 size={14} className="mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="aging">Aging Report</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <Input
                  placeholder="SEARCH RFIS..."
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-zinc-900 border-zinc-800 text-white">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="answered">Answered</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={pmFilter} onValueChange={setPmFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-zinc-900 border-zinc-800 text-white">
                  <SelectValue placeholder="All PMs" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All PMs</SelectItem>
                  {uniquePMs.map((pm) =>
                    <SelectItem key={pm} value={pm}>{pm}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <DataTable
              columns={columns}
              data={filteredRFIs}
              onRowClick={handleEdit}
              emptyMessage="No RFIs found. Create your first RFI to get started."
            />
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            <RFIKPIDashboard rfis={filteredRFIs} />
          </TabsContent>

          <TabsContent value="aging" className="space-y-6">
            <RFIAgingDashboard rfis={filteredRFIs} projects={projects} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New RFI</DialogTitle>
          </DialogHeader>
          <RFIForm
            formData={formData}
            setFormData={setFormData}
            projects={projects}
            projectDrawings={projectDrawings}
            projectCOs={projectCOs}
            onProjectChange={handleProjectChange}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending} />

        </DialogContent>
      </Dialog>

      {/* Edit Sheet */}
      <Sheet open={!!selectedRFI} onOpenChange={(open) => !open && setSelectedRFI(null)}>
        <SheetContent className="w-full sm:max-w-xl bg-zinc-900 border-zinc-800 text-white overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">
              Edit RFI-{String(selectedRFI?.rfi_number).padStart(3, '0')}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <RFIForm
              formData={formData}
              setFormData={setFormData}
              projects={projects}
              projectDrawings={projectDrawings}
              projectCOs={projectCOs}
              onProjectChange={handleProjectChange}
              onSubmit={handleSubmit}
              isLoading={updateMutation.isPending}
              isEdit />

          </div>
        </SheetContent>
      </Sheet>

      {/* Bulk RFI Creator */}
      <BulkRFICreator
        open={showBulkCreator}
        onOpenChange={setShowBulkCreator}
        projectId={projectFilter !== 'all' ? projectFilter : ''} />


      {/* CSV Import */}
      <CSVUpload
        entityName="RFI"
        templateFields={[
        { label: 'Project Number', key: 'project_number', example: 'P-001' },
        { label: 'Subject', key: 'subject', example: 'Column connection detail' },
        { label: 'Question', key: 'question', example: 'Please clarify base plate size' },
        { label: 'Priority', key: 'priority', example: 'high' },
        { label: 'Due Date', key: 'due_date', example: '2025-01-15' },
        { label: 'Assigned To', key: 'assigned_to', example: 'John Smith' },
        { label: 'Status', key: 'status', example: 'draft' }]
        }
        transformRow={(() => {
          const projectCounters = {};

          return (row) => {
            const project = projects.find((p) => p.project_number === row.project_number);

            if (!project?.id) {
              throw new Error(`Project not found: ${row.project_number}`);
            }

            // Initialize counter for this project if not exists
            if (!projectCounters[project.id]) {
              const projectRFIs = rfis.filter((r) => r.project_id === project.id);
              const maxNumber = projectRFIs.reduce((max, r) => Math.max(max, r.rfi_number || 0), 0);
              projectCounters[project.id] = maxNumber;
            }

            // Increment counter for this project
            projectCounters[project.id]++;

            return {
              project_id: project.id,
              rfi_number: projectCounters[project.id],
              subject: row.subject || '',
              question: row.question || '',
              priority: row.priority || 'medium',
              status: row.status || 'draft',
              assigned_to: row.assigned_to || '',
              due_date: row.due_date || '',
              cost_impact: false,
              schedule_impact: false
            };
          };
        })()}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['rfis'] });
        }}
        open={showCSVImport}
        onOpenChange={setShowCSVImport} />


      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteRFI} onOpenChange={() => setDeleteRFI(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete RFI?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete RFI-{String(deleteRFI?.rfi_number).padStart(3, '0')} "{deleteRFI?.subject}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteRFI.id)}
              className="bg-red-500 hover:bg-red-600">

              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}

function RFIForm({ formData, setFormData, projects, projectDrawings, projectCOs, onProjectChange, onSubmit, isLoading, isEdit }) {
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Project *</Label>
          <Select
            value={formData.project_id}
            onValueChange={onProjectChange}
            disabled={isEdit}>

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
          <Label>RFI Number *</Label>
          <Input
            type="number"
            value={formData.rfi_number}
            onChange={(e) => handleChange('rfi_number', e.target.value)}
            className="bg-zinc-800 border-zinc-700 font-mono"
            required />

        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Subject *</Label>
        <Input
          value={formData.subject}
          onChange={(e) => handleChange('subject', e.target.value)}
          placeholder="Brief description of the question"
          required
          className="bg-zinc-800 border-zinc-700" />

      </div>

      <div className="space-y-2">
        <Label>Question / Request</Label>
        <Textarea
          value={formData.question}
          onChange={(e) => handleChange('question', e.target.value)}
          rows={4}
          placeholder="Detailed question or request for information"
          className="bg-zinc-800 border-zinc-700" />

      </div>

      <div className="space-y-2">
        <Label>Response</Label>
        <Textarea
          value={formData.response}
          onChange={(e) => handleChange('response', e.target.value)}
          rows={4}
          placeholder="Response from architect/engineer"
          className="bg-zinc-800 border-zinc-700" />

      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="answered">Answered</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
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

      <div className="space-y-2">
        <Label>Assigned To</Label>
        <Input
          value={formData.assigned_to}
          onChange={(e) => handleChange('assigned_to', e.target.value)}
          placeholder="Person responsible for response"
          className="bg-zinc-800 border-zinc-700" />

      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Submitted Date</Label>
          <Input
            type="date"
            value={formData.submitted_date}
            onChange={(e) => handleChange('submitted_date', e.target.value)}
            className="bg-zinc-800 border-zinc-700" />

        </div>
        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input
            type="date"
            value={formData.due_date}
            onChange={(e) => handleChange('due_date', e.target.value)}
            className="bg-zinc-800 border-zinc-700" />

        </div>
        <div className="space-y-2">
          <Label>Response Date</Label>
          <Input
            type="date"
            value={formData.response_date}
            onChange={(e) => handleChange('response_date', e.target.value)}
            className="bg-zinc-800 border-zinc-700" />

        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Linked Drawing Set</Label>
          <Select
            value={formData.linked_drawing_set_id}
            onValueChange={(v) => handleChange('linked_drawing_set_id', v)}>

            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Select drawing" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>None</SelectItem>
              {projectDrawings.map((d) =>
              <SelectItem key={d.id} value={d.id}>{d.set_number} - {d.set_name}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Linked Change Order</Label>
          <Select
            value={formData.linked_change_order_id}
            onValueChange={(v) => handleChange('linked_change_order_id', v)}>

            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Select CO" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>None</SelectItem>
              {projectCOs.map((co) =>
              <SelectItem key={co.id} value={co.id}>CO-{String(co.co_number).padStart(3, '0')} - {co.title}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-6 py-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="cost_impact"
            checked={formData.cost_impact}
            onCheckedChange={(checked) => handleChange('cost_impact', checked)} />

          <Label htmlFor="cost_impact" className="cursor-pointer">Cost Impact</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="schedule_impact"
            checked={formData.schedule_impact}
            onCheckedChange={(checked) => handleChange('schedule_impact', checked)} />

          <Label htmlFor="schedule_impact" className="cursor-pointer">Schedule Impact</Label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-amber-500 hover:bg-amber-600 text-black">

          {isLoading ? 'Saving...' : isEdit ? 'Update RFI' : 'Create RFI'}
        </Button>
      </div>
    </form>);

}