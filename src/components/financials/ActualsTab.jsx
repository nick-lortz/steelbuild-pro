import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataTable from '@/components/ui/DataTable';
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import * as backend from '../services/backend';

const STANDARD_EXPENSE_CATEGORIES = [
  { category: 'labor', label: 'Labor' },
  { category: 'material', label: 'Material' },
  { category: 'equipment', label: 'Equipment' },
  { category: 'subcontract', label: 'Subcontract' },
  { category: 'overhead', label: 'Overhead' }
];

export default function ActualsTab({ projectId, expenses = [], costCodes = [], canEdit }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showStandardDialog, setShowStandardDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState({});
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    cost_code_id: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    vendor: '',
    amount: 0,
    invoice_number: '',
    payment_status: 'pending'
  });

  const createMutation = useMutation({
    mutationFn: (data) => backend.createExpense({ ...data, project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', projectId] });
      queryClient.invalidateQueries({ queryKey: ['financials', projectId] });
      toast.success('Expense added');
      setShowAddDialog(false);
      setEditingExpense(null);
      setFormData({
        cost_code_id: '',
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
    mutationFn: ({ id, updates }) => backend.updateExpense(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', projectId] });
      queryClient.invalidateQueries({ queryKey: ['financials', projectId] });
      toast.success('Expense updated');
      setShowEditDialog(false);
      setEditingExpense(null);
      setFormData({
        cost_code_id: '',
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        vendor: '',
        amount: 0,
        invoice_number: '',
        payment_status: 'pending'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => backend.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', projectId] });
      queryClient.invalidateQueries({ queryKey: ['financials', projectId] });
      toast.success('Expense deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete expense');
    }
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (expenses) => Promise.all(expenses.map(e => backend.createExpense(e))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', projectId] });
      queryClient.invalidateQueries({ queryKey: ['financials', projectId] });
      toast.success('Standard expense lines added');
      setShowStandardDialog(false);
      setSelectedCategories({});
    }
  });

  const handleAddStandards = () => {
    const selected = Object.entries(selectedCategories)
      .filter(([_, isSelected]) => isSelected)
      .map(([category]) => category);

    if (!selected.length) {
      toast.error('Select at least one category');
      return;
    }

    const newExpenses = selected.map(category => ({
      project_id: projectId,
      cost_code_id: costCodes.find(c => c.category === category)?.id || '',
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      description: `${category.charAt(0).toUpperCase() + category.slice(1)} expense`,
      vendor: '',
      amount: 0,
      invoice_number: '',
      payment_status: 'pending'
    }));

    bulkCreateMutation.mutate(newExpenses);
  };

  const getCostCodeName = (id) => costCodes.find(c => c.id === id)?.name || '-';

  const columns = [
    {
      header: 'Code',
      accessor: 'cost_code_id',
      render: (row) => {
        const code = costCodes.find(c => c.id === row.cost_code_id);
        return code ? <span className="font-mono font-semibold text-amber-400">{code.code}</span> : '-';
      }
    },
    {
      header: 'Code Description',
      accessor: 'cost_code_id',
      render: (row) => {
        const code = costCodes.find(c => c.id === row.cost_code_id);
        return code ? <span className="text-xs text-zinc-300">{code.name}</span> : '—';
      }
    },
    {
      header: 'Date',
      accessor: 'expense_date',
      render: (row) => format(new Date(row.expense_date), 'MMM d, yyyy')
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (row) => <span className="truncate max-w-xs text-xs text-zinc-400">{row.description}</span>
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
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditingExpense(row);
              setFormData({
                cost_code_id: row.cost_code_id,
                expense_date: row.expense_date,
                description: row.description,
                vendor: row.vendor,
                amount: row.amount,
                invoice_number: row.invoice_number,
                payment_status: row.payment_status
              });
              setShowEditDialog(true);
            }}
            disabled={!canEdit}
            className="text-blue-400 hover:text-blue-300 disabled:opacity-50"
            title={!canEdit ? '🔒 Editing disabled' : 'Edit expense'}
          >
            <Edit size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (window.confirm(`⚠️ Delete expense: ${row.description}?\n\nAmount: $${row.amount.toLocaleString()}\nVendor: ${row.vendor || 'N/A'}\n\nThis will update actual costs and cannot be undone.`)) {
                deleteMutation.mutate(row.id);
              }
            }}
            disabled={!canEdit}
            className="text-red-400 hover:text-red-300 disabled:opacity-50"
            title={!canEdit ? '🔒 Editing disabled' : 'Delete expense'}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold">Actual Costs</h3>
        <div className="flex gap-2">
          <Button onClick={() => setShowStandardDialog(true)} variant="outline" disabled={!canEdit} size="sm">
            <Plus size={16} className="mr-1" />
            Add Standard
          </Button>
          <Button onClick={() => setShowAddDialog(true)} disabled={!canEdit} size="sm">
            <Plus size={16} className="mr-1" />
            Add Expense
          </Button>
        </div>
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

      <Dialog open={showStandardDialog} onOpenChange={setShowStandardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Standard Expense Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {STANDARD_EXPENSE_CATEGORIES.map(({ category, label }) => (
                <div key={category} className="flex items-center gap-2">
                  <Checkbox
                    id={category}
                    checked={selectedCategories[category] || false}
                    onCheckedChange={(checked) =>
                      setSelectedCategories({ ...selectedCategories, [category]: checked })
                    }
                  />
                  <label htmlFor={category} className="text-sm font-medium cursor-pointer">{label}</label>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowStandardDialog(false)}>Cancel</Button>
              <Button onClick={handleAddStandards} disabled={bulkCreateMutation.status === 'pending'}>
                Add Selected
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          setEditingExpense(null);
          setFormData({
            cost_code_id: '',
            expense_date: format(new Date(), 'yyyy-MM-dd'),
            description: '',
            vendor: '',
            amount: 0,
            invoice_number: '',
            payment_status: 'pending'
          });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
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
            <div>
              <Label>Payment Status</Label>
              <Select value={formData.payment_status} onValueChange={(v) => setFormData({ ...formData, payment_status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button 
                onClick={() => {
                  if (editingExpense) {
                    updateMutation.mutate({ 
                      id: editingExpense.id, 
                      updates: formData 
                    });
                  }
                }} 
                disabled={!formData.amount || updateMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}