import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import SubmittalDetailPanel from '@/components/submittals/SubmittalDetailPanel';
import SubmittalForm from '@/components/submittals/SubmittalForm';
import { Plus, Search, Eye, Trash2, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from '@/components/ui/notifications';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function Submittals() {
  const { activeProjectId } = useActiveProject();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSubmittal, setSelectedSubmittal] = useState(null);
  const [deleteSubmittal, setDeleteSubmittal] = useState(null);

  const { data: submittals = [] } = useQuery({
    queryKey: ['submittals', activeProjectId],
    queryFn: () => base44.entities.Submittal.filter({ project_id: activeProjectId }, '-submitted_date'),
    enabled: !!activeProjectId
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', activeProjectId],
    queryFn: () => base44.entities.RFI.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', activeProjectId],
    queryFn: () => base44.entities.SOVItem.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Submittal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submittals'] });
      setShowCreateDialog(false);
      toast.success('Submittal created');
    },
    onError: (error) => {
      toast.error('Failed to create: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Submittal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submittals'] });
      toast.success('Submittal updated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Submittal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submittals'] });
      setDeleteSubmittal(null);
      toast.success('Submittal deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    }
  });

  const filtered = useMemo(() => {
    return submittals.filter(s =>
      (statusFilter === 'all' || s.status === statusFilter) &&
      (!searchTerm || 
        s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `SUB-${s.submittal_number}`.includes(searchTerm))
    );
  }, [submittals, statusFilter, searchTerm]);

  const stats = {
    total: submittals.length,
    draft: submittals.filter(s => s.status === 'draft').length,
    pending: submittals.filter(s => s.status === 'submitted').length,
    approved: submittals.filter(s => s.status === 'approved').length,
    rejected: submittals.filter(s => s.status === 'rejected').length
  };

  const columns = [
    {
      header: 'Submittal',
      accessor: 'title',
      render: (row) => (
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-amber-400" />
          <div>
            <p className="font-medium text-white">SUB-{String(row.submittal_number).padStart(3, '0')}</p>
            <p className="text-xs text-zinc-500">{row.title}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Type',
      accessor: 'type',
      render: (row) => (
        <Badge className="bg-zinc-700 capitalize">{row.type?.replace('_', ' ')}</Badge>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Due',
      accessor: 'due_date',
      render: (row) => row.due_date ? format(parseISO(row.due_date), 'MMM d, yyyy') : '-'
    },
    {
      header: 'Docs',
      accessor: 'file_urls',
      render: (row) => (
        <span className="text-xs text-zinc-500">{row.file_urls?.length || 0} file(s)</span>
      )
    },
    {
      header: 'Reviewer',
      accessor: 'reviewer',
      render: (row) => <span className="text-xs">{row.reviewer ? row.reviewer.split('@')[0] : '-'}</span>
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedSubmittal(row)}
            className="text-zinc-400 hover:text-white"
          >
            <Eye size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDeleteSubmittal(row)}
            className="text-red-400 hover:text-red-300"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Submittals"
        subtitle="Manage project submittals and approvals"
        actions={
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            <Plus size={16} className="mr-2" />
            New Submittal
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, key: 'all' },
          { label: 'Draft', value: stats.draft, color: 'text-zinc-400' },
          { label: 'Pending', value: stats.pending, color: 'text-amber-400' },
          { label: 'Approved', value: stats.approved, color: 'text-green-400' },
          { label: 'Rejected', value: stats.rejected, color: 'text-red-400' }
        ].map((stat) => (
          <Card key={stat.label} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-3">
              <div className="text-xs text-zinc-500 uppercase mb-1">{stat.label}</div>
              <div className={`text-2xl font-bold ${stat.color || 'text-white'}`}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <Input
            placeholder="Search submittals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-zinc-800 border-zinc-700"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="reviewed">Reviewed</option>
          <option value="approved_with_changes">Approved w/ Changes</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="voided">Voided</option>
        </select>
      </div>

      {/* Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filtered}
            onRowClick={setSelectedSubmittal}
            emptyMessage="No submittals. Create your first submittal."
          />
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Submittal</DialogTitle>
          </DialogHeader>
          <SubmittalForm
            projectId={activeProjectId}
            rfis={rfis}
            sovItems={sovItems}
            onSubmit={(data) => {
              createMutation.mutate({
                ...data,
                project_id: activeProjectId,
                submittal_number: Math.max(...submittals.map(s => s.submittal_number || 0), 0) + 1
              });
            }}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={!!selectedSubmittal} onOpenChange={(open) => !open && setSelectedSubmittal(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Submittal Details</SheetTitle>
          </SheetHeader>
          {selectedSubmittal && (
            <div className="mt-6">
              <SubmittalDetailPanel
                submittal={selectedSubmittal}
                rfis={rfis}
                sovItems={sovItems}
                onUpdate={(data) => {
                  updateMutation.mutate({
                    id: selectedSubmittal.id,
                    data
                  });
                }}
                onStatusChange={(status) => {
                  updateMutation.mutate({
                    id: selectedSubmittal.id,
                    data: { status }
                  });
                }}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      {deleteSubmittal && (
        <Dialog open={!!deleteSubmittal} onOpenChange={() => setDeleteSubmittal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Submittal?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-zinc-400">
              Delete SUB-{String(deleteSubmittal.submittal_number).padStart(3, '0')}: {deleteSubmittal.title}?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteSubmittal(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(deleteSubmittal.id)}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}