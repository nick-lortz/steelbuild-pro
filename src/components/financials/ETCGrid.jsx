import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Save, X } from 'lucide-react';
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

export default function ETCGrid({ etcRecords, actualCostByCategory, onUpdate, canEdit }) {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  const categories = ['labor', 'material', 'equipment', 'subcontract', 'other'];

  const startEdit = (category, field, currentValue) => {
    if (!canEdit) return;
    setEditingCell({ category, field });
    setEditValue(currentValue?.toString() || '');
  };

  const saveEdit = async (category) => {
    if (!editingCell) return;
    
    const value = editingCell.field === 'notes' ? editValue : parseFloat(editValue) || 0;
    const ac = actualCostByCategory[category] || 0;
    const eac = ac + value;

    if (eac < ac) {
      toast.error('EAC cannot be less than Actual Cost');
      setEditingCell(null);
      return;
    }

    await onUpdate(category, { 
      estimated_remaining_cost: value,
      last_reviewed_date: new Date().toISOString().split('T')[0]
    });
    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e, category) => {
    if (e.key === 'Enter' && editingCell?.field !== 'notes') {
      saveEdit(category);
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const totalAC = Object.values(actualCostByCategory).reduce((sum, val) => sum + val, 0);
  const totalETC = etcRecords.reduce((sum, etc) => sum + (etc.estimated_remaining_cost || 0), 0);
  const totalEAC = totalAC + totalETC;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm">Estimate to Complete (ETC)</CardTitle>
          <div className="flex items-center gap-4 text-xs">
            <div className="text-zinc-400">
              AC: <span className="text-white font-mono">{formatCurrency(totalAC)}</span>
            </div>
            <div className="text-zinc-400">
              ETC: <span className="text-amber-400 font-mono">{formatCurrency(totalETC)}</span>
            </div>
            <div className="text-zinc-400">
              EAC: <span className="text-white font-mono font-bold">{formatCurrency(totalEAC)}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950 border-b border-zinc-700">
              <tr>
                <th className="text-left p-3 text-zinc-400 font-bold text-xs uppercase w-32">Category</th>
                <th className="text-right p-3 text-zinc-400 font-bold text-xs uppercase w-32">Actual to Date</th>
                <th className="text-right p-3 text-zinc-400 font-bold text-xs uppercase w-32">Est Remaining</th>
                <th className="text-right p-3 text-zinc-400 font-bold text-xs uppercase w-32">Forecast Total</th>
                <th className="text-left p-3 text-zinc-400 font-bold text-xs uppercase flex-1">Assumptions</th>
                <th className="text-center p-3 text-zinc-400 font-bold text-xs uppercase w-24">Updated</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => {
                const etc = etcRecords.find(e => e.category === category);
                const ac = actualCostByCategory[category] || 0;
                const estRemaining = etc?.estimated_remaining_cost || 0;
                const eac = ac + estRemaining;
                const invalid = eac < ac;

                return (
                  <tr key={category} className={`border-b border-zinc-800 hover:bg-zinc-800/30 ${invalid ? 'bg-red-500/5' : ''}`}>
                    <td className="p-3 text-white capitalize font-medium text-xs">{category}</td>
                    <td className="p-3 text-right text-zinc-400 font-mono text-xs">{formatCurrency(ac)}</td>
                    <td className="p-3 text-right">
                      {editingCell?.category === category && editingCell.field === 'estimated_remaining_cost' ? (
                        <div className="flex items-center gap-1 justify-end">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, category)}
                            autoFocus
                            className="h-7 text-xs text-right bg-zinc-950 border-amber-500 w-32"
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveEdit(category)}>
                            <Save size={12} className="text-green-400" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}>
                            <X size={12} className="text-zinc-400" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(category, 'estimated_remaining_cost', estRemaining)}
                          className="text-amber-400 font-mono text-xs hover:text-amber-300 transition-colors"
                        >
                          {formatCurrency(estRemaining)}
                        </button>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <span className={`font-mono text-xs font-bold ${invalid ? 'text-red-400' : 'text-white'}`}>
                        {formatCurrency(eac)}
                      </span>
                      {invalid && (
                        <Badge className="ml-2 bg-red-500/20 text-red-400 border-red-500/50 text-[10px]">
                          <AlertCircle size={10} className="mr-1" />
                          Invalid
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      {editingCell?.category === category && editingCell.field === 'notes' ? (
                        <div className="flex items-center gap-1">
                          <Textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-16 text-xs bg-zinc-950 border-amber-500"
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveEdit(category)}>
                            <Save size={12} className="text-green-400" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}>
                            <X size={12} className="text-zinc-400" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(category, 'notes', etc?.notes)}
                          className="text-zinc-400 text-xs text-left hover:text-white transition-colors w-full"
                        >
                          {etc?.notes || 'Add assumptions...'}
                        </button>
                      )}
                    </td>
                    <td className="p-3 text-center text-[10px] text-zinc-500">
                      {etc?.last_reviewed_date || '-'}
                    </td>
                  </tr>
                );
              })}
              
              {/* Totals */}
              <tr className="bg-zinc-950 border-t-2 border-zinc-700 font-bold">
                <td className="p-3 text-zinc-300 text-xs uppercase">Totals</td>
                <td className="p-3 text-right text-white text-xs font-mono">{formatCurrency(totalAC)}</td>
                <td className="p-3 text-right text-amber-400 text-xs font-mono">{formatCurrency(totalETC)}</td>
                <td className="p-3 text-right text-white text-xs font-mono font-bold">{formatCurrency(totalEAC)}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}