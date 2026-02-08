import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import MetricsBar from '@/components/layout/MetricsBar';
import FilterBar from '@/components/layout/FilterBar';
import ContentSection from '@/components/layout/ContentSection';
import SectionCard from '@/components/layout/SectionCard';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import CSVUpload from '@/components/shared/CSVUpload';
import ChangeOrderForm from '@/components/change-orders/ChangeOrderForm';
import ChangeOrderDetail from '@/components/change-orders/ChangeOrderDetail';
import { Plus, Search, TrendingUp, TrendingDown, FileSpreadsheet, Trash2 } from 'lucide-react';
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
  const [pmFilter, setPmFilter] = useState('all');
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [deleteCO, setDeleteCO] = useState(null);
  const [viewingCO, setViewingCO] = useState(null);

  const queryClient = useQueryClient();

  // Real-time subscription
  useEffect(() => {
    const unsubscribe = base44.entities.ChangeOrder.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
    });

    return unsubscribe;
  }, [queryClient]);

  const { data: rawProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const projects = useMemo(() => 
    [...rawProjects].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [rawProjects]
  );

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders'],
    queryFn: () => base44.entities.ChangeOrder.list('co_number'),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ChangeOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
      setShowForm(false);
      setFormData(initialFormState);
    },
    onError: (error) => {
      console.error('Failed to create change order:', error);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const current = changeOrders.find(co => co.id === id);
      
      // Create version history entry
      const versionHistory = current.version_history || [];
      const newVersion = (current.version || 1) + 1;
      
      versionHistory.push({
        version: current.version || 1,
        changed_by: (await base44.auth.me()).email,
        changed_at: new Date().toISOString(),
        changes_summary: data.changes_summary || 'Updated change order',
        snapshot: { ...current }
      });

      const updateData = {
        ...data,
        version: newVersion,
        version_history: versionHistory
      };

      // Send notification
      await base44.functions.invoke('notifyStatusChange', {
        entity_type: 'ChangeOrder',
        entity_id: id,
        event_type: 'status_change',
        message: `CO-${current.co_number} updated to version ${newVersion}`
      });

      return base44.entities.ChangeOrder.update(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
      setSelectedCO(null);
      setFormData(initialFormState);
    },
    onError: (error) => {
      console.error('Failed to update change order:', error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ChangeOrder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
      setDeleteCO(null);
    },
    onError: (error) => {
      console.error('Failed to delete change order:', error);
    }
  });

  const getNextCONumber = (projectId) => {
    const projectCOs = changeOrders.filter(co => co.project_id === projectId);
    const maxNumber = projectCOs.reduce((max, co) => Math.max(max, co.co_number || 0), 0);
    return maxNumber + 1;
  };

  const handleProjectChange = useCallback((projectId) => {
    const nextNumber = getNextCONumber(projectId);
    setFormData(prev => ({ 
      ...prev, 
      project_id: projectId,
      co_number: nextNumber.toString()
    }));
  }, [changeOrders]);

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
      sov_allocations: co.sov_allocations || []
    });
    setSelectedCO(co);
  };

  const filteredCOs = useMemo(() => {
    return changeOrders.filter(co => {
      const project = projects.find(p => p.id === co.project_id);
      const matchesSearch = 
        co.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(co.co_number).includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || co.status === statusFilter;
      const matchesProject = projectFilter === 'all' || co.project_id === projectFilter;
      const matchesPm = pmFilter === 'all' || project?.project_manager === pmFilter;
      return matchesSearch && matchesStatus && matchesProject && matchesPm;
    }).sort((a, b) => {
      const projectA = projects.find(p => p.id === a.project_id);
      const projectB = projects.find(p => p.id === b.project_id);
      const nameComparison = (projectA?.name || '').localeCompare(projectB?.name || '');
      if (nameComparison !== 0) return nameComparison;
      return (a.co_number || 0) - (b.co_number || 0);
    });
  }, [changeOrders, projects, searchTerm, statusFilter, projectFilter, pmFilter]);

  const uniquePMs = [...new Set(projects.map(p => p.project_manager).filter(Boolean))].sort();

  // Calculate totals - ensure we have an array before reducing
  const totals = (filteredCOs || []).reduce((acc, co) => {
    if (co.status === 'approved') {
      return {
        ...acc,
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
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteCO(row);
          }}
          className="text-zinc-500 hover:text-red-500"
        >
          <Trash2 size={16} />
        </Button>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Change Orders"
        subtitle={`${filteredCOs.length} change orders`}
        actions={
          <>
            <Button 
              onClick={() => setShowCSVImport(true)}
              variant="outline"
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              <FileSpreadsheet size={16} className="mr-2" />
              Import CSV
            </Button>
            <Button 
              onClick={() => {
                setFormData(initialFormState);
                setShowForm(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
            >
              <Plus size={16} className="mr-2" />
              New Change Order
            </Button>
          </>
        }
      />

      <MetricsBar
        metrics={[
          { label: 'Approved COs', value: `+$${(totals.approved || 0).toLocaleString()}`, color: 'text-green-400' },
          { label: 'Pending COs', value: `$${(totals.pending || 0).toLocaleString()}`, color: 'text-amber-400' },
          { label: 'Schedule Impact', value: `${(totals.days || 0) > 0 ? '+' : ''}${totals.days || 0} days` }
        ]}
      />

      <FilterBar>
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search change orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800 text-white"
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800 text-white">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-zinc-900 border-zinc-800 text-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>
        <Select value={pmFilter} onValueChange={setPmFilter}>
          <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800 text-white">
            <SelectValue placeholder="Filter by PM" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All PMs</SelectItem>
            {uniquePMs.map(pm => (
              <SelectItem key={pm} value={pm}>{pm}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      <ContentSection>
        <SectionCard>
          <DataTable
            columns={columns}
            data={filteredCOs}
            onRowClick={(co) => setViewingCO(co)}
            emptyMessage="No change orders found. Create your first change order to get started."
          />
        </SectionCard>
      </ContentSection>

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>New Change Order</DialogTitle>
          </DialogHeader>
          <ChangeOrderForm
            formData={formData}
            setFormData={setFormData}
            projects={projects}
            onProjectChange={handleProjectChange}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={!!viewingCO} onOpenChange={(open) => !open && setViewingCO(null)}>
        <SheetContent className="w-full sm:max-w-4xl bg-zinc-900 border-zinc-800 text-white overflow-y-auto">
          {viewingCO && (
            <ChangeOrderDetail
              changeOrder={viewingCO}
              projects={projects}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
                const updated = changeOrders.find(co => co.id === viewingCO.id);
                if (updated) setViewingCO(updated);
              }}
              onClose={() => setViewingCO(null)}
            />
          )}
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCO} onOpenChange={() => setDeleteCO(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Change Order?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete CO-{String(deleteCO?.co_number).padStart(3, '0')} "{deleteCO?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteCO.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}