import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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
import { Plus, Trash2, Copy } from 'lucide-react';

export default function BulkRFICreator({ open, onOpenChange, projectId }) {
  const [rfis, setRfis] = useState([{
    subject: '',
    question: '',
    priority: 'medium',
    due_date: ''
  }]);

  const queryClient = useQueryClient();

  const { data: existingRFIs = [] } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list(),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (rfisData) => {
      return Promise.all(rfisData.map(rfi => base44.entities.RFI.create(rfi)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      onOpenChange(false);
      setRfis([{ subject: '', question: '', priority: 'medium', due_date: '' }]);
    },
  });

  const getNextRFINumber = () => {
    const projectRFIs = existingRFIs.filter(r => r.project_id === projectId);
    const maxNumber = projectRFIs.reduce((max, r) => Math.max(max, r.rfi_number || 0), 0);
    return maxNumber + 1;
  };

  const addRFI = () => {
    setRfis([...rfis, { subject: '', question: '', priority: 'medium', due_date: '' }]);
  };

  const removeRFI = (index) => {
    setRfis(rfis.filter((_, i) => i !== index));
  };

  const duplicateRFI = (index) => {
    const rfi = rfis[index];
    setRfis([...rfis.slice(0, index + 1), { ...rfi }, ...rfis.slice(index + 1)]);
  };

  const updateRFI = (index, field, value) => {
    const updated = [...rfis];
    updated[index][field] = value;
    setRfis(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let nextNumber = getNextRFINumber();
    const rfisData = rfis
      .filter(rfi => rfi.subject && rfi.question)
      .map(rfi => ({
        ...rfi,
        project_id: projectId,
        rfi_number: nextNumber++,
        status: 'draft',
        submitted_date: new Date().toISOString().split('T')[0]
      }));
    
    if (rfisData.length > 0) {
      bulkCreateMutation.mutate(rfisData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Create RFIs</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {rfis.map((rfi, index) => (
              <div key={index} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-amber-400">RFI #{index + 1}</span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => duplicateRFI(index)}
                      className="h-8 w-8 p-0"
                    >
                      <Copy size={14} />
                    </Button>
                    {rfis.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeRFI(index)}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <Input
                    value={rfi.subject}
                    onChange={(e) => updateRFI(index, 'subject', e.target.value)}
                    placeholder="RFI subject"
                    required
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Question *</Label>
                  <Textarea
                    value={rfi.question}
                    onChange={(e) => updateRFI(index, 'question', e.target.value)}
                    rows={2}
                    placeholder="RFI question"
                    required
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select 
                      value={rfi.priority} 
                      onValueChange={(v) => updateRFI(index, 'priority', v)}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={rfi.due_date}
                      onChange={(e) => updateRFI(index, 'due_date', e.target.value)}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addRFI}
            className="w-full border-zinc-700"
          >
            <Plus size={16} className="mr-2" />
            Add Another RFI
          </Button>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-zinc-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={bulkCreateMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {bulkCreateMutation.isPending ? 'Creating...' : `Create ${rfis.filter(r => r.subject && r.question).length} RFIs`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}