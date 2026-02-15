import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Link2, CheckCircle } from 'lucide-react';
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

export default function CostAlignmentPanel({ expenses, sovItems, onBulkMap }) {
  const [selectedExpenses, setSelectedExpenses] = useState(new Set());
  const [targetSOVCode, setTargetSOVCode] = useState('');

  const unalignedExpenses = expenses.filter(e => !e.sov_code);
  const totalUnaligned = unalignedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalAligned = expenses.filter(e => e.sov_code).reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalCost = totalUnaligned + totalAligned;
  const coverage = totalCost > 0 ? (totalAligned / totalCost) * 100 : 100;

  const toggleExpense = (expenseId) => {
    const newSet = new Set(selectedExpenses);
    if (newSet.has(expenseId)) {
      newSet.delete(expenseId);
    } else {
      newSet.add(expenseId);
    }
    setSelectedExpenses(newSet);
  };

  const selectAll = () => {
    if (selectedExpenses.size === unalignedExpenses.length) {
      setSelectedExpenses(new Set());
    } else {
      setSelectedExpenses(new Set(unalignedExpenses.map(e => e.id)));
    }
  };

  const handleBulkMap = async () => {
    if (selectedExpenses.size === 0) {
      toast.error('Select at least one expense');
      return;
    }
    if (!targetSOVCode) {
      toast.error('Select SOV line');
      return;
    }

    await onBulkMap(Array.from(selectedExpenses), targetSOVCode);
    setSelectedExpenses(new Set());
    setTargetSOVCode('');
  };

  return (
    <Card className={`border-2 ${coverage < 95 ? 'border-red-500/50 bg-red-500/5' : 'border-zinc-800 bg-zinc-900'}`}>
      <CardHeader className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-white text-sm">Cost Alignment</CardTitle>
            {coverage < 95 ? (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                <AlertCircle size={12} className="mr-1" />
                {coverage.toFixed(0)}% Coverage — Map Costs Required
              </Badge>
            ) : (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                <CheckCircle size={12} className="mr-1" />
                {coverage.toFixed(0)}% Coverage
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="text-zinc-400">
              Aligned: <span className="text-green-400 font-mono">{formatCurrency(totalAligned)}</span>
            </div>
            <div className="text-zinc-400">
              Unaligned: <span className="text-red-400 font-mono">{formatCurrency(totalUnaligned)}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {unalignedExpenses.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
            All costs aligned to SOV
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedExpenses.size === unalignedExpenses.length && unalignedExpenses.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-xs text-zinc-400">
                  {selectedExpenses.size} of {unalignedExpenses.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Select value={targetSOVCode} onValueChange={setTargetSOVCode}>
                  <SelectTrigger className="w-64 h-8 text-xs bg-zinc-950 border-zinc-700">
                    <SelectValue placeholder="Map to SOV line..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {sovItems.map(sov => (
                      <SelectItem key={sov.sov_code} value={sov.sov_code} className="text-white text-xs">
                        {sov.sov_code} - {sov.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleBulkMap}
                  disabled={selectedExpenses.size === 0 || !targetSOVCode}
                  className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold"
                >
                  <Link2 size={12} className="mr-1" />
                  Map {selectedExpenses.size} Cost{selectedExpenses.size !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-1">
              {unalignedExpenses.map(expense => (
                <div
                  key={expense.id}
                  className={`flex items-center gap-3 p-2 rounded transition-colors ${
                    selectedExpenses.has(expense.id) ? 'bg-amber-500/10 border border-amber-500/30' : 'hover:bg-zinc-800/50'
                  }`}
                >
                  <Checkbox
                    checked={selectedExpenses.has(expense.id)}
                    onCheckedChange={() => toggleExpense(expense.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-white truncate">{expense.description || expense.vendor}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">{expense.category}</Badge>
                    </div>
                    <p className="text-[10px] text-zinc-500">{expense.expense_date}</p>
                  </div>
                  <p className="text-xs text-white font-mono">{formatCurrency(expense.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}