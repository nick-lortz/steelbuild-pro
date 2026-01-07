import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataTable from '@/components/ui/DataTable';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from 'date-fns';

export default function ActualsTab({ projectId, expenses = [], costCodes = [], canEdit }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    cost_code_id: '',
    category: 'other',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    vendor: '',
    amount: 0,
    invoice_number: '',
    payment_status: 'pending'
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create({ ...data, project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['financials'] });
      toast.success('Expense added');
      setShowAddDialog(false);
      setFormData({
        cost_code_id: '',
        category: 'other',
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        vendor: '',
        amount: 0,
        invoice_number: '',
        payment_status: 'pending'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['financials'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['financials'] });
      toast.success('Expense deleted');
    }
  });

  const getCostCodeName = (id) => costCodes.find(c => c.id === id)?.name || '-';

  const columns = [
    {
      header: 'Date',
      accessor: 'expense_date',
      render: (row) => format(new Date(row.expense_date), 'MMM d, yyyy')
    },
    {
      header: 'Cost Code',
      accessor: 'cost_code_id',
      render: (row) => getCostCodeName(row.cost_code_id)
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (row) => <span className="capitalize">{row.category}</span>
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (row) => <span className="truncate max-w-xs">{row.description}</span>
    },
    {
      header: 'Vendor',
      accessor: 'vendor'
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (row) => <span className="font-semibold">${row.amount.toLocaleString()}</span>
    },
    {
      header: 'Status',
      accessor: 'payment_status',
      render: (row) => (
        <Select
          value={row.payment_status}
          onValueChange={(v) => updateMutation.mutate({ id: row.id, data: { payment_status: v } })}
          disabled={!canEdit}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="disputed">Disputed</SelectItem>
          </SelectContent>
        </Select>
      )
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (window.confirm('Delete this expense?')) {
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
        <h3 className="text-base font-semibold">Actual Costs</h3>
        <Button onClick={() => setShowAddDialog(true)} disabled={!canEdit} size="sm">
          <Plus size={16} className="mr-1" />
          Add Expense
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            data={expenses}
            emptyMessage="No expenses recorded. Add expenses to track actual costs."
          />
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Cost Code</Label>
              <Select value={formData.cost_code_id} onValueChange={(v) => setFormData({ ...formData, cost_code_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cost code" />
                </SelectTrigger>
                <SelectContent>
                  {costCodes.map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
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
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vendor</Label>
                <Input
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                />
              </div>
              <div>
                <Label>Invoice #</Label>
                <Input
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.amount}>
                Add Expense
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}