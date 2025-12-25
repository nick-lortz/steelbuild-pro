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
import { Plus, Receipt, Upload, Loader2, FileSpreadsheet, Pencil, Trash2 } from 'lucide-react';
import CSVUpload from '@/components/shared/CSVUpload';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';

export default function ExpensesManagement({ projectFilter = 'all' }) {
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    project_id: '',
    cost_code_id: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    category: 'other',
    vendor: '',
    amount: '',
    invoice_number: '',
    payment_status: 'pending',
    notes: '',
  });
  const [uploading, setUploading] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['costCodes'],
    queryFn: () => base44.entities.CostCode.list('code'),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-expense_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['financials'] });
      setShowForm(false);
      setEditingExpense(null);
      setFormData({
        project_id: '',
        cost_code_id: '',
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        category: 'other',
        vendor: '',
        amount: '',
        invoice_number: '',
        payment_status: 'pending',
        notes: '',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['financials'] });
      setShowForm(false);
      setEditingExpense(null);
      setFormData({
        project_id: '',
        cost_code_id: '',
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        category: 'other',
        vendor: '',
        amount: '',
        invoice_number: '',
        payment_status: 'pending',
        notes: '',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['financials'] });
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, receipt_url: file_url }));
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      amount: parseFloat(formData.amount) || 0,
    };
    
    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormData({
      project_id: expense.project_id || '',
      cost_code_id: expense.cost_code_id || '',
      expense_date: expense.expense_date || format(new Date(), 'yyyy-MM-dd'),
      description: expense.description || '',
      category: expense.category || 'other',
      vendor: expense.vendor || '',
      amount: expense.amount?.toString() || '',
      invoice_number: expense.invoice_number || '',
      payment_status: expense.payment_status || 'pending',
      notes: expense.notes || '',
      receipt_url: expense.receipt_url || '',
    });
    setShowForm(true);
  };

  const handleDelete = (expense) => {
    if (confirm(`Delete expense: ${expense.description}?`)) {
      deleteMutation.mutate(expense.id);
    }
  };

  const filteredExpenses = projectFilter === 'all' 
    ? expenses 
    : expenses.filter(e => e.project_id === projectFilter);

  const columns = [
    {
      header: 'Date',
      accessor: 'expense_date',
      render: (row) => format(new Date(row.expense_date), 'MMM d, yyyy'),
    },
    {
      header: 'Project',
      accessor: 'project_id',
      render: (row) => {
        const project = projects.find(p => p.id === row.project_id);
        return <span className="text-zinc-300">{project?.name || '-'}</span>;
      },
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (row) => (
        <div>
          <p className="font-medium">{row.description}</p>
          <p className="text-xs text-zinc-500">{row.vendor}</p>
        </div>
      ),
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (row) => <span className="capitalize text-zinc-400">{row.category}</span>,
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (row) => <span className="font-mono text-white">${row.amount?.toLocaleString()}</span>,
    },
    {
      header: 'Status',
      accessor: 'payment_status',
      render: (row) => <StatusBadge status={row.payment_status} />,
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
            className="h-8 w-8 p-0"
          >
            <Pencil size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
            className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const paidExpenses = filteredExpenses.filter(e => e.payment_status === 'paid').reduce((sum, e) => sum + (e.amount || 0), 0);
  const pendingExpenses = filteredExpenses.filter(e => e.payment_status === 'pending').reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <p className="text-zinc-400 text-sm">Total Expenses</p>
          <p className="text-xl font-bold text-white">${totalExpenses.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
          <p className="text-zinc-400 text-sm">Paid</p>
          <p className="text-xl font-bold text-green-400">${paidExpenses.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
          <p className="text-zinc-400 text-sm">Pending</p>
          <p className="text-xl font-bold text-amber-400">${pendingExpenses.toLocaleString()}</p>
        </div>
      </div>

      {/* Add Button */}
      <div className="flex gap-2">
        <Button onClick={() => setShowCSVImport(true)} variant="outline" className="border-zinc-700">
          <FileSpreadsheet size={16} className="mr-2" />
          Import CSV
        </Button>
        <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600 text-black">
          <Plus size={16} className="mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredExpenses}
        emptyMessage="No expenses recorded yet."
      />

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project *</Label>
                <Select value={formData.project_id} onValueChange={(v) => setFormData({ ...formData, project_id: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cost Code</Label>
                <Select value={formData.cost_code_id} onValueChange={(v) => setFormData({ ...formData, cost_code_id: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Select cost code" />
                  </SelectTrigger>
                  <SelectContent>
                    {costCodes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  required
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Expense description"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="labor">Labor</SelectItem>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="subcontract">Subcontract</SelectItem>
                    <SelectItem value="overhead">Overhead</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={formData.payment_status} onValueChange={(v) => setFormData({ ...formData, payment_status: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice #</Label>
                <Input
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Receipt</Label>
              <div className="border-2 border-dashed border-zinc-700 rounded-lg p-4 text-center">
                <input type="file" id="receipt-upload" onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />
                <label htmlFor="receipt-upload" className="cursor-pointer">
                  {uploading ? (
                    <Loader2 className="mx-auto mb-2 animate-spin text-amber-500" size={24} />
                  ) : formData.receipt_url ? (
                    <Receipt className="mx-auto mb-2 text-green-500" size={24} />
                  ) : (
                    <Upload className="mx-auto mb-2 text-zinc-500" size={24} />
                  )}
                  <p className="text-sm text-zinc-400">
                    {uploading ? 'Uploading...' : formData.receipt_url ? 'Receipt uploaded' : 'Click to upload receipt'}
                  </p>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingExpense(null);
                  setFormData({
                    project_id: '',
                    cost_code_id: '',
                    expense_date: format(new Date(), 'yyyy-MM-dd'),
                    description: '',
                    category: 'other',
                    vendor: '',
                    amount: '',
                    invoice_number: '',
                    payment_status: 'pending',
                    notes: '',
                  });
                }}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending} 
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : editingExpense ? 'Update Expense' : 'Add Expense'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV Import */}
      <CSVUpload
        entityName="Expense"
        templateFields={[
          { label: 'Project Number', key: 'project_number', example: 'P-001' },
          { label: 'Expense Date', key: 'expense_date', example: '2025-01-15' },
          { label: 'Description', key: 'description', example: 'Steel delivery' },
          { label: 'Category', key: 'category', example: 'material' },
          { label: 'Vendor', key: 'vendor', example: 'ABC Steel Supply' },
          { label: 'Amount', key: 'amount', example: '5000' },
          { label: 'Invoice Number', key: 'invoice_number', example: 'INV-12345' },
        ]}
        transformRow={(row) => {
          const project = projects.find(p => p.project_number === row.project_number);
          return {
            project_id: project?.id || '',
            expense_date: row.expense_date || format(new Date(), 'yyyy-MM-dd'),
            description: row.description || '',
            category: row.category || 'other',
            vendor: row.vendor || '',
            amount: parseFloat(row.amount) || 0,
            invoice_number: row.invoice_number || '',
            payment_status: 'pending',
          };
        }}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['expenses'] });
        }}
        open={showCSVImport}
        onOpenChange={setShowCSVImport}
      />
    </div>
  );
}