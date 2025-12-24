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
import { Plus, Search, DollarSign, Clock, TrendingUp, TrendingDown, FileSpreadsheet } from 'lucide-react';
import CSVUpload from '@/components/shared/CSVUpload';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';

const initialFormState = {
  project_id: '',
  co_number: '',
  title: '',
  description: '',
  status: 'pending',
  cost_impact: '',
  schedule_impact_days: '',
  submitted_date: '',
  approved_date: '',
  approved_by: '',
};

export default function ChangeOrders() {
  const [showForm, setShowForm] = useState(false);
  const [selectedCO, setSelectedCO] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [showCSVImport, setShowCSVImport] = useState(false);

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders'],
    queryFn: () => base44.entities.ChangeOrder.list('co_number'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ChangeOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
      setShowForm(false);
      setFormData(initialFormState);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChangeOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
      setSelectedCO(null);
      setFormData(initialFormState);
    },
  });

  const getNextCONumber = (projectId) => {
    const projectCOs = changeOrders.filter(co => co.project_id === projectId);
    const maxNumber = projectCOs.reduce((max, co) => Math.max(max, co.co_number || 0), 0);
    return maxNumber + 1;
  };

  const handleProjectChange = (projectId) => {
    const nextNumber = getNextCONumber(projectId);
    setFormData(prev => ({ 
      ...prev, 
      project_id: projectId,
      co_number: nextNumber.toString()
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      co_number: parseInt(formData.co_number) || 1,
      cost_impact: parseFloat(formData.cost_impact) || 0,
      schedule_impact_days: parseInt(formData.schedule_impact_days) || 0,
    };

    if (selectedCO) {
      updateMutation.mutate({ id: selectedCO.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (co) => {
    setFormData({
      project_id: co.project_id || '',
      co_number: co.co_number?.toString() || '',
      title: co.title || '',
      description: co.description || '',
      status: co.status || 'pending',
      cost_impact: co.cost_impact?.toString() || '',
      schedule_impact_days: co.schedule_impact_days?.toString() || '',
      submitted_date: co.submitted_date || '',
      approved_date: co.approved_date || '',
      approved_by: co.approved_by || '',
    });
    setSelectedCO(co);
  };

  const filteredCOs = changeOrders.filter(co => {
    const matchesSearch = 
      co.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(co.co_number).includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || co.status === statusFilter;
    const matchesProject = projectFilter === 'all' || co.project_id === projectFilter;
    return matchesSearch && matchesStatus && matchesProject;
  }).sort((a, b) => (a.co_number || 0) - (b.co_number || 0));

  // Calculate totals
  const totals = filteredCOs.reduce((acc, co) => {
    if (co.status === 'approved') {
      return {
        approved: acc.approved + (co.cost_impact || 0),
        days: acc.days + (co.schedule_impact_days || 0),
      };
    }
    if (co.status === 'pending' || co.status === 'submitted') {
      return {
        ...acc,
        pending: acc.pending + (co.cost_impact || 0),
      };
    }
    return acc;
  }, { approved: 0, pending: 0, days: 0 });

  const columns = [
    {
      header: 'CO #',
      accessor: 'co_number',
      render: (row) => (
        <span className="font-mono text-amber-500 font-medium">
          CO-{String(row.co_number).padStart(3, '0')}
        </span>
      ),
    },
    {
      header: 'Title',
      accessor: 'title',
      render: (row) => {
        const project = projects.find(p => p.id === row.project_id);
        return (
          <div>
            <p className="font-medium line-clamp-1">{row.title}</p>
            <p className="text-xs text-zinc-500">{project?.name}</p>
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Cost Impact',
      accessor: 'cost_impact',
      render: (row) => {
        const value = row.cost_impact || 0;
        return (
          <span className={`flex items-center gap-1 ${value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {value >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {value >= 0 ? '+' : ''}${value.toLocaleString()}
          </span>
        );
      },
    },
    {
      header: 'Schedule Impact',
      accessor: 'schedule_impact_days',
      render: (row) => {
        const days = row.schedule_impact_days || 0;
        if (days === 0) return '-';
        return (
          <span className={days > 0 ? 'text-red-400' : 'text-green-400'}>
            {days > 0 ? '+' : ''}{days} days
          </span>
        );
      },
    },
    {
      header: 'Submitted',
      accessor: 'submitted_date',
      render: (row) => row.submitted_date ? format(new Date(row.submitted_date), 'MMM d, yyyy') : '-',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Change Orders"
        subtitle="Track contract modifications"
        actions={
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowCSVImport(true)}
              variant="outline"
              className="border-zinc-700"
            >
              <FileSpreadsheet size={18} className="mr-2" />
              Import CSV
            </Button>
            <Button 
              onClick={() => {
                setFormData(initialFormState);
                setShowForm(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Plus size={18} className="mr-2" />
              New Change Order
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Approved COs</p>
              <p className="text-xl font-bold text-green-400">
                +${totals.approved.toLocaleString()}
              </p>
            </div>
            <DollarSign className="text-green-500" size={24} />
          </div>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Pending COs</p>
              <p className="text-xl font-bold text-amber-400">
                ${totals.pending.toLocaleString()}
              </p>
            </div>
            <DollarSign className="text-amber-500" size={24} />
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Schedule Impact</p>
              <p className="text-xl font-bold text-white">
                {totals.days > 0 ? '+' : ''}{totals.days} days
              </p>
            </div>
            <Clock className="text-zinc-500" size={24} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search change orders..."
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredCOs}
        onRowClick={handleEdit}
        emptyMessage="No change orders found. Create your first change order to get started."
      />

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>New Change Order</DialogTitle>
          </DialogHeader>
          <COForm
            formData={formData}
            setFormData={setFormData}
            projects={projects}
            onProjectChange={handleProjectChange}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Sheet */}
      <Sheet open={!!selectedCO} onOpenChange={(open) => !open && setSelectedCO(null)}>
        <SheetContent className="w-full sm:max-w-xl bg-zinc-900 border-zinc-800 text-white overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">
              Edit CO-{String(selectedCO?.co_number).padStart(3, '0')}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <COForm
              formData={formData}
              setFormData={setFormData}
              projects={projects}
              onProjectChange={handleProjectChange}
              onSubmit={handleSubmit}
              isLoading={updateMutation.isPending}
              isEdit
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* CSV Import */}
      <CSVUpload
        entityName="ChangeOrder"
        templateFields={[
          { label: 'Project Number', key: 'project_number', example: 'P-001' },
          { label: 'Title', key: 'title', example: 'Add Level 2 Bracing' },
          { label: 'Description', key: 'description', example: 'Additional bracing per engineer' },
          { label: 'Cost Impact', key: 'cost_impact', example: '15000' },
          { label: 'Schedule Impact Days', key: 'schedule_impact_days', example: '5' },
        ]}
        transformRow={(row) => {
          const project = projects.find(p => p.project_number === row.project_number);
          const projectCOs = changeOrders.filter(co => co.project_id === project?.id);
          const maxNumber = projectCOs.reduce((max, co) => Math.max(max, co.co_number || 0), 0);
          return {
            project_id: project?.id || '',
            co_number: maxNumber + 1,
            title: row.title || '',
            description: row.description || '',
            cost_impact: parseFloat(row.cost_impact) || 0,
            schedule_impact_days: parseInt(row.schedule_impact_days) || 0,
            status: 'pending',
          };
        }}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
        }}
        open={showCSVImport}
        onOpenChange={setShowCSVImport}
      />
    </div>
  );
}

function COForm({ formData, setFormData, projects, onProjectChange, onSubmit, isLoading, isEdit }) {
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Project *</Label>
          <Select 
            value={formData.project_id} 
            onValueChange={onProjectChange}
            disabled={isEdit}
          >
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
        <div className="space-y-2">
          <Label>CO Number</Label>
          <Input
            type="number"
            value={formData.co_number}
            onChange={(e) => handleChange('co_number', e.target.value)}
            className="bg-zinc-800 border-zinc-700 font-mono"
            disabled={isEdit}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Change order title"
          required
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={4}
          placeholder="Detailed description of the change"
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cost Impact ($)</Label>
          <Input
            type="number"
            value={formData.cost_impact}
            onChange={(e) => handleChange('cost_impact', e.target.value)}
            placeholder="0.00"
            className="bg-zinc-800 border-zinc-700"
          />
          <p className="text-xs text-zinc-500">Positive = add, Negative = deduct</p>
        </div>
        <div className="space-y-2">
          <Label>Schedule Impact (Days)</Label>
          <Input
            type="number"
            value={formData.schedule_impact_days}
            onChange={(e) => handleChange('schedule_impact_days', e.target.value)}
            placeholder="0"
            className="bg-zinc-800 border-zinc-700"
          />
          <p className="text-xs text-zinc-500">Positive = added time</p>
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
          <Label>Approved Date</Label>
          <Input
            type="date"
            value={formData.approved_date}
            onChange={(e) => handleChange('approved_date', e.target.value)}
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Approved By</Label>
        <Input
          value={formData.approved_by}
          onChange={(e) => handleChange('approved_by', e.target.value)}
          placeholder="Name of approver"
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          {isLoading ? 'Saving...' : isEdit ? 'Update CO' : 'Create CO'}
        </Button>
      </div>
    </form>
  );
}