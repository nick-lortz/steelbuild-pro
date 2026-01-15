import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTable from '@/components/ui/DataTable';
import { Plus, Trash2, Lock, AlertTriangle, Edit } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import * as backend from '../services/backend';

export default function SOVManager({ projectId, canEdit }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ 
    sov_code: '', 
    description: '', 
    sov_category: 'labor',
    scheduled_value: 0 
  });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sov-items', projectId],
    queryFn: () => base44.entities.SOVItem.filter({ project_id: projectId }),
    select: (items) => {
      const seg = (s) => String(s ?? '').split(/[^\dA-Za-z]+/).filter(Boolean);
      const cmp = (a, b) => {
        const aa = seg(a), bb = seg(b);
        const n = Math.max(aa.length, bb.length);
        for (let i = 0; i < n; i++) {
          const x = aa[i] ?? '', y = bb[i] ?? '';
          const nx = Number(x), ny = Number(y);
          const bothNum = !Number.isNaN(nx) && !Number.isNaN(ny);
          if (bothNum && nx !== ny) return nx - ny;
          if (x !== y) return String(x).localeCompare(String(y), undefined, { numeric: true });
        }
        return 0;
      };
      return [...items].sort((a, b) => cmp(a.sov_code, b.sov_code));
    },
    enabled: !!projectId
  });

  // Get all SOV items across all projects for dropdown reference
  const { data: allSOVItems = [] } = useQuery({
    queryKey: ['all-sov-items'],
    queryFn: () => base44.entities.SOVItem.list(),
    select: (items) => {
      const uniqueItems = new Map();
      items.forEach(item => {
        const key = `${item.sov_code}-${item.description}`;
        if (!uniqueItems.has(key)) {
          uniqueItems.set(key, { sov_code: item.sov_code, description: item.description });
        }
      });
      return Array.from(uniqueItems.values()).sort((a, b) => 
        String(a.sov_code).localeCompare(String(b.sov_code), undefined, { numeric: true })
      );
    }
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', projectId],
    queryFn: () => base44.entities.Invoice.filter({ project_id: projectId }),
    enabled: !!projectId,
    retry: 1,
    staleTime: 5 * 60 * 1000
  });

  const { data: invoiceLines = [] } = useQuery({
    queryKey: ['invoice-lines', projectId],
    queryFn: async () => {
      const lines = await base44.entities.InvoiceLine.list();
      const approvedInvoiceIds = new Set(
        invoices.filter(inv => inv.status === 'approved' || inv.status === 'paid').map(inv => inv.id)
      );
      return lines.filter(line => approvedInvoiceIds.has(line.invoice_id));
    },
    enabled: !!projectId && invoices.length > 0,
    retry: 1,
    staleTime: 5 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (data) => backend.createSOVItem({ ...data, project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sov-items', projectId] });
      toast.success('SOV line added');
      setShowAddDialog(false);
      setFormData({ sov_code: '', description: '', sov_category: 'labor', scheduled_value: 0 });
    },
    onError: (err) => toast.error(err?.message ?? 'Failed to add SOV line')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => backend.updateSOVItem(id, data),
    onSuccess: (result, variables) => {
      queryClient.setQueryData(['sov-items', projectId], (old) => {
        if (!old) return old;
        return old.map(item => 
          item.id === variables.id ? { ...item, ...variables.data } : item
        );
      });
    },
    onError: (err) => toast.error(err?.message ?? 'Update failed')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => backend.deleteSOVItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sov-items', projectId] });
      toast.success('SOV line deleted');
    },
    onError: (err) => toast.error(err?.message ?? 'Delete failed')
  });

  const lockedSovItemIds = useMemo(() => {
    const ids = new Set();
    for (const line of invoiceLines ?? []) {
      if (line?.sov_item_id) ids.add(line.sov_item_id);
    }
    return ids;
  }, [invoiceLines]);

  const [editingPercent, setEditingPercent] = useState({});

  const handleUpdatePercent = async (sovItem, value) => {
    if (value === '' || value == null) {
      setEditingPercent(prev => ({ ...prev, [sovItem.id]: '' }));
      return;
    }

    const numValue = parseFloat(value);
    if (Number.isNaN(numValue) || numValue < 0 || numValue > 100) {
      toast.error('Percent must be 0-100');
      return;
    }

    // Per-line guard: only block if this specific line has approved/paid invoices
    const prev = sovItem.percent_complete ?? 0;
    if (numValue < prev && lockedSovItemIds.has(sovItem.id)) {
      toast.error('Cannot decrease % complete for billed lines. Use change order.');
      return;
    }

    setEditingPercent(prev => ({ ...prev, [sovItem.id]: undefined }));

    // Optimistic update with rollback
    updateMutation.mutate(
      { id: sovItem.id, data: { percent_complete: numValue } },
      {
        onMutate: async () => {
          await queryClient.cancelQueries({ queryKey: ['sov-items', projectId] });
          const prevData = queryClient.getQueryData(['sov-items', projectId]);
          queryClient.setQueryData(['sov-items', projectId], (old = []) =>
            old.map(it => it.id === sovItem.id ? { ...it, percent_complete: numValue } : it)
          );
          return { prevData };
        },
        onError: (_err, _vars, ctx) => {
          if (ctx?.prevData) queryClient.setQueryData(['sov-items', projectId], ctx.prevData);
        }
      }
    );
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      sov_code: item.sov_code,
      description: item.description,
      sov_category: item.sov_category,
      scheduled_value: item.scheduled_value
    });
    setShowAddDialog(true);
  };

  const columns = [
    { 
      header: 'Code', 
      accessor: 'sov_code',
      render: (row) => <span className="font-mono text-sm font-semibold">{row.sov_code}</span>
    },
    { 
      header: 'Description', 
      accessor: 'description',
      render: (row) => (
        <Input
          value={row.description}
          onChange={(e) => updateMutation.mutate({ id: row.id, data: { description: e.target.value } })}
          disabled={!canEdit}
          className="text-sm"
        />
      )
    },
    {
      header: 'Category',
      accessor: 'sov_category',
      render: (row) => <span className="capitalize text-sm">{row.sov_category}</span>
    },
    { 
      header: 'Scheduled Value', 
      accessor: 'scheduled_value',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Lock size={12} className="text-muted-foreground" />
          <span className="font-semibold">${row.scheduled_value.toLocaleString()}</span>
        </div>
      )
    },
    {
      header: '% Complete',
      accessor: 'percent_complete',
      render: (row) => {
        const displayValue = editingPercent[row.id] !== undefined 
          ? editingPercent[row.id] 
          : (row.percent_complete === 0 || row.percent_complete === null || row.percent_complete === undefined ? '' : row.percent_complete);
        
        return (
          <Input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={displayValue}
            placeholder="0"
            onChange={(e) => {
              setEditingPercent({ ...editingPercent, [row.id]: e.target.value });
            }}
            onBlur={(e) => {
              handleUpdatePercent(row, e.target.value === '' ? '0' : e.target.value);
            }}
            disabled={!canEdit}
            className="w-20"
          />
        );
      }
    },
    {
      header: 'Earned to Date',
      accessor: 'earned',
      render: (row) => {
        const earned = ((row.scheduled_value || 0) * (row.percent_complete || 0)) / 100;
        return <span className="text-green-400 font-semibold">${earned.toFixed(2).toLocaleString()}</span>;
      }
    },
    {
      header: 'Billed to Date',
      accessor: 'billed_to_date',
      render: (row) => <span className="font-semibold">${(row.billed_to_date || 0).toLocaleString()}</span>
    },
    {
      header: 'Ready to Bill',
      accessor: 'to_bill',
      render: (row) => {
        const earned = ((row.scheduled_value || 0) * (row.percent_complete || 0)) / 100;
        const toBill = earned - (row.billed_to_date || 0);
        return (
          <span className={toBill < 0 ? 'text-red-400 font-bold' : toBill > 0 ? 'text-amber-400 font-bold' : 'text-muted-foreground'}>
            ${toBill.toFixed(2).toLocaleString()}
          </span>
        );
      }
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => {
        const isLocked = lockedSovItemIds.has(row.id);
        return (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(row)}
              disabled={!canEdit}
              className="text-blue-400 hover:text-blue-300"
              title="Edit SOV line"
            >
              <Edit size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (window.confirm(`⚠️ Delete SOV line ${row.sov_code}?\n\nThis will permanently remove the line and all associated mappings. This action cannot be undone.`)) {
                  deleteMutation.mutate(row.id);
                }
              }}
              disabled={!canEdit || isLocked}
              className="text-red-400 hover:text-red-300 disabled:opacity-50"
              title={isLocked ? '🔒 Locked — line has approved invoices. Use Change Orders.' : 'Delete SOV line'}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        );
      }
    }
  ];

  const totals = sovItems.reduce((acc, item) => {
    const earned = ((item.scheduled_value || 0) * (item.percent_complete || 0)) / 100;
    const toBill = earned - (item.billed_to_date || 0);
    return {
      scheduled: acc.scheduled + (item.scheduled_value || 0),
      earned: acc.earned + earned,
      billed: acc.billed + (item.billed_to_date || 0),
      toBill: acc.toBill + toBill
    };
  }, { scheduled: 0, earned: 0, billed: 0, toBill: 0 });

  const hasOverbilling = sovItems.some(item => {
    const earned = ((item.scheduled_value || 0) * (item.percent_complete || 0)) / 100;
    return earned < (item.billed_to_date || 0);
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold">Schedule of Values</h3>
          <p className="text-xs text-muted-foreground">Project-level billing lines. Update % complete to calculate billing.</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} disabled={!canEdit} size="sm">
          <Plus size={16} className="mr-1" />
          Add SOV Line
        </Button>
      </div>

      {hasOverbilling && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-400 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-400">Overbilling Detected</p>
            <p className="text-xs text-muted-foreground">One or more SOV lines have billed more than earned. Adjust % complete or contact accounting.</p>
          </div>
        </div>
      )}

      <Card className="bg-blue-500/5 border-blue-500/30">
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Contract Value</p>
              <p className="text-lg font-bold">${totals.scheduled.toFixed(2).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Earned to Date</p>
              <p className="text-lg font-bold text-green-400">${totals.earned.toFixed(2).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Billed to Date</p>
              <p className="text-lg font-bold">${totals.billed.toFixed(2).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ready to Bill</p>
              <p className={`text-lg font-bold ${totals.toBill < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                ${totals.toBill.toFixed(2).toLocaleString()}
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
            emptyMessage="No SOV lines. Add Schedule of Values items to begin billing."
          />
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) {
          setEditingItem(null);
          setFormData({ sov_code: '', description: '', sov_category: 'labor', scheduled_value: 0 });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit SOV Line' : 'Add SOV Line'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the SOV line details below.' : 'Enter code, description, category, and scheduled value.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            if (editingItem) {
              // Only send non-locked fields
              const updates = {
                sov_code: formData.sov_code,
                description: formData.description,
                sov_category: formData.sov_category
              };
              // Only include scheduled_value if not locked
              if (!lockedSovItemIds.has(editingItem.id)) {
                updates.scheduled_value = formData.scheduled_value;
              }
              updateMutation.mutate({ id: editingItem.id, data: updates }, {
                onSuccess: () => {
                  toast.success('SOV line updated');
                  setShowAddDialog(false);
                  setEditingItem(null);
                  setFormData({ sov_code: '', description: '', sov_category: 'labor', scheduled_value: 0 });
                }
              });
            } else {
              createMutation.mutate(formData);
            }
          }} className="space-y-4">
            <div>
              <Label>SOV Code / Line #</Label>
              <Select 
                value={formData.sov_code} 
                onValueChange={(v) => {
                  const selected = allSOVItems.find(item => item.sov_code === v);
                  setFormData({ 
                    ...formData, 
                    sov_code: v,
                    description: selected?.description || formData.description
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select or enter code" />
                </SelectTrigger>
                <SelectContent>
                  {allSOVItems.map(item => (
                    <SelectItem key={item.sov_code} value={item.sov_code}>
                      {item.sov_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={formData.sov_code}
                onChange={(e) => setFormData({ ...formData, sov_code: e.target.value })}
                placeholder="Or type custom code"
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Select 
                value={formData.description} 
                onValueChange={(v) => {
                  const selected = allSOVItems.find(item => item.description === v);
                  setFormData({ 
                    ...formData, 
                    description: v,
                    sov_code: selected?.sov_code || formData.sov_code
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select or enter description" />
                </SelectTrigger>
                <SelectContent>
                  {allSOVItems.map((item, idx) => (
                    <SelectItem key={`${item.description}-${idx}`} value={item.description}>
                      {item.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Or type custom description"
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={formData.sov_category} onValueChange={(v) => setFormData({ ...formData, sov_category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="labor">Labor</SelectItem>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="subcontract">Subcontract</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scheduled Value</Label>
              <Input
                type="number"
                value={formData.scheduled_value}
                onChange={(e) => setFormData({ ...formData, scheduled_value: Number(e.target.value) })}
                disabled={editingItem && lockedSovItemIds.has(editingItem.id)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                <Lock size={10} className="inline mr-1" />
                {editingItem && lockedSovItemIds.has(editingItem.id) 
                  ? 'Locked — line has approved invoices. Use Change Orders.' 
                  : 'Locked after invoicing. Changes via Change Orders only.'}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setShowAddDialog(false);
                setEditingItem(null);
                setFormData({ sov_code: '', description: '', sov_category: 'labor', scheduled_value: 0 });
              }}>Cancel</Button>
              <Button type="submit">{editingItem ? 'Update' : 'Add'} SOV Line</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}