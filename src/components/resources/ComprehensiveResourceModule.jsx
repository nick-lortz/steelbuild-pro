import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DataTable from '@/components/ui/DataTable';
import { 
  Users, DollarSign, TrendingUp, Calendar, BarChart3, 
  Plus, Edit, Package, Wrench, AlertTriangle 
} from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { format, parseISO } from 'date-fns';

export default function ComprehensiveResourceModule({ projectId }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [selectedSOV, setSelectedSOV] = useState(null);

  const formatCurrency = (value) => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Fetch all required data
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => base44.entities.Project.filter({ id: projectId }).then(p => p[0]),
    enabled: !!projectId
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sovItems', projectId],
    queryFn: () => base44.entities.SOVItem.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: resourceAssignments = [] } = useQuery({
    queryKey: ['resourceSOVAssignments', projectId],
    queryFn: () => base44.entities.ResourceSOVAssignment.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: resourceCosts = [] } = useQuery({
    queryKey: ['resourceCosts', projectId],
    queryFn: () => base44.entities.ResourceCost.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['resourceAllocations'],
    queryFn: () => base44.entities.ResourceAllocation.list(),
    staleTime: 5 * 60 * 1000
  });

  // Create SOV assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: (data) => base44.entities.ResourceSOVAssignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resourceSOVAssignments'] });
      setAssignDialogOpen(false);
      toast.success('Resource assigned to SOV line');
    },
    onError: (error) => toast.error(error.message || 'Assignment failed')
  });

  // Log resource cost mutation
  const logCostMutation = useMutation({
    mutationFn: (data) => base44.entities.ResourceCost.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resourceCosts'] });
      toast.success('Cost recorded');
    }
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const projectResources = resources.filter(r => 
      allocations.some(a => a.resource_id === r.id && a.project_id === projectId)
    );

    const totalEstimatedCost = resourceAssignments.reduce((sum, a) => sum + (a.estimated_cost || 0), 0);
    const totalActualCost = resourceCosts.reduce((sum, c) => sum + (c.total_cost || 0), 0);
    const totalEstimatedHours = resourceAssignments.reduce((sum, a) => sum + (a.estimated_hours || 0), 0);
    const totalActualHours = resourceCosts.reduce((sum, c) => sum + (c.hours_worked || 0), 0);

    const costBySOV = {};
    resourceCosts.forEach(cost => {
      if (!costBySOV[cost.sov_code]) {
        costBySOV[cost.sov_code] = { estimated: 0, actual: 0, hours: 0 };
      }
      costBySOV[cost.sov_code].actual += cost.total_cost || 0;
      costBySOV[cost.sov_code].hours += cost.hours_worked || 0;
    });

    resourceAssignments.forEach(assignment => {
      if (!costBySOV[assignment.sov_code]) {
        costBySOV[assignment.sov_code] = { estimated: 0, actual: 0, hours: 0 };
      }
      costBySOV[assignment.sov_code].estimated += assignment.estimated_cost || 0;
    });

    const costByResource = {};
    resourceCosts.forEach(cost => {
      if (!costByResource[cost.resource_id]) {
        costByResource[cost.resource_id] = { actual: 0, hours: 0 };
      }
      costByResource[cost.resource_id].actual += cost.total_cost || 0;
      costByResource[cost.resource_id].hours += cost.hours_worked || 0;
    });

    return {
      projectResourceCount: projectResources.length,
      totalEstimatedCost,
      totalActualCost,
      costVariance: totalEstimatedCost - totalActualCost,
      totalEstimatedHours,
      totalActualHours,
      hoursVariance: totalEstimatedHours - totalActualHours,
      costBySOV,
      costByResource,
      utilizationRate: totalEstimatedHours > 0 ? (totalActualHours / totalEstimatedHours) * 100 : 0
    };
  }, [resources, allocations, resourceAssignments, resourceCosts, projectId]);

  // Resource-SOV matrix data
  const resourceSOVMatrix = useMemo(() => {
    return resources.map(resource => {
      const assignments = resourceAssignments.filter(a => a.resource_id === resource.id);
      const costs = resourceCosts.filter(c => c.resource_id === resource.id);
      
      const totalEstimated = assignments.reduce((sum, a) => sum + (a.estimated_hours || 0), 0);
      const totalActual = costs.reduce((sum, c) => sum + (c.hours_worked || 0), 0);
      const totalCost = costs.reduce((sum, c) => sum + (c.total_cost || 0), 0);

      return {
        resource,
        assignmentCount: assignments.length,
        totalEstimatedHours: totalEstimated,
        totalActualHours: totalActual,
        totalCost,
        utilization: totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : 0
      };
    }).filter(r => r.assignmentCount > 0);
  }, [resources, resourceAssignments, resourceCosts]);

  // SOV cost summary
  const sovCostSummary = useMemo(() => {
    return sovItems.map(sov => {
      const assignments = resourceAssignments.filter(a => a.sov_code === sov.sov_code);
      const costs = resourceCosts.filter(c => c.sov_code === sov.sov_code);
      
      const estimatedCost = assignments.reduce((sum, a) => sum + (a.estimated_cost || 0), 0);
      const actualCost = costs.reduce((sum, c) => sum + (c.total_cost || 0), 0);
      const estimatedHours = assignments.reduce((sum, a) => sum + (a.estimated_hours || 0), 0);
      const actualHours = costs.reduce((sum, c) => sum + (c.hours_worked || 0), 0);

      return {
        sov,
        resourceCount: assignments.length,
        estimatedCost,
        actualCost,
        variance: estimatedCost - actualCost,
        estimatedHours,
        actualHours,
        hoursVariance: estimatedHours - actualHours
      };
    }).filter(s => s.resourceCount > 0);
  }, [sovItems, resourceAssignments, resourceCosts]);

  const resourceColumns = [
    { 
      header: 'Resource', 
      accessor: 'resource',
      render: (row) => (
        <div>
          <p className="font-semibold text-white text-sm">{row.resource.name}</p>
          <Badge variant="outline" className="text-[10px] capitalize mt-1">
            {row.resource.type}
          </Badge>
        </div>
      )
    },
    { 
      header: 'SOV Assignments', 
      accessor: 'assignmentCount',
      render: (row) => <span className="text-sm">{row.assignmentCount}</span>
    },
    { 
      header: 'Est. Hours', 
      accessor: 'totalEstimatedHours',
      render: (row) => <span className="text-sm">{row.totalEstimatedHours.toFixed(1)}</span>
    },
    { 
      header: 'Actual Hours', 
      accessor: 'totalActualHours',
      render: (row) => (
        <span className={`text-sm font-semibold ${
          row.totalActualHours > row.totalEstimatedHours ? 'text-red-400' : 'text-green-400'
        }`}>
          {row.totalActualHours.toFixed(1)}
        </span>
      )
    },
    { 
      header: 'Utilization', 
      accessor: 'utilization',
      render: (row) => (
        <span className={`text-sm ${
          row.utilization > 100 ? 'text-red-400' : row.utilization > 80 ? 'text-amber-400' : 'text-green-400'
        }`}>
          {row.utilization.toFixed(0)}%
        </span>
      )
    },
    { 
      header: 'Total Cost', 
      accessor: 'totalCost',
      render: (row) => <span className="text-sm font-semibold">${formatCurrency(row.totalCost)}</span>
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setSelectedResource(row.resource);
            setAssignDialogOpen(true);
          }}
          className="text-xs"
        >
          <Plus size={14} className="mr-1" />
          Assign
        </Button>
      )
    }
  ];

  const sovColumns = [
    { 
      header: 'SOV Code', 
      accessor: 'sov',
      render: (row) => (
        <div>
          <p className="font-mono text-sm font-semibold">{row.sov.sov_code}</p>
          <p className="text-xs text-zinc-500 truncate max-w-xs">{row.sov.description}</p>
        </div>
      )
    },
    { 
      header: 'Resources', 
      accessor: 'resourceCount',
      render: (row) => <span className="text-sm">{row.resourceCount}</span>
    },
    { 
      header: 'Est. Cost', 
      accessor: 'estimatedCost',
      render: (row) => <span className="text-sm">${formatCurrency(row.estimatedCost)}</span>
    },
    { 
      header: 'Actual Cost', 
      accessor: 'actualCost',
      render: (row) => <span className="text-sm font-semibold">${formatCurrency(row.actualCost)}</span>
    },
    { 
      header: 'Variance', 
      accessor: 'variance',
      render: (row) => (
        <span className={`text-sm font-semibold ${
          row.variance >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          ${formatCurrency(Math.abs(row.variance))}
        </span>
      )
    },
    { 
      header: 'Est. Hours', 
      accessor: 'estimatedHours',
      render: (row) => <span className="text-sm">{row.estimatedHours.toFixed(1)}</span>
    },
    { 
      header: 'Actual Hours', 
      accessor: 'actualHours',
      render: (row) => <span className="text-sm">{row.actualHours.toFixed(1)}</span>
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Project Resources</p>
                <p className="text-3xl font-bold text-white">{metrics.projectResourceCount}</p>
                <p className="text-xs text-zinc-500 mt-1">Allocated</p>
              </div>
              <Users size={24} className="text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Estimated Cost</p>
                <p className="text-2xl font-bold text-amber-400">${(metrics.totalEstimatedCost / 1000).toFixed(1)}K</p>
                <p className="text-xs text-zinc-500 mt-1">{metrics.totalEstimatedHours.toFixed(0)} hrs</p>
              </div>
              <DollarSign size={24} className="text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Actual Cost</p>
                <p className="text-2xl font-bold text-blue-400">${(metrics.totalActualCost / 1000).toFixed(1)}K</p>
                <p className="text-xs text-zinc-500 mt-1">{metrics.totalActualHours.toFixed(0)} hrs</p>
              </div>
              <BarChart3 size={24} className="text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Cost Variance</p>
                <p className={`text-2xl font-bold ${
                  metrics.costVariance >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  ${(Math.abs(metrics.costVariance) / 1000).toFixed(1)}K
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {metrics.costVariance >= 0 ? 'Under' : 'Over'} budget
                </p>
              </div>
              <TrendingUp size={24} className={metrics.costVariance >= 0 ? 'text-green-500' : 'text-red-500'} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="overview">
            <BarChart3 size={14} className="mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="resources">
            <Users size={14} className="mr-2" />
            By Resource
          </TabsTrigger>
          <TabsTrigger value="sov">
            <Package size={14} className="mr-2" />
            By SOV Line
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <Calendar size={14} className="mr-2" />
            Assignments
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Resource Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Overall Utilization</span>
                    <span className={`text-lg font-bold ${
                      metrics.utilizationRate > 100 ? 'text-red-400' :
                      metrics.utilizationRate > 80 ? 'text-amber-400' :
                      'text-green-400'
                    }`}>
                      {metrics.utilizationRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Hours Variance</span>
                    <span className={`text-sm font-semibold ${
                      metrics.hoursVariance >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {metrics.hoursVariance >= 0 ? '+' : ''}{metrics.hoursVariance.toFixed(1)} hrs
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Cost Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Budget Utilization</span>
                    <span className={`text-lg font-bold ${
                      metrics.totalActualCost > metrics.totalEstimatedCost ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {metrics.totalEstimatedCost > 0 
                        ? ((metrics.totalActualCost / metrics.totalEstimatedCost) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Cost Performance</span>
                    <Badge className={
                      metrics.costVariance >= 0 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }>
                      {metrics.costVariance >= 0 ? 'On Budget' : 'Over Budget'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base">Resource Cost & Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={resourceColumns}
                data={resourceSOVMatrix}
                emptyMessage="No resource assignments found"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* SOV Tab */}
        <TabsContent value="sov">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base">SOV Line Item Resource Costs</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={sovColumns}
                data={sovCostSummary}
                emptyMessage="No SOV assignments found"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Active Assignments</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setAssignDialogOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
                >
                  <Plus size={14} className="mr-1" />
                  New Assignment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {resourceAssignments.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    No assignments yet. Create assignments to track resource costs by SOV line.
                  </div>
                ) : (
                  resourceAssignments.map(assignment => {
                    const resource = resources.find(r => r.id === assignment.resource_id);
                    const sov = sovItems.find(s => s.sov_code === assignment.sov_code);
                    
                    return (
                      <div key={assignment.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {assignment.sov_code}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {assignment.status}
                              </Badge>
                            </div>
                            <p className="text-sm font-semibold text-white">{resource?.name || 'Unknown'}</p>
                            <p className="text-xs text-zinc-500 truncate">{sov?.description || 'Unknown SOV'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">
                              {assignment.actual_hours.toFixed(1)} / {assignment.estimated_hours.toFixed(1)} hrs
                            </p>
                            <p className="text-xs text-zinc-500">
                              ${formatCurrency(assignment.actual_cost)} / ${formatCurrency(assignment.estimated_cost)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Assign Resource to SOV Line</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block">Resource</label>
              <select
                className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded text-white"
                onChange={(e) => setSelectedResource(resources.find(r => r.id === e.target.value))}
                value={selectedResource?.id || ''}
              >
                <option value="">Select resource...</option>
                {resources.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block">SOV Line Item</label>
              <select
                className="w-full p-2 bg-zinc-950 border border-zinc-800 rounded text-white"
                onChange={(e) => setSelectedSOV(sovItems.find(s => s.sov_code === e.target.value))}
                value={selectedSOV?.sov_code || ''}
              >
                <option value="">Select SOV line...</option>
                {sovItems.map(s => (
                  <option key={s.id} value={s.sov_code}>
                    {s.sov_code} - {s.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block">Estimated Hours</label>
                <Input
                  type="number"
                  placeholder="0"
                  className="bg-zinc-950 border-zinc-800"
                  id="estimated-hours"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block">Rate ($/hr)</label>
                <Input
                  type="number"
                  placeholder="0"
                  defaultValue={selectedResource?.rate || 0}
                  className="bg-zinc-950 border-zinc-800"
                  id="rate"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                variant="outline"
                onClick={() => {
                  setAssignDialogOpen(false);
                  setSelectedResource(null);
                  setSelectedSOV(null);
                }}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const hours = parseFloat(document.getElementById('estimated-hours').value) || 0;
                  const rate = parseFloat(document.getElementById('rate').value) || selectedResource?.rate || 0;
                  
                  createAssignmentMutation.mutate({
                    resource_id: selectedResource?.id,
                    project_id: projectId,
                    sov_code: selectedSOV?.sov_code,
                    estimated_hours: hours,
                    estimated_cost: hours * rate,
                    actual_hours: 0,
                    actual_cost: 0,
                    status: 'planned'
                  });
                }}
                disabled={!selectedResource || !selectedSOV}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
              >
                Create Assignment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}