import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  Plus, Search, Truck, Calendar, MapPin, Package, 
  Filter, Download, Edit, Trash2, CheckCircle2, AlertTriangle 
} from 'lucide-react';
import { format, parseISO, differenceInDays, isWithinInterval, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { toast } from 'sonner';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import DeliveryWizard from '@/components/deliveries/DeliveryWizard';
import DeliveryDetailPanel from '@/components/deliveries/DeliveryDetailPanel';
import TodaysDeliveries from '@/components/deliveries/TodaysDeliveries';
import ReceivingMode from '@/components/deliveries/ReceivingMode';
import DeliveryMapView from '@/components/deliveries/DeliveryMapView';
import LocationTracker from '@/components/deliveries/LocationTracker';

export default function Deliveries() {
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showWizard, setShowWizard] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [deleteDelivery, setDeleteDelivery] = useState(null);
  const [receivingDelivery, setReceivingDelivery] = useState(null);
  const [activeView, setActiveView] = useState('list');

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 30 * 60 * 1000
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => base44.entities.Delivery.list('-confirmed_date'),
    staleTime: 2 * 60 * 1000
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const activityLog = {
        action: `Delivery created`,
        user: user?.email || 'system',
        timestamp: new Date().toISOString()
      };
      return base44.entities.Delivery.create({
        ...data,
        activity_log: [activityLog]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setShowWizard(false);
      setEditingDelivery(null);
      toast.success('Delivery created successfully');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data, logAction }) => {
      const activityLog = [
        ...(editingDelivery?.activity_log || []),
        {
          action: logAction || `Delivery updated`,
          user: user?.email || 'system',
          timestamp: new Date().toISOString(),
          changes: data
        }
      ];
      return base44.entities.Delivery.update(id, { ...data, activity_log });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setShowWizard(false);
      setEditingDelivery(null);
      setSelectedDelivery(null);
      setReceivingDelivery(null);
      toast.success('Delivery updated successfully');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Delivery.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setDeleteDelivery(null);
      toast.success('Delivery deleted');
    }
  });

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(d => {
      const matchesSearch = 
        d.package_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.delivery_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.vendor_supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.carrier?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesProject = projectFilter === 'all' || d.project_id === projectFilter;
      const matchesStatus = statusFilter === 'all' || d.delivery_status === statusFilter;

      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [deliveries, searchTerm, projectFilter, statusFilter]);

  const kpis = useMemo(() => {
    const today = new Date();
    const received = filteredDeliveries.filter(d => d.delivery_status === 'received' || d.delivery_status === 'closed');
    const onTime = received.filter(d => d.on_time);
    const todaysCount = filteredDeliveries.filter(d => {
      const date = d.confirmed_date || d.scheduled_date || d.requested_date;
      return date && isToday(parseISO(date));
    }).length;
    const exceptions = filteredDeliveries.filter(d => d.exceptions?.some(e => !e.resolved)).length;

    return {
      total: filteredDeliveries.length,
      today: todaysCount,
      onTimePercent: received.length > 0 ? (onTime.length / received.length) * 100 : 0,
      exceptions
    };
  }, [filteredDeliveries]);

  const handleStatusChange = (id, newStatus) => {
    const delivery = deliveries.find(d => d.id === id);
    updateMutation.mutate({
      id,
      data: { delivery_status: newStatus },
      logAction: `Status changed to ${newStatus}`
    });
  };

  const columns = [
    {
      header: 'Delivery #',
      accessor: 'delivery_number',
      render: (row) => (
        <span className="font-mono text-amber-400 font-bold text-sm">
          {row.delivery_number || '-'}
        </span>
      )
    },
    {
      header: 'Package',
      accessor: 'package_name',
      render: (row) => (
        <div>
          <p className="font-medium">{row.package_name}</p>
          <p className="text-xs text-zinc-500">{row.package_number}</p>
        </div>
      )
    },
    {
      header: 'Project',
      accessor: 'project_id',
      render: (row) => {
        const project = projects.find(p => p.id === row.project_id);
        return project ? (
          <div>
            <p className="text-sm">{project.name}</p>
            <p className="text-xs text-zinc-500">{project.project_number}</p>
          </div>
        ) : '-';
      }
    },
    {
      header: 'Status',
      accessor: 'delivery_status',
      render: (row) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.delivery_status} />
          {row.exceptions?.some(e => !e.resolved) && (
            <AlertTriangle size={14} className="text-red-500" />
          )}
        </div>
      )
    },
    {
      header: 'Scheduled',
      accessor: 'confirmed_date',
      render: (row) => {
        const date = row.confirmed_date || row.requested_date;
        if (!date) return '-';
        const isUpcoming = differenceInDays(parseISO(date), new Date()) <= 7;
        return (
          <div>
            <p>{format(parseISO(date), 'MMM d, yyyy')}</p>
            {row.confirmed_time_window && (
              <p className="text-xs text-zinc-500">{row.confirmed_time_window}</p>
            )}
            {isToday(parseISO(date)) && (
              <Badge className="bg-amber-500 text-black text-xs mt-1">TODAY</Badge>
            )}
          </div>
        );
      }
    },
    {
      header: 'Vendor',
      accessor: 'vendor_supplier',
      render: (row) => row.vendor_supplier || '-'
    },
    {
      header: 'Weight',
      accessor: 'weight_tons',
      render: (row) => {
        const weight = row.line_items?.reduce((sum, item) => sum + (item.weight_tons || 0), 0) || row.weight_tons || 0;
        return weight > 0 ? `${weight.toFixed(1)} tons` : '-';
      }
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDelivery(row);
            }}
            className="text-zinc-500 hover:text-white"
          >
            <Edit size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteDelivery(row);
            }}
            className="text-zinc-500 hover:text-red-500"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Delivery Management</h1>
              <p className="text-xs text-zinc-600 font-mono mt-1">
                {kpis.total} TOTAL • {kpis.today} TODAY • {kpis.onTimePercent.toFixed(0)}% ON-TIME
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setEditingDelivery(null);
                  setShowWizard(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs uppercase tracking-wider"
              >
                <Plus size={14} className="mr-1" />
                NEW DELIVERY
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Bar */}
      {kpis.exceptions > 0 && (
        <div className="border-b border-red-800 bg-red-950/20">
          <div className="max-w-[1800px] mx-auto px-6 py-3">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">
                {kpis.exceptions} DELIVERIES WITH UNRESOLVED EXCEPTIONS
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <Tabs value={activeView} onValueChange={setActiveView} className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="today">
              <Calendar size={14} className="mr-2" />
              Today ({kpis.today})
            </TabsTrigger>
            <TabsTrigger value="list">All Deliveries</TabsTrigger>
            <TabsTrigger value="calendar">
              <MapPin size={14} className="mr-2" />
              Map View
            </TabsTrigger>
          </TabsList>

          {/* Today's Deliveries */}
          <TabsContent value="today">
            <TodaysDeliveries
              deliveries={filteredDeliveries}
              onReceive={(delivery) => setReceivingDelivery(delivery)}
              onMarkArrived={(delivery) => handleStatusChange(delivery.id, 'arrived_on_site')}
              onViewDetails={(delivery) => setSelectedDelivery(delivery)}
            />
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <Input
                  placeholder="SEARCH DELIVERIES..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 placeholder:uppercase placeholder:text-xs"
                />
              </div>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="requested">Requested</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="arrived_on_site">Arrived</SelectItem>
                  <SelectItem value="partially_received">Partially Received</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="exception">Exception</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DataTable
              columns={columns}
              data={filteredDeliveries}
              onRowClick={(delivery) => setSelectedDelivery(delivery)}
              emptyMessage="No deliveries found. Create your first delivery to get started."
            />
          </TabsContent>

          {/* Map View */}
          <TabsContent value="calendar">
            <DeliveryMapView
              deliveries={filteredDeliveries}
              projects={projects}
              onSelectDelivery={(delivery) => setSelectedDelivery(delivery)}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Wizard Dialog */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>{editingDelivery ? 'Edit Delivery' : 'Create New Delivery'}</DialogTitle>
          </DialogHeader>
          <DeliveryWizard
            delivery={editingDelivery}
            projects={projects}
            onSubmit={(data) => {
              if (editingDelivery) {
                updateMutation.mutate({ id: editingDelivery.id, data, logAction: 'Delivery updated via wizard' });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => {
              setShowWizard(false);
              setEditingDelivery(null);
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Detail Panel */}
      <Sheet open={!!selectedDelivery} onOpenChange={(open) => !open && setSelectedDelivery(null)}>
        <SheetContent className="w-full sm:max-w-2xl bg-zinc-900 border-zinc-800 text-white overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Delivery Details</SheetTitle>
          </SheetHeader>
          {selectedDelivery && (
            <div className="mt-6">
              <DeliveryDetailPanel
                delivery={selectedDelivery}
                project={projects.find(p => p.id === selectedDelivery.project_id)}
                onEdit={(d) => {
                  setEditingDelivery(d);
                  setSelectedDelivery(null);
                  setShowWizard(true);
                }}
                onDelete={(d) => {
                  setSelectedDelivery(null);
                  setDeleteDelivery(d);
                }}
                onStatusChange={handleStatusChange}
                onAddException={() => toast.info('Exception reporting coming soon')}
                onReceiveItems={() => {
                  setReceivingDelivery(selectedDelivery);
                  setSelectedDelivery(null);
                }}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Receiving Mode */}
      <Dialog open={!!receivingDelivery} onOpenChange={(open) => !open && setReceivingDelivery(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Receiving: {receivingDelivery?.package_name}</DialogTitle>
          </DialogHeader>
          {receivingDelivery && (
            <ReceivingMode
              delivery={receivingDelivery}
              onComplete={(updatedDelivery) => {
                updateMutation.mutate({
                  id: receivingDelivery.id,
                  data: updatedDelivery,
                  logAction: 'Items received'
                });
              }}
              onCancel={() => setReceivingDelivery(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDelivery} onOpenChange={() => setDeleteDelivery(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Delivery?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Delete "{deleteDelivery?.package_name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteDelivery.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}