import React, { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle, Rocket } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { cn } from '@/lib/utils';

export default function DetailingReadinessPanel({ 
  project, 
  drawingSets, 
  rfis, 
  onRelease 
}) {
  const queryClient = useQueryClient();

  const checks = useMemo(() => {
    if (!project) return [];

    const projectDrawingSets = drawingSets.filter(d => d.project_id === project.id);
    const projectRFIs = rfis.filter(r => r.project_id === project.id);

    const drawingLinkedRFIs = projectRFIs.filter(r => 
      r.linked_drawing_set_id && 
      (r.status !== 'closed' && r.status !== 'answered')
    );

    const openRFIs = projectRFIs.filter(r => 
      r.status !== 'closed' && r.status !== 'answered'
    );

    const unapprovedDrawings = projectDrawingSets.filter(d => 
      d.status !== 'FFF' && d.status !== 'As-Built'
    );

    const unreleasedSheets = projectDrawingSets.filter(d => 
      d.status === 'BFS' && !d.released_for_fab_date
    );

    const missingRevisions = projectDrawingSets.filter(d => 
      !d.current_revision || d.current_revision.trim() === ''
    );

    return [
      {
        id: 'drawing_rfis',
        label: 'Drawing-Linked RFIs',
        passed: drawingLinkedRFIs.length === 0,
        count: drawingLinkedRFIs.length,
        message: drawingLinkedRFIs.length === 0 
          ? 'No drawing-related RFIs blocking release'
          : `${drawingLinkedRFIs.length} RFI${drawingLinkedRFIs.length !== 1 ? 's' : ''} blocking drawings`
      },
      {
        id: 'rfis',
        label: 'All Open RFIs',
        passed: openRFIs.length === 0,
        count: openRFIs.length,
        message: openRFIs.length === 0 
          ? 'No open RFIs'
          : `${openRFIs.length} RFI${openRFIs.length !== 1 ? 's' : ''} still open`
      },
      {
        id: 'approvals',
        label: 'Drawing Approvals',
        passed: unapprovedDrawings.length === 0,
        count: unapprovedDrawings.length,
        message: unapprovedDrawings.length === 0
          ? 'All drawings approved'
          : `${unapprovedDrawings.length} drawing${unapprovedDrawings.length !== 1 ? 's' : ''} not approved`
      },
      {
        id: 'releases',
        label: 'Released Sheets',
        passed: unreleasedSheets.length === 0,
        count: unreleasedSheets.length,
        message: unreleasedSheets.length === 0
          ? 'All sheets released'
          : `${unreleasedSheets.length} sheet${unreleasedSheets.length !== 1 ? 's' : ''} pending release`
      },
      {
        id: 'revisions',
        label: 'Revision Tracking',
        passed: missingRevisions.length === 0,
        count: missingRevisions.length,
        message: missingRevisions.length === 0
          ? 'All revisions documented'
          : `${missingRevisions.length} drawing${missingRevisions.length !== 1 ? 's' : ''} missing revision`
      }
    ];
  }, [project, drawingSets, rfis]);

  const allChecksPassed = checks.every(check => check.passed);
  const isDetailingPhase = project?.phase === 'detailing';
  const detailingComplete = project?.phase && project.phase !== 'detailing';

  const releaseToFabricationMutation = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error('No project selected');
      
      // Update project to fabrication phase
      await apiClient.entities.Project.update(project.id, {
        phase: 'fabrication',
        status: 'in_progress',
        notes: `${project.notes || ''}\n\nReleased to Fabrication: ${new Date().toISOString()}`
      });

      return project.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project released to fabrication');
      onRelease?.();
    },
    onError: (error) => {
      toast.error(`Failed to release: ${error.message}`);
    }
  });

  if (!project) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-zinc-800">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Rocket size={20} className="text-amber-500" />
          Detailing Readiness
        </h3>
        <p className="text-sm text-zinc-400 mt-1">
          {detailingComplete 
            ? 'Detailing phase complete - now in fabrication'
            : 'All checks must pass before releasing to fabrication'
          }
        </p>
      </div>

      <div className="p-4 space-y-3">
        {checks.map(check => (
          <div 
            key={check.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border",
              check.passed 
                ? "bg-green-500/10 border-green-500/20" 
                : "bg-red-500/10 border-red-500/20"
            )}
          >
            <div className="flex items-center gap-3">
              {check.passed ? (
                <CheckCircle2 size={20} className="text-green-400 flex-shrink-0" />
              ) : (
                <XCircle size={20} className="text-red-400 flex-shrink-0" />
              )}
              <div>
                <p className={cn(
                  "text-sm font-medium",
                  check.passed ? "text-green-300" : "text-red-300"
                )}>
                  {check.label}
                </p>
                <p className="text-xs text-zinc-400">{check.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {detailingComplete ? (
        <div className="p-4 border-t border-zinc-800 bg-green-500/5">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-300">Released to Fabrication</p>
              <p className="text-xs text-zinc-400">Project is now in fabrication phase</p>
            </div>
          </div>
        </div>
      ) : allChecksPassed ? (
        <div className="p-4 border-t border-zinc-800 bg-green-500/5">
          <div className="flex items-start gap-3 mb-3">
            <CheckCircle2 size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-300">Ready for Fabrication</p>
              <p className="text-xs text-zinc-400">All detailing requirements satisfied</p>
            </div>
          </div>
          <Button
            onClick={() => releaseToFabricationMutation.mutate()}
            disabled={releaseToFabricationMutation.isPending || !isDetailingPhase}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <Rocket size={18} className="mr-2" />
            Release to Fabrication
          </Button>
        </div>
      ) : (
        <div className="p-4 border-t border-zinc-800 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Not Ready</p>
              <p className="text-xs text-zinc-400">
                Resolve {checks.filter(c => !c.passed).length} blocker{checks.filter(c => !c.passed).length !== 1 ? 's' : ''} before releasing
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}