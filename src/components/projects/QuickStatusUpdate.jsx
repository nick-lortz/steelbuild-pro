import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/notifications';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle, Clock, FileCheck, Pause, XCircle } from 'lucide-react';

const statusConfig = {
  bidding: { label: 'Bidding', icon: FileCheck, color: 'text-blue-400' },
  awarded: { label: 'Awarded', icon: CheckCircle, color: 'text-green-400' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-amber-400' },
  on_hold: { label: 'On Hold', icon: Pause, color: 'text-orange-400' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'text-green-500' },
  closed: { label: 'Closed', icon: XCircle, color: 'text-zinc-500' }
};

export default function QuickStatusUpdate({ project, compact = false }) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Project.update(id, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(`Status updated to ${statusConfig[variables.status].label}`);
    },
    onError: (error) => {
      toast.error('Failed to update status');
      console.error(error);
    }
  });

  const handleStatusChange = (newStatus) => {
    if (newStatus === project.status) return;
    updateMutation.mutate({ id: project.id, status: newStatus });
  };

  const CurrentIcon = statusConfig[project.status]?.icon || AlertCircle;

  if (compact) {
    return (
      <Select 
        value={project.status} 
        onValueChange={handleStatusChange}
        disabled={updateMutation.isPending}
      >
        <SelectTrigger className="h-8 w-[140px] bg-zinc-800 border-zinc-700">
          <div className="flex items-center gap-1.5">
            <CurrentIcon size={14} className={statusConfig[project.status]?.color} />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <Icon size={14} className={config.color} />
                  {config.label}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-400">Project Status</label>
      <Select 
        value={project.status} 
        onValueChange={handleStatusChange}
        disabled={updateMutation.isPending}
      >
        <SelectTrigger className="bg-zinc-800 border-zinc-700">
          <div className="flex items-center gap-2">
            <CurrentIcon size={16} className={statusConfig[project.status]?.color} />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <Icon size={16} className={config.color} />
                  {config.label}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}