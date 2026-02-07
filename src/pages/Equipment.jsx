import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Wrench, BarChart3, CheckCircle2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import EquipmentLogForm from '@/components/equipment/EquipmentLogForm';
import EquipmentDashboard from '@/components/equipment/EquipmentDashboard';
import InspectionForm from '@/components/equipment/InspectionForm';
import { ActiveProjectProvider, useActiveProject } from '@/components/shared/hooks/useActiveProject';
import ResourceForm from '@/components/resources/ResourceForm';

function EquipmentContent() {
  const { activeProjectId, setActiveProjectId } = useActiveProject();
  const [activeTab, setActiveTab] = useState('log');
  const [filterEquipment, setFilterEquipment] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('7d');
  const [selectedEquipmentForInspection, setSelectedEquipmentForInspection] = useState('');
  const [showAddEquipment, setShowAddEquipment] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.filter({ status: 'in_progress' })
  });

  const { data: project } = useQuery({
    queryKey: ['project', activeProjectId],
    queryFn: () => base44.entities.Project.filter({ id: activeProjectId }),
    enabled: !!activeProjectId,
    select: (data) => data?.[0]
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment', activeProjectId],
    queryFn: () => base44.entities.Resource.filter({
      type: 'equipment',
      current_project_id: activeProjectId
    }),
    enabled: !!activeProjectId
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['equipmentLogs', activeProjectId, filterDateRange],
    queryFn: async () => {
      const allLogs = await base44.entities.EquipmentLog.filter({ project_id: activeProjectId });

      const daysBack = filterDateRange === '7d' ? 7 : filterDateRange === '30d' ? 30 : 14;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysBack);

      return allLogs.filter(log => new Date(log.log_date) >= cutoff);
    },
    enabled: !!activeProjectId
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ['inspections', activeProjectId],
    queryFn: () => base44.entities.InspectionChecklist.filter({ project_id: activeProjectId }),
    enabled: !!activeProjectId
  });

  const filteredLogs = useMemo(() => {
    if (filterEquipment === 'all') return logs;
    return logs.filter(log => log.equipment_id === filterEquipment);
  }, [logs, filterEquipment]);

  // KPIs
  const kpis = useMemo(() => {
    const totalHours = filteredLogs.reduce((sum, l) => sum + l.productive_hours + l.setup_time_hours + l.breakdown_time_hours + l.idle_hours, 0);
    const productiveHours = filteredLogs.reduce((sum, l) => sum + l.productive_hours, 0);
    const idleHours = filteredLogs.reduce((sum, l) => sum + l.idle_hours, 0);
    const conflicts = filteredLogs.reduce((sum, l) => sum + (l.conflicts?.length || 0), 0);
    const failedInspections = inspections.filter(i => i.overall_status === 'fail').length;

    return {
      total_hours: totalHours.toFixed(1),
      utilization: totalHours > 0 ? ((productiveHours / totalHours) * 100).toFixed(0) : 0,
      idle_hours: idleHours.toFixed(1),
      idle_cost: (idleHours * 150).toFixed(0),
      conflicts,
      inspections_failed: failedInspections
    };
  }, [filteredLogs, inspections]);

  return (
    <div className="space-y-6">
      {/* Header with Project Selector */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipment Management</h1>
          <p className="text-muted-foreground mt-2">{project?.name || 'No project selected'}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-80">
            <label className="text-sm font-medium text-foreground block mb-2">Switch Project</label>
            <Select value={activeProjectId || ''} onValueChange={setActiveProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map(proj => (
                  <SelectItem key={proj.id} value={proj.id}>
                    {proj.name} ({proj.project_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => setShowAddEquipment(true)}
          >
            <Plus size={16} className="mr-2" />
            Add Equipment
          </Button>
        </div>
      </div>

      {!activeProjectId && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Select a project to begin</p>
          </CardContent>
        </Card>
      )}

      {activeProjectId && (
      <>

      {/* KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Hours</p>
            <p className="text-2xl font-bold">{kpis.total_hours}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Utilization</p>
            <p className="text-2xl font-bold text-green-500">{kpis.utilization}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Idle Hours</p>
            <p className="text-2xl font-bold text-orange-500">{kpis.idle_hours}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Idle Cost</p>
            <p className="text-2xl font-bold text-red-500">${kpis.idle_cost}</p>
          </CardContent>
        </Card>
        <Card className={cn(kpis.conflicts > 0 && "border-red-500/40 bg-red-500/5")}>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Conflicts</p>
            <p className={cn("text-2xl font-bold", kpis.conflicts > 0 ? "text-red-500" : "text-green-500")}>
              {kpis.conflicts}
            </p>
          </CardContent>
        </Card>
        <Card className={cn(kpis.inspections_failed > 0 && "border-yellow-500/40 bg-yellow-500/5")}>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Failed Inspections</p>
            <p className={cn("text-2xl font-bold", kpis.inspections_failed > 0 ? "text-yellow-500" : "text-green-500")}>
              {kpis.inspections_failed}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filterEquipment} onValueChange={setFilterEquipment}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Equipment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Equipment</SelectItem>
            {equipment.map(eq => (
              <SelectItem key={eq.id} value={eq.id}>
                {eq.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterDateRange} onValueChange={setFilterDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="14d">Last 14 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted border border-border">
          <TabsTrigger value="log">
            <BarChart3 size={14} className="mr-2" />
            Daily Log
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <BarChart3 size={14} className="mr-2" />
            Utilization
          </TabsTrigger>
          <TabsTrigger value="inspection">
            <CheckCircle2 size={14} className="mr-2" />
            Inspections
          </TabsTrigger>
        </TabsList>

        {/* Daily Log Entry */}
        <TabsContent value="log">
          <EquipmentLogForm
            projectId={activeProjectId}
            onSuccess={() => setActiveTab('dashboard')}
          />
        </TabsContent>

        {/* Dashboard */}
        <TabsContent value="dashboard">
          <EquipmentDashboard logs={filteredLogs} equipment={equipment} />
        </TabsContent>

        {/* Inspections */}
        <TabsContent value="inspection" className="space-y-4">
            {equipment.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Equipment for Inspection</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedEquipmentForInspection} onValueChange={setSelectedEquipmentForInspection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose equipment..." />
                    </SelectTrigger>
                    <SelectContent>
                    {equipment.map(eq => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.name} ({eq.classification})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {selectedEquipmentForInspection && (
            <InspectionForm
              projectId={activeProjectId}
              equipmentId={selectedEquipmentForInspection}
              equipmentType={equipment.find(e => e.id === selectedEquipmentForInspection)?.classification?.toLowerCase().replace(/\s+/g, '_') || 'mobile_crane'}
              onSuccess={() => {
                setSelectedEquipmentForInspection('');
              }}
            />
          )}

          {/* Recent Inspections */}
          {inspections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Inspections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {inspections.slice(-10).reverse().map((insp, idx) => (
                    <div key={idx} className="p-3 rounded border text-sm flex items-center justify-between bg-muted/40">
                      <div>
                        <p className="font-medium">{insp.equipment_id}</p>
                        <p className="text-xs text-muted-foreground">{insp.inspection_date} • {insp.inspector_name}</p>
                      </div>
                      <Badge variant={
                        insp.overall_status === 'pass' ? 'default' :
                        insp.overall_status === 'fail' ? 'destructive' :
                        'outline'
                      }>
                        {insp.overall_status.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </>
      )}

      {/* Add Equipment Sheet */}
      <Sheet open={showAddEquipment} onOpenChange={setShowAddEquipment}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Equipment</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <ResourceForm
              resource={{ type: 'equipment', current_project_id: activeProjectId, assigned_project_ids: [] }}
              projects={projects || []}
              onSubmit={async (data) => {
                await base44.entities.Resource.create(data);
              }}
              onCancel={() => setShowAddEquipment(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function Equipment() {
  return (
    <ActiveProjectProvider>
      <EquipmentContent />
    </ActiveProjectProvider>
  );
}