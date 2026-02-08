import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';

export default function RFIRiskHeatmap() {
  const { activeProjectId } = useActiveProject();

  const { data: allRFIs = [] } = useQuery({
    queryKey: ['allRFIs', activeProjectId],
    queryFn: () => base44.entities.RFI.filter({
      project_id: activeProjectId
    }),
    enabled: !!activeProjectId
  });

  // Group by status
  const byStatus = useMemo(() => {
    const groups = {
      draft: [],
      internal_review: [],
      submitted: [],
      under_review: [],
      answered: [],
      closed: [],
      reopened: []
    };

    allRFIs.forEach(rfi => {
      if (groups[rfi.status]) {
        groups[rfi.status].push(rfi);
      }
    });

    return groups;
  }, [allRFIs]);

  // Calculate cost exposure
  const costExposure = useMemo(() => {
    return allRFIs.reduce((sum, rfi) => {
      if (rfi.status !== 'closed') {
        const hours = rfi.est_detail_hours || 0;
        const costImpact = rfi.estimated_cost_impact || 0;
        return sum + (hours * 125) + costImpact;
      }
      return sum;
    }, 0);
  }, [allRFIs]);

  // Group by phase impacted
  const byPhase = useMemo(() => {
    const phases = {
      detailing: [],
      fabrication: [],
      delivery: [],
      erection: [],
      closeout: []
    };

    allRFIs.forEach(rfi => {
      const affectedPhases = rfi.linked_task_ids?.length > 0 ? 'fabrication' : 'detailing';
      if (phases[affectedPhases]) {
        phases[affectedPhases].push(rfi);
      }
      if (rfi.field_rework_risk && rfi.field_rework_risk !== 'low') {
        if (phases['erection']) phases['erection'].push(rfi);
      }
    });

    return phases;
  }, [allRFIs]);

  // Risk severity matrix
  const criticalRFIs = allRFIs.filter(rfi => 
    rfi.priority === 'critical' || 
    (rfi.field_rework_risk === 'high') ||
    (rfi.fabrication_hold === true)
  );

  const riskMatrix = useMemo(() => {
    return {
      critical: criticalRFIs.length,
      high: allRFIs.filter(rfi => rfi.priority === 'high' && rfi.status !== 'closed').length,
      medium: allRFIs.filter(rfi => rfi.priority === 'medium' && rfi.status !== 'closed').length,
      low: allRFIs.filter(rfi => rfi.priority === 'low' && rfi.status !== 'closed').length
    };
  }, [allRFIs, criticalRFIs]);

  const statusColors = {
    draft: 'bg-slate-600',
    internal_review: 'bg-blue-600',
    submitted: 'bg-cyan-600',
    under_review: 'bg-amber-600',
    answered: 'bg-purple-600',
    closed: 'bg-green-600',
    reopened: 'bg-red-600'
  };

  const phaseColors = {
    detailing: 'bg-blue-600',
    fabrication: 'bg-orange-600',
    delivery: 'bg-green-600',
    erection: 'bg-red-600',
    closeout: 'bg-slate-600'
  };

  return (
    <div className="space-y-6">
      {/* Cost Exposure Summary */}
      {costExposure > 0 && (
        <Alert>
          <AlertDescription>
            <span className="font-bold text-lg">${costExposure.toLocaleString()}</span>
            <span className="text-muted-foreground ml-2">total cost exposure from open RFIs</span>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* RFI Status Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">RFIs by Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(byStatus).map(([status, rfis]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div className={`w-3 h-3 rounded ${statusColors[status]}`} />
                  <span className="text-sm capitalize text-muted-foreground">
                    {status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold">{rfis.length}</div>
                  {rfis.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      ${rfis.reduce((sum, r) => sum + (r.estimated_cost_impact || 0), 0).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Phase Impact Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">RFIs by Phase Impacted</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(byPhase).map(([phase, rfis]) => (
              <div key={phase} className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div className={`w-3 h-3 rounded ${phaseColors[phase]}`} />
                  <span className="text-sm capitalize text-muted-foreground">{phase}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold">{rfis.length}</div>
                  {rfis.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {Math.round(rfis.reduce((sum, r) => sum + (r.est_detail_hours || 0), 0))} hrs
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Risk Severity Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Risk Severity Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            <div className="p-3 bg-red-950/20 border border-red-800 rounded text-center">
              <div className="text-2xl font-bold text-red-500">{riskMatrix.critical}</div>
              <div className="text-xs text-red-400 mt-1">Critical</div>
            </div>
            <div className="p-3 bg-orange-950/20 border border-orange-800 rounded text-center">
              <div className="text-2xl font-bold text-orange-500">{riskMatrix.high}</div>
              <div className="text-xs text-orange-400 mt-1">High</div>
            </div>
            <div className="p-3 bg-yellow-950/20 border border-yellow-800 rounded text-center">
              <div className="text-2xl font-bold text-yellow-500">{riskMatrix.medium}</div>
              <div className="text-xs text-yellow-400 mt-1">Medium</div>
            </div>
            <div className="p-3 bg-blue-950/20 border border-blue-800 rounded text-center">
              <div className="text-2xl font-bold text-blue-500">{riskMatrix.low}</div>
              <div className="text-xs text-blue-400 mt-1">Low</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical RFIs */}
      {criticalRFIs.length > 0 && (
        <Card className="border-red-800">
          <CardHeader>
            <CardTitle className="text-red-500 text-sm">Critical RFIs Requiring Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalRFIs.slice(0, 5).map((rfi) => (
                <div key={rfi.id} className="p-3 bg-red-950/10 border border-red-900/30 rounded">
                  <div className="flex items-start justify-between mb-1">
                    <div className="font-mono text-sm">RFI-{rfi.rfi_number}</div>
                    <Badge variant="destructive" className="text-xs">
                      {rfi.priority}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-1 mb-2">{rfi.subject}</div>
                  <div className="flex items-center gap-2 text-xs">
                    {rfi.est_detail_hours > 0 && (
                      <span className="text-muted-foreground">{Math.round(rfi.est_detail_hours)} hrs</span>
                    )}
                    {rfi.estimated_cost_impact > 0 && (
                      <span className="text-red-400">${rfi.estimated_cost_impact.toLocaleString()}</span>
                    )}
                    {rfi.field_rework_risk && rfi.field_rework_risk !== 'low' && (
                      <span className="text-orange-400">{rfi.field_rework_risk} field risk</span>
                    )}
                  </div>
                </div>
              ))}
              {criticalRFIs.length > 5 && (
                <div className="text-center text-sm text-muted-foreground pt-2">
                  +{criticalRFIs.length - 5} more critical items
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}