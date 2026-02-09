import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/notifications';
import { Loader2, Wrench, Calendar } from 'lucide-react';

export default function BulkDetailingActions({ improvement, projectId, onClose }) {
  const queryClient = useQueryClient();
  const [selectedDrawingSets, setSelectedDrawingSets] = useState([]);
  const [formData, setFormData] = useState({
    assigned_to: '',
    due_date: '',
    title: improvement.title,
    required_change: improvement.recommended_change,
    blocking: false,
    blocks_rff: false,
    phase_impacted: 'detailing'
  });

  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawing-sets', projectId],
    queryFn: () => base44.entities.DrawingSet.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const createActionsMutation = useMutation({
    mutationFn: async () => {
      const actions = selectedDrawingSets.map(setId => ({
        project_id: projectId,
        source_detail_improvement_id: improvement.id,
        drawing_set_id: setId,
        detail_ref: improvement.affected_detail_refs?.[0] || '',
        assigned_to: formData.assigned_to,
        title: formData.title,
        required_change: formData.required_change,
        due_date: formData.due_date,
        blocking: formData.blocking,
        blocks_rff: formData.blocks_rff,
        phase_impacted: formData.phase_impacted,
        status: 'open',
        verification_required: true
      }));

      return base44.entities.DetailingAction.bulkCreate(actions);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['detailing-actions'] });
      toast.success(`${data.length} detailing actions created`);
      if (onClose) onClose();
    },
    onError: () => {
      toast.error('Failed to create actions');
    }
  });

  const toggleSet = (setId) => {
    setSelectedDrawingSets(prev =>
      prev.includes(setId) ? prev.filter(id => id !== setId) : [...prev, setId]
    );
  };

  const canCreate = selectedDrawingSets.length > 0 && formData.assigned_to && formData.due_date;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench size={18} />
            Create Detailing Actions
          </CardTitle>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            {selectedDrawingSets.length} sets
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-blue-500/5 border border-blue-500/30 rounded text-xs">
          <div className="font-semibold text-blue-400 mb-1">Source Improvement</div>
          <div className="text-zinc-400">{improvement.title}</div>
        </div>

        <div>
          <Label className="text-xs text-zinc-400 mb-2 block">Select Drawing Sets</Label>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {drawingSets.map(set => (
              <div
                key={set.id}
                className="flex items-center gap-2 p-2 hover:bg-zinc-800/50 rounded cursor-pointer"
                onClick={() => toggleSet(set.id)}
              >
                <Checkbox
                  checked={selectedDrawingSets.includes(set.id)}
                  onCheckedChange={() => toggleSet(set.id)}
                />
                <div className="flex-1">
                  <div className="text-xs text-white">{set.set_name}</div>
                  <div className="text-[10px] text-zinc-500">{set.set_number}</div>
                </div>
                <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">
                  {set.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-zinc-800">
          <div>
            <Label className="text-xs text-zinc-400">Assigned To *</Label>
            <Input
              type="email"
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              placeholder="detailer@company.com"
              className="bg-zinc-800 border-zinc-700"
              required
            />
          </div>

          <div>
            <Label className="text-xs text-zinc-400">Due Date *</Label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="bg-zinc-800 border-zinc-700"
              required
            />
          </div>

          <div>
            <Label className="text-xs text-zinc-400">Phase Impacted</Label>
            <Select 
              value={formData.phase_impacted} 
              onValueChange={(v) => setFormData({ ...formData, phase_impacted: v })}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="detailing">Detailing</SelectItem>
                <SelectItem value="fabrication">Fabrication</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="erection">Erection</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.blocking}
                onCheckedChange={(checked) => setFormData({ ...formData, blocking: checked })}
              />
              <Label className="text-xs text-zinc-300">Blocking</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.blocks_rff}
                onCheckedChange={(checked) => setFormData({ ...formData, blocks_rff: checked })}
              />
              <Label className="text-xs text-zinc-300">Blocks RFF</Label>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-zinc-700"
          >
            Cancel
          </Button>
          <Button
            onClick={() => createActionsMutation.mutate()}
            disabled={!canCreate || createActionsMutation.isPending}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
          >
            {createActionsMutation.isPending && <Loader2 size={16} className="mr-2 animate-spin" />}
            Create {selectedDrawingSets.length} Actions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}