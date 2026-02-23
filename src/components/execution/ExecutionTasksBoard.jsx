import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock, Shield, TrendingDown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

export default function ExecutionTasksBoard({ projectId }) {
  const [selectedGate, setSelectedGate] = useState('all');

  const { data: executionTasks = [], isLoading } = useQuery({
    queryKey: ['execution-tasks', projectId],
    queryFn: () => base44.entities.ExecutionTask.filter({ project_id: projectId }, '-risk_score'),
    enabled: !!projectId,
    staleTime: 60 * 1000
  });

  const filteredTasks = selectedGate === 'all' 
    ? executionTasks 
    : executionTasks.filter(t => t.execution_gate === selectedGate);

  const stats = {
    blocked: executionTasks.filter(t => t.readiness_status === 'Blocked').length,
    conditional: executionTasks.filter(t => t.readiness_status === 'Conditional').length,
    ready: executionTasks.filter(t => t.readiness_status === 'Ready').length,
    lookahead: executionTasks.filter(t => t.lookahead_window).length,
    totalRisk: executionTasks.reduce((sum, t) => sum + (t.margin_impact_dollars || 0), 0)
  };

  const statusColors = {
    'Blocked': 'bg-red-500/20 text-red-400 border-red-500/30',
    'Conditional': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'Ready': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'Released': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'At Risk': 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  };

  const gateColors = {
    'Fabricate': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    'Ship': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    'Install': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    'Approve': 'bg-green-500/10 text-green-400 border-green-500/30'
  };

  const actionColors = {
    'Release': 'bg-emerald-600 hover:bg-emerald-700',
    'Hold': 'bg-red-600 hover:bg-red-700',
    'Verify': 'bg-amber-600 hover:bg-amber-700',
    'Escalate': 'bg-orange-600 hover:bg-orange-700',
    'Monitor': 'bg-zinc-600 hover:bg-zinc-700'
  };

  if (isLoading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-6">
          <div className="text-center text-zinc-500">Loading execution intelligence...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-5 gap-3">
        <Card className="bg-red-950/20 border-red-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-red-400" />
              <span className="text-xs text-zinc-400">Blocked</span>
            </div>
            <div className="text-2xl font-bold text-red-400">{stats.blocked}</div>
          </CardContent>
        </Card>

        <Card className="bg-amber-950/20 border-amber-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-zinc-400">Conditional</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">{stats.conditional}</div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-950/20 border-emerald-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-zinc-400">Ready</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400">{stats.ready}</div>
          </CardContent>
        </Card>

        <Card className="bg-blue-950/20 border-blue-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-zinc-400">Lookahead</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">{stats.lookahead}</div>
          </CardContent>
        </Card>

        <Card className="bg-orange-950/20 border-orange-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-zinc-400">Margin Risk</span>
            </div>
            <div className="text-xl font-bold text-orange-400">${(stats.totalRisk / 1000).toFixed(0)}K</div>
          </CardContent>
        </Card>
      </div>

      {/* Gate Filter */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={selectedGate === 'all' ? 'default' : 'outline'}
          onClick={() => setSelectedGate('all')}
        >
          All Gates
        </Button>
        {['Fabricate', 'Ship', 'Install', 'Approve'].map(gate => (
          <Button
            key={gate}
            size="sm"
            variant={selectedGate === gate ? 'default' : 'outline'}
            onClick={() => setSelectedGate(gate)}
          >
            {gate}
          </Button>
        ))}
      </div>

      {/* Execution Tasks */}
      <div className="space-y-3">
        {filteredTasks.map(task => (
          <Card key={task.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Status Indicator */}
                <div className={cn(
                  "w-1 h-full rounded-full",
                  task.readiness_status === 'Blocked' && 'bg-red-500',
                  task.readiness_status === 'Conditional' && 'bg-amber-500',
                  task.readiness_status === 'Ready' && 'bg-emerald-500'
                )} />

                {/* Task Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={gateColors[task.execution_gate]}>
                      {task.execution_gate}
                    </Badge>
                    <Badge className={statusColors[task.readiness_status]}>
                      {task.readiness_status}
                    </Badge>
                    {task.lookahead_window && (
                      <Badge variant="outline" className="text-blue-400 border-blue-500/30">
                        <Clock size={12} className="mr-1" />
                        {task.days_until_execution}d
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500">{task.source_entity_type}</span>
                      {task.execution_date && (
                        <>
                          <span className="text-zinc-700">•</span>
                          <span className="text-xs text-cyan-400">
                            Target: {format(parseISO(task.execution_date), 'MMM d')}
                          </span>
                        </>
                      )}
                      <span className="text-zinc-700">•</span>
                      <span className="text-xs text-zinc-400">
                        Risk: {task.risk_score}/100
                      </span>
                      <span className="text-zinc-700">•</span>
                      <span className="text-xs text-orange-400">
                        ${(task.margin_impact_dollars || 0).toLocaleString()} at risk
                      </span>
                    </div>

                    {/* AI Reasoning */}
                    <p className="text-sm text-zinc-300">{task.ai_reasoning}</p>

                    {/* Blockers */}
                    {task.blocking_dependencies?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {task.blocking_dependencies.map((blocker, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5" />
                            <span className="text-red-400">{blocker.description}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* GC Actions */}
                    {task.required_gc_actions?.length > 0 && (
                      <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded">
                        <div className="text-xs font-semibold text-amber-400 mb-1">GC Actions Required:</div>
                        <ul className="text-xs text-amber-300 space-y-0.5">
                          {task.required_gc_actions.map((action, idx) => (
                            <li key={idx}>• {action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommendation */}
                <Button
                  size="sm"
                  className={cn("whitespace-nowrap", actionColors[task.recommended_action])}
                >
                  {task.recommended_action}
                  <ArrowRight size={14} className="ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredTasks.length === 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6 text-center">
              <div className="text-zinc-500">No execution tasks for selected gate</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}