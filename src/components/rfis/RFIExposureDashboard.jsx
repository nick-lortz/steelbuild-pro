import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Clock, AlertTriangle, Package } from 'lucide-react';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';

export default function RFIExposureDashboard() {
  const { activeProjectId } = useActiveProject();

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', activeProjectId],
    queryFn: () => base44.entities.RFI.filter({
      project_id: activeProjectId,
      status: { $in: ['submitted', 'under_review', 'internal_review'] }
    }),
    enabled: !!activeProjectId
  });

  const totalDetailHours = rfis.reduce((sum, rfi) => sum + (rfi.est_detail_hours || 0), 0);
  const totalCost = totalDetailHours * 125;
  const fabricationHoldCount = rfis.filter(r => r.fabrication_hold).length;
  const highRiskCount = rfis.filter(r => r.field_rework_risk === 'high').length;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign size={16} className="text-amber-500" />
            Cost Exposure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${totalCost.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Open RFIs</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock size={16} className="text-blue-500" />
            Detail Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalDetailHours}</div>
          <p className="text-xs text-muted-foreground">Est. to resolve</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package size={16} className="text-red-500" />
            Fab Holds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{fabricationHoldCount}</div>
          <p className="text-xs text-muted-foreground">Shop waiting</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-500" />
            High Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{highRiskCount}</div>
          <p className="text-xs text-muted-foreground">Field rework</p>
        </CardContent>
      </Card>
    </div>
  );
}