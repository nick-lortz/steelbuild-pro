import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from 'date-fns';
import * as backend from '../services/backend';

// Category order (in user's specified order)
const CATEGORY_ORDER = [
  'pm_admin',
  'shop_structural',
  'shop_misc',
  'shop_shipping',
  'field_budget',
  'buyouts',
  'detailing',
  'crane',
  'equipment',
  'material_fasteners',
  'shipping',
  'special_coatings',
  'subcontractor_shop',
  'subcontractor_field',
  'specialty_sub_field',
  'deck_install',
  'misc_steel'
];

const CATEGORY_LABELS = {
  pm_admin: 'PM/ADMIN',
  shop_structural: 'Shop Budget - Structural',
  shop_misc: 'Shop Budget - Misc.',
  shop_shipping: 'Shop Budget - Shipping',
  field_budget: 'Field Budget',
  buyouts: 'BUY OUTS (DECK & JOIST)',
  detailing: 'DETAILING/ENGINEERING',
  crane: 'CRANE',
  equipment: 'EQUIPMENT',
  material_fasteners: 'MATERIAL /FASTENERS',
  shipping: 'SHIPPING',
  special_coatings: 'SPECIAL COATINGS',
  subcontractor_shop: 'SUBCONTRACTOR SHOP',
  subcontractor_field: 'SUBCONTRACTOR FIELD',
  specialty_sub_field: 'SPECIALTY SUBCONTRACTOR FIELD',
  deck_install: 'DECK INSTALL',
  misc_steel: 'MISC STEEL (Stairs, handrail, ladders..)'
};

export default function ActualsTableOrdered({ projectId, expenses = [], costCodes = [], canEdit }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(new Set(CATEGORY_ORDER));
  const [formData, setFormData] = useState({
    cost_code_id: '',
    category: 'pm_admin',
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
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['financials'] });
      toast.success('Expense added');
      setShowAddDialog(false);
      setFormData({
        cost_code_id: '',
        category: 'pm_admin',
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
    mutationFn: ({ id, data }) => backend.updateExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['financials'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => backend.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['financials'] });
      toast.success('Expense deleted');
    }
  });

  const getCostCodeName = (id) => costCodes.find(c => c.id === id)?.name || '-';

  // Group expenses by category in order
  const groupedExpenses = useMemo(() => {
    const groups = {};
    CATEGORY_ORDER.forEach(cat => {
      groups[cat] = expenses.filter(e => e.category === cat);
    });
    return groups;
  }, [expenses]);

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const categoryTotals = useMemo(() => {
    const totals = {};
    Object.entries(groupedExpenses).forEach(([cat, items]) => {
      totals[cat] = items.reduce((sum, e) => sum + (e.amount || 0), 0);
    });
    return totals;
  }, [groupedExpenses]);

  const grandTotal = Object.values(categoryTotals).reduce((sum, t) => sum + t, 0);

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Description</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Vendor</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Amount</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORY_ORDER.map(category => {
                  const categoryExpenses = groupedExpenses[category] || [];
                  const isExpanded = expandedCategories.has(category);
                  const total = categoryTotals[category] || 0;
                  const hasExpenses = categoryExpenses.length > 0;

                  return (
                    <React.Fragment key={category}>
                      {/* Category Header Row */}
                      <tr className="bg-zinc-900/50 border-b border-border hover:bg-zinc-900 cursor-pointer" onClick={() => toggleCategory(category)}>
                        <td colSpan="7" className="py-2 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {hasExpenses && (
                                isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                              )}
                              <span className="font-semibold text-white">{CATEGORY_LABELS[category]}</span>
                              <span className="text-xs text-muted-foreground">({categoryExpenses.length})</span>
                            </div>
                            <span className="font-bold text-amber-400">${total.toLocaleString()}</span>
                          </div>
                        </td>
                      </tr>

                      {/* Expense Rows */}
                      {isExpanded && categoryExpenses.length > 0 && categoryExpenses.map((expense, idx) => (
                        <tr key={expense.id} className="border-b border-border/50 hover:bg-zinc-900/30">
                          <td className="py-2 px-4 text-xs text-muted-foreground">
                            {idx === 0 ? CATEGORY_LABELS[category] : ''}
                          </td>
                          <td className="py-2 px-4 text-xs">{format(new Date(expense.expense_date), 'MMM d, yyyy')}</td>
                          <td className="py-2 px-4 text-xs max-w-xs truncate">{expense.description}</td>
                          <td className="py-2 px-4 text-xs">{expense.vendor || '-'}</td>
                          <td className="py-2 px-4 text-right font-semibold">${expense.amount.toLocaleString()}</td>
                          <td className="py-2 px-4 text-center">
                            <Select
                              value={expense.payment_status}
                              onValueChange={(v) => updateMutation.mutate({ id: expense.id, data: { payment_status: v } })}
                              disabled={!canEdit}
                            >
                              <SelectTrigger className="w-24 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="disputed">Disputed</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-2 px-4 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (window.confirm(`⚠️ Delete expense: ${expense.description}?\n\nAmount: $${expense.amount.toLocaleString()}`)) {
                                  deleteMutation.mutate(expense.id);
                                }
                              }}
                              disabled={!canEdit}
                              className="text-red-400 hover:text-red-300 disabled:opacity-50 h-7 w-7"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </td>
                        </tr>
                      ))}

                      {/* Empty Row */}
                      {categoryExpenses.length === 0 && (
                        <tr className="border-b border-border/50 hover:bg-zinc-900/30">
                          <td colSpan="7" className="py-2 px-4 text-xs text-muted-foreground italic">
                            No expenses in this category
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Grand Total Row */}
                <tr className="bg-zinc-900 border-t-2 border-border font-bold">
                  <td colSpan="4" className="py-3 px-4 text-right">TOTAL:</td>
                  <td className="py-3 px-4 text-right text-amber-400">${grandTotal.toLocaleString()}</td>
                  <td colSpan="2"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {expenses.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No expenses recorded. Add expenses to track actual costs.
            </div>
          )}
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
                <SelectContent className="max-h-[300px]">
                  {CATEGORY_ORDER.map(cat => (
                    <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
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
    </div>
  );
}