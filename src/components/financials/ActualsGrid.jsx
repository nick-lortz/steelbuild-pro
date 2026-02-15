import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Upload, Download, Link2 } from 'lucide-react';
import HierarchicalCostCodeSelector from './HierarchicalCostCodeSelector';
import { toast } from '@/components/ui/notifications';

const formatCurrency = (value) => {
  if (value == null) return '$0.00';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  return value < 0 ? `( $${formatted} )` : `$${formatted}`;
};

export default function ActualsGrid({ 
  expenses, 
  costCodes, 
  sovItems,
  onUpdate, 
  onDelete, 
  onCreate,
  onImport,
  onExport,
  canEdit 
}) {
  const [newExpense, setNewExpense] = useState(null);

  const getCostCodeName = (codeId) => {
    const code = costCodes.find(c => c.id === codeId);
    return code?.full_path || code?.name || '-';
  };

  const getSovDescription = (sovCode) => {
    const sov = sovItems.find(s => s.sov_code === sovCode);
    return sov?.description || '-';
  };

  const addExpense = () => {
    setNewExpense({
      expense_date: new Date().toISOString().split('T')[0],
      description: '',
      vendor: '',
      amount: 0,
      category: 'material',
      cost_code_id: '',
      sov_code: ''
    });
  };

  const saveNewExpense = async () => {
    if (!newExpense.description || newExpense.amount <= 0) {
      toast.error('Description and amount required');
      return;
    }
    await onCreate(newExpense);
    setNewExpense(null);
  };

  const totalActuals = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const alignedTotal = expenses.filter(e => e.sov_code).reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-white text-sm">Actual Costs</CardTitle>
            <Badge className="bg-zinc-800 text-white text-xs">
              Total: {formatCurrency(totalActuals)}
            </Badge>
            <Badge className={alignedTotal < totalActuals ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-green-500/20 text-green-400 border-green-500/50'}>
              {formatCurrency(alignedTotal)} Aligned
            </Badge>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <>
                <Button size="sm" variant="outline" onClick={addExpense} className="border-zinc-700 text-xs">
                  <Plus size={12} className="mr-1" />
                  Add Cost
                </Button>
                <Button size="sm" variant="outline" onClick={onImport} className="border-zinc-700 text-xs">
                  <Upload size={12} className="mr-1" />
                  Import
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={onExport} className="border-zinc-700 text-xs">
              <Download size={12} className="mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-950 border-b border-zinc-700 z-10">
              <tr>
                <th className="text-left p-3 text-zinc-400 font-bold text-xs uppercase w-28">Date</th>
                <th className="text-left p-3 text-zinc-400 font-bold text-xs uppercase">Description</th>
                <th className="text-left p-3 text-zinc-400 font-bold text-xs uppercase w-40">Vendor</th>
                <th className="text-left p-3 text-zinc-400 font-bold text-xs uppercase w-32">Category</th>
                <th className="text-left p-3 text-zinc-400 font-bold text-xs uppercase w-48">Cost Code</th>
                <th className="text-left p-3 text-zinc-400 font-bold text-xs uppercase w-48">SOV Line</th>
                <th className="text-right p-3 text-zinc-400 font-bold text-xs uppercase w-32">Amount</th>
                {canEdit && <th className="w-12"></th>}
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className={`border-b border-zinc-800 hover:bg-zinc-800/30 ${!expense.sov_code ? 'bg-amber-500/5' : ''}`}>
                  <td className="p-3 text-zinc-400 text-xs">{expense.expense_date}</td>
                  <td className="p-3 text-white text-xs">{expense.description}</td>
                  <td className="p-3 text-zinc-400 text-xs">{expense.vendor || '-'}</td>
                  <td className="p-3">
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {expense.category}
                    </Badge>
                  </td>
                  <td className="p-3 text-zinc-400 text-xs">
                    {getCostCodeName(expense.cost_code_id)}
                  </td>
                  <td className="p-3 text-xs">
                    {expense.sov_code ? (
                      <span className="text-green-400 font-mono">{expense.sov_code}</span>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-[10px]">
                        <Link2 size={10} className="mr-1" />
                        Not Mapped
                      </Badge>
                    )}
                  </td>
                  <td className="p-3 text-right text-white font-mono text-xs">{formatCurrency(expense.amount)}</td>
                  {canEdit && (
                    <td className="p-3">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(expense.id)}
                        className="h-6 w-6 text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}

              {newExpense && (
                <tr className="border-b-2 border-amber-500 bg-amber-500/5">
                  <td className="p-3">
                    <Input
                      type="date"
                      value={newExpense.expense_date}
                      onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                      className="h-7 text-xs bg-zinc-950 border-amber-500"
                    />
                  </td>
                  <td className="p-3">
                    <Input
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                      placeholder="Description"
                      className="h-7 text-xs bg-zinc-950 border-amber-500"
                    />
                  </td>
                  <td className="p-3">
                    <Input
                      value={newExpense.vendor}
                      onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })}
                      placeholder="Vendor"
                      className="h-7 text-xs bg-zinc-950 border-amber-500"
                    />
                  </td>
                  <td className="p-3">
                    <select
                      value={newExpense.category}
                      onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                      className="h-7 text-xs bg-zinc-950 border border-amber-500 rounded px-2 text-white w-full"
                    >
                      <option value="labor">Labor</option>
                      <option value="material">Material</option>
                      <option value="equipment">Equipment</option>
                      <option value="subcontract">Subcontract</option>
                      <option value="overhead">Overhead</option>
                      <option value="other">Other</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <HierarchicalCostCodeSelector
                      costCodes={costCodes}
                      value={newExpense.cost_code_id}
                      onChange={(val) => setNewExpense({ ...newExpense, cost_code_id: val })}
                      className="h-7 text-xs bg-zinc-950 border-amber-500"
                    />
                  </td>
                  <td className="p-3">
                    <select
                      value={newExpense.sov_code}
                      onChange={(e) => setNewExpense({ ...newExpense, sov_code: e.target.value })}
                      className="h-7 text-xs bg-zinc-950 border border-zinc-700 rounded px-2 text-white w-full"
                    >
                      <option value="">Not mapped</option>
                      {sovItems.map(sov => (
                        <option key={sov.sov_code} value={sov.sov_code}>
                          {sov.sov_code} - {sov.description}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <Input
                      type="number"
                      step="0.01"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                      className="h-7 text-xs text-right bg-zinc-950 border-amber-500"
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveNewExpense}>
                        <Plus size={12} className="text-green-400" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setNewExpense(null)}>
                        <X size={12} className="text-zinc-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}