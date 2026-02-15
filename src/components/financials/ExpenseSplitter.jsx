import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Split, AlertCircle, X } from 'lucide-react';
import HierarchicalCostCodeSelector from './HierarchicalCostCodeSelector';

export default function ExpenseSplitter({ 
  expense, 
  sovItems, 
  costCodes, 
  tasks = [],
  phases = ['detailing', 'fabrication', 'delivery', 'erection', 'closeout'],
  onSave, 
  onClose 
}) {
  const [splits, setSplits] = useState([
    {
      sov_code: '',
      cost_code_id: '',
      task_id: '',
      phase: '',
      amount: expense.amount,
      percentage: 100,
      description: ''
    }
  ]);

  const addSplit = () => {
    setSplits([...splits, {
      sov_code: '',
      cost_code_id: '',
      task_id: '',
      phase: '',
      amount: 0,
      percentage: 0,
      description: ''
    }]);
  };

  const removeSplit = (index) => {
    setSplits(splits.filter((_, i) => i !== index));
  };

  const updateSplit = (index, field, value) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    
    if (field === 'percentage') {
      newSplits[index].amount = (expense.amount * parseFloat(value || 0)) / 100;
    } else if (field === 'amount') {
      newSplits[index].percentage = (parseFloat(value || 0) / expense.amount) * 100;
    }
    
    setSplits(newSplits);
  };

  const totalAmount = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  const totalPercentage = splits.reduce((sum, s) => sum + (parseFloat(s.percentage) || 0), 0);
  const isValid = Math.abs(totalAmount - expense.amount) < 0.01;

  const handleSave = async () => {
    if (!isValid) return;
    await onSave(splits);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white flex items-center gap-2">
              <Split size={18} />
              Split Expense
            </DialogTitle>
            <Badge className="font-mono text-sm">
              ${expense.amount?.toFixed(2)}
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-2">{expense.description}</p>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {splits.map((split, index) => (
            <div key={index} className="p-4 bg-zinc-950 border border-zinc-800 rounded space-y-3">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-xs">Split {index + 1}</Badge>
                {splits.length > 1 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeSplit(index)}
                    className="h-6 w-6 text-red-400"
                  >
                    <Trash2 size={12} />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">SOV Line</label>
                  <Select
                    value={split.sov_code}
                    onValueChange={(val) => updateSplit(index, 'sov_code', val)}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white text-xs">
                      <SelectValue placeholder="Select SOV..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {sovItems.map(sov => (
                        <SelectItem key={sov.sov_code} value={sov.sov_code} className="text-white text-xs">
                          {sov.sov_code} - {sov.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Cost Code</label>
                  <HierarchicalCostCodeSelector
                    costCodes={costCodes}
                    value={split.cost_code_id}
                    onChange={(val) => updateSplit(index, 'cost_code_id', val)}
                    className="bg-zinc-900 border-zinc-700 text-xs"
                  />
                </div>

                {tasks.length > 0 && (
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Task (Optional)</label>
                    <Select
                      value={split.task_id}
                      onValueChange={(val) => updateSplit(index, 'task_id', val)}
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white text-xs">
                        <SelectValue placeholder="Select task..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {tasks.map(task => (
                          <SelectItem key={task.id} value={task.id} className="text-white text-xs">
                            {task.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Phase (Optional)</label>
                  <Select
                    value={split.phase}
                    onValueChange={(val) => updateSplit(index, 'phase', val)}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white text-xs">
                      <SelectValue placeholder="Select phase..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {phases.map(phase => (
                        <SelectItem key={phase} value={phase} className="text-white text-xs capitalize">
                          {phase}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Amount ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={split.amount}
                    onChange={(e) => updateSplit(index, 'amount', e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Percentage (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={split.percentage.toFixed(2)}
                    onChange={(e) => updateSplit(index, 'percentage', e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Description</label>
                <Input
                  value={split.description}
                  onChange={(e) => updateSplit(index, 'description', e.target.value)}
                  placeholder="Why this split?"
                  className="bg-zinc-900 border-zinc-700 text-white text-xs"
                />
              </div>
            </div>
          ))}

          <Button
            onClick={addSplit}
            variant="outline"
            className="w-full border-zinc-700 text-xs"
          >
            <Plus size={14} className="mr-1" />
            Add Split
          </Button>

          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-zinc-400">Total Amount:</span>
              <span className={`font-mono font-bold ${isValid ? 'text-green-400' : 'text-red-400'}`}>
                ${totalAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Total Percentage:</span>
              <span className={`font-mono font-bold ${isValid ? 'text-green-400' : 'text-red-400'}`}>
                {totalPercentage.toFixed(2)}%
              </span>
            </div>
          </div>

          {!isValid && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded flex items-center gap-2">
              <AlertCircle size={16} className="text-red-400" />
              <p className="text-xs text-red-400">
                Total must equal ${expense.amount.toFixed(2)} (currently ${totalAmount.toFixed(2)})
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isValid}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Save Splits
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}