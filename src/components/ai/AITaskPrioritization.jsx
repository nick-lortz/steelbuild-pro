import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { Sparkles, AlertTriangle, TrendingUp, Calendar, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/notifications';

export default function AITaskPrioritization({ projectId, onTaskClick }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const analyzeTasks = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('aiTaskPrioritization', { project_id: projectId });
      if (data.success) {
        setAnalysis(data.analysis);
        toast.success('Task prioritization complete');
      } else {
        toast.error('Analysis failed');
      }
    } catch (error) {
      toast.error('Failed to analyze tasks');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!analysis) {
    return (
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <CardContent className="p-6 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-400" />
          <h3 className="text-lg font-bold text-white mb-2">AI Task Prioritization</h3>
          <p className="text-sm text-zinc-400 mb-4">
            Analyze tasks using AI to identify critical path, blockers, and recommended actions
          </p>
          <Button 
            onClick={analyzeTasks} 
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze Tasks
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const priorityColors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500'
  };

  const topPriority = analysis.prioritized_tasks.slice(0, 5);
  const immediateTasks = analysis.prioritized_tasks.filter(t => 
    analysis.immediate_attention.includes(t.task_id)
  );

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              AI Task Prioritization
            </CardTitle>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={analyzeTasks}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded">
            <p className="text-sm text-zinc-300">{analysis.summary}</p>
          </div>

          {immediateTasks.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
                <AlertTriangle size={14} />
                Immediate Attention Required
              </h4>
              <div className="space-y-2">
                {immediateTasks.map((task) => (
                  <div 
                    key={task.task_id}
                    onClick={() => onTaskClick?.(task.task_id)}
                    className="p-3 bg-red-500/10 border border-red-500/30 rounded cursor-pointer hover:bg-red-500/20"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-bold text-white text-sm">{task.task_name}</div>
                        <div className="text-xs text-zinc-400 mt-1">{task.rationale}</div>
                      </div>
                      <Badge className={cn('ml-2', priorityColors[task.priority_level])}>
                        {task.priority_score}/10
                      </Badge>
                    </div>
                    <div className="text-xs text-zinc-400 font-bold mb-1">Recommended Action:</div>
                    <div className="text-xs text-zinc-300">{task.recommended_action}</div>
                    {task.blockers?.length > 0 && (
                      <div className="mt-2 flex gap-1 flex-wrap">
                        {task.blockers.map((blocker, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs border-red-500/50 text-red-400">
                            {blocker}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-bold text-white mb-2">Top Priority Tasks</h4>
            <div className="space-y-2">
              {topPriority.map((task) => (
                <div 
                  key={task.task_id}
                  onClick={() => onTaskClick?.(task.task_id)}
                  className="p-3 bg-zinc-950 border border-zinc-800 rounded cursor-pointer hover:bg-zinc-800/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-bold text-white text-sm">{task.task_name}</div>
                      <div className="text-xs text-zinc-400 mt-1">{task.rationale}</div>
                    </div>
                    <Badge className={cn('ml-2', priorityColors[task.priority_level])}>
                      {task.priority_score}/10
                    </Badge>
                  </div>
                  {task.must_start_by && (
                    <div className="flex items-center gap-1 text-xs text-amber-400 mb-1">
                      <Calendar size={12} />
                      Must start by: {task.must_start_by}
                    </div>
                  )}
                  {task.schedule_impact_days > 0 && (
                    <div className="text-xs text-red-400">
                      ⚠ {task.schedule_impact_days} day schedule impact if delayed
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {analysis.critical_path_tasks.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded">
              <div className="text-xs text-amber-400 font-bold mb-1 flex items-center gap-1">
                <TrendingUp size={12} />
                Critical Path: {analysis.critical_path_tasks.length} tasks
              </div>
              <div className="text-xs text-zinc-300">
                These tasks directly impact project completion date
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}