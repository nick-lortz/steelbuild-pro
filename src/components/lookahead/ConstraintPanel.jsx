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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Shield, AlertTriangle } from 'lucide-react';
import WaiverDialog from './WaiverDialog';
import { cn } from '@/lib/utils';

export default function ConstraintPanel({ taskId, open, onClose, projectId }) {
  const queryClient = useQueryClient();
  const [waiverDialogOpen, setWaiverDialogOpen] = useState(false);
  const [selectedConstraintForWaiver, setSelectedConstraintForWaiver] = useState(null);

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
      const user = await base44.auth.me();
      await base44.entities.Constraint.update(constraintId, {
        status: 'CLEARED',
        cleared_at: new Date().toISOString(),
        cleared_by_user_id: user.email
      });
    },
    onSuccess: async () => {
      // Re-evaluate task readiness
      if (taskId && projectId) {
        await base44.functions.invoke('evaluateErectionReadiness', { 
          project_id: projectId,
          task_id: taskId 
        });
      }
      queryClient.invalidateQueries({ queryKey: ['constraints'] });
      queryClient.invalidateQueries({ queryKey: ['erectionLookahead'] });
      queryClient.invalidateQueries({ queryKey: ['erectionReadiness'] });
    }
  });

  const waiveMutation = useMutation({
    mutationFn: async ({ constraint_id, reason_code, notes }) => {
      const user = await base44.auth.me();
      
      // Update constraint with waiver details
      await base44.entities.Constraint.update(constraint_id, {
        status: 'WAIVED',
        waived_at: new Date().toISOString(),
        waived_by_user_id: user.email,
        waiver_reason: `[${reason_code}] ${notes}`
      });

      // Log audit trail
      await base44.entities.AuditLog.create({
        project_id: projectId,
        entity_type: 'Constraint',
        entity_id: constraint_id,
        action: 'WAIVED',
        action_by: user.email,
        action_timestamp: new Date().toISOString(),
        details: {
          reason_code,
          notes,
          task_id: taskId,
          constraint_type: selectedConstraintForWaiver?.constraint_type
        }
      });
    },
    onSuccess: async () => {
      // Re-evaluate task readiness
      if (taskId && projectId) {
        await base44.functions.invoke('evaluateErectionReadiness', { 
          project_id: projectId,
          task_id: taskId 
        });
      }
      queryClient.invalidateQueries({ queryKey: ['constraints'] });
      queryClient.invalidateQueries({ queryKey: ['erectionLookahead'] });
      queryClient.invalidateQueries({ queryKey: ['erectionReadiness'] });
      setWaiverDialogOpen(false);
      setSelectedConstraintForWaiver(null);
    }
  });

  const handleWaiveClick = (constraint) => {
    setSelectedConstraintForWaiver(constraint);
    setWaiverDialogOpen(true);
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
                        </div>

                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => clearMutation.mutate(constraint.id)}
                            disabled={clearMutation.isPending}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Mark Cleared
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleWaiveClick(constraint)}
                            className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            Waive (PM)
                          </Button>
                        </div>
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

      <WaiverDialog
        open={waiverDialogOpen}
        onOpenChange={setWaiverDialogOpen}
        constraint={selectedConstraintForWaiver}
        onWaive={waiveMutation.mutate}
      />
    </Sheet>
  );
}