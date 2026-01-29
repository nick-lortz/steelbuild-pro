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
import * as backend from '../services/backend';

export default function BudgetTab({ projectId, budgetLines = [], costCodes = [], canEdit }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({ cost_code_id: '', category: 'labor', original_budget: 0 });
  const [editingValues, setEditingValues] = useState({});

  const createMutation = useMutation({
    mutationFn: (data) => backend.createBudgetLine({
      ...data,
      project_id: projectId,
      current_budget: data.original_budget,
      approved_changes: 0
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
      toast.success('Budget line added');
      setShowAddDialog(false);
      setFormData({ cost_code_id: '', category: 'labor', original_budget: 0 });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => backend.updateBudgetLine(id, {
      ...data,
      current_budget: (data.original_budget || 0) + (data.approved_changes || 0)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => backend.deleteBudgetLine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials'] });
      toast.success('Budget line deleted');
    }
  });

  const getCostCodeName = (id) => costCodes.find(c => c.id === id)?.name || 'Unknown';

  const handleSave = (rowId, field, value) => {
    const row = budgetLines.find(r => r.id === rowId);
    if (!row) return;

    const updates = field === 'original_budget'
      ? { original_budget: Number(value), approved_changes: row.approved_changes || 0 }
      : { approved_changes: Number(value), original_budget: row.original_budget || 0 };

    updateMutation.mutate({ id: rowId, data: updates });
    
    setEditingValues(prev => {
      const newState = { ...prev };
      delete newState[`${rowId}_${field}`];
      return newState;
    });
  };

  const columns = [
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
      header: 'Original Budget',
      accessor: 'original_budget',
      render: (row) => {
        const key = `${row.id}_original_budget`;
        const displayValue = editingValues[key] ?? row.original_budget ?? 0;
        
        return (
          <Input
            type="number"
            value={displayValue}
            onChange={(e) => setEditingValues(prev => ({ ...prev, [key]: e.target.value }))}
            onBlur={(e) => handleSave(row.id, 'original_budget', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            disabled={!canEdit}
            className="w-32"
          />
        );
      }
    },
    {
      header: 'Approved Changes',
      accessor: 'approved_changes',
      render: (row) => {
        const key = `${row.id}_approved_changes`;
        const displayValue = editingValues[key] ?? row.approved_changes ?? 0;
        
        return (
          <Input
            type="number"
            value={displayValue}
            onChange={(e) => setEditingValues(prev => ({ ...prev, [key]: e.target.value }))}
            onBlur={(e) => handleSave(row.id, 'approved_changes', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            disabled={!canEdit}
            className="w-32"
          />
        );
      }
    },
    {
      header: 'Current Budget',
      accessor: 'current_budget',
      render: (row) => (
        <span className="font-semibold">
          ${((row.original_budget || 0) + (row.approved_changes || 0)).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Actual',
      accessor: 'actual_amount',
      render: (row) => <span>${(row.actual_amount || 0).toLocaleString()}</span>
    },
    {
      header: 'Variance',
      accessor: 'variance',
      render: (row) => {
        const current = (row.original_budget || 0) + (row.approved_changes || 0);
        const variance = current - (row.actual_amount || 0);
        return (
          <span className={variance < 0 ? 'text-red-400' : 'text-green-400'}>
            ${variance.toLocaleString()}
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
            if (window.confirm(`⚠️ Delete budget line for ${getCostCodeName(row.cost_code_id)}?\n\nOriginal Budget: $${(row.original_budget || 0).toLocaleString()}\nCurrent Budget: $${((row.original_budget || 0) + (row.approved_changes || 0)).toLocaleString()}\n\nThis cannot be undone.`)) {
              deleteMutation.mutate(row.id);
            }
          }}
          disabled={!canEdit}
          className="text-red-400 hover:text-red-300 disabled:opacity-50"
          title={!canEdit ? '🔒 Editing disabled' : 'Delete budget line'}
        >
          <Trash2 size={16} />
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold">Budget Lines by Cost Code</h3>
        <Button onClick={() => setShowAddDialog(true)} disabled={!canEdit} size="sm">
          <Plus size={16} className="mr-1" />
          Add Budget Line
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            data={budgetLines}
            emptyMessage="No budget lines. Add budget allocations by cost code."
          />
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Budget Line</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="pm_admin">PM/ADMIN</SelectItem>
                  <SelectItem value="shop_structural">Shop Budget - Structural</SelectItem>
                  <SelectItem value="shop_misc">Shop Budget - Misc.</SelectItem>
                  <SelectItem value="shop_shipping">Shop Budget - Shipping</SelectItem>
                  <SelectItem value="field_budget">Field Budget</SelectItem>
                  <SelectItem value="buyouts">BUY OUTS (DECK & JOIST)</SelectItem>
                  <SelectItem value="detailing">DETAILING/ENGINEERING</SelectItem>
                  <SelectItem value="crane">CRANE</SelectItem>
                  <SelectItem value="equipment">EQUIPMENT</SelectItem>
                  <SelectItem value="material_fasteners">MATERIAL /FASTENERS</SelectItem>
                  <SelectItem value="shipping">SHIPPING</SelectItem>
                  <SelectItem value="special_coatings">SPECIAL COATINGS</SelectItem>
                  <SelectItem value="subcontractor_shop">SUBCONTRACTOR SHOP</SelectItem>
                  <SelectItem value="subcontractor_field">SUBCONTRACTOR FIELD</SelectItem>
                  <SelectItem value="specialty_sub_field">SPECIALTY SUBCONTRACTOR FIELD</SelectItem>
                  <SelectItem value="deck_install">DECK INSTALL</SelectItem>
                  <SelectItem value="misc_steel">MISC STEEL (Stairs, handrail, ladders..)</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Original Budget</Label>
              <Input
                type="number"
                value={formData.original_budget}
                onChange={(e) => setFormData({ ...formData, original_budget: Number(e.target.value) })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.cost_code_id}>
                Add Budget Line
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}