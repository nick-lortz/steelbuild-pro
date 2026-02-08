import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Edit3, Loader2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function BulkEditDrawings({ drawingSets, projects, open, onOpenChange }) {
  const drawings = drawingSets; // Alias for compatibility
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('status');
  const [newValue, setNewValue] = useState('');
  
  const queryClient = useQueryClient();

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates) => {
      return Promise.all(
        updates.map(({ id, data }) => apiClient.entities.DrawingSet.update(id, data))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawings'] });
      setSelectedIds([]);
      onOpenChange(false);
    },
  });

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(drawings.map(d => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectDrawing = (id, checked) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleBulkUpdate = () => {
    if (selectedIds.length === 0 || !newValue) return;

    const updates = selectedIds.map(id => ({
      id,
      data: { [bulkAction]: newValue }
    }));

    bulkUpdateMutation.mutate(updates);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 size={18} />
            Bulk Edit Drawings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selection Summary */}
          <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.length === drawings.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-zinc-400">Select All</span>
            </div>
            <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              {selectedIds.length} selected
            </Badge>
          </div>

          {/* Drawing List */}
          <div className="max-h-64 overflow-y-auto space-y-2 border border-zinc-800 rounded-lg p-3">
            {drawings.map(drawing => (
              <div 
                key={drawing.id}
                className="flex items-center gap-3 p-2 hover:bg-zinc-800/50 rounded"
              >
                <Checkbox
                  checked={selectedIds.includes(drawing.id)}
                  onCheckedChange={(checked) => handleSelectDrawing(drawing.id, checked)}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{drawing.set_name}</p>
                  <p className="text-xs text-zinc-500">
                    {drawing.set_number} • Rev {drawing.current_revision}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {drawing.status}
                </Badge>
              </div>
            ))}
          </div>

          {/* Bulk Action Selection */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Action</Label>
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">Update Status</SelectItem>
                    <SelectItem value="discipline">Change Discipline</SelectItem>
                    <SelectItem value="ifa_date">IFA Date</SelectItem>
                    <SelectItem value="bfa_date">BFA Date</SelectItem>
                    <SelectItem value="bfs_date">BFS Date</SelectItem>
                    <SelectItem value="released_for_fab_date">Released Date</SelectItem>
                    <SelectItem value="due_date">Due Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>New Value</Label>
                {bulkAction === 'status' ? (
                  <Select value={newValue} onValueChange={setNewValue}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IFA">IFA - Issued for Approval</SelectItem>
                      <SelectItem value="BFA">BFA - Back from Approval</SelectItem>
                      <SelectItem value="BFS">BFS - Back from Shop</SelectItem>
                      <SelectItem value="FFF">FFF - Fit for Fabrication</SelectItem>
                      <SelectItem value="As-Built">As-Built</SelectItem>
                    </SelectContent>
                  </Select>
                ) : bulkAction === 'discipline' ? (
                  <Select value={newValue} onValueChange={setNewValue}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="Select discipline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="structural">Structural</SelectItem>
                      <SelectItem value="misc_metals">Misc Metals</SelectItem>
                      <SelectItem value="stairs">Stairs</SelectItem>
                      <SelectItem value="handrails">Handrails</SelectItem>
                      <SelectItem value="connections">Connections</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type="date"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkUpdate}
              disabled={selectedIds.length === 0 || !newValue || bulkUpdateMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {bulkUpdateMutation.isPending ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                `Update ${selectedIds.length} Drawing${selectedIds.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}