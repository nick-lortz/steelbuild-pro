import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Loader2 } from 'lucide-react';

export default function QuickAddDrawingSet({ projects, open, onOpenChange, onSuccess }) {
  const [formData, setFormData] = useState({
    project_id: '',
    set_name: '',
    set_number: '',
  });
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    
    try {
      await apiClient.entities.DrawingSet.create({
        ...formData,
        current_revision: 'Rev 0',
        status: 'IFA',
        discipline: 'structural',
        sheet_count: 0,
        ai_review_status: 'pending',
      });

      setFormData({ project_id: '', set_name: '', set_number: '' });
      onSuccess();
    } catch (error) {
      console.error('Failed to create drawing set:', error);
      alert('Failed to create drawing set');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Quick Add Drawing Set</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Project *</Label>
            <Select 
              value={formData.project_id} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, project_id: v }))}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_number} - {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Set Number *</Label>
            <Input
              value={formData.set_number}
              onChange={(e) => setFormData(prev => ({ ...prev, set_number: e.target.value }))}
              placeholder="e.g., S-100"
              required
              className="bg-zinc-800 border-zinc-700 font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label>Set Name *</Label>
            <Input
              value={formData.set_name}
              onChange={(e) => setFormData(prev => ({ ...prev, set_name: e.target.value }))}
              placeholder="e.g., Structural Steel - Level 1"
              required
              className="bg-zinc-800 border-zinc-700"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-zinc-700"
              disabled={creating}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={creating}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {creating ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Set'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}