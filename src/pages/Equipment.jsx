import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Truck, Plus, Wrench, Calendar, MoreVertical, Trash2, Pencil } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function EquipmentPage() {
  const queryClient = useQueryClient();
  const [showEquipmentForm, setShowEquipmentForm] = useState(false);
  const [showUsageForm, setShowUsageForm] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => base44.entities.Equipment.list('description')
  });

  const { data: equipmentUsage = [] } = useQuery({
    queryKey: ['equipment-usage'],
    queryFn: () => base44.entities.EquipmentUsage.list('-usage_date')
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list()
  });

  const { data: workPackages = [] } = useQuery({
    queryKey: ['work-packages'],
    queryFn: () => base44.entities.WorkPackage.list()
  });

  const { data: costCodes = [] } = useQuery({
    queryKey: ['cost-codes'],
    queryFn: () => base44.entities.CostCode.list()
  });

  const createEquipmentMutation = useMutation({
    mutationFn: (data) => base44.entities.Equipment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Equipment created');
      setShowEquipmentForm(false);
      setEditingEquipment(null);
    }
  });

  const updateEquipmentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Equipment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Updated');
      setShowEquipmentForm(false);
      setEditingEquipment(null);
    }
  });

  const createUsageMutation = useMutation({
    mutationFn: (data) => base44.entities.EquipmentUsage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-usage'] });
      toast.success('Usage logged');
      setShowUsageForm(false);
    }
  });

  const equipmentColumns = [
    {
      header: 'Asset Tag',
      accessor: 'asset_tag',
      render: (row) => <span className="font-mono text-amber-500">{row.asset_tag}</span>
    },
    {
      header: 'Equipment',
      accessor: 'description',
      render: (row) => (
        <div>
          <div className="font-medium">{row.description}</div>
          <div className="text-xs text-zinc-500">{row.make_model}</div>
        </div>
      )
    },
    {
      header: 'Type',
      render: (row) => <Badge className="text-xs">{row.equipment_type?.replace('_', ' ')}</Badge>
    },
    {
      header: 'Ownership',
      accessor: 'ownership'
    },
    {
      header: 'Daily Rate',
      render: (row) => <span className="font-mono">${row.daily_rate?.toLocaleString() || 0}</span>
    },
    {
      header: 'Status',
      render: (row) => row.active ? <StatusBadge status="active" /> : <StatusBadge status="inactive" />
    },
    {
      header: '',
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700">
            <DropdownMenuItem onClick={() => { setEditingEquipment(row); setShowEquipmentForm(true); }} className="text-white hover:text-white">
              <Pencil size={14} className="mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSelectedEquipment(row); setShowUsageForm(true); }} className="text-white hover:text-white">
              <Plus size={14} className="mr-2" />
              Log Usage
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  const kpis = useMemo(() => {
    const active = equipment.filter(e => e.active).length;
    const inUse = equipment.filter(e => e.assigned_project_id).length;
    const totalUsageThisMonth = equipmentUsage.filter(u => {
      const usageDate = new Date(u.usage_date);
      const now = new Date();
      return usageDate.getMonth() === now.getMonth() && usageDate.getFullYear() === now.getFullYear();
    }).length;
    
    return { active, inUse, totalUsageThisMonth };
  }, [equipment, equipmentUsage]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Equipment Management"
        subtitle="Fleet Assets & Usage Tracking"
        actions={
          <Button onClick={() => setShowEquipmentForm(true)} className="bg-amber-500 hover:bg-amber-600 text-black">
            <Plus size={16} className="mr-2" />
            Add Equipment
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{kpis.active}</div>
            <div className="text-xs text-zinc-500">Active Assets</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-500">{kpis.inUse}</div>
            <div className="text-xs text-zinc-500">Currently Assigned</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-500">{kpis.totalUsageThisMonth}</div>
            <div className="text-xs text-zinc-500">Usage Logs (This Month)</div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={equipmentColumns}
        data={equipment}
        emptyMessage="No equipment found. Add assets to track usage and costs."
      />

      <EquipmentForm
        open={showEquipmentForm}
        equipment={editingEquipment}
        onClose={() => { setShowEquipmentForm(false); setEditingEquipment(null); }}
        onSubmit={(data) => {
          if (editingEquipment) {
            updateEquipmentMutation.mutate({ id: editingEquipment.id, data });
          } else {
            createEquipmentMutation.mutate(data);
          }
        }}
      />

      <UsageForm
        open={showUsageForm}
        equipment={selectedEquipment}
        projects={projects}
        workPackages={workPackages}
        costCodes={costCodes}
        onClose={() => { setShowUsageForm(false); setSelectedEquipment(null); }}
        onSubmit={(data) => createUsageMutation.mutate(data)}
      />
    </div>
  );
}

function EquipmentForm({ open, equipment, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    asset_tag: equipment?.asset_tag || '',
    description: equipment?.description || '',
    equipment_type: equipment?.equipment_type || 'other',
    ownership: equipment?.ownership || 'owned',
    daily_rate: equipment?.daily_rate || 0,
    hourly_rate: equipment?.hourly_rate || 0,
    active: equipment?.active ?? true,
    make_model: equipment?.make_model || '',
    notes: equipment?.notes || ''
  });

  React.useEffect(() => {
    if (equipment) {
      setFormData({
        asset_tag: equipment.asset_tag || '',
        description: equipment.description || '',
        equipment_type: equipment.equipment_type || 'other',
        ownership: equipment.ownership || 'owned',
        daily_rate: equipment.daily_rate || 0,
        hourly_rate: equipment.hourly_rate || 0,
        active: equipment.active ?? true,
        make_model: equipment.make_model || '',
        notes: equipment.notes || ''
      });
    }
  }, [equipment]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>{equipment ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Asset Tag *</Label>
              <Input
                value={formData.asset_tag}
                onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formData.equipment_type} onValueChange={(v) => setFormData({ ...formData, equipment_type: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crane">Crane</SelectItem>
                  <SelectItem value="forklift">Forklift</SelectItem>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="welding_machine">Welding Machine</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-zinc-800 border-zinc-700"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Ownership</Label>
              <Select value={formData.ownership} onValueChange={(v) => setFormData({ ...formData, ownership: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owned">Owned</SelectItem>
                  <SelectItem value="leased">Leased</SelectItem>
                  <SelectItem value="rented">Rented</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Daily Rate</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.daily_rate}
                onChange={(e) => setFormData({ ...formData, daily_rate: parseFloat(e.target.value) || 0 })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Hourly Rate</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={() => onSubmit(formData)}
              disabled={!formData.asset_tag || !formData.description}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {equipment ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UsageForm({ open, equipment, projects, workPackages, costCodes, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    equipment_id: equipment?.id || '',
    project_id: '',
    work_package_id: '',
    cost_code_id: '',
    usage_date: format(new Date(), 'yyyy-MM-dd'),
    hours: '',
    days: '',
    operator: '',
    description: ''
  });

  React.useEffect(() => {
    if (equipment) {
      setFormData(prev => ({ ...prev, equipment_id: equipment.id }));
    }
  }, [equipment]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Log Equipment Usage</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {equipment && (
            <div className="p-3 bg-zinc-800 rounded">
              <div className="font-medium">{equipment.description}</div>
              <div className="text-xs text-zinc-500">{equipment.asset_tag}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
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
              <Label>Work Package *</Label>
              <Select value={formData.work_package_id} onValueChange={(v) => setFormData({ ...formData, work_package_id: v })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {workPackages.filter(wp => wp.project_id === formData.project_id).map(wp => (
                    <SelectItem key={wp.id} value={wp.id}>{wp.wpid} - {wp.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.usage_date}
                onChange={(e) => setFormData({ ...formData, usage_date: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Hours</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Days</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.days}
                onChange={(e) => setFormData({ ...formData, days: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={() => {
                const submitData = {
                  ...formData,
                  hours: formData.hours ? parseFloat(formData.hours) : null,
                  days: formData.days ? parseFloat(formData.days) : null
                };
                onSubmit(submitData);
              }}
              disabled={!formData.project_id || !formData.work_package_id || !formData.usage_date}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Log Usage
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}