import React, { useState, useMemo } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Clock, CheckCircle, Users, TrendingUp, MoreVertical, Trash2, Pencil, Check, X } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import ExportButton from '@/components/shared/ExportButton';
import { format } from 'date-fns';

export default function Labor() {
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [formData, setFormData] = useState({
    project_id: '',
    work_package_id: '',
    cost_code_id: '',
    crew_employee: '',
    work_date: format(new Date(), 'yyyy-MM-dd'),
    hours: '',
    overtime_hours: '',
    description: '',
    approved: false,
  });
  const [bulkEntries, setBulkEntries] = useState([
    { crew_employee: '', hours: '', overtime_hours: '', description: '' }
  ]);

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 10 * 60 * 1000,
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list('name'),
    staleTime: 10 * 60 * 1000,
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['costCodes'],
    queryFn: () => base44.entities.CostCode.list('code'),
    staleTime: 10 * 60 * 1000,
  });

  const { data: laborHours = [] } = useQuery({
    queryKey: ['laborHours'],
    queryFn: () => base44.entities.LaborHours.list('-work_date'),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LaborHours.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laborHours'] });
      setShowForm(false);
      setEditingEntry(null);
      setBulkMode(false);
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
      setBulkEntries([{ resource_id: '', hours: '', overtime_hours: '', description: '' }]);
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (entries) => base44.entities.LaborHours.bulkCreate(entries),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laborHours'] });
      setShowForm(false);
      setBulkMode(false);
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
      setBulkEntries([{ resource_id: '', hours: '', overtime_hours: '', description: '' }]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LaborHours.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laborHours'] });
      setShowForm(false);
      setEditingEntry(null);
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

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LaborHours.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laborHours'] });
      setDeleteId(null);
    },
  });

  const toggleApprovalMutation = useMutation({
    mutationFn: ({ id, approved }) => base44.entities.LaborHours.update(id, { approved }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laborHours'] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (bulkMode) {
      const validEntries = bulkEntries
        .filter(entry => entry.crew_employee && entry.hours)
        .map(entry => ({
          project_id: formData.project_id,
          work_package_id: formData.work_package_id,
          cost_code_id: formData.cost_code_id,
          work_date: formData.work_date,
          crew_employee: entry.crew_employee,
          hours: parseFloat(entry.hours) || 0,
          overtime_hours: parseFloat(entry.overtime_hours) || 0,
          description: entry.description || '',
          approved: false,
        }));
      
      if (validEntries.length > 0) {
        bulkCreateMutation.mutate(validEntries);
      }
    } else {
      const data = {
        ...formData,
        hours: parseFloat(formData.hours) || 0,
        overtime_hours: parseFloat(formData.overtime_hours) || 0,
      };
      
      if (editingEntry) {
        updateMutation.mutate({ id: editingEntry.id, data });
      } else {
        createMutation.mutate(data);
      }
    }
  };

  const addBulkEntry = () => {
    setBulkEntries([...bulkEntries, { resource_id: '', hours: '', overtime_hours: '', description: '' }]);
  };

  const removeBulkEntry = (index) => {
    setBulkEntries(bulkEntries.filter((_, i) => i !== index));
  };

  const updateBulkEntry = (index, field, value) => {
    const updated = [...bulkEntries];
    updated[index][field] = value;
    setBulkEntries(updated);
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setFormData({
      project_id: entry.project_id || '',
      work_package_id: entry.work_package_id || '',
      cost_code_id: entry.cost_code_id || '',
      crew_employee: entry.crew_employee || '',
      work_date: entry.work_date || format(new Date(), 'yyyy-MM-dd'),
      hours: entry.hours?.toString() || '',
      overtime_hours: entry.overtime_hours?.toString() || '',
      description: entry.description || '',
      approved: entry.approved || false,
    });
    setShowForm(true);
  };

  const laborResources = useMemo(() => 
    resources.filter(r => r.type === 'labor' || r.type === 'subcontractor'),
    [resources]
  );

  const columns = [
    {
      header: 'Date',
      accessor: 'work_date',
      render: (row) => {
        if (!row.work_date) return '-';
        try {
          const date = new Date(row.work_date + 'T00:00:00');
          if (isNaN(date.getTime())) return '-';
          return format(date, 'MMM d, yyyy');
        } catch {
          return '-';
        }
      },
    },
    {
      header: 'Worker',
      accessor: 'crew_employee',
      render: (row) => {
        const workerEmail = row.crew_employee || '';
        const workerName = workerEmail.split('@')[0];
        return (
          <div>
            <p className="font-medium">{workerName || '-'}</p>
            <p className="text-xs text-zinc-500">{workerEmail}</p>
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
    {
      header: '',
      accessor: 'actions',
      cellClassName: 'w-12',
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700">
            <DropdownMenuItem 
              onClick={() => handleEdit(row)}
              className="cursor-pointer text-white hover:text-white"
            >
              <Pencil size={14} className="mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => toggleApprovalMutation.mutate({ id: row.id, approved: !row.approved })}
              className="cursor-pointer text-white hover:text-white"
            >
              {row.approved ? (
                <>
                  <X size={14} className="mr-2" />
                  Mark as Pending
                </>
              ) : (
                <>
                  <Check size={14} className="mr-2" />
                  Approve
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setDeleteId(row.id)}
              className="text-red-400 hover:text-red-300 cursor-pointer"
            >
              <Trash2 size={14} className="mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const laborMetrics = useMemo(() => {
    const totalHours = laborHours.reduce((sum, l) => sum + (l.hours || 0), 0);
    const totalOT = laborHours.reduce((sum, l) => sum + (l.overtime_hours || 0), 0);
    const pendingApproval = laborHours.filter(l => !l.approved).length;

    const last30Days = laborHours.filter(l => {
      if (!l.work_date) return false;
      try {
        const workDate = new Date(l.work_date + 'T00:00:00');
        if (isNaN(workDate.getTime())) return false;
        const daysAgo = (new Date() - workDate) / (1000 * 60 * 60 * 24);
        return daysAgo <= 30;
      } catch {
        return false;
      }
    });
    const avgDailyHours = last30Days.length > 0 
      ? last30Days.reduce((sum, l) => sum + (l.hours || 0), 0) / 30 
      : 0;
    
    return { totalHours, totalOT, pendingApproval, avgDailyHours };
  }, [laborHours]);
  
  const { totalHours, totalOT, pendingApproval, avgDailyHours } = laborMetrics;

  return (
    <div>
      <PageHeader
        title="Labor Management"
        subtitle="Track hours and labor costs"
        actions={
          <div className="flex gap-2">
            <ExportButton
              data={laborHours}
              columns={[
                { key: 'work_date', label: 'Date' },
                { key: 'crew_employee', label: 'Worker' },
                { key: 'project_id', label: 'Project', formatter: (row) => projects.find(p => p.id === row.project_id)?.name || '-' },
                { key: 'hours', label: 'Hours' },
                { key: 'overtime_hours', label: 'OT Hours' },
                { key: 'cost_code_id', label: 'Cost Code', formatter: (row) => costCodes.find(c => c.id === row.cost_code_id)?.code || '-' },
                { key: 'description', label: 'Description' },
                { key: 'approved', label: 'Approved', formatter: (row) => row.approved ? 'Yes' : 'No' }
              ]}
              filename="labor_hours"
            />
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Plus size={18} className="mr-2" />
              Log Hours
            </Button>
          </div>
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
                  {Array.from(new Set(laborHours.map(l => l.crew_employee).filter(Boolean))).map(workerEmail => {
                    const workerHours = laborHours.filter(l => l.crew_employee === workerEmail);
                    const totalWorkerHours = workerHours.reduce((sum, l) => sum + (l.hours || 0), 0);
                    const workerName = workerEmail.split('@')[0];
                    return (
                      <div key={workerEmail} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded">
                        <span className="text-sm text-zinc-300">{workerName}</span>
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
      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) {
          setEditingEntry(null);
          setBulkMode(false);
          setFormData({
            project_id: '',
            work_package_id: '',
            cost_code_id: '',
            crew_employee: '',
            work_date: format(new Date(), 'yyyy-MM-dd'),
            hours: '',
            overtime_hours: '',
            description: '',
            approved: false,
          });
          setBulkEntries([{ crew_employee: '', hours: '', overtime_hours: '', description: '' }]);
        }
      }}>
        <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {editingEntry ? 'Edit Hours' : 'Log Hours'}
              {!editingEntry && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkMode(!bulkMode)}
                  className="border-zinc-700"
                >
                  {bulkMode ? 'Single Entry' : 'Bulk Entry'}
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {bulkMode ? (
              <>
                <div className="grid grid-cols-3 gap-4">
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
                  <div className="space-y-2">
                    <Label>Cost Code *</Label>
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
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Workers</Label>
                    <Button type="button" size="sm" onClick={addBulkEntry} className="bg-amber-500 hover:bg-amber-600 text-black">
                      <Plus size={14} className="mr-1" />
                      Add Worker
                    </Button>
                  </div>
                  <div className="border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="bg-zinc-800/50 grid grid-cols-12 gap-2 p-2 text-xs font-medium text-zinc-400">
                      <div className="col-span-4">Worker Email</div>
                      <div className="col-span-2">Hours</div>
                      <div className="col-span-2">OT</div>
                      <div className="col-span-3">Notes</div>
                      <div className="col-span-1"></div>
                    </div>
                    <div className="divide-y divide-zinc-800">
                      {bulkEntries.map((entry, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 p-2 items-center">
                          <div className="col-span-4">
                            <Input
                              type="email"
                              value={entry.crew_employee}
                              onChange={(e) => updateBulkEntry(idx, 'crew_employee', e.target.value)}
                              className="bg-zinc-800 border-zinc-700 h-8"
                              placeholder="worker@example.com"
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              step="0.5"
                              value={entry.hours}
                              onChange={(e) => updateBulkEntry(idx, 'hours', e.target.value)}
                              className="bg-zinc-800 border-zinc-700 h-8"
                              placeholder="0"
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              step="0.5"
                              value={entry.overtime_hours}
                              onChange={(e) => updateBulkEntry(idx, 'overtime_hours', e.target.value)}
                              className="bg-zinc-800 border-zinc-700 h-8"
                              placeholder="0"
                            />
                          </div>
                          <div className="col-span-3">
                            <Input
                              value={entry.description}
                              onChange={(e) => updateBulkEntry(idx, 'description', e.target.value)}
                              className="bg-zinc-800 border-zinc-700 h-8"
                              placeholder="Notes"
                            />
                          </div>
                          <div className="col-span-1">
                            {bulkEntries.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeBulkEntry(idx)}
                                className="h-8 w-8 text-red-400 hover:text-red-300"
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Worker Email *</Label>
                    <Input
                      type="email"
                      value={formData.crew_employee}
                      onChange={(e) => setFormData({ ...formData, crew_employee: e.target.value })}
                      placeholder="worker@example.com"
                      required
                      className="bg-zinc-800 border-zinc-700"
                    />
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
                  <Label>Work Package</Label>
                  <Input
                    value={formData.work_package_id}
                    onChange={(e) => setFormData({ ...formData, work_package_id: e.target.value })}
                    className="bg-zinc-800 border-zinc-700"
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cost Code *</Label>
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
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending || bulkCreateMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {(createMutation.isPending || updateMutation.isPending || bulkCreateMutation.isPending) 
                  ? 'Saving...' 
                  : editingEntry 
                    ? 'Update Hours' 
                    : bulkMode 
                      ? `Log ${bulkEntries.filter(e => e.resource_id && e.hours).length} Entries`
                      : 'Log Hours'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Labor Entry</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will permanently delete this labor entry. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}