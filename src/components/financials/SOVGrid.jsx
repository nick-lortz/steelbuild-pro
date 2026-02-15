import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Save, X, Upload, Download, Trash2, History } from 'lucide-react';
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

export default function SOVGrid({ 
  sovItems, 
  onUpdate, 
  onDelete, 
  onCreate,
  onImport,
  onExport,
  onPublish,
  canEdit,
  baseContract,
  totalContract 
}) {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [newRow, setNewRow] = useState(null);

  const startEdit = (sovId, field, currentValue) => {
    if (!canEdit) return;
    setEditingCell({ sovId, field });
    setEditValue(currentValue?.toString() || '');
  };

  const saveEdit = async (sov) => {
    if (!editingCell) return;
    
    let value = editValue;
    if (['scheduled_value', 'percent_complete', 'billed_to_date', 'earned_to_date'].includes(editingCell.field)) {
      value = parseFloat(editValue) || 0;
    }
    
    await onUpdate(sov.id, { [editingCell.field]: value });
    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e, sov) => {
    if (e.key === 'Enter') {
      saveEdit(sov);
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const addRow = () => {
    setNewRow({
      sov_code: '',
      description: '',
      sov_category: 'labor',
      scheduled_value: 0,
      percent_complete: 0,
      billed_to_date: 0,
      earned_to_date: 0
    });
  };

  const saveNewRow = async () => {
    if (!newRow.sov_code || !newRow.description) {
      toast.error('Code and Description required');
      return;
    }
    await onCreate(newRow);
    setNewRow(null);
  };

  const totals = sovItems.reduce((acc, item) => ({
    scheduled_value: acc.scheduled_value + (item.scheduled_value || 0),
    earned_to_date: acc.earned_to_date + (item.earned_to_date || 0),
    billed_to_date: acc.billed_to_date + (item.billed_to_date || 0),
  }), { scheduled_value: 0, earned_to_date: 0, billed_to_date: 0 });

  const sovMismatch = Math.abs(totals.scheduled_value - baseContract) > 1;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm">Schedule of Values</CardTitle>
          <div className="flex gap-2">
            {canEdit && (
              <>
                <Button size="sm" variant="outline" onClick={addRow} className="border-zinc-700 text-xs">
                  <Plus size={14} className="mr-1" />
                  Add Line
                </Button>
                <Button size="sm" variant="outline" onClick={onImport} className="border-zinc-700 text-xs">
                  <Upload size={14} className="mr-1" />
                  Import
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={onExport} className="border-zinc-700 text-xs">
              <Download size={14} className="mr-1" />
              Export
            </Button>
            {canEdit && (
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold" onClick={onPublish}>
                <History size={14} className="mr-1" />
                Publish Version
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950 border-b border-zinc-700">
              <tr>
                <th className="text-left p-3 text-zinc-400 font-bold text-xs uppercase w-24">Code</th>
                <th className="text-left p-3 text-zinc-400 font-bold text-xs uppercase w-96">Description</th>
                <th className="text-left p-3 text-zinc-400 font-bold text-xs uppercase w-32">Type</th>
                <th className="text-right p-3 text-zinc-400 font-bold text-xs uppercase w-32">Budget</th>
                <th className="text-right p-3 text-zinc-400 font-bold text-xs uppercase w-24">% Done</th>
                <th className="text-right p-3 text-zinc-400 font-bold text-xs uppercase w-32">Earned</th>
                <th className="text-right p-3 text-zinc-400 font-bold text-xs uppercase w-32">Billed</th>
                <th className="text-right p-3 text-zinc-400 font-bold text-xs uppercase w-32">Cost Aligned</th>
                {canEdit && <th className="w-16"></th>}
              </tr>
            </thead>
            <tbody>
              {sovItems.map((sov) => {
                const earned = (sov.scheduled_value || 0) * ((sov.percent_complete || 0) / 100);
                const costAligned = sov.cost_aligned_to_date || 0;
                const coverage = earned > 0 ? (costAligned / earned) * 100 : 0;
                
                return (
                  <tr key={sov.id} className="border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3">
                      {editingCell?.sovId === sov.id && editingCell.field === 'sov_code' ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, sov)}
                          autoFocus
                          className="h-7 text-xs bg-zinc-950 border-amber-500"
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(sov.id, 'sov_code', sov.sov_code)}
                          className="text-white font-mono text-xs hover:text-amber-400 transition-colors"
                        >
                          {sov.sov_code}
                        </button>
                      )}
                    </td>
                    <td className="p-3">
                      {editingCell?.sovId === sov.id && editingCell.field === 'description' ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, sov)}
                          autoFocus
                          className="h-7 text-xs bg-zinc-950 border-amber-500"
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(sov.id, 'description', sov.description)}
                          className="text-white text-xs text-left hover:text-amber-400 transition-colors w-full"
                        >
                          {sov.description}
                        </button>
                      )}
                    </td>
                    <td className="p-3">
                      {editingCell?.sovId === sov.id && editingCell.field === 'sov_category' ? (
                        <Select 
                          value={editValue} 
                          onValueChange={(val) => {
                            setEditValue(val);
                            setTimeout(() => {
                              onUpdate(sov.id, { sov_category: val });
                              setEditingCell(null);
                            }, 50);
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs border-amber-500">
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
                      ) : (
                        <button
                          onClick={() => startEdit(sov.id, 'sov_category', sov.sov_category)}
                          className="text-zinc-400 text-xs capitalize hover:text-amber-400 transition-colors"
                        >
                          {sov.sov_category}
                        </button>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {editingCell?.sovId === sov.id && editingCell.field === 'scheduled_value' ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, sov)}
                          autoFocus
                          className="h-7 text-xs text-right bg-zinc-950 border-amber-500"
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(sov.id, 'scheduled_value', sov.scheduled_value)}
                          className="text-white text-xs font-mono hover:text-amber-400 transition-colors"
                        >
                          {formatCurrency(sov.scheduled_value)}
                        </button>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {editingCell?.sovId === sov.id && editingCell.field === 'percent_complete' ? (
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveEdit(sov)}
                          onKeyDown={(e) => handleKeyDown(e, sov)}
                          autoFocus
                          className="h-7 text-xs text-right bg-zinc-950 border-amber-500 w-16"
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(sov.id, 'percent_complete', sov.percent_complete)}
                          className="text-white text-xs font-mono hover:text-amber-400 transition-colors"
                        >
                          {(sov.percent_complete || 0).toFixed(1)}%
                        </button>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <span className={`text-xs font-mono ${coverage < 95 ? 'text-amber-400' : 'text-white'}`}>
                        {formatCurrency(earned)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-white text-xs font-mono">
                        {formatCurrency(sov.billed_to_date)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`text-xs font-mono ${coverage < 95 ? 'text-red-400' : 'text-green-400'}`}>
                          {formatCurrency(costAligned)}
                        </span>
                        {coverage < 95 && earned > 0 && (
                          <span className="text-[10px] text-amber-400">
                            {coverage.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </td>
                    {canEdit && (
                      <td className="p-3">
                        {editingCell?.sovId === sov.id ? (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => saveEdit(sov)}>
                              <Save size={12} className="text-green-400" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}>
                              <X size={12} className="text-zinc-400" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onDelete(sov.id)}
                            className="h-6 w-6 text-zinc-500 hover:text-red-400"
                          >
                            <Trash2 size={12} />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}

              {newRow && (
                <tr className="border-b-2 border-amber-500 bg-amber-500/5">
                  <td className="p-3">
                    <Input
                      value={newRow.sov_code}
                      onChange={(e) => setNewRow({ ...newRow, sov_code: e.target.value })}
                      placeholder="Code"
                      className="h-7 text-xs bg-zinc-950 border-amber-500"
                    />
                  </td>
                  <td className="p-3">
                    <Input
                      value={newRow.description}
                      onChange={(e) => setNewRow({ ...newRow, description: e.target.value })}
                      placeholder="Description"
                      className="h-7 text-xs bg-zinc-950 border-amber-500"
                    />
                  </td>
                  <td className="p-3">
                    <Select value={newRow.sov_category} onValueChange={(val) => setNewRow({ ...newRow, sov_category: val })}>
                      <SelectTrigger className="h-7 text-xs border-zinc-700">
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
                  </td>
                  <td className="p-3">
                    <Input
                      type="number"
                      step="0.01"
                      value={newRow.scheduled_value}
                      onChange={(e) => setNewRow({ ...newRow, scheduled_value: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="h-7 text-xs text-right bg-zinc-950 border-amber-500"
                    />
                  </td>
                  <td colSpan={4} className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" onClick={saveNewRow} className="bg-green-500 hover:bg-green-600 text-white text-xs">
                        <Save size={12} className="mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setNewRow(null)} className="border-zinc-700 text-xs">
                        <X size={12} className="mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Totals Row */}
              <tr className="bg-zinc-950 border-t-2 border-zinc-700 font-bold">
                <td colSpan={3} className="p-3 text-zinc-300 text-xs uppercase">
                  Totals
                  {sovMismatch && (
                    <span className="ml-2 text-amber-400 font-normal">
                      (Contract: {formatCurrency(baseContract)})
                    </span>
                  )}
                </td>
                <td className={`p-3 text-right text-xs font-mono ${sovMismatch ? 'text-amber-400' : 'text-white'}`}>
                  {formatCurrency(totals.scheduled_value)}
                </td>
                <td className="p-3"></td>
                <td className="p-3 text-right text-white text-xs font-mono">{formatCurrency(totals.earned_to_date)}</td>
                <td className="p-3 text-right text-white text-xs font-mono">{formatCurrency(totals.billed_to_date)}</td>
                <td className="p-3"></td>
                {canEdit && <td></td>}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}