import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { TrendingUp, Calendar } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function ProgressWidget({ projectId }) {
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => apiClient.entities.Task.filter({ project_id: projectId })
  });

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const avgProgress = tasks.length > 0
    ? Math.round(tasks.reduce((sum, t) => sum + (t.progress_percent || 0), 0) / tasks.length)
    : 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-amber-500" />
        <h3 className="text-sm font-semibold text-white">Project Progress</h3>
      </div>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-400">Tasks Complete</span>
            <span className="text-white font-medium">{completedTasks} / {totalTasks}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-400">Average Progress</span>
            <span className="text-white font-medium">{avgProgress}%</span>
          </div>
          <Progress value={avgProgress} className="h-2" />
        </div>
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="bg-zinc-800/50 rounded p-2">
            <div className="text-[10px] text-zinc-500 uppercase">In Progress</div>
            <div className="text-lg font-bold text-blue-400">
              {tasks.filter(t => t.status === 'in_progress').length}
            </div>
          </div>
          <div className="bg-zinc-800/50 rounded p-2">
            <div className="text-[10px] text-zinc-500 uppercase">Blocked</div>
            <div className="text-lg font-bold text-red-400">
              {tasks.filter(t => t.status === 'blocked').length}
            </div>
          </div>
          <div className="bg-zinc-800/50 rounded p-2">
            <div className="text-[10px] text-zinc-500 uppercase">On Hold</div>
            <div className="text-lg font-bold text-amber-400">
              {tasks.filter(t => t.status === 'on_hold').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}