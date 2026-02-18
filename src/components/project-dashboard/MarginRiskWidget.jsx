import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, AlertTriangle, AlertCircle, DollarSign, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MarginRiskWidget({ projectId }) {
  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['executionPermissions', projectId],
    queryFn: async () => {
      const perms = await base44.entities.ExecutionPermission.filter({ 
        project_id: projectId,
        permission_status: { $ne: 'RELEASED' }
      });
      
      // Get linked assessments
      const assessmentIds = perms.map(p => p.linked_margin_risk_assessment_id).filter(Boolean);
      const assessments = assessmentIds.length > 0
        ? await base44.entities.MarginRiskAssessment.filter({ id: { $in: assessmentIds } })
        : [];
      
      // Get linked work packages
      const wpIds = perms.map(p => p.work_package_id);
      const workPackages = wpIds.length > 0
        ? await base44.entities.WorkPackage.filter({ id: { $in: wpIds } })
        : [];
      
      return perms.map(p => ({
        ...p,
        assessment: assessments.find(a => a.id === p.linked_margin_risk_assessment_id),
        work_package: workPackages.find(wp => wp.id === p.work_package_id)
      }));
    },
    enabled: !!projectId,
    refetchInterval: 30000 // Auto-refresh every 30s
  });

  const groupedByStatus = {
    BLOCKED: permissions.filter(p => p.permission_status === 'BLOCKED'),
    ENGINEER_REVIEW_REQUIRED: permissions.filter(p => p.permission_status === 'ENGINEER_REVIEW_REQUIRED'),
    PM_APPROVAL_REQUIRED: permissions.filter(p => p.permission_status === 'PM_APPROVAL_REQUIRED')
  };

  const totalMarginAtRisk = permissions.reduce((sum, p) => 
    sum + (p.assessment?.margin_at_risk || 0), 0
  );

  const totalECCImpact = permissions.reduce((sum, p) => 
    sum + (p.assessment?.ecc_impact_estimate || 0), 0
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Work Packages At Margin Risk</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (permissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Work Packages At Margin Risk</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-sm text-muted-foreground">All work packages cleared for execution</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Work Packages At Margin Risk
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-red-950/20 rounded-lg border border-red-800/40">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-red-400" />
              <p className="text-xs text-muted-foreground">Margin at Risk</p>
            </div>
            <p className="text-lg font-bold text-red-300">
              ${totalMarginAtRisk.toLocaleString()}
            </p>
          </div>
          
          <div className="p-3 bg-amber-950/20 rounded-lg border border-amber-800/40">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <p className="text-xs text-muted-foreground">ECC Impact</p>
            </div>
            <p className="text-lg font-bold text-amber-300">
              ${totalECCImpact.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Blocked Work Packages */}
        {groupedByStatus.BLOCKED.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-red-400" />
              <h4 className="text-sm font-semibold text-red-300">
                Blocked ({groupedByStatus.BLOCKED.length})
              </h4>
            </div>
            <div className="space-y-2">
              {groupedByStatus.BLOCKED.slice(0, 3).map((perm) => (
                <Link 
                  key={perm.id} 
                  to={createPageUrl(`WorkPackages?wp_id=${perm.work_package_id}`)}
                  className="block p-2 bg-red-950/20 rounded border border-red-800/40 hover:bg-red-950/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-red-200 truncate">
                        {perm.work_package?.package_number || 'WP-???'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {perm.blocking_reason}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-xs shrink-0">
                      ${(perm.assessment?.margin_at_risk || 0).toLocaleString()}
                    </Badge>
                  </div>
                </Link>
              ))}
              {groupedByStatus.BLOCKED.length > 3 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{groupedByStatus.BLOCKED.length - 3} more blocked
                </p>
              )}
            </div>
          </div>
        )}

        {/* PM Approval Required */}
        {groupedByStatus.PM_APPROVAL_REQUIRED.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-semibold text-amber-300">
                PM Approval ({groupedByStatus.PM_APPROVAL_REQUIRED.length})
              </h4>
            </div>
            <div className="space-y-2">
              {groupedByStatus.PM_APPROVAL_REQUIRED.slice(0, 3).map((perm) => (
                <Link 
                  key={perm.id} 
                  to={createPageUrl(`WorkPackages?wp_id=${perm.work_package_id}`)}
                  className="block p-2 bg-amber-950/20 rounded border border-amber-800/40 hover:bg-amber-950/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-amber-200 truncate">
                        {perm.work_package?.package_number || 'WP-???'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        Risk: {perm.assessment?.risk_score || 0}
                      </p>
                    </div>
                    <Badge variant="warning" className="text-xs shrink-0">
                      ${(perm.assessment?.margin_at_risk || 0).toLocaleString()}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Engineer Review Required */}
        {groupedByStatus.ENGINEER_REVIEW_REQUIRED.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-orange-400" />
              <h4 className="text-sm font-semibold text-orange-300">
                Engineer Review ({groupedByStatus.ENGINEER_REVIEW_REQUIRED.length})
              </h4>
            </div>
            <div className="space-y-2">
              {groupedByStatus.ENGINEER_REVIEW_REQUIRED.slice(0, 3).map((perm) => (
                <Link 
                  key={perm.id} 
                  to={createPageUrl(`WorkPackages?wp_id=${perm.work_package_id}`)}
                  className="block p-2 bg-orange-950/20 rounded border border-orange-800/40 hover:bg-orange-950/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-orange-200 truncate">
                        {perm.work_package?.package_number || 'WP-???'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        Design intent change
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}