import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AuditFixQueue() {
  const queryClient = useQueryClient();

  const { data: fixTasks = [] } = useQuery({
    queryKey: ['audit-fix-tasks'],
    queryFn: () => base44.entities.AuditFixTask.list('-created_date', 200)
  });

  const { data: findings = [] } = useQuery({
    queryKey: ['all-findings'],
    queryFn: () => base44.entities.AuditFinding.list('-created_date', 500)
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AuditFixTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['audit-fix-tasks']);
      toast.success('Updated');
    }
  });

  const getFindingForTask = (taskId) => {
    const task = fixTasks.find(t => t.id === taskId);
    return findings.find(f => f.id === task?.audit_finding_id);
  };

  const pendingTasks = fixTasks.filter(t => t.status === 'PENDING');
  const appliedTasks = fixTasks.filter(t => t.status === 'APPLIED');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Fix Queue</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manual review required for non-deterministic fixes
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
            {pendingTasks.length} Pending
          </Badge>
          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
            {appliedTasks.length} Applied
          </Badge>
        </div>
      </div>

      {/* Pending Tasks */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock size={18} className="text-amber-400" />
            Pending Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingTasks.map(task => {
            const finding = getFindingForTask(task.id);
            if (!finding) return null;

            return (
              <div key={task.id} className="p-4 bg-zinc-900/50 rounded border border-zinc-700">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={cn("text-xs font-semibold", 
                        finding.severity === 'CRITICAL' && "bg-red-500/20 text-red-400 border-red-500/30",
                        finding.severity === 'HIGH' && "bg-orange-500/20 text-orange-400 border-orange-500/30",
                        finding.severity === 'MEDIUM' && "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      )}>
                        {finding.severity}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-zinc-800 border-zinc-700">
                        {finding.category}
                      </Badge>
                    </div>
                    <div className="text-sm font-semibold text-white mb-2">{finding.title}</div>
                    <div className="text-xs text-zinc-400 mb-3">{finding.description}</div>
                    <div className="text-xs space-y-1">
                      <div className="flex gap-2">
                        <span className="text-zinc-600">Location:</span>
                        <span className="font-mono text-blue-400">{finding.location}</span>
                      </div>
                      {finding.proposed_fix && (
                        <div className="flex gap-2">
                          <span className="text-zinc-600">Fix:</span>
                          <span className="text-amber-400">{finding.proposed_fix}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTaskMutation.mutate({ 
                        id: task.id, 
                        data: { 
                          status: 'APPLIED', 
                          applied_at: new Date().toISOString() 
                        }
                      })}
                      className="border-green-700 text-green-400 hover:bg-green-900/20"
                    >
                      <CheckCircle2 size={14} className="mr-1" />
                      Mark Fixed
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateTaskMutation.mutate({ 
                        id: task.id, 
                        data: { status: 'SKIPPED' }
                      })}
                      className="text-zinc-400"
                    >
                      <X size={14} className="mr-1" />
                      Skip
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {pendingTasks.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              No pending fixes
            </div>
          )}
        </CardContent>
      </Card>

      {/* Applied History */}
      {appliedTasks.length > 0 && (
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-400" />
              Recently Applied
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {appliedTasks.slice(0, 10).map(task => {
              const finding = getFindingForTask(task.id);
              if (!finding) return null;

              return (
                <div key={task.id} className="flex items-center justify-between p-3 bg-zinc-900/30 rounded border border-zinc-700/50">
                  <div className="flex-1">
                    <div className="text-sm text-white">{finding.title}</div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {task.applied_at && new Date(task.applied_at).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                    APPLIED
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}