import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import DataTable from '@/components/ui/DataTable';
import { Clock, DollarSign, Plus, Calendar } from 'lucide-react';
import { toast } from '@/components/ui/notifications';
import { format } from 'date-fns';

export default function ResourceCostLogger({ projectId }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedResource, setSelectedResource] = useState(null);
  const [selectedSOV, setSelectedSOV] = useState(null);
  const [hours, setHours] = useState('');
  const [customRate, setCustomRate] = useState('');

  const formatCurrency = (value) => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list()
  });

  const { data: sovItems = [] } = useQuery({
    queryKey: ['sovItems', projectId],
    queryFn: () => base44.entities.SOVItem.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: resourceCosts = [] } = useQuery({
    queryKey: ['resourceCosts', projectId],
    queryFn: () => base44.entities.ResourceCost.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const logCostMutation = useMutation({
    mutationFn: (data) => base44.entities.ResourceCost.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resourceCosts'] });
      queryClient.invalidateQueries({ queryKey: ['resourceSOVAssignments'] });
      setDialogOpen(false);
      resetForm();
      toast.success('Cost logged successfully');
    },
    onError: (error) => toast.error(error.message || 'Failed to log cost')
  });

  const resetForm = () => {
    setSelectedResource(null);
    setSelectedSOV(null);
    setHours('');
    setCustomRate('');
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleSubmit = () => {
    const hoursWorked = parseFloat(hours);
    const rate = parseFloat(customRate) || selectedResource?.rate || 0;
    const totalCost = hoursWorked * rate;

    logCostMutation.mutate({
      resource_id: selectedResource.id,
      project_id: projectId,
      sov_code: selectedSOV.sov_code,
      date: selectedDate,
      hours_worked: hoursWorked,
      hourly_rate: rate,
      total_cost: totalCost,
      cost_type: selectedResource.type,
      is_billable: true
    });
  };

  const columns = [
    {
      header: 'Date',
      accessor: 'date',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-zinc-500" />
          <span className="text-sm">{format(new Date(row.date), 'MMM d, yyyy')}</span>
        </div>
      )
    },
    {
      header: 'Resource',
      accessor: 'resource_id',
      render: (row) => {
        const resource = resources.find(r => r.id === row.resource_id);
        return (
          <div>
            <p className="text-sm font-semibold">{resource?.name || 'Unknown'}</p>
            <Badge variant="outline" className="text-[10px] capitalize mt-1">
              {resource?.type || 'unknown'}
            </Badge>
          </div>
        );
      }
    },
    {
      header: 'SOV Code',
      accessor: 'sov_code',
      render: (row) => {
        const sov = sovItems.find(s => s.sov_code === row.sov_code);
        return (
          <div>
            <p className="font-mono text-sm font-semibold">{row.sov_code}</p>
            <p className="text-xs text-zinc-500 truncate max-w-xs">{sov?.description || ''}</p>
          </div>
        );
      }
    },
    {
      header: 'Hours',
      accessor: 'hours_worked',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Clock size={14} className="text-blue-400" />
          <span className="text-sm font-semibold">{row.hours_worked.toFixed(2)}</span>
        </div>
      )
    },
    {
      header: 'Rate',
      accessor: 'hourly_rate',
      render: (row) => <span className="text-sm">${formatCurrency(row.hourly_rate)}/hr</span>
    },
    {
      header: 'Total Cost',
      accessor: 'total_cost',
      render: (row) => (
        <div className="flex items-center gap-1">
          <DollarSign size={14} className="text-green-400" />
          <span className="text-sm font-bold text-green-400">${formatCurrency(row.total_cost)}</span>
        </div>
      )
    }
  ];

  const totalCost = resourceCosts.reduce((sum, c) => sum + (c.total_cost || 0), 0);
  const totalHours = resourceCosts.reduce((sum, c) => sum + (c.hours_worked || 0), 0);
  const avgRate = totalHours > 0 ? totalCost / totalHours : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Total Hours</p>
                <p className="text-3xl font-bold text-blue-400">{totalHours.toFixed(1)}</p>
              </div>
              <Clock size={24} className="text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Total Cost</p>
                <p className="text-3xl font-bold text-green-400">${(totalCost / 1000).toFixed(1)}K</p>
              </div>
              <DollarSign size={24} className="text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Avg Rate</p>
                <p className="text-3xl font-bold text-amber-400">${avgRate.toFixed(2)}/hr</p>
              </div>
              <DollarSign size={24} className="text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Log Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Resource Cost Log</CardTitle>
            <Button
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
            >
              <Plus size={14} className="mr-1" />
              Log Cost
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={resourceCosts}
            emptyMessage="No costs logged yet. Start tracking resource costs to improve forecasting."
          />
        </CardContent>
      </Card>

      {/* Log Cost Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Log Resource Cost</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>

            <div>
              <Label>Resource</Label>
              <Select
                value={selectedResource?.id || ''}
                onValueChange={(id) => {
                  const res = resources.find(r => r.id === id);
                  setSelectedResource(res);
                  setCustomRate(res?.rate || '');
                }}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue placeholder="Select resource..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {resources.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.type}) - ${r.rate || 0}/hr
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>SOV Line Item</Label>
              <Select
                value={selectedSOV?.sov_code || ''}
                onValueChange={(code) => {
                  const sov = sovItems.find(s => s.sov_code === code);
                  setSelectedSOV(sov);
                }}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue placeholder="Select SOV line..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {sovItems.map(s => (
                    <SelectItem key={s.id} value={s.sov_code}>
                      {s.sov_code} - {s.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hours Worked</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="8.0"
                  className="bg-zinc-950 border-zinc-800"
                />
              </div>
              <div>
                <Label>Rate ($/hr)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  placeholder="0.00"
                  className="bg-zinc-950 border-zinc-800"
                />
              </div>
            </div>

            {hours && customRate && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Total Cost:</span>
                  <span className="text-lg font-bold text-blue-400">
                    ${formatCurrency(parseFloat(hours) * parseFloat(customRate))}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!selectedResource || !selectedSOV || !hours || !customRate}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
              >
                Log Cost
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}