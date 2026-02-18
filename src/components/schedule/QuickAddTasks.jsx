import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, X } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { addDays, format } from 'date-fns';

const TEMPLATES = {
  structural_steel: [
    { type: 'FAB_COMPLETE', name: 'Fabrication Complete', offset_days: 0, phase: 'fabrication' },
    { type: 'SHIP_RELEASE', name: 'Ship Release', offset_days: 2, phase: 'fabrication' },
    { type: 'ONSITE_DELIVERY', name: 'On-Site Delivery', offset_days: 10, phase: 'delivery' },
    { type: 'INSTALL_READY', name: 'Install Ready', offset_days: 13, phase: 'erection' },
    { type: 'BOLT_UP', name: 'Bolt-Up', offset_days: 14, phase: 'erection' },
    { type: 'FINAL_WELD', name: 'Final Weld', offset_days: 16, phase: 'erection' },
    { type: 'PUNCHLIST', name: 'Punchlist', offset_days: 18, phase: 'closeout' }
  ]
};

export default function QuickAddTasks({ projectId, onClose }) {
  const [erectionArea, setErectionArea] = useState('');
  const [startingSequence, setStartingSequence] = useState(100);
  const [baseDate, setBaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [template, setTemplate] = useState('structural_steel');
  const queryClient = useQueryClient();

  const createBulkMutation = useMutation({
    mutationFn: async (tasks) => {
      return await base44.entities.Task.bulkCreate(tasks);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Created ${data.length} tasks`);
      if (onClose) onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create tasks');
    }
  });

  const handleGenerate = () => {
    if (!erectionArea) {
      toast.error('Enter erection area');
      return;
    }

    const templates = TEMPLATES[template];
    const tasks = templates.map((tmpl, idx) => ({
      project_id: projectId,
      name: `${erectionArea} - ${tmpl.name}`,
      type: tmpl.type,
      phase: tmpl.phase,
      erection_area: erectionArea,
      install_sequence_number: startingSequence + idx,
      start_date: format(addDays(new Date(baseDate), tmpl.offset_days), 'yyyy-MM-dd'),
      end_date: format(addDays(new Date(baseDate), tmpl.offset_days + 1), 'yyyy-MM-dd'),
      status: 'not_started',
      procurement_status: 'NOT_ORDERED'
    }));

    createBulkMutation.mutate(tasks);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Add Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs text-zinc-500 mb-2 block">Erection Area</label>
          <Input
            value={erectionArea}
            onChange={(e) => setErectionArea(e.target.value)}
            placeholder="e.g., Grid A3-A6 / Level 2"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500 mb-2 block">Starting Sequence</label>
          <Input
            type="number"
            value={startingSequence}
            onChange={(e) => setStartingSequence(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500 mb-2 block">Base Date</label>
          <Input
            type="date"
            value={baseDate}
            onChange={(e) => setBaseDate(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500 mb-2 block">Template</label>
          <Select value={template} onValueChange={setTemplate}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="structural_steel">Structural Steel Typical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-500 mb-2">Preview ({TEMPLATES[template].length} tasks)</div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {TEMPLATES[template].map((tmpl, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded bg-zinc-900/50 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {startingSequence + idx}
                  </Badge>
                  <span className="text-white">{tmpl.name}</span>
                </div>
                <span className="text-zinc-500">{tmpl.phase}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              <X size={16} className="mr-2" />
              Cancel
            </Button>
          )}
          <Button onClick={handleGenerate} disabled={createBulkMutation.isPending}>
            <Plus size={16} className="mr-2" />
            Create {TEMPLATES[template].length} Tasks
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}