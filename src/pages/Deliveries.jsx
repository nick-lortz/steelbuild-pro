import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Truck, TrendingUp, TrendingDown, Clock, Package, Trash2, Calendar, AlertTriangle, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import KPICard from '@/components/financials/KPICard';
import DeliveryForm from '@/components/deliveries/DeliveryForm';
import DeliveryKPIs from '@/components/deliveries/DeliveryKPIs';
import FilterBar from '@/components/shared/FilterBar';
import SortControl from '@/components/shared/SortControl';
import ExportButton from '@/components/shared/ExportButton';
import { format, parseISO, differenceInDays, isWithinInterval, addDays, startOfWeek, endOfWeek } from 'date-fns';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    projects: [],
    statuses: [],
    carriers: [],
    dateRange: 'all'
  });
  const [sortBy, setSortBy] = useState('scheduled_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showForm, setShowForm] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState(null);
  const [deleteDelivery, setDeleteDelivery] = useState(null);
  const [savedFilters, setSavedFilters] = useState([]);

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 30 * 60 * 1000
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => base44.entities.Delivery.list('-scheduled_date'),
    staleTime: 5 * 60 * 1000
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => base44.entities.Task.list(),
    staleTime: 10 * 60 * 1000
  });

  const tasks = useMemo(() => {
    if (!activeFilters.projects?.length || activeFilters.projects.length === 0) {
      return allTasks.filter((t) => t.phase === 'delivery');
    }
    return allTasks.filter((t) =>
    t.phase === 'delivery' && activeFilters.projects.includes(t.project_id)
    );
  }, [allTasks, activeFilters.projects]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Delivery.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setShowForm(false);
      setEditingDelivery(null);
    },
    onError: (error) => {
      console.error('Failed to create delivery:', error);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, oldStatus }) => {
      const updated = await base44.entities.Delivery.update(id, data);

      // Trigger notification if status changed
      if (oldStatus && data.delivery_status && oldStatus !== data.delivery_status) {
        try {
          await base44.functions.invoke('notifyDeliveryStatusChange', {
            delivery_id: id,
            old_status: oldStatus,
            new_status: data.delivery_status
          });
        } catch (notifError) {
          console.error('Notification error:', notifError);
        }
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setShowForm(false);
      setEditingDelivery(null);
    },
    onError: (error) => {
      console.error('Failed to update delivery:', error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Delivery.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setDeleteDelivery(null);
    },
    onError: (error) => {
      console.error('Failed to delete delivery:', error);
    }
  });

  // Get unique carriers for filter
  const uniqueCarriers = useMemo(() =>
  [...new Set(deliveries.map((d) => d.carrier).filter(Boolean))].sort(),
  [deliveries]
  );

  // Build project lookup map
  const projectMap = useMemo(() =>
  new Map(projects.map((p) => [p.id, p])),
  [projects]
  );

  const deliveriesFromTasks = useMemo(() => {
    return tasks.
    filter((t) => t.phase === 'delivery').
    map((task) => {
      const existingDelivery = deliveries.find((d) =>
      d.linked_task_ids?.includes(task.id) ||
      d.package_name === task.name && d.project_id === task.project_id
      );

      if (existingDelivery) return null;

      return {
        _isFromTask: true,
        _taskId: task.id,
        project_id: task.project_id,
        package_name: task.name,
        package_number: task.wbs_code || '',
        scheduled_date: task.start_date,
        delivery_status: task.status === 'completed' ? 'delivered' : 'scheduled',
        weight_tons: 0,
        piece_count: 0,
        carrier: '',
        linked_task_ids: [task.id],
        notes: `Auto-generated from delivery task`
      };
    }).
    filter(Boolean);
  }, [tasks, deliveries]);

  const allDeliveries = useMemo(() => {
    return [...deliveries, ...deliveriesFromTasks];
  }, [deliveries, deliveriesFromTasks]);

  const filteredDeliveries = useMemo(() => {
    let filtered = allDeliveries;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((d) =>
      d.package_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.package_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.carrier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.load_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Multi-select project filter
    if (activeFilters.projects?.length > 0) {
      filtered = filtered.filter((d) => activeFilters.projects.includes(d.project_id));
    }

    // Multi-select status filter
    if (activeFilters.statuses?.length > 0) {
      filtered = filtered.filter((d) => activeFilters.statuses.includes(d.delivery_status));
    }

    // Multi-select carrier filter
    if (activeFilters.carriers?.length > 0) {
      filtered = filtered.filter((d) => activeFilters.carriers.includes(d.carrier));
    }

    // Date range filter
    const today = new Date();
    if (activeFilters.dateRange === 'this_week') {
      filtered = filtered.filter((d) => {
        if (!d.scheduled_date) return false;
        return isWithinInterval(parseISO(d.scheduled_date), {
          start: startOfWeek(today),
          end: endOfWeek(today)
        });
      });
    } else if (activeFilters.dateRange === 'next_7_days') {
      filtered = filtered.filter((d) => {
        if (!d.scheduled_date) return false;
        const daysUntil = differenceInDays(parseISO(d.scheduled_date), today);
        return daysUntil >= 0 && daysUntil <= 7;
      });
    } else if (activeFilters.dateRange === 'next_14_days') {
      filtered = filtered.filter((d) => {
        if (!d.scheduled_date) return false;
        const daysUntil = differenceInDays(parseISO(d.scheduled_date), today);
        return daysUntil >= 0 && daysUntil <= 14;
      });
    } else if (activeFilters.dateRange === 'past_30_days') {
      filtered = filtered.filter((d) => {
        if (!d.scheduled_date) return false;
        const daysAgo = differenceInDays(today, parseISO(d.scheduled_date));
        return daysAgo >= 0 && daysAgo <= 30;
      });
    }

    // Apply sorting
    const sortFunctions = {
      scheduled_date: (a, b) => {
        const dateA = a.scheduled_date ? new Date(a.scheduled_date) : new Date(0);
        const dateB = b.scheduled_date ? new Date(b.scheduled_date) : new Date(0);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      },
      actual_date: (a, b) => {
        const dateA = a.actual_date ? new Date(a.actual_date) : new Date(0);
        const dateB = b.actual_date ? new Date(b.actual_date) : new Date(0);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      },
      project: (a, b) => {
        const projA = projectMap.get(a.project_id)?.name || '';
        const projB = projectMap.get(b.project_id)?.name || '';
        return sortOrder === 'asc' ? projA.localeCompare(projB) : projB.localeCompare(projA);
      },
      status: (a, b) => {
        const statusA = a.delivery_status || '';
        const statusB = b.delivery_status || '';
        return sortOrder === 'asc' ? statusA.localeCompare(statusB) : statusB.localeCompare(statusA);
      },
      weight: (a, b) => {
        const weightA = Number(a.weight_tons) || 0;
        const weightB = Number(b.weight_tons) || 0;
        return sortOrder === 'asc' ? weightA - weightB : weightB - weightA;
      },
      carrier: (a, b) => {
        const carrierA = a.carrier || '';
        const carrierB = b.carrier || '';
        return sortOrder === 'asc' ? carrierA.localeCompare(carrierB) : carrierB.localeCompare(carrierA);
      },
      variance: (a, b) => {
        const varianceA = a.days_variance || 0;
        const varianceB = b.days_variance || 0;
        return sortOrder === 'asc' ? varianceA - varianceB : varianceB - varianceA;
      }
    };

    const sortFn = sortFunctions[sortBy] || sortFunctions.scheduled_date;
    return [...filtered].sort(sortFn);
  }, [deliveries, searchTerm, activeFilters, sortBy, sortOrder, projectMap]);

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
    if (delivery._isFromTask) {
      // Convert task-based delivery to full delivery record on edit
      const taskDelivery = {
        project_id: delivery.project_id,
        package_name: delivery.package_name,
        package_number: delivery.package_number,
        scheduled_date: delivery.scheduled_date,
        delivery_status: delivery.delivery_status,
        linked_task_ids: delivery.linked_task_ids,
        notes: delivery.notes
      };
      setEditingDelivery(taskDelivery);
    } else {
      setEditingDelivery(delivery);
    }
    setShowForm(true);
  };

  const columns = [
  {
    header: 'Package',
    accessor: 'package_name',
    render: (row) =>
    <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{row.package_name}</p>
            {row._isFromTask &&
        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/40">
                SCHEDULE
              </span>
        }
          </div>
          <p className="text-xs text-zinc-500">{row.package_number}</p>
        </div>

  },
  {
    header: 'Project',
    accessor: 'project_id',
    render: (row) => {
      const project = projectMap.get(row.project_id);
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
    render: (row) => {
      if (!row.scheduled_date) return '-';
      const date = parseISO(row.scheduled_date);
      const daysUntil = differenceInDays(date, new Date());
      const isUpcoming = daysUntil >= 0 && daysUntil <= 7;
      return (
        <div>
          <p>{format(date, 'MMM d, yyyy')}</p>
          {isUpcoming &&
          <p className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
              <Calendar size={10} />
              in {daysUntil} days
            </p>
          }
        </div>);

    }
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
    render: (row) => {
      const isDelayed = row.delivery_status === 'delayed' ||
      row.delivery_status === 'scheduled' &&
      row.scheduled_date &&
      differenceInDays(new Date(), parseISO(row.scheduled_date)) > 0;

      return (
        <div className="flex items-center gap-1">
          <StatusBadge status={row.delivery_status} />
          {isDelayed && <AlertTriangle size={14} className="text-red-400" />}
        </div>);

    }
  },
  {
    header: 'Weight',
    accessor: 'weight_tons',
    render: (row) => {
      const weight = row.weight_tons;
      return weight ? `${weight} tons` : '-';
    }
  },
  {
    header: 'Pieces',
    accessor: 'piece_count',
    render: (row) => row.piece_count || '-'
  },
  {
    header: 'Carrier',
    accessor: 'carrier',
    render: (row) => row.carrier || '-'
  },
  {
    header: '',
    accessor: 'actions',
    render: (row) =>
    !row._isFromTask ? (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            handleEdit(row);
          }}
          className="text-zinc-500 hover:text-amber-400">
          <Edit size={16} />
        </Button>
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
      </div>
    ) : null
  }];


  return (
    <div className="min-h-screen bg-black">
      {/* Header Bar */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Delivery Tracking</h1>
              <p className="text-xs text-zinc-600 font-mono mt-1">{kpis.total} TOTAL • {kpis.upcoming} NEXT 14D</p>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton
                data={filteredDeliveries}
                entityType="deliveries"
                filename="deliveries"
              />
              <Button
                onClick={() => {
                  setEditingDelivery(null);
                  setShowForm(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs uppercase tracking-wider">
                <Plus size={14} className="mr-1" />
                NEW
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">ON-TIME RATE</div>
              <div className={`text-2xl font-bold font-mono ${kpis.onTimePercent >= 90 ? 'text-green-500' : 'text-red-500'}`}>
                {kpis.onTimePercent.toFixed(0)}%
              </div>
              <div className="text-xs text-zinc-600 font-mono">{kpis.onTime}/{kpis.completed}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">DELAYED</div>
              <div className={`text-2xl font-bold font-mono ${kpis.delayed > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {kpis.delayed}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">TOTAL WEIGHT</div>
              <div className="text-2xl font-bold font-mono text-white">{kpis.totalWeight.toFixed(1)}</div>
              <div className="text-xs text-zinc-600">TONS</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">AVG VARIANCE</div>
              <div className={`text-2xl font-bold font-mono ${kpis.avgVariance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {kpis.avgVariance > 0 ? '+' : ''}{kpis.avgVariance}
              </div>
              <div className="text-xs text-zinc-600">DAYS</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-3">
          <FilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder="SEARCH PACKAGES..."
          filterGroups={[
          {
            key: 'projects',
            label: 'Projects',
            multiSelect: true,
            options: projects.map((p) => ({
              value: p.id,
              label: `${p.project_number} - ${p.name}`
            }))
          },
          {
            key: 'statuses',
            label: 'Status',
            multiSelect: true,
            options: [
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'in_transit', label: 'In Transit' },
            { value: 'delivered', label: 'Delivered' },
            { value: 'delayed', label: 'Delayed' },
            { value: 'cancelled', label: 'Cancelled' }]

          },
          {
            key: 'carriers',
            label: 'Carriers',
            multiSelect: true,
            options: uniqueCarriers.map((c) => ({ value: c, label: c }))
          },
          {
            key: 'dateRange',
            label: 'Date Range',
            multiSelect: false,
            options: [
            { value: 'this_week', label: 'This Week' },
            { value: 'next_7_days', label: 'Next 7 Days' },
            { value: 'next_14_days', label: 'Next 14 Days' },
            { value: 'past_30_days', label: 'Past 30 Days' }]

          }]
          }
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
          savedConfigs={savedFilters}
          onSaveConfig={(config) => setSavedFilters([...savedFilters, config])}
          onLoadConfig={(config) => setActiveFilters(config.filters)} />


          <div className="flex justify-between items-center mt-3">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono">
              {filteredDeliveries.length} SHOWN • {allDeliveries.length} TOTAL
            </p>
            <SortControl
              sortOptions={[
                { value: 'scheduled_date', label: 'Scheduled' },
                { value: 'actual_date', label: 'Actual' },
                { value: 'project', label: 'Project' },
                { value: 'status', label: 'Status' },
                { value: 'weight', label: 'Weight' },
                { value: 'carrier', label: 'Carrier' }
              ]}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={(field, order) => {
                setSortBy(field);
                setSortOrder(order);
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <Tabs defaultValue="deliveries" className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="deliveries">All Deliveries</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="kpis">Extended KPIs</TabsTrigger>
          </TabsList>

          <TabsContent value="kpis" className="space-y-6">
            <DeliveryKPIs deliveries={filteredDeliveries} projects={projects} />
          </TabsContent>

          <TabsContent value="deliveries">
            <DataTable
              columns={columns}
              data={filteredDeliveries}
              onRowClick={handleEdit}
              emptyMessage="No deliveries found."
            />
          </TabsContent>

          <TabsContent value="upcoming">
            <DataTable
              columns={columns}
              data={filteredDeliveries.filter((d) => d.delivery_status === 'scheduled' || d.delivery_status === 'in_transit')}
              onRowClick={handleEdit}
              emptyMessage="No upcoming deliveries."
            />
          </TabsContent>
        </Tabs>
      </div>

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
                updateMutation.mutate({
                  id: editingDelivery.id,
                  data,
                  oldStatus: editingDelivery.delivery_status
                });
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