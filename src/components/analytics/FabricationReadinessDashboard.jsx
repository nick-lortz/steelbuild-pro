import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Lock, Package } from 'lucide-react';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';

export default function FabricationReadinessDashboard() {
  const { activeProjectId } = useActiveProject();

  const { data: drawingSets = [] } = useQuery({
    queryKey: ['drawingSets', activeProjectId],
    queryFn: () => base44.entities.DrawingSet.filter({
      project_id: activeProjectId,
      status: { $in: ['BFA', 'BFS', 'FFF'] }
    }),
    enabled: !!activeProjectId
  });

  const { data: fabrications = [] } = useQuery({
    queryKey: ['fabrications', activeProjectId],
    queryFn: () => base44.entities.Fabrication.filter({
      project_id: activeProjectId
    }),
    enabled: !!activeProjectId
  });

  const { data: blockingRFIs = [] } = useQuery({
    queryKey: ['blockingRFIs', activeProjectId],
    queryFn: () => base44.entities.RFI.filter({
      project_id: activeProjectId,
      fabrication_hold: true,
      status: { $in: ['submitted', 'under_review', 'internal_review'] }
    }),
    enabled: !!activeProjectId
  });

  // Calculate metrics
  const releasedForFab = drawingSets.filter(ds => ds.status === 'FFF').length;
  const totalDrawingSets = drawingSets.length;
  const releasedPercent = totalDrawingSets > 0 ? Math.round((releasedForFab / totalDrawingSets) * 100) : 0;

  const tonsApproved = fabrications.filter(f => f.status === 'approved').reduce((sum, f) => sum + (f.est_tonnage || 0), 0);
  const tonsFabricated = fabrications.filter(f => f.status === 'in_progress' || f.status === 'completed').reduce((sum, f) => sum + (f.est_tonnage || 0), 0);
  const fabricationPercent = tonsApproved > 0 ? Math.round((tonsFabricated / tonsApproved) * 100) : 0;

  const fabricationHoldCount = blockingRFIs.length;
  const p0BlockerCount = blockingRFIs.filter(rfi => 
    (rfi.qa_blockers || []).some(b => b.severity === 'P0')
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {/* Drawings Released */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Lock size={16} className="text-blue-500" />
              Drawings Released
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-bold">{releasedPercent}%</span>
                <span className="text-xs text-muted-foreground">{releasedForFab} of {totalDrawingSets}</span>
              </div>
              <Progress value={releasedPercent} />
            </div>
            {releasedPercent === 100 ? (
              <div className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle size={14} /> All released
              </div>
            ) : (
              <div className="text-xs text-yellow-400">
                {totalDrawingSets - releasedForFab} pending QA
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tons Fabricated */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Package size={16} className="text-orange-500" />
              Fabrication Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-bold">{fabricationPercent}%</span>
                <span className="text-xs text-muted-foreground">{tonsFabricated} of {tonsApproved} tons</span>
              </div>
              <Progress value={fabricationPercent} />
            </div>
            {tonsApproved === 0 ? (
              <div className="text-xs text-muted-foreground">No fabrications yet</div>
            ) : (
              <div className="text-xs text-blue-400">
                {tonsApproved - tonsFabricated} tons in queue
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fabrication Holds */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              Fabrication Holds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">{fabricationHoldCount}</div>
            {fabricationHoldCount > 0 && (
              <div className="space-y-1 text-xs">
                <div className="text-red-400">{p0BlockerCount} P0 critical</div>
                <div className="text-yellow-400">{fabricationHoldCount - p0BlockerCount} waiting response</div>
              </div>
            )}
            {fabricationHoldCount === 0 && (
              <div className="text-xs text-green-400">✓ Shop ready to proceed</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Blocking RFIs Detail */}
      {blockingRFIs.length > 0 && (
        <Card className="border-red-800">
          <CardHeader>
            <CardTitle className="text-red-500">RFIs Blocking Fabrication</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {blockingRFIs.slice(0, 8).map((rfi) => (
                <div key={rfi.id} className="flex items-start justify-between p-3 bg-card rounded border border-red-900/30">
                  <div className="flex-1">
                    <div className="font-mono text-sm">RFI-{rfi.rfi_number}</div>
                    <div className="text-sm text-muted-foreground line-clamp-1">{rfi.subject}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {rfi.est_detail_hours > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {Math.round(rfi.est_detail_hours)} hrs
                      </Badge>
                    )}
                    <Badge 
                      variant={rfi.priority === 'critical' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {rfi.priority}
                    </Badge>
                  </div>
                </div>
              ))}
              {blockingRFIs.length > 8 && (
                <div className="text-center text-sm text-muted-foreground pt-2">
                  +{blockingRFIs.length - 8} more
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* QA Status by Drawing Set */}
      <Card>
        <CardHeader>
          <CardTitle>QA Status Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {drawingSets.map((ds) => (
              <div key={ds.id} className="flex items-center justify-between p-3 bg-card rounded border">
                <div className="flex items-center gap-3 flex-1">
                  {ds.qa_status === 'pass' && <CheckCircle size={16} className="text-green-500" />}
                  {ds.qa_status === 'fail' && <AlertTriangle size={16} className="text-red-500" />}
                  {ds.qa_status === 'not_run' && <div className="w-4 h-4 rounded-full bg-slate-600" />}
                  <div>
                    <div className="font-medium text-sm">{ds.set_name}</div>
                    <div className="text-xs text-muted-foreground">{ds.current_revision}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ds.status === 'FFF' && (
                    <Badge className="bg-green-600">Released</Badge>
                  )}
                  {ds.status !== 'FFF' && ds.qa_status === 'pass' && (
                    <Badge variant="outline" className="text-green-500">Ready</Badge>
                  )}
                  {ds.qa_status === 'fail' && (
                    <Badge variant="destructive">{ds.qa_blockers?.length || 0} issues</Badge>
                  )}
                </div>
              </div>
            ))}
            {drawingSets.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-4">
                No drawings in fabrication phase
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}