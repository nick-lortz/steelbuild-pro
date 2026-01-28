import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, FileText, MessageSquareWarning, RefreshCcw } from 'lucide-react';

export function checkPrerequisites(item, drawings, rfis) {
  const failures = [];
  
  // 1. Check drawings IFC
  if (item.drawing_set_id) {
    const drawing = drawings.find(d => d.id === item.drawing_set_id);
    if (!drawing) {
      failures.push({
        check: 'drawings_ifc',
        reason: 'Drawing set not found',
        severity: 'critical'
      });
    } else if (drawing.status !== 'IFC' && drawing.status !== 'issued_for_construction') {
      failures.push({
        check: 'drawings_ifc',
        reason: `Drawing status is ${drawing.status}, not IFC`,
        severity: 'critical',
        details: `${drawing.set_number} - ${drawing.set_name}`
      });
    }
  } else {
    failures.push({
      check: 'drawings_ifc',
      reason: 'No drawing set assigned',
      severity: 'critical'
    });
  }
  
  // 2. Check latest revision
  if (item.is_latest_revision === false) {
    failures.push({
      check: 'latest_revision',
      reason: 'Not on latest drawing revision',
      severity: 'critical',
      details: `Current: ${item.drawing_revision || 'Unknown'}`
    });
  }
  
  // 3. Check RFIs closed
  if (item.linked_rfi_ids && item.linked_rfi_ids.length > 0) {
    const openRFIs = rfis.filter(rfi => 
      item.linked_rfi_ids.includes(rfi.id) && 
      rfi.status !== 'closed' && 
      rfi.status !== 'answered'
    );
    
    if (openRFIs.length > 0) {
      failures.push({
        check: 'rfis_closed',
        reason: `${openRFIs.length} open RFI(s)`,
        severity: 'critical',
        details: openRFIs.map(r => `RFI-${r.rfi_number}: ${r.subject}`).join(', ')
      });
    }
  }
  
  // 4. Check material assigned
  if (item.material_status === 'not_ordered') {
    failures.push({
      check: 'material_assigned',
      reason: 'Material not ordered',
      severity: 'warning'
    });
  }
  
  // 5. Check BOM verified (if package has this field)
  const hasUnverifiedBOM = item.bom_verified === false;
  if (hasUnverifiedBOM) {
    failures.push({
      check: 'bom_verified',
      reason: 'BOM not verified',
      severity: 'warning'
    });
  }
  
  const criticalFailures = failures.filter(f => f.severity === 'critical');
  const canRelease = criticalFailures.length === 0;
  
  return {
    canRelease,
    failures,
    criticalFailures,
    warningFailures: failures.filter(f => f.severity === 'warning')
  };
}

export function PrerequisitesPanel({ item, drawings, rfis, onResolve }) {
  const prereqResult = checkPrerequisites(item, drawings, rfis);
  
  const checkConfig = {
    drawings_ifc: { label: 'Drawings IFC', icon: FileText },
    latest_revision: { label: 'Latest Revision', icon: RefreshCcw },
    rfis_closed: { label: 'RFIs Closed', icon: MessageSquareWarning },
    material_assigned: { label: 'Material On Hand', icon: CheckCircle2 },
    bom_verified: { label: 'BOM Verified', icon: CheckCircle2 }
  };
  
  const passedChecks = [
    'drawings_ifc',
    'latest_revision', 
    'rfis_closed',
    'material_assigned',
    'bom_verified'
  ].filter(check => !prereqResult.failures.some(f => f.check === check));
  
  return (
    <Card className={`border-2 ${prereqResult.canRelease ? 'bg-green-950/20 border-green-500/30' : 'bg-red-950/20 border-red-500/40'}`}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Release Prerequisites</span>
          {prereqResult.canRelease ? (
            <Badge className="bg-green-500">✓ READY</Badge>
          ) : (
            <Badge className="bg-red-500">BLOCKED</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Failed Checks */}
        {prereqResult.failures.map((failure, idx) => {
          const config = checkConfig[failure.check];
          const Icon = config?.icon || XCircle;
          
          return (
            <div key={idx} className="flex items-start gap-3 p-3 bg-zinc-900/50 rounded border border-red-500/30">
              <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-red-400">{config?.label || failure.check}</p>
                  {failure.severity === 'critical' && (
                    <Badge className="bg-red-600 text-xs">CRITICAL</Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1">{failure.reason}</p>
                {failure.details && (
                  <p className="text-xs text-zinc-500 mt-1 font-mono">{failure.details}</p>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Passed Checks */}
        {passedChecks.map((check) => {
          const config = checkConfig[check];
          const Icon = config?.icon || CheckCircle2;
          
          return (
            <div key={check} className="flex items-center gap-3 text-sm text-zinc-500">
              <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
              <span>{config?.label || check}</span>
            </div>
          );
        })}
        
        {/* Summary */}
        <div className="pt-3 border-t border-zinc-800">
          {prereqResult.canRelease ? (
            <p className="text-xs text-green-400 font-medium">
              ✓ All critical prerequisites met. Ready to release.
            </p>
          ) : (
            <p className="text-xs text-red-400 font-medium">
              ✗ {prereqResult.criticalFailures.length} critical issue(s) must be resolved before release.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PrerequisitesBadge({ item, drawings, rfis }) {
  const result = checkPrerequisites(item, drawings, rfis);
  
  if (result.canRelease) {
    return (
      <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
        <CheckCircle2 size={12} className="mr-1" />
        Ready
      </Badge>
    );
  }
  
  return (
    <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">
      <AlertCircle size={12} className="mr-1" />
      {result.criticalFailures.length} Blocks
    </Badge>
  );
}