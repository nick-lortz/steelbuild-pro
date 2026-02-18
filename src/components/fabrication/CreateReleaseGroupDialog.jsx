import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Package } from 'lucide-react';

export default function CreateReleaseGroupDialog({ projectId, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    target_release_date: '',
    sequence_priority: 1
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FabReleaseGroup.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fab-release-groups', projectId] });
      onClose();
      setFormData({ name: '', target_release_date: '', sequence_priority: 1 });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      project_id: projectId,
      ...formData,
      status: 'draft',
      readiness_score: 0
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Release Group</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Group Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Lot 1 - Grid A-C"
              required
            />
          </div>

          <div>
            <Label>Target Release Date</Label>
            <Input
              type="date"
              value={formData.target_release_date}
              onChange={(e) => setFormData({ ...formData, target_release_date: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Sequence Priority</Label>
            <Input
              type="number"
              min="1"
              value={formData.sequence_priority}
              onChange={(e) => setFormData({ ...formData, sequence_priority: parseInt(e.target.value) })}
            />
            <p className="text-xs text-zinc-500 mt-1">Lower number = higher priority</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}