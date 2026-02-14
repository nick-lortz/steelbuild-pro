import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle, Clock, Zap, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/notifications';

export default function AITaskPrioritizer({ projectId, tasks, open, onClose }) {
  const queryClient = useQueryClient();
  const [analysis, setAnalysis] = useState(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('aiTaskPrioritization', { 
        project_id: projectId,
        task_ids: tasks.map(t => t.id)
      });
      return data;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      toast.success('Task analysis complete');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to analyze tasks');
    }
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const updates = analysis.prioritized_tasks.map((pt, idx) => ({
        id: pt.task_id,
        priority_score: idx + 1,
        notes: pt.reasoning
      }));

      await Promise.all(
        updates.map(u => base44.entities.Task.update(u.id, { 
          notes: `${u.notes}\n\n---\nAI Priority: ${u.priority_score}` 
        }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task priorities applied');
      onClose();
      setAnalysis(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to apply priorities');
    }
  });

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      low: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    return colors[severity] || 'bg-zinc-700';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            AI Task Prioritization
          </DialogTitle>
        </DialogHeader>

        {!analysis ? (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded">
              <p className="text-sm text-zinc-400 mb-2">
                Analyzing <span className="text-white font-semibold">{tasks.length}</span> tasks
              </p>
              <p className="text-xs text-zinc-500">
                AI will evaluate deadlines, dependencies, resource constraints, and critical path to suggest optimal task order.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="mr-2" />
                    Analyze Tasks
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-4 bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/20 rounded">
              <h3 className="font-semibold text-white mb-2">Priority Analysis</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold text-red-400">{analysis.bottlenecks?.length || 0}</p>
                  <p className="text-xs text-zinc-500">Bottlenecks</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400">{analysis.critical_tasks?.length || 0}</p>
                  <p className="text-xs text-zinc-500">Critical</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{analysis.optimizations?.length || 0}</p>
                  <p className="text-xs text-zinc-500">Optimizations</p>
                </div>
              </div>
            </div>

            {/* Bottlenecks */}
            {analysis.bottlenecks && analysis.bottlenecks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-400" />
                  Identified Bottlenecks
                </h4>
                <div className="space-y-2">
                  {analysis.bottlenecks.map((bottleneck, idx) => (
                    <div key={idx} className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                      <p className="text-sm font-medium text-red-400 mb-1">{bottleneck.task_name}</p>
                      <p className="text-xs text-zinc-400">{bottleneck.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prioritized Tasks */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Recommended Task Order
              </h4>
              <div className="space-y-1">
                {analysis.prioritized_tasks?.slice(0, 10).map((task, idx) => (
                  <div key={idx} className="p-3 bg-zinc-950 border border-zinc-800 rounded hover:border-zinc-700 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-amber-400">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-white truncate">{task.task_name}</p>
                          <Badge variant="outline" className={getSeverityColor(task.severity)}>
                            {task.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-400">{task.reasoning}</p>
                        {task.deadline && (
                          <div className="flex items-center gap-1 mt-1">
                            <Clock size={10} className="text-zinc-500" />
                            <p className="text-[10px] text-zinc-500">Due: {task.deadline}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-zinc-700"
              >
                Close
              </Button>
              <Button
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending}
                className="bg-green-500 hover:bg-green-600 text-white font-bold"
              >
                {applyMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Zap size={16} className="mr-2" />
                    Apply Recommendations
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}