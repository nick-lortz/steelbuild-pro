import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Truck, TrendingUp, TrendingDown, Clock, Package, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import KPICard from '@/components/financials/KPICard';
import DeliveryForm from '@/components/deliveries/DeliveryForm';
import DeliveryKPIs from '@/components/deliveries/DeliveryKPIs';
import { format, parseISO, differenceInDays } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";

export default function Deliveries() {
  const [selectedProject, setSelectedProject] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState(null);
  const [deleteDelivery, setDeleteDelivery] = useState(null);

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 10 * 60 * 1000
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => base44.entities.Delivery.list('-scheduled_date'),
    staleTime: 5 * 60 * 1000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
    staleTime: 5 * 60 * 1000
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Delivery.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setShowForm(false);
      setEditingDelivery(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Delivery.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setShowForm(false);
      setEditingDelivery(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Delivery.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setDeleteDelivery(null);
    }
  });

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) =>
    selectedProject === 'all' || d.project_id === selectedProject
    );
  }, [deliveries, selectedProject]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const completed = filteredDeliveries.filter((d) => d.delivery_status === 'delivered');
    const onTime = completed.filter((d) => {
      if (!d.actual_date) return false;
      const variance = differenceInDays(
        parseISO(d.actual_date),
        parseISO(d.scheduled_date)
      );
      return variance <= 0; // On time or early
    });

    const delayed = filteredDeliveries.filter((d) =>
    d.delivery_status === 'delayed' ||
    d.delivery_status === 'delivered' && d.actual_date &&
    differenceInDays(parseISO(d.actual_date), parseISO(d.scheduled_date)) > 0
    );

    const upcoming = filteredDeliveries.filter((d) => {
      if (d.delivery_status !== 'scheduled') return false;
      const daysUntil = differenceInDays(
        parseISO(d.scheduled_date),
        new Date()
      );
      return daysUntil >= 0 && daysUntil <= 14;
    });

    const totalWeight = filteredDeliveries.reduce((sum, d) => sum + (d.weight_tons || 0), 0);
    const totalPieces = filteredDeliveries.reduce((sum, d) => sum + (d.piece_count || 0), 0);

    const avgVariance = completed.length > 0 ?
    completed.reduce((sum, d) => {
      if (!d.actual_date) return sum;
      return sum + differenceInDays(
        parseISO(d.actual_date),
        parseISO(d.scheduled_date)
      );
    }, 0) / completed.length :
    0;

    return {
      total: filteredDeliveries.length,
      completed: completed.length,
      onTime: onTime.length,
      onTimePercent: completed.length > 0 ? onTime.length / completed.length * 100 : 0,
      delayed: delayed.length,
      upcoming: upcoming.length,
      totalWeight,
      totalPieces,
      avgVariance: Math.round(avgVariance * 10) / 10
    };
  }, [filteredDeliveries]);

  const handleEdit = (delivery) => {
    setEditingDelivery(delivery);
    setShowForm(true);
  };

  const columns = [
  {
    header: 'Package',
    accessor: 'package_name',
    render: (row) =>
    <div>
          <p className="font-medium">{row.package_name}</p>
          <p className="text-xs text-zinc-500">{row.package_number}</p>
        </div>

  },
  {
    header: 'Project',
    accessor: 'project_id',
    render: (row) => {
      const project = projects.find((p) => p.id === row.project_id);
      return project ?
      <div>
            <p className="text-sm">{project.name}</p>
            <p className="text-xs text-zinc-500">{project.project_number}</p>
          </div> :
      '-';
    }
  },
  {
    header: 'Scheduled Date',
    accessor: 'scheduled_date',
    render: (row) => row.scheduled_date ? format(parseISO(row.scheduled_date), 'MMM d, yyyy') : '-'
  },
  {
    header: 'Actual Date',
    accessor: 'actual_date',
    render: (row) => {
      if (!row.actual_date) return '-';
      const variance = differenceInDays(
        parseISO(row.actual_date),
        parseISO(row.scheduled_date)
      );
      return (
        <div>
            <p>{format(parseISO(row.actual_date), 'MMM d, yyyy')}</p>
            <p className={`text-xs ${variance > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {variance > 0 ? `+${variance}` : variance} days
            </p>
          </div>);

    }
  },
  {
    header: 'Status',
    accessor: 'delivery_status',
    render: (row) => <StatusBadge status={row.delivery_status} />
  },
  {
    header: 'Weight',
    accessor: 'weight_tons',
    render: (row) => row.weight_tons ? `${row.weight_tons} tons` : '-'
  },
  {
    header: 'Pieces',
    accessor: 'piece_count',
    render: (row) => row.piece_count || '-'
  },
  {
    header: 'Carrier',
    accessor: 'carrier'
  },
  {
    header: '',
    accessor: 'actions',
    render: (row) =>
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => {
        e.stopPropagation();
        setDeleteDelivery(row);
      }}
      className="text-zinc-500 hover:text-red-500">

          <Trash2 size={16} />
        </Button>

  }];


  return (
    <div>
      <PageHeader
        title="Delivery Tracking"
        subtitle="Steel package deliveries and KPIs"
        actions={
        <Button
          onClick={() => {
            setEditingDelivery(null);
            setShowForm(true);
          }}
          className="bg-amber-500 hover:bg-amber-600 text-black">

            <Plus size={18} className="mr-2" />
            Add Delivery
          </Button>
        } />


      {/* Project Filter */}
      <div className="mb-6">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) =>
            <SelectItem key={p.id} value={p.id}>
                {p.project_number} - {p.name}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deliveries">All Deliveries</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Deliveries"
              value={kpis.total}
              icon={Package} />

            <KPICard
              title="On-Time Rate"
              value={`${kpis.onTimePercent.toFixed(1)}%`}
              trend={kpis.onTimePercent >= 90 ? 'up' : 'down'}
              trendValue={`${kpis.onTime}/${kpis.completed}`}
              icon={kpis.onTimePercent >= 90 ? TrendingUp : TrendingDown}
              variant={kpis.onTimePercent >= 90 ? 'green' : 'red'} />

            <KPICard
              title="Delayed"
              value={kpis.delayed}
              icon={Clock}
              variant={kpis.delayed > 0 ? 'red' : 'green'} />

            <KPICard
              title="Upcoming (14 days)"
              value={kpis.upcoming}
              icon={Truck}
              variant="blue" />

          </div>

          {/* Detailed KPIs */}
          <DeliveryKPIs deliveries={filteredDeliveries} projects={projects} />

          {/* Recent Deliveries */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-slate-50 text-lg font-semibold tracking-tight">Recent & Upcoming Deliveries</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={filteredDeliveries.slice(0, 10)}
                onRowClick={handleEdit}
                emptyMessage="No deliveries found." />

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries">
          <DataTable
            columns={columns}
            data={filteredDeliveries}
            onRowClick={handleEdit}
            emptyMessage="No deliveries found." />

        </TabsContent>

        <TabsContent value="upcoming">
          <DataTable
            columns={columns}
            data={filteredDeliveries.filter((d) => d.delivery_status === 'scheduled' || d.delivery_status === 'in_transit')}
            onRowClick={handleEdit}
            emptyMessage="No upcoming deliveries." />

        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>{editingDelivery ? 'Edit Delivery' : 'Add Delivery'}</DialogTitle>
          </DialogHeader>
          <DeliveryForm
            delivery={editingDelivery}
            projects={projects}
            tasks={tasks}
            onSubmit={(data) => {
              // Auto-calculate variance if actual_date provided
              if (data.actual_date && data.scheduled_date) {
                const variance = differenceInDays(
                  parseISO(data.actual_date),
                  parseISO(data.scheduled_date)
                );
                data.days_variance = variance;
                data.on_time = variance <= 0;
              }

              if (editingDelivery) {
                updateMutation.mutate({ id: editingDelivery.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingDelivery(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending} />

        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDelivery} onOpenChange={() => setDeleteDelivery(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Delivery?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete delivery "{deleteDelivery?.package_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteDelivery.id)}
              className="bg-red-500 hover:bg-red-600">

              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}