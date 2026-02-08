import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Lock, AlertTriangle } from 'lucide-react';

export default function FabricationReadinessPanel({ rfis = [], drawingSets = [], fabricationTasks = [] }) {
  const readinessAnalysis = useMemo(() => {
    const analysis = {
      ready_for_release: [],
      blocked_by_rfis: [],
      at_risk: [],
      rfi_impact_map: {}
    };

    // Find RFIs blocking fabrication
    const fabBlockers = rfis.filter(rfi => 
      rfi.blocker_info?.is_blocker && rfi.blocker_info.blocked_work === 'fabrication' && rfi.status !== 'closed'
    );

    drawingSets?.forEach(ds => {
      if (ds.status === 'IFA' || ds.status === 'BFA') {
        // Check if any blocking RFI affects this drawing set
        const affectingRFI = fabBlockers.find(rfi => rfi.linked_drawing_set_ids?.includes(ds.id));
        
        if (affectingRFI) {
          analysis.blocked_by_rfis.push({
            drawing_set: ds,
            blocking_rfi: affectingRFI,
            status: 'BLOCKED'
          });
        } else if (ds.status === 'IFA') {
          analysis.at_risk.push({
            drawing_set: ds,
            status: 'PENDING_APPROVAL'
          });
        } else {
          analysis.ready_for_release.push({
            drawing_set: ds,
            status: 'READY'
          });
        }
      }
    });

    return analysis;
  }, [rfis, drawingSets]);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-green-900/20 border-green-700">
          <CardContent className="pt-3">
            <div className="text-xs text-green-400 uppercase font-bold">Ready to Release</div>
            <div className="text-2xl font-bold text-green-500">{readinessAnalysis.ready_for_release.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-900/20 border-yellow-700">
          <CardContent className="pt-3">
            <div className="text-xs text-yellow-400 uppercase font-bold">At Risk (Pending)</div>
            <div className="text-2xl font-bold text-yellow-500">{readinessAnalysis.at_risk.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-900/20 border-red-700">
          <CardContent className="pt-3">
            <div className="text-xs text-red-400 uppercase font-bold">Blocked by RFI</div>
            <div className="text-2xl font-bold text-red-500">{readinessAnalysis.blocked_by_rfis.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Blocked Drawings */}
      {readinessAnalysis.blocked_by_rfis.length > 0 && (
        <Card className="bg-red-900/20 border-red-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Lock size={16} className="text-red-500" />
              Drawings Blocked by RFIs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {readinessAnalysis.blocked_by_rfis.map((item, idx) => (
              <div key={idx} className="p-2 bg-zinc-800 rounded border-l-2 border-red-600">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-white">{item.drawing_set.set_name}</div>
                    <div className="text-xs text-zinc-400">Blocked by RFI #{item.blocking_rfi.rfi_number}</div>
                    <div className="text-xs text-red-300 mt-1">{item.blocking_rfi.subject}</div>
                  </div>
                  <Badge variant="destructive">BLOCKED</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Ready to Release */}
      {readinessAnalysis.ready_for_release.length > 0 && (
        <Card className="bg-green-900/20 border-green-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle2 size={16} className="text-green-500" />
              Ready for Fabrication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {readinessAnalysis.ready_for_release.map((item, idx) => (
              <div key={idx} className="p-2 bg-zinc-800 rounded border-l-2 border-green-600 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold">{item.drawing_set.set_name}</span>
                  <Badge className="bg-green-700">READY</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* At Risk (Pending Approval) */}
      {readinessAnalysis.at_risk.length > 0 && (
        <Card className="bg-yellow-900/20 border-yellow-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle size={16} className="text-yellow-500" />
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {readinessAnalysis.at_risk.map((item, idx) => (
              <div key={idx} className="p-2 bg-zinc-800 rounded border-l-2 border-yellow-600 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold">{item.drawing_set.set_name}</span>
                  <Badge className="bg-yellow-700">IFA</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}