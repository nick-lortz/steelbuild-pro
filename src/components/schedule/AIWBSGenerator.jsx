import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { addDays, format } from 'date-fns';

export default function AIWBSGenerator({ project, open, onClose }) {
  const queryClient = useQueryClient();
  const [scopeDescription, setScopeDescription] = useState(project?.scope_of_work || '');
  const [keyDeliverables, setKeyDeliverables] = useState('');
  const [generatedWBS, setGeneratedWBS] = useState(null);

  if (!project) return null;

  const generateWBSMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateWBS', {
        project_id: project.id,
        project_type: project.structure_anatomy_job_type,
        scope_description: scopeDescription,
        square_footage: project.rough_square_footage,
        key_deliverables: keyDeliverables,
        baseline_shop_hours: project.baseline_shop_hours,
        baseline_field_hours: project.baseline_field_hours
      });
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedWBS(data);
      toast.success('WBS generated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate WBS');
    }
  });

  const createTasksMutation = useMutation({
    mutationFn: async (selectedTasks) => {
      const startDate = project.start_date ? new Date(project.start_date) : new Date();
      let currentDate = new Date(startDate);

      const tasksToCreate = selectedTasks.map((wbsTask, idx) => {
        const taskStartDate = new Date(currentDate);
        const taskEndDate = addDays(taskStartDate, wbsTask.duration_days || 1);
        
        // Move current date forward for next task
        currentDate = new Date(taskEndDate);

        return {
          project_id: project.id,
          name: wbsTask.name,
          phase: wbsTask.phase,
          wbs_code: wbsTask.wbs_code,
          start_date: format(taskStartDate, 'yyyy-MM-dd'),
          end_date: format(taskEndDate, 'yyyy-MM-dd'),
          duration_days: wbsTask.duration_days,
          estimated_hours: wbsTask.estimated_hours || 0,
          status: 'not_started',
          is_milestone: wbsTask.is_milestone || false,
          notes: wbsTask.description
        };
      });

      return await base44.entities.Task.bulkCreate(tasksToCreate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tasks created from WBS');
      onClose();
      setGeneratedWBS(null);
      setScopeDescription('');
      setKeyDeliverables('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create tasks');
    }
  });

  const handleGenerate = () => {
    if (!scopeDescription.trim()) {
      toast.error('Please provide scope description');
      return;
    }
    generateWBSMutation.mutate();
  };

  const handleCreateTasks = () => {
    if (!generatedWBS?.wbs) return;
    createTasksMutation.mutate(generatedWBS.wbs);
  };

  const getPhaseColor = (phase) => {
    const colors = {
      detailing: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      fabrication: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      delivery: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      erection: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      closeout: 'bg-green-500/10 text-green-400 border-green-500/30'
    };
    return colors[phase] || 'bg-zinc-700';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            AI Work Breakdown Structure Generator
          </DialogTitle>
        </DialogHeader>

        {!generatedWBS ? (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded">
              <p className="text-sm text-zinc-400 mb-2">Project: <span className="text-white font-semibold">{project?.name}</span></p>
              <p className="text-sm text-zinc-400">Type: <span className="text-white">{project?.structure_anatomy_job_type || 'Not specified'}</span></p>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block">
                Scope Description *
              </label>
              <Textarea
                placeholder="Describe the scope of work (e.g., 'Design, fabricate and erect structural steel for 80,000 SF warehouse including columns, beams, joists, and roof deck')"
                value={scopeDescription}
                onChange={(e) => setScopeDescription(e.target.value)}
                className="bg-zinc-950 border-zinc-700 text-white min-h-[100px]"
                rows={5}
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block">
                Key Deliverables (Optional)
              </label>
              <Textarea
                placeholder="List key deliverables (e.g., '120 tons structural steel, misc metals, stairs, handrails')"
                value={keyDeliverables}
                onChange={(e) => setKeyDeliverables(e.target.value)}
                className="bg-zinc-950 border-zinc-700 text-white"
                rows={3}
              />
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
                onClick={handleGenerate}
                disabled={generateWBSMutation.isPending || !scopeDescription.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
              >
                {generateWBSMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="mr-2" />
                    Generate WBS
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-4 bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/20 rounded">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white">Generated WBS</h3>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  {generatedWBS.wbs.length} tasks • {generatedWBS.total_duration} days
                </Badge>
              </div>
              
              {generatedWBS.critical_milestones && generatedWBS.critical_milestones.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Critical Milestones:</p>
                  <ul className="space-y-1">
                    {generatedWBS.critical_milestones.map((milestone, idx) => (
                      <li key={idx} className="text-xs text-zinc-300 flex items-center gap-2">
                        <CheckCircle2 size={10} className="text-amber-500" />
                        {milestone}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Phase Summaries */}
            {generatedWBS.phase_summaries && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(generatedWBS.phase_summaries).map(([phase, summary]) => (
                  <div key={phase} className="p-3 bg-zinc-950 border border-zinc-800 rounded">
                    <Badge variant="outline" className={`${getPhaseColor(phase)} mb-2 capitalize`}>
                      {phase}
                    </Badge>
                    <p className="text-xs text-zinc-400">{summary}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tasks by Phase */}
            <div className="space-y-4">
              {['detailing', 'fabrication', 'delivery', 'erection', 'closeout'].map(phase => {
                const phaseTasks = generatedWBS.wbs.filter(t => t.phase === phase);
                if (phaseTasks.length === 0) return null;

                return (
                  <div key={phase} className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getPhaseColor(phase) + ' uppercase tracking-wider'}>
                        {phase} ({phaseTasks.length})
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {phaseTasks.map((task, idx) => (
                        <div key={idx} className="p-3 bg-zinc-950 border border-zinc-800 rounded hover:border-zinc-700 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-zinc-500">{task.wbs_code}</span>
                                <p className="text-sm font-semibold text-white truncate">{task.name}</p>
                                {task.is_milestone && (
                                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                                    Milestone
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-zinc-400">{task.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-white">{task.duration_days}d</p>
                              {task.estimated_hours > 0 && (
                                <p className="text-xs text-zinc-500">{task.estimated_hours}h</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center gap-3 pt-4 border-t border-zinc-800">
              <Button
                variant="outline"
                onClick={() => {
                  setGeneratedWBS(null);
                }}
                className="border-zinc-700"
              >
                Regenerate
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-zinc-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTasks}
                  disabled={createTasksMutation.isPending}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold"
                >
                  {createTasksMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} className="mr-2" />
                      Create {generatedWBS.wbs.length} Tasks
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}