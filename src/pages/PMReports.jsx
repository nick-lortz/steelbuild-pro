import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveProject } from '@/components/shared/hooks/useActiveProject';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, TrendingUp, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PMReports() {
  const { activeProjectId } = useActiveProject();

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: () => base44.entities.Project.filter({ id: activeProjectId }),
    enabled: !!activeProjectId,
    select: (data) => data[0]
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['changeOrders', activeProjectId],
    queryFn: () => base44.entities.ChangeOrder.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: coLineItems = [] } = useQuery({
    queryKey: ['coLineItems', activeProjectId],
    queryFn: () => base44.entities.ChangeOrderLineItem.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: shippingRecords = [] } = useQuery({
    queryKey: ['shippingRecords', activeProjectId],
    queryFn: () => base44.entities.ShippingCostRecord.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: travelRecords = [] } = useQuery({
    queryKey: ['travelRecords', activeProjectId],
    queryFn: () => base44.entities.TravelCostRecord.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', activeProjectId],
    queryFn: () => base44.entities.ProjectContact.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ['rfis', activeProjectId],
    queryFn: () => base44.entities.RFI.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const coSummary = useMemo(() => {
    const byStatus = {};
    const byValue = [];

    changeOrders.forEach(co => {
      const items = coLineItems.filter(li => li.change_order_id === co.id);
      const credits = items.filter(i => i.type === 'credit').reduce((sum, i) => sum + (i.price || 0), 0);
      const charges = items.filter(i => i.type === 'charge').reduce((sum, i) => sum + (i.price || 0), 0);
      const net = charges - credits;

      byStatus[co.status] = (byStatus[co.status] || 0) + 1;
      byValue.push({
        co_number: co.co_number,
        title: co.title,
        status: co.status,
        credits,
        charges,
        net
      });
    });

    return { byStatus, byValue };
  }, [changeOrders, coLineItems]);

  const shippingTravelSummary = useMemo(() => {
    const totalShipping = shippingRecords.reduce((sum, r) => sum + (r.total_cost || 0), 0);
    const totalTravel = travelRecords.reduce((sum, r) => sum + (r.total_cost || 0), 0);
    const totalLoads = shippingRecords.reduce((sum, r) => sum + (r.loads_shipped || 0), 0);

    return {
      totalShipping,
      totalTravel,
      totalLoads,
      combined: totalShipping + totalTravel,
      shippingRecords,
      travelRecords
    };
  }, [shippingRecords, travelRecords]);

  const jobSnapshot = useMemo(() => {
    const openRFIs = rfis.filter(r => !['closed', 'answered'].includes(r.status)).length;
    const totalCOValue = coSummary.byValue.reduce((sum, co) => sum + co.net, 0);
    const approvedCOs = changeOrders.filter(co => co.status === 'approved').length;
    const pendingCOs = changeOrders.filter(co => co.status === 'submitted').length;

    return {
      project_number: project?.project_number,
      project_name: project?.name,
      pm: project?.project_manager,
      superintendent: project?.superintendent,
      total_cos: changeOrders.length,
      approved_cos: approvedCOs,
      pending_cos: pendingCOs,
      total_co_value: totalCOValue,
      open_rfis: openRFIs,
      shipping_travel_total: shippingTravelSummary.combined,
      total_contacts: contacts.length
    };
  }, [project, changeOrders, coSummary, rfis, shippingTravelSummary, contacts]);

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!activeProjectId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Select a project to view reports
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#E5E7EB]">PM Toolkit Reports</h1>
        <p className="text-sm text-[#9CA3AF]">{project?.project_number} - Custom Reports & Export</p>
      </div>

      <Tabs defaultValue="co_summary">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="co_summary">CO Summary</TabsTrigger>
          <TabsTrigger value="shipping_travel">Shipping & Travel</TabsTrigger>
          <TabsTrigger value="snapshot">Job Snapshot</TabsTrigger>
        </TabsList>

        <TabsContent value="co_summary" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Change Orders by Status
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => exportToCSV(
                    Object.entries(coSummary.byStatus).map(([status, count]) => ({ status, count })),
                    'co_by_status'
                  )}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(coSummary.byStatus).map(([status, count]) => (
                  <div key={status} className="p-4 bg-[#0A0A0A] rounded-lg border border-[rgba(255,255,255,0.05)]">
                    <p className="text-sm text-[#9CA3AF] capitalize">{status}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Change Orders by Value
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => exportToCSV(coSummary.byValue, 'co_by_value')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {coSummary.byValue.map((co, idx) => (
                  <div key={idx} className="p-3 border border-[rgba(255,255,255,0.05)] rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-[#6B7280]">CO #{co.co_number}</span>
                          <Badge>{co.status}</Badge>
                        </div>
                        <p className="text-sm mt-1">{co.title}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[#9CA3AF]">Credits: <span className="text-green-500">${co.credits.toLocaleString()}</span></p>
                        <p className="text-xs text-[#9CA3AF]">Charges: <span className="text-[#FF9D42]">${co.charges.toLocaleString()}</span></p>
                        <p className="text-sm font-semibold mt-1">Net: ${co.net.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.1)]">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Net Value:</span>
                  <span className="text-xl font-bold text-[#FF9D42]">
                    ${coSummary.byValue.reduce((sum, co) => sum + co.net, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipping_travel" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Total Shipping</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-[#FF9D42]">${shippingTravelSummary.totalShipping.toLocaleString()}</p>
                <p className="text-sm text-[#6B7280] mt-1">{shippingTravelSummary.totalLoads} loads</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Total Travel</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-[#FF9D42]">${shippingTravelSummary.totalTravel.toLocaleString()}</p>
                <p className="text-sm text-[#6B7280] mt-1">{travelRecords.length} records</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Combined Total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-[#FF9D42]">${shippingTravelSummary.combined.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Shipping Details</CardTitle>
                <Button
                  size="sm"
                  onClick={() => exportToCSV(
                    shippingRecords.map(r => ({
                      loads: r.loads_shipped,
                      distance_miles: r.distance_miles,
                      total_cost: r.total_cost,
                      per_load: r.per_load_cost,
                      date: r.calculated_at?.split('T')[0]
                    })),
                    'shipping_records'
                  )}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {shippingRecords.map((record, idx) => (
                  <div key={idx} className="p-3 bg-[#0A0A0A] rounded border border-[rgba(255,255,255,0.05)]">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm">{record.loads_shipped} loads • {record.distance_miles} mi</p>
                        <p className="text-xs text-[#6B7280]">{new Date(record.calculated_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${record.total_cost?.toLocaleString()}</p>
                        <p className="text-xs text-[#6B7280]">${record.per_load_cost?.toLocaleString()}/load</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Travel Details</CardTitle>
                <Button
                  size="sm"
                  onClick={() => exportToCSV(
                    travelRecords.map(r => ({
                      duration_weeks: r.duration_weeks,
                      men: r.men,
                      distance_miles: r.distance_miles,
                      total_cost: r.total_cost,
                      date: r.calculated_at?.split('T')[0]
                    })),
                    'travel_records'
                  )}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {travelRecords.map((record, idx) => (
                  <div key={idx} className="p-3 bg-[#0A0A0A] rounded border border-[rgba(255,255,255,0.05)]">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm">{record.duration_weeks}wk • {record.men} men • {record.distance_miles} mi</p>
                        <p className="text-xs text-[#6B7280]">{new Date(record.calculated_at).toLocaleDateString()}</p>
                      </div>
                      <p className="font-semibold">${record.total_cost?.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="snapshot" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Job Status Snapshot
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => exportToCSV([jobSnapshot], 'job_snapshot')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#9CA3AF]">Project Number</p>
                  <p className="font-semibold">{jobSnapshot.project_number}</p>
                </div>
                <div>
                  <p className="text-sm text-[#9CA3AF]">Project Name</p>
                  <p className="font-semibold">{jobSnapshot.project_name}</p>
                </div>
                <div>
                  <p className="text-sm text-[#9CA3AF]">PM</p>
                  <p className="font-semibold">{jobSnapshot.pm || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-sm text-[#9CA3AF]">Superintendent</p>
                  <p className="font-semibold">{jobSnapshot.superintendent || 'Not assigned'}</p>
                </div>
              </div>

              <div className="border-t border-[rgba(255,255,255,0.1)] pt-4">
                <h4 className="font-semibold mb-3">Change Orders</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-[#0A0A0A] rounded">
                    <p className="text-xs text-[#9CA3AF]">Total COs</p>
                    <p className="text-xl font-bold">{jobSnapshot.total_cos}</p>
                  </div>
                  <div className="p-3 bg-[#0A0A0A] rounded">
                    <p className="text-xs text-[#9CA3AF]">Approved</p>
                    <p className="text-xl font-bold text-green-500">{jobSnapshot.approved_cos}</p>
                  </div>
                  <div className="p-3 bg-[#0A0A0A] rounded">
                    <p className="text-xs text-[#9CA3AF]">Pending</p>
                    <p className="text-xl font-bold text-yellow-500">{jobSnapshot.pending_cos}</p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-[#0A0A0A] rounded border border-[rgba(255,157,66,0.2)]">
                  <p className="text-sm text-[#9CA3AF]">Total CO Value</p>
                  <p className="text-2xl font-bold text-[#FF9D42]">${jobSnapshot.total_co_value.toLocaleString()}</p>
                </div>
              </div>

              <div className="border-t border-[rgba(255,255,255,0.1)] pt-4">
                <h4 className="font-semibold mb-3">Other Metrics</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-[#0A0A0A] rounded">
                    <p className="text-xs text-[#9CA3AF]">Open RFIs</p>
                    <p className="text-xl font-bold">{jobSnapshot.open_rfis}</p>
                  </div>
                  <div className="p-3 bg-[#0A0A0A] rounded">
                    <p className="text-xs text-[#9CA3AF]">Ship/Travel Cost</p>
                    <p className="text-xl font-bold">${jobSnapshot.shipping_travel_total.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-[#0A0A0A] rounded">
                    <p className="text-xs text-[#9CA3AF]">Total Contacts</p>
                    <p className="text-xl font-bold">{jobSnapshot.total_contacts}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}