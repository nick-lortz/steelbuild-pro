import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataTable from '@/components/ui/DataTable';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import * as backend from '@/services/backend';

export default function InvoicesTab({ projectId, invoices = [], canEdit }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    total_amount: 0,
    payment_status: 'pending'
  });

  const createMutation = useMutation({
    mutationFn: (data) => backend.createInvoice({ ...data, project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created');
      setShowAddDialog(false);
      setFormData({
        invoice_number: '',
        invoice_date: format(new Date(), 'yyyy-MM-dd'),
        total_amount: 0,
        payment_status: 'pending'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => backend.updateInvoice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => backend.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice deleted');
    }
  });

  const columns = [
    {
      header: 'Invoice #',
      accessor: 'invoice_number'
    },
    {
      header: 'Date',
      accessor: 'invoice_date',
      render: (row) => format(new Date(row.invoice_date), 'MMM d, yyyy')
    },
    {
      header: 'Amount',
      accessor: 'total_amount',
      render: (row) => <span className="font-semibold">${(row.total_amount || 0).toLocaleString()}</span>
    },
    {
      header: 'Status',
      accessor: 'payment_status',
      render: (row) => (
        <Select
          value={row.payment_status}
          onValueChange={(v) => updateMutation.mutate({
            id: row.id,
            data: { payment_status: v, paid_date: v === 'paid' ? format(new Date(), 'yyyy-MM-dd') : row.paid_date }
          })}
          disabled={!canEdit}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>
      )
    },
    {
      header: 'Paid Date',
      accessor: 'paid_date',
      render: (row) => row.paid_date ? format(new Date(row.paid_date), 'MMM d, yyyy') : '-'
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (window.confirm('Delete this invoice?')) {
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold">Client Invoices</h3>
        <Button onClick={() => setShowAddDialog(true)} disabled={!canEdit} size="sm">
          <Plus size={16} className="mr-1" />
          Add Invoice
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            data={invoices}
            emptyMessage="No invoices. Add client invoices to track billing."
          />
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Client Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Invoice Number</Label>
                <Input
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  placeholder="INV-001"
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Total Amount</Label>
              <Input
                type="number"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: Number(e.target.value) })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.invoice_number || !formData.total_amount}>
                Create Invoice
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}