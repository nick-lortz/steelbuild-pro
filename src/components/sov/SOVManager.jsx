import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DataTable from '@/components/ui/DataTable';
import { Plus, Trash2, FileText } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function SOVManager({ projectId, canEdit }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({ sov_code: '', description: '', scheduled_value: 0 });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', projectId],
    queryFn: () => base44.entities.SOVItem.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SOVItem.create({ ...data, project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sov-items'] });
      toast.success('SOV item added');
      setShowAddDialog(false);
      setFormData({ sov_code: '', description: '', scheduled_value: 0 });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SOVItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sov-items'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SOVItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sov-items'] });
      toast.success('SOV item deleted');
    }
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', projectId],
    queryFn: () => base44.entities.Invoice.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const handleUpdatePercent = (id, value) => {
    const numValue = Number(value) || 0;
    if (numValue < 0 || numValue > 100) {
      toast.error('Percent must be 0-100');
      return;
    }

    // Check if decreasing percent and invoice exists
    const sovItem = sovItems.find(s => s.id === id);
    if (sovItem && numValue < (sovItem.percent_complete || 0)) {
      // Check if any approved/paid invoices exist for this project
      const hasApprovedInvoices = invoices.some(inv => 
        inv.status === 'approved' || inv.status === 'paid'
      );
      
      if (hasApprovedInvoices) {
        toast.error('Cannot decrease % complete after billing. Un-earning revenue requires change order.');
        return;
      }
    }

    updateMutation.mutate({ id, data: { percent_complete: numValue } });
  };

  const columns = [
    { 
      header: 'Code', 
      accessor: 'sov_code',
      render: (row) => <span className="font-mono text-sm">{row.sov_code}</span>
    },
    { 
      header: 'Description', 
      accessor: 'description',
      render: (row) => <span className="text-sm">{row.description}</span>
    },
    { 
      header: 'Scheduled Value', 
      accessor: 'scheduled_value',
      render: (row) => (
        <div>
          <span className="font-semibold">${row.scheduled_value.toLocaleString()}</span>
          <p className="text-xs text-muted-foreground">Locked</p>
        </div>
      )
    },
    {
      header: '% Complete',
      accessor: 'percent_complete',
      render: (row) => (
        <Input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={row.percent_complete || 0}
          onChange={(e) => handleUpdatePercent(row.id, e.target.value)}
          disabled={!canEdit}
          className="w-20"
        />
      )
    },
    {
      header: 'Earned to Date',
      accessor: 'earned',
      render: (row) => {
        const earned = (row.scheduled_value * (row.percent_complete || 0)) / 100;
        return <span className="text-green-400 font-semibold">${earned.toLocaleString()}</span>;
      }
    },
    {
      header: 'Billed to Date',
      accessor: 'billed_to_date',
      render: (row) => <span>${(row.billed_to_date || 0).toLocaleString()}</span>
    },
    {
      header: 'To Bill',
      accessor: 'to_bill',
      render: (row) => {
        const earned = (row.scheduled_value * (row.percent_complete || 0)) / 100;
        const toBill = earned - (row.billed_to_date || 0);
        return (
          <span className={toBill < 0 ? 'text-red-400 font-bold' : 'text-amber-400 font-semibold'}>
            ${toBill.toLocaleString()}
          </span>
        );
      }
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (window.confirm('Delete this SOV line?')) {
              deleteMutation.mutate(row.id);
            }
          }}
          disabled={!canEdit}
          className="text-red-400 hover:text-red-300"
        >
          <Trash2 size={16} />
        </Button>
      )
    }
  ];

  const totals = sovItems.reduce((acc, item) => {
    const earned = (item.scheduled_value * (item.percent_complete || 0)) / 100;
    const toBill = earned - (item.billed_to_date || 0);
    return {
      scheduled: acc.scheduled + item.scheduled_value,
      earned: acc.earned + earned,
      billed: acc.billed + (item.billed_to_date || 0),
      toBill: acc.toBill + toBill
    };
  }, { scheduled: 0, earned: 0, billed: 0, toBill: 0 });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold">Schedule of Values</h3>
          <p className="text-xs text-muted-foreground">Update % complete to calculate billing</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} disabled={!canEdit} size="sm">
          <Plus size={16} className="mr-1" />
          Add SOV Line
        </Button>
      </div>

      <Card className="bg-blue-500/5 border-blue-500/30">
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Contract Value</p>
              <p className="text-lg font-bold">${totals.scheduled.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Earned to Date</p>
              <p className="text-lg font-bold text-green-400">${totals.earned.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Billed to Date</p>
              <p className="text-lg font-bold">${totals.billed.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ready to Bill</p>
              <p className={`text-lg font-bold ${totals.toBill < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                ${totals.toBill.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            data={sovItems}
            emptyMessage="No SOV lines. Add Schedule of Values items to track billing."
          />
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add SOV Line</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>SOV Code / Line #</Label>
              <Input
                value={formData.sov_code}
                onChange={(e) => setFormData({ ...formData, sov_code: e.target.value })}
                placeholder="e.g., 100, 05100"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Work item description"
              />
            </div>
            <div>
              <Label>Scheduled Value</Label>
              <Input
                type="number"
                value={formData.scheduled_value}
                onChange={(e) => setFormData({ ...formData, scheduled_value: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground mt-1">Fixed after contract execution. Changes via Change Orders.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.sov_code || !formData.description}>
                Add SOV Line
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}