import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Link as LinkIcon } from 'lucide-react';

export default function CoordinationImpactsPanel({ workPackage }) {
  if (!workPackage || !workPackage.impacted_by_rfi_ids?.length) {
    return (
      <Card className="bg-green-950/20 border-green-900/30">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-green-400">
            <span>✓ Coordination Impacts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-green-300">No RFI coordination risks</p>
        </CardContent>
      </Card>
    );
  }

  const severityColor = {
    none: 'text-gray-400',
    low: 'text-blue-400',
    medium: 'text-yellow-400',
    high: 'text-orange-400',
    blocking: 'text-red-500'
  };

  const severityBg = {
    low: 'bg-blue-900/20',
    medium: 'bg-yellow-900/20',
    high: 'bg-orange-900/20',
    blocking: 'bg-red-900/30'
  };

  return (
    <Card className={`border-amber-900/50 ${severityBg[workPackage.impacted_by_rfi_severity] || 'bg-amber-950/20'}`}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertCircle className={`w-4 h-4 ${severityColor[workPackage.impacted_by_rfi_severity]}`} />
          Coordination Impacts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Severity badge */}
        <div>
          <Badge className={`${severityColor[workPackage.impacted_by_rfi_severity]} border-current`}>
            {workPackage.impacted_by_rfi_severity.toUpperCase()}
          </Badge>
        </div>

        {/* Impact summary */}
        {workPackage.rfi_impact_summary && (
          <div>
            <div className="text-xs text-gray-400 mb-1">Blocking RFIs:</div>
            <p className="text-xs text-gray-300 leading-relaxed">{workPackage.rfi_impact_summary}</p>
          </div>
        )}

        {/* Impact tags */}
        {workPackage.impacted_areas && workPackage.impacted_areas.length > 0 && (
          <div>
            <div className="text-xs text-gray-400 mb-1">Affected Areas:</div>
            <div className="flex flex-wrap gap-1">
              {workPackage.impacted_areas.map(area => (
                <Badge key={area} variant="outline" className="text-xs">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* RFI count */}
        <div className="text-xs text-gray-400">
          {workPackage.open_rfi_ids?.length || 0} open RFI(s) affecting this WP
        </div>

        {/* Blocking flag */}
        {workPackage.has_blocking_rfi && (
          <div className="p-2 bg-red-900/30 border border-red-800/50 rounded text-xs text-red-300">
            ⚠️ Blocking RFI(s) prevent install readiness
          </div>
        )}
      </CardContent>
    </Card>
  );
}