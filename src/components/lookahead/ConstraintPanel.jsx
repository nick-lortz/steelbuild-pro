import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ConstraintPanel({ taskId, open, onClose, projectId }) {
  const queryClient = useQueryClient();
  const [waiverReason, setWaiverReason] = useState('');
  const [selectedConstraintId, setSelectedConstraintId] = useState(null);

  const { data: task } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => base44.entities.Task.filter({ id: taskId }).then(t => t[0]),
    enabled: !!taskId
  });

  const { data: constraints = [] } = useQuery({
    queryKey: ['constraints', taskId],
    queryFn: async () => {
      if (!task) return [];
      
      const query = {
        project_id: projectId,
        status: 'OPEN',
        $or: [
          { task_id: taskId },
          ...(task.work_package_id ? [{
            work_package_id: task.work_package_id,
            scope_type: 'WORK_PACKAGE'
          }] : [])
        ]
      };

      return await base44.entities.Constraint.filter(query);
    },
    enabled: !!task && !!taskId && open
  });

  const clearMutation = useMutation({
    mutationFn: async (constraintId) => {
      await base44.entities.Constraint.update(constraintId, {
        status: 'CLEARED',
        cleared_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['constraints'] });
      queryClient.invalidateQueries({ queryKey: ['erectionLookahead'] });
    }
  });

  const waiveMutation = useMutation({
    mutationFn: async ({ constraintId, reason }) => {
      await base44.entities.Constraint.update(constraintId, {
        status: 'WAIVED',
        waived_at: new Date().toISOString(),
        waiver_reason: reason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['constraints'] });
      queryClient.invalidateQueries({ queryKey: ['erectionLookahead'] });
      setWaiverReason('');
      setSelectedConstraintId(null);
    }
  });

  const handleWaive = (constraintId) => {
    if (!waiverReason.trim()) {
      alert('Waiver reason required');
      return;
    }

    waiveMutation.mutate({ constraintId, reason: waiverReason });
  };

  const blockers = constraints.filter(c => c.severity === 'BLOCKER');
  const warnings = constraints.filter(c => c.severity === 'WARNING');

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Constraints: {task?.name}</SheetTitle>
          <SheetDescription>
            {task?.work_package_id && `Work Package: ${task.work_package?.wpid || 'N/A'}`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Blockers */}
          {blockers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                Blockers ({blockers.length})
              </h3>
              <div className="space-y-3">
                {blockers.map((constraint) => (
                  <Alert key={constraint.id} variant="destructive">
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-xs font-semibold mb-1">
                              {constraint.constraint_type.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-muted-foreground">{constraint.notes}</p>
                            {constraint.owner_role && (
                              <Badge variant="outline" className="mt-2 text-xs">
                                Owner: {constraint.owner_role}
                              </Badge>
                            )}
                          </div>
                          <X 
                            className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => setSelectedConstraintId(constraint.id)}
                          />
                        </div>

                        {selectedConstraintId === constraint.id && (
                          <div className="pt-3 border-t border-border space-y-2">
                            <Label className="text-xs">Waiver Reason (PM Only)</Label>
                            <Textarea
                              value={waiverReason}
                              onChange={(e) => setWaiverReason(e.target.value)}
                              placeholder="Document why this constraint is being waived..."
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => clearMutation.mutate(constraint.id)}
                              >
                                Mark Cleared
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleWaive(constraint.id)}
                                disabled={!waiverReason.trim()}
                              >
                                Waive
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedConstraintId(null);
                                  setWaiverReason('');
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Warnings ({warnings.length})
              </h3>
              <div className="space-y-3">
                {warnings.map((constraint) => (
                  <Alert key={constraint.id} className="bg-amber-950/20 border-amber-800/40">
                    <AlertDescription>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-xs font-semibold mb-1 text-amber-200">
                            {constraint.constraint_type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">{constraint.notes}</p>
                          {constraint.owner_role && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              Owner: {constraint.owner_role}
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => clearMutation.mutate(constraint.id)}
                        >
                          Clear
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {constraints.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No open constraints</p>
              <p className="text-xs text-muted-foreground mt-1">Task is ready to start</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}