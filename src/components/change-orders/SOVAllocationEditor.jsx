import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, AlertTriangle, CheckCircle2, LayoutList } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

/**
 * Inline SOV allocation editor used inside ChangeOrderDetail.
 * Lets users link/unlink SOV items and set amounts + reasons directly,
 * without needing to open the Edit form.
 */
export default function SOVAllocationEditor({ changeOrder, sovItems, onSaved }) {
  const queryClient = useQueryClient();
  const [allocations, setAllocations] = useState(changeOrder.sov_allocations || []);
  const [dirty, setDirty] = useState(false);

  const costImpact = changeOrder.cost_impact || 0;
  const totalAllocated = allocations.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
  const remaining = costImpact - totalAllocated;
  const mismatch = costImpact !== 0 && Math.abs(remaining) > 0.01;

  const saveMutation = useMutation({
    mutationFn: () =>
      base44.entities.ChangeOrder.update(changeOrder.id, {
        sov_allocations: allocations.map(a => ({ ...a, amount: parseFloat(a.amount) || 0 }))
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['changeOrders'] });
      setDirty(false);
      toast.success('SOV allocations saved');
      onSaved?.();
    }
  });

  const addLine = () => {
    setAllocations(prev => [...prev, { sov_item_id: '', amount: '', description: '' }]);
    setDirty(true);
  };

  const updateLine = (idx, field, value) => {
    setAllocations(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
    setDirty(true);
  };

  const removeLine = (idx) => {
    setAllocations(prev => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const autoSplit = () => {
    if (allocations.length === 0 || costImpact === 0) return;
    const even = (costImpact / allocations.length).toFixed(2);
    setAllocations(prev => prev.map(a => ({ ...a, amount: even })));
    setDirty(true);
  };

  const availableSovItems = sovItems.filter(
    s => !allocations.some((a, _) => a.sov_item_id === s.id)
  );

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <LayoutList size={15} className="text-amber-400" />
            SOV Allocations
            {allocations.length > 0 && (
              <Badge variant="outline" className="text-[10px] ml-1">
                {allocations.length} line{allocations.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {allocations.length > 1 && costImpact !== 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={autoSplit}
                className="text-xs text-zinc-400 hover:text-amber-400 h-7 px-2"
              >
                Split Evenly
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLine}
              className="border-zinc-700 h-7 px-2 text-xs"
            >
              <Plus size={12} className="mr-1" />
              Add Line
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Unallocated cost banner */}
        {costImpact !== 0 && allocations.length === 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded">
            <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-300">
              This CO has a <strong>${Math.abs(costImpact).toLocaleString()}</strong> cost impact that hasn't been allocated to any SOV line items yet.
              Add lines above to break it down for billing tracking.
            </p>
          </div>
        )}

        {allocations.length === 0 && costImpact === 0 && (
          <p className="text-xs text-zinc-600 text-center py-4">No SOV allocations. Add a line to link cost impact to SOV billing lines.</p>
        )}

        {allocations.map((alloc, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-zinc-900/50 p-3 rounded">
            <div className="col-span-5 space-y-1">
              <p className="text-[10px] text-zinc-500 uppercase">SOV Line Item</p>
              <Select
                value={alloc.sov_item_id}
                onValueChange={(v) => updateLine(idx, 'sov_item_id', v)}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-8 text-xs">
                  <SelectValue placeholder="Select SOV line" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {/* Show currently selected item even if not in available list */}
                  {alloc.sov_item_id && !availableSovItems.find(s => s.id === alloc.sov_item_id) && (() => {
                    const existing = sovItems.find(s => s.id === alloc.sov_item_id);
                    return existing ? (
                      <SelectItem key={existing.id} value={existing.id}>
                        {existing.sov_code} – {existing.description?.substring(0, 35)}
                      </SelectItem>
                    ) : null;
                  })()}
                  {availableSovItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.sov_code} – {item.description?.substring(0, 35)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <p className="text-[10px] text-zinc-500 uppercase">Amount ($)</p>
              <Input
                type="number"
                step="0.01"
                value={alloc.amount}
                onChange={(e) => updateLine(idx, 'amount', e.target.value)}
                placeholder="0.00"
                className="bg-zinc-800 border-zinc-700 h-8 text-xs"
              />
            </div>
            <div className="col-span-4 space-y-1">
              <p className="text-[10px] text-zinc-500 uppercase">Reason</p>
              <Input
                value={alloc.description}
                onChange={(e) => updateLine(idx, 'description', e.target.value)}
                placeholder="Why this line is affected"
                className="bg-zinc-800 border-zinc-700 h-8 text-xs"
              />
            </div>
            <div className="col-span-1 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeLine(idx)}
                className="h-8 w-8 text-red-400 hover:text-red-300"
              >
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        ))}

        {allocations.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-zinc-800">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">CO Cost Impact:</span>
              <span className="font-mono text-zinc-300">${Math.abs(costImpact).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Total Allocated:</span>
              <span className={`font-mono font-bold ${mismatch ? 'text-amber-400' : 'text-green-400'}`}>
                ${totalAllocated.toLocaleString()}
              </span>
            </div>
            {mismatch && (
              <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded">
                <AlertTriangle size={12} className="text-amber-400 shrink-0" />
                <p className="text-[10px] text-amber-300">
                  ${Math.abs(remaining).toLocaleString()} {remaining > 0 ? 'unallocated' : 'over-allocated'}
                </p>
              </div>
            )}
            {!mismatch && costImpact !== 0 && (
              <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded">
                <CheckCircle2 size={12} className="text-green-400 shrink-0" />
                <p className="text-[10px] text-green-300">Fully allocated</p>
              </div>
            )}
          </div>
        )}

        {dirty && (
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setAllocations(changeOrder.sov_allocations || []); setDirty(false); }}
              className="text-zinc-500 h-8 text-xs"
            >
              Discard
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-8 text-xs"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save Allocations'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}