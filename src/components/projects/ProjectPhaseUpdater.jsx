import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiClient } from '@/api/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const PHASES = [
  { value: 'planning', label: 'Planning', color: 'bg-gray-600' },
  { value: 'detailing', label: 'Detailing', color: 'bg-blue-600' },
  { value: 'fabrication', label: 'Fabrication', color: 'bg-purple-600' },
  { value: 'erection', label: 'Erection', color: 'bg-orange-600' },
  { value: 'closeout', label: 'Closeout', color: 'bg-green-600' }
];

export default function ProjectPhaseUpdater({ project, compact = false }) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (/** @type {string} */ phase) => apiClient.entities.Project.update(project.id, { phase }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      toast.success('Phase updated');
    },
    onError: () => {
      toast.error('Failed to update phase');
    }
  });

  if (compact) {
    return (
      <Select 
        value={project.phase || 'planning'} 
        onValueChange={(val) => updateMutation.mutate(val)}
        disabled={updateMutation.isPending}
      >
        <SelectTrigger className="w-32 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PHASES.map(phase => (
            <SelectItem key={phase.value} value={phase.value}>
              {phase.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const currentPhase = PHASES.find(p => p.value === (project.phase || 'planning'));

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Phase:</span>
      <Select 
        value={project.phase || 'planning'} 
        onValueChange={(val) => updateMutation.mutate(val)}
        disabled={updateMutation.isPending}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PHASES.map(phase => (
            <SelectItem key={phase.value} value={phase.value}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${phase.color}`} />
                {phase.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {currentPhase && (
        <Badge className={currentPhase.color}>
          {currentPhase.label}
        </Badge>
      )}
    </div>
  );
}
