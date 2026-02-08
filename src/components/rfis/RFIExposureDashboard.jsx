import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Clock, DollarSign, AlertTriangle } from 'lucide-react';

export default function RFIExposureDashboard({ projectId }) {
  const { data: rfis = [] } = useQuery({
    queryKey: ['projectRFIs', projectId],
    queryFn: () => base44.entities.RFI.filter({ project_id: projectId }),
    select: (data) => data || []
  });

  // Calculate exposure metrics
  const openRFIs = rfis.filter(r => !['closed', 'cancelled'].includes(r.status));
  
  const totalDetailHours = openRFIs.reduce((sum, r) => sum + (r.est_detail_hours || 0), 0);
  const fabricationHold = openRFIs.filter(r => r.fabrication_hold).length;
  
  const highRiskRFIs = openRFIs.filter(r => r.field_rework_risk === 'high');
  const medRiskRFIs = openRFIs.filter(r => r.field_rework_risk === 'med');

  // Cost estimate (rough: $50/hr detailing + $2000/day fab hold)
  const detailingCost = totalDetailHours * 50;
  const fabricationHoldCost = fabricationHold * 2000;
  const totalExposure = detailingCost + fabricationHoldCost;

  return (
    <div className="space-y-3">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Detailing Hours</div>
                <div className="text-lg font-bold text-amber-400">{totalDetailHours}</div>
              </div>
              <Clock size={20} className="text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Est. Exposure</div>
                <div className="text-lg font-bold text-red-400">${(totalExposure / 1000).toFixed(1)}K</div>
              </div>
              <DollarSign size={20} className="text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Risk Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {fabricationHold > 0 && (
            <div className="flex items-center justify-between p-2 bg-red-950/20 border border-red-800 rounded">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-red-500" />
                <span className="text-xs text-red-300">Fab Hold</span>
              </div>
              <Badge className="bg-red-600 text-white text-xs">{fabricationHold} RFI{fabricationHold !== 1 ? 's' : ''}</Badge>
            </div>
          )}

          {highRiskRFIs.length > 0 && (
            <div className="flex items-center justify-between p-2 bg-orange-950/20 border border-orange-800 rounded">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-orange-500" />
                <span className="text-xs text-orange-300">High Field Risk</span>
              </div>
              <Badge className="bg-orange-600 text-white text-xs">{highRiskRFIs.length}</Badge>
            </div>
          )}

          {medRiskRFIs.length > 0 && (
            <div className="flex items-center justify-between p-2 bg-yellow-950/20 border border-yellow-800 rounded">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-yellow-500" />
                <span className="text-xs text-yellow-300">Med Field Risk</span>
              </div>
              <Badge className="bg-yellow-600 text-white text-xs">{medRiskRFIs.length}</Badge>
            </div>
          )}

          {openRFIs.length === 0 && (
            <div className="text-xs text-green-400 text-center py-2">✓ No open RFIs</div>
          )}
        </CardContent>
      </Card>

      {/* Detail Breakdown */}
      {openRFIs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Open RFIs by Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {openRFIs
                .sort((a, b) => (b.est_detail_hours || 0) - (a.est_detail_hours || 0))
                .slice(0, 5)
                .map((rfi) => (
                  <div key={rfi.id} className="text-xs p-2 bg-slate-900 rounded border border-slate-700">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-semibold text-slate-300">RFI #{rfi.rfi_number}</span>
                      {rfi.est_detail_hours > 0 && (
                        <span className="text-amber-300 font-mono">{rfi.est_detail_hours}h</span>
                      )}
                    </div>
                    <div className="text-slate-400 mt-0.5 line-clamp-1">{rfi.subject}</div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}