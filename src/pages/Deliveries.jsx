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
import DeliveryLookAhead from '@/components/deliveries/DeliveryLookAhead';
import DeliveryCard from '@/components/deliveries/DeliveryCard';
import DeliveryConflictPanel from '@/components/deliveries/DeliveryConflictPanel';
import DeliveryMetricsPanel from '@/components/deliveries/DeliveryMetricsPanel';

export default function Deliveries() {
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showWizard, setShowWizard] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [deleteDelivery, setDeleteDelivery] = useState(null);
  const [receivingDelivery, setReceivingDelivery] = useState(null);
  const [activeView, setActiveView] = useState('lookAhead');
  const [filterZone, setFilterZone] = useState('all');
  const [filterCrane, setFilterCrane] = useState('all');

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
      // Validate required fields
      if (!data.project_id || !data.package_name) {
        throw new Error('Project and package name are required');
      }
      
      const activityLog = {
        action: `Delivery created`,
        user: user?.email || 'system',
        timestamp: new Date().toISOString()
      };
      
      // Clean and set defaults
      const cleanData = {
        project_id: data.project_id,
        package_name: data.package_name,
        delivery_number: data.delivery_number || `DEL-${Date.now().toString().slice(-6)}`,
        template_type: data.template_type || 'custom',
        package_number: data.package_number || '',
        description: data.description || '',
        vendor_supplier: data.vendor_supplier || '',
        ship_from_location: data.ship_from_location || '',
        ship_to_location: data.ship_to_location || '',
        requested_date: data.requested_date || null,
        requested_time_window: data.requested_time_window || '',
        confirmed_date: data.confirmed_date || null,
        confirmed_time_window: data.confirmed_time_window || '',
        scheduled_date: data.scheduled_date || data.confirmed_date || data.requested_date || null,
        delivery_status: data.delivery_status || 'draft',
        delivery_type: data.delivery_type || 'ship',
        priority: data.priority || 'medium',
        carrier: data.carrier || '',
        tracking_number: data.tracking_number || '',
        pro_number: data.pro_number || '',
        trailer_number: data.trailer_number || '',
        po_number: data.po_number || '',
        contact_name: data.contact_name || '',
        contact_phone: data.contact_phone || '',
        contact_email: data.contact_email || '',
        weight_tons: parseFloat(data.weight_tons) || 0,
        piece_count: parseInt(data.piece_count) || 0,
        line_items: data.line_items || [],
        receiving_requirements: data.receiving_requirements || [],
        site_constraints: data.site_constraints || {},
        on_time: data.on_time || null,
        days_variance: data.days_variance || null,
        exceptions: data.exceptions || [],
        attachments: data.attachments || [],
        comments: data.comments || [],
        notes: data.notes || '',
        activity_log: [activityLog]
      };
      
      return base44.entities.Delivery.create(cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setShowWizard(false);
      setEditingDelivery(null);
      toast.success('Delivery created successfully');
    },
    onError: (error) => {
      console.error('Create delivery error:', error);
      toast.error('Failed to create: ' + (error.message || 'Unknown error'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data, logAction }) => {
      const delivery = deliveries.find(d => d.id === id);
      
      // Auto-calculate on_time if dates are provided
      if (data.actual_arrival_date || data.scheduled_date) {
        const actual = data.actual_arrival_date ? new Date(data.actual_arrival_date) : delivery?.actual_arrival_date ? new Date(delivery.actual_arrival_date) : null;
        const scheduled = data.scheduled_date ? new Date(data.scheduled_date) : delivery?.scheduled_date ? new Date(delivery.scheduled_date) : null;
        
        if (actual && scheduled) {
          const diffDays = Math.round((actual - scheduled) / (1000 * 60 * 60 * 24));
          data.on_time = diffDays <= 0;
          data.days_variance = diffDays;
        }
      }
      
      const activityLogEntry = {
        action: logAction || `Delivery updated`,
        user: user?.email || 'system',
        timestamp: new Date().toISOString(),
        changes: data
      };
      
      const updatedActivityLog = [
        ...(delivery?.activity_log || []),
        activityLogEntry
      ];
      
      return base44.entities.Delivery.update(id, { ...data, activity_log: updatedActivityLog });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setShowWizard(false);
      setEditingDelivery(null);
      setSelectedDelivery(null);
      setReceivingDelivery(null);
      toast.success('Delivery updated successfully');
    },
    onError: (error) => {
      console.error('Update delivery error:', error);
      toast.error('Failed to update: ' + (error.message || 'Unknown error'));
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

  const handleStatusChange = (id, updates) => {
    const delivery = deliveries.find(d => d.id === id);
    
    // If updates is a string (old signature), convert to object
    const updateData = typeof updates === 'string' ? { delivery_status: updates } : updates;
    
    // Auto-update scheduled_date if it's not set but we have confirmed or requested
    if (!updateData.scheduled_date && !delivery.scheduled_date) {
      updateData.scheduled_date = delivery.confirmed_date || delivery.requested_date;
    }
    
    // Auto-advance status to requested if still draft
    if (delivery.delivery_status === 'draft' && updateData.scheduled_date) {
      updateData.delivery_status = updateData.delivery_status || 'requested';
    }
    
    updateMutation.mutate({
      id,
      data: updateData,
      logAction: `Status changed to ${updateData.delivery_status || 'updated'}`
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
      <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-600/10 via-zinc-900/50 to-amber-600/5">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Delivery Management</h1>
              <p className="text-xs text-zinc-400 font-mono mt-1">
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
             <TabsTrigger value="lookAhead">
               <Calendar size={14} className="mr-2" />
               Look-Ahead
             </TabsTrigger>
             <TabsTrigger value="today">
               <Calendar size={14} className="mr-2" />
               Today ({kpis.today})
             </TabsTrigger>
             <TabsTrigger value="list">All Deliveries</TabsTrigger>
             <TabsTrigger value="metrics">
               <Download size={14} className="mr-2" />
               Metrics
             </TabsTrigger>
           </TabsList>

          {/* Look-Ahead Schedule */}
          <TabsContent value="lookAhead" className="space-y-4">
            <div className="flex gap-3 mb-4">
              <Select value={filterZone} onValueChange={setFilterZone}>
                <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="All Zones" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All Zones</SelectItem>
                  {[...new Set(filteredDeliveries.map(d => d.gridlines_zone).filter(Boolean))].map(zone => (
                    <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCrane} onValueChange={setFilterCrane}>
                <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="All Cranes" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All Cranes</SelectItem>
                  {[...new Set(filteredDeliveries.map(d => d.required_crane).filter(Boolean))].map(crane => (
                    <SelectItem key={crane} value={crane}>{crane}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DeliveryConflictPanel
              deliveries={filteredDeliveries}
              onSelectDelivery={(d) => setSelectedDelivery(d)}
            />

            <DeliveryLookAhead
              deliveries={filteredDeliveries.filter(d =>
                (filterZone === 'all' || d.gridlines_zone === filterZone) &&
                (filterCrane === 'all' || d.required_crane === filterCrane)
              )}
              projects={projects}
              onSelectDelivery={(d) => setSelectedDelivery(d)}
            />
          </TabsContent>

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

          {/* Metrics */}
          <TabsContent value="metrics" className="space-y-6">
            <DeliveryMetricsPanel deliveries={filteredDeliveries} />
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