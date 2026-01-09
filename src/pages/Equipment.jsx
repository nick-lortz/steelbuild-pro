import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, Calendar, BarChart3 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import EquipmentCalendar from '@/components/equipment/EquipmentCalendar';
import EquipmentKPIs from '@/components/equipment/EquipmentKPIs';
import Pagination from '@/components/ui/Pagination';
import { usePagination } from '@/components/shared/hooks/usePagination';
import ExportButton from '@/components/shared/ExportButton';

export default function Equipment() {
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list('name'),
    staleTime: 10 * 60 * 1000
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['equipmentBookings'],
    queryFn: () => base44.entities.EquipmentBooking.list('-start_date'),
    staleTime: 5 * 60 * 1000
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 10 * 60 * 1000
  });

  const equipment = useMemo(() =>
  resources.filter((r) => r.type === 'equipment'),
  [resources]
  );

  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedEquipment,
    handlePageChange,
    totalItems,
  } = usePagination(equipment, 20);

  const handleSelectEquipment = useCallback((row) => {
    setSelectedEquipment(row);
  }, []);

  const columns = [
  {
    header: 'Equipment',
    accessor: 'name',
    render: (row) =>
    <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded">
            <Truck size={18} className="text-purple-400" />
          </div>
          <div>
            <p className="font-medium text-white">{row.name}</p>
            <p className="text-xs text-zinc-500">{row.classification}</p>
          </div>
        </div>

  },
  {
    header: 'Status',
    accessor: 'status',
    render: (row) => <StatusBadge status={row.status} />
  },
  {
    header: 'Rate',
    accessor: 'rate',
    render: (row) => row.rate ?
    <span className="font-mono">${row.rate.toLocaleString()}/{row.rate_type}</span> :
    '-'
  },
  {
    header: 'Current Project',
    accessor: 'current_project_id',
    render: (row) => {
      if (!row.current_project_id) return <span className="text-zinc-500">Available</span>;
      const project = projects.find((p) => p.id === row.current_project_id);
      return <span className="text-zinc-300">{project?.name || '-'}</span>;
    }
  },
  {
    header: 'Bookings',
    render: (row) => {
      const equipmentBookings = bookings.filter((b) => b.resource_id === row.id);
      const activeBookings = equipmentBookings.filter((b) =>
      b.status === 'confirmed' || b.status === 'in_use'
      ).length;
      return (
        <span className="text-sm text-zinc-400">
            {activeBookings} active
          </span>);

    }
  },
  {
    header: '',
    render: (row) =>
    <Button
      size="sm"
      variant="outline"
      onClick={(e) => {
        e.stopPropagation();
        handleSelectEquipment(row);
      }} className="bg-background text-slate-950 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:bg-accent hover:text-accent-foreground h-8 border-zinc-700">


          <Calendar size={14} className="mr-2" />
          Schedule
        </Button>

  }];


  const equipStats = useMemo(() => {
    const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'in_use').length;
    const totalRevenue = bookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.total_cost || 0), 0);
    return { activeBookings, totalRevenue };
  }, [bookings]);

  return (
    <div className="min-h-screen bg-black">
      {/* Header Bar */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Equipment Management</h1>
              <p className="text-xs text-zinc-600 font-mono mt-1">{equipment.length} UNITS</p>
            </div>
            <div className="flex gap-2">
              <ExportButton
                data={equipment}
                columns={[
                  { key: 'name', label: 'Equipment' },
                  { key: 'classification', label: 'Type' },
                  { key: 'status', label: 'Status' },
                  { key: 'rate', label: 'Rate' },
                  { key: 'rate_type', label: 'Rate Type' },
                  { key: 'current_project_id', label: 'Project', formatter: (row) => projects.find(p => p.id === row.current_project_id)?.name || 'Available' }
                ]}
                filename="equipment"
              />
              <Link to={createPageUrl('Resources')}>
                <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs uppercase tracking-wider">
                  MANAGE
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">FLEET SIZE</div>
              <div className="text-2xl font-bold font-mono text-white">{equipment.length}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">AVAILABLE</div>
              <div className="text-2xl font-bold font-mono text-green-500">
                {equipment.filter(e => e.status === 'available').length}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">ACTIVE BOOKINGS</div>
              <div className="text-2xl font-bold font-mono text-amber-500">{equipStats.activeBookings}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">REVENUE (TTD)</div>
              <div className="text-2xl font-bold font-mono text-white">
                ${(equipStats.totalRevenue / 1000).toFixed(0)}K
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Fleet Overview */}
        {equipment.length > 0 && (
          <div className="mb-6">
            <EquipmentKPIs bookings={bookings} equipment={equipment} />
          </div>
        )}

        {/* Equipment List */}
        <div className="mb-6">
          <DataTable
            columns={columns}
            data={paginatedEquipment}
            emptyMessage="No equipment found. Add equipment resources to get started."
          />
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              pageSize={20}
              totalItems={totalItems}
            />
          )}
        </div>

        {/* Selected Equipment Details */}
        {selectedEquipment && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">EQUIPMENT DETAILS</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedEquipment(null)}
                className="border-zinc-700 text-white hover:bg-zinc-800 text-xs uppercase tracking-wider"
              >
                CLOSE
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Calendar */}
              <EquipmentCalendar
                equipmentId={selectedEquipment.id}
                equipmentName={selectedEquipment.name}
              />

              {/* Equipment-specific KPIs */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide">
                    <BarChart3 size={16} />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EquipmentKPIs
                    bookings={bookings.filter((b) => b.resource_id === selectedEquipment.id)}
                    equipment={[selectedEquipment]}
                  />
                  
                  {/* Additional Details */}
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between items-center p-2 bg-zinc-950 border-b border-zinc-800">
                      <span className="text-xs text-zinc-600 uppercase tracking-widest">CLASSIFICATION</span>
                      <span className="text-sm font-medium text-white">{selectedEquipment.classification || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-zinc-950 border-b border-zinc-800">
                      <span className="text-xs text-zinc-600 uppercase tracking-widest">RATE</span>
                      <span className="text-sm font-medium text-amber-400 font-mono">
                        ${selectedEquipment.rate?.toLocaleString() || 0}/{selectedEquipment.rate_type}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-zinc-950 border-b border-zinc-800">
                      <span className="text-xs text-zinc-600 uppercase tracking-widest">CONTACT</span>
                      <span className="text-sm font-medium text-white">
                        {selectedEquipment.contact_name || selectedEquipment.contact_phone || '-'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}