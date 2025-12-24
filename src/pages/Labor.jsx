import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Clock, CheckCircle, Users, TrendingUp } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';

export default function Labor() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    project_id: '',
    resource_id: '',
    work_date: format(new Date(), 'yyyy-MM-dd'),
    hours: '',
    overtime_hours: '',
    cost_code_id: '',
    description: '',
    approved: false,
  });

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list('name'),
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['costCodes'],
    queryFn: () => base44.entities.CostCode.list('code'),
  });

  const { data: laborHours = [] } = useQuery({
    queryKey: ['laborHours'],
    queryFn: () => base44.entities.LaborHours.list('-work_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LaborHours.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laborHours'] });
      setShowForm(false);
      setFormData({
        project_id: '',
        resource_id: '',
        work_date: format(new Date(), 'yyyy-MM-dd'),
        hours: '',
        overtime_hours: '',
        cost_code_id: '',
        description: '',
        approved: false,
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      hours: parseFloat(formData.hours) || 0,
      overtime_hours: parseFloat(formData.overtime_hours) || 0,
    };
    createMutation.mutate(data);
  };

  const laborResources = resources.filter(r => r.type === 'labor');

  const columns = [
    {
      header: 'Date',
      accessor: 'work_date',
      render: (row) => format(new Date(row.work_date), 'MMM d, yyyy'),
    },
    {
      header: 'Worker',
      accessor: 'resource_id',
      render: (row) => {
        const resource = resources.find(r => r.id === row.resource_id);
        return (
          <div>
            <p className="font-medium">{resource?.name || '-'}</p>
            <p className="text-xs text-zinc-500">{resource?.classification}</p>
          </div>
        );
      },
    },
    {
      header: 'Project',
      accessor: 'project_id',
      render: (row) => {
        const project = projects.find(p => p.id === row.project_id);
        return <span className="text-zinc-300">{project?.name || '-'}</span>;
      },
    },
    {
      header: 'Hours',
      accessor: 'hours',
      render: (row) => (
        <div>
          <p className="font-mono">{row.hours}h</p>
          {row.overtime_hours > 0 && (
            <p className="text-xs text-amber-400">+{row.overtime_hours}h OT</p>
          )}
        </div>
      ),
    },
    {
      header: 'Cost Code',
      accessor: 'cost_code_id',
      render: (row) => {
        const code = costCodes.find(c => c.id === row.cost_code_id);
        return <span className="font-mono text-sm">{code?.code || '-'}</span>;
      },
    },
    {
      header: 'Status',
      accessor: 'approved',
      render: (row) => (
        row.approved 
          ? <StatusBadge status="approved" />
          : <StatusBadge status="pending" />
      ),
    },
  ];

  const totalHours = laborHours.reduce((sum, l) => sum + (l.hours || 0), 0);
  const totalOT = laborHours.reduce((sum, l) => sum + (l.overtime_hours || 0), 0);
  const pendingApproval = laborHours.filter(l => !l.approved).length;

  // Forecast calculations
  const last30Days = laborHours.filter(l => {
    const daysAgo = (new Date() - new Date(l.work_date)) / (1000 * 60 * 60 * 24);
    return daysAgo <= 30;
  });
  const avgDailyHours = last30Days.length > 0 
    ? last30Days.reduce((sum, l) => sum + (l.hours || 0), 0) / 30 
    : 0;

  return (
    <div>
      <PageHeader
        title="Labor Management"
        subtitle="Track hours and labor costs"
        actions={
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            <Plus size={18} className="mr-2" />
            Log Hours
          </Button>
        }
      />

      <Tabs defaultValue="hours" className="mb-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="hours">Hours Entry</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="hours" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-400 text-sm">Total Hours</p>
                    <p className="text-2xl font-bold text-white">{totalHours.toFixed(1)}</p>
                  </div>
                  <Clock className="text-amber-500" size={24} />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-400 text-sm">Overtime</p>
                    <p className="text-2xl font-bold text-amber-400">{totalOT.toFixed(1)}h</p>
                  </div>
                  <Clock className="text-amber-500" size={24} />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-400 text-sm">Pending Approval</p>
                    <p className="text-2xl font-bold text-amber-400">{pendingApproval}</p>
                  </div>
                  <CheckCircle className="text-amber-500" size={24} />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-400 text-sm">Active Workers</p>
                    <p className="text-2xl font-bold text-white">{laborResources.length}</p>
                  </div>
                  <Users className="text-zinc-500" size={24} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <DataTable
            columns={columns}
            data={laborHours}
            emptyMessage="No hours logged yet. Start tracking labor hours."
          />
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Labor Forecast</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <p className="text-zinc-400 text-sm mb-1">Avg Daily Hours (30d)</p>
                  <p className="text-2xl font-bold text-white">{avgDailyHours.toFixed(1)}h</p>
                </div>
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <p className="text-zinc-400 text-sm mb-1">Projected Weekly</p>
                  <p className="text-2xl font-bold text-amber-400">{(avgDailyHours * 7).toFixed(1)}h</p>
                </div>
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <p className="text-zinc-400 text-sm mb-1">Projected Monthly</p>
                  <p className="text-2xl font-bold text-blue-400">{(avgDailyHours * 30).toFixed(1)}h</p>
                </div>
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <p className="text-zinc-400 text-sm mb-1">OT Ratio</p>
                  <p className="text-2xl font-bold text-white">
                    {totalHours > 0 ? ((totalOT / totalHours) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>

              {/* Worker Breakdown */}
              <div className="border-t border-zinc-800 pt-4">
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Worker Performance</h4>
                <div className="space-y-2">
                  {laborResources.map(worker => {
                    const workerHours = laborHours.filter(l => l.resource_id === worker.id);
                    const totalWorkerHours = workerHours.reduce((sum, l) => sum + (l.hours || 0), 0);
                    return (
                      <div key={worker.id} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded">
                        <span className="text-sm text-zinc-300">{worker.name}</span>
                        <span className="text-sm font-mono text-white">{totalWorkerHours.toFixed(1)}h</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Log Hours</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Worker *</Label>
                <Select value={formData.resource_id} onValueChange={(v) => setFormData({ ...formData, resource_id: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Select worker" />
                  </SelectTrigger>
                  <SelectContent>
                    {laborResources.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.work_date}
                  onChange={(e) => setFormData({ ...formData, work_date: e.target.value })}
                  required
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={formData.project_id} onValueChange={(v) => setFormData({ ...formData, project_id: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hours *</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  required
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Overtime Hours</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.overtime_hours}
                  onChange={(e) => setFormData({ ...formData, overtime_hours: e.target.value })}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cost Code</Label>
              <Select value={formData.cost_code_id} onValueChange={(v) => setFormData({ ...formData, cost_code_id: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Select cost code" />
                </SelectTrigger>
                <SelectContent>
                  {costCodes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {createMutation.isPending ? 'Saving...' : 'Log Hours'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}