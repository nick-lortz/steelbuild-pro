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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Users, Truck, Hammer, Trash2, Calendar, BarChart3, FileSpreadsheet } from 'lucide-react';
import CSVUpload from '@/components/shared/CSVUpload';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Badge } from "@/components/ui/badge";
import ResourceAllocation from '@/components/resources/ResourceAllocation';
import ResourceUtilization from '@/components/resources/ResourceUtilization';
import ResourceForecast from '@/components/resources/ResourceForecast';
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

const initialFormState = {
  type: 'labor',
  name: '',
  classification: '',
  rate: '',
  rate_type: 'hourly',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  status: 'available',
  current_project_id: '',
  notes: '',
};

const typeIcons = {
  labor: Users,
  equipment: Truck,
  subcontractor: Hammer,
};

const typeColors = {
  labor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  equipment: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  subcontractor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

export default function Resources() {
  const [showForm, setShowForm] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [deleteResource, setDeleteResource] = useState(null);
  const [showCSVImport, setShowCSVImport] = useState(false);

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('name'),
    staleTime: 10 * 60 * 1000,
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => base44.entities.Resource.list('name'),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Resource.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setShowForm(false);
      setFormData(initialFormState);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Resource.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setSelectedResource(null);
      setFormData(initialFormState);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Resource.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setDeleteResource(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      rate: parseFloat(formData.rate) || 0,
    };

    if (selectedResource) {
      updateMutation.mutate({ id: selectedResource.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (resource) => {
    setFormData({
      type: resource.type || 'labor',
      name: resource.name || '',
      classification: resource.classification || '',
      rate: resource.rate?.toString() || '',
      rate_type: resource.rate_type || 'hourly',
      contact_name: resource.contact_name || '',
      contact_phone: resource.contact_phone || '',
      contact_email: resource.contact_email || '',
      status: resource.status || 'available',
      current_project_id: resource.current_project_id || '',
      notes: resource.notes || '',
    });
    setSelectedResource(resource);
  };

  const filteredResources = React.useMemo(() => 
    resources.filter(r => {
      const matchesSearch = 
        r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.classification?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || r.type === typeFilter;
      return matchesSearch && matchesType;
    }),
    [resources, searchTerm, typeFilter]
  );

  const { laborCount, equipmentCount, subCount } = React.useMemo(() => ({
    laborCount: resources.filter(r => r.type === 'labor').length,
    equipmentCount: resources.filter(r => r.type === 'equipment').length,
    subCount: resources.filter(r => r.type === 'subcontractor').length,
  }), [resources]);

  const columns = [
    {
      header: 'Type',
      accessor: 'type',
      render: (row) => {
        const Icon = typeIcons[row.type] || Users;
        return (
          <Badge variant="outline" className={`${typeColors[row.type]} border flex items-center gap-1 w-fit`}>
            <Icon size={12} />
            {row.type?.replace('_', ' ').toUpperCase()}
          </Badge>
        );
      },
    },
    {
      header: 'Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-zinc-500">{row.classification}</p>
        </div>
      ),
    },
    {
      header: 'Rate',
      accessor: 'rate',
      render: (row) => row.rate 
        ? `$${row.rate.toLocaleString()}/${row.rate_type?.replace('_', ' ') || 'hr'}` 
        : '-',
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Current Project',
      accessor: 'current_project_id',
      render: (row) => {
        if (!row.current_project_id) return '-';
        const project = projects.find(p => p.id === row.current_project_id);
        return project?.name || '-';
      },
    },
    {
      header: 'Contact',
      accessor: 'contact_name',
      render: (row) => row.contact_name || row.contact_phone || '-',
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteResource(row);
          }}
          className="text-zinc-500 hover:text-red-500"
        >
          <Trash2 size={16} />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Resources"
        subtitle="Labor, equipment, and subcontractors"
        actions={
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowCSVImport(true)}
              variant="outline"
              className="border-zinc-700"
            >
              <FileSpreadsheet size={18} className="mr-2" />
              Import CSV
            </Button>
            <Button 
              onClick={() => {
                setFormData(initialFormState);
                setShowForm(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              <Plus size={18} className="mr-2" />
              Add Resource
            </Button>
          </div>
        }
      />

      {/* Main Tabs */}
      <Tabs defaultValue="directory" className="mb-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="allocation">
            <Calendar size={14} className="mr-2" />
            Allocation
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 size={14} className="mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-6">
          {/* Type Tabs */}
          <Tabs value={typeFilter} onValueChange={setTypeFilter}>
            <TabsList className="bg-zinc-900 border border-zinc-800">
              <TabsTrigger value="all" className="data-[state=active]:bg-zinc-800">
                All ({resources.length})
              </TabsTrigger>
              <TabsTrigger value="labor" className="data-[state=active]:bg-zinc-800">
                <Users size={14} className="mr-1" />
                Labor ({laborCount})
              </TabsTrigger>
              <TabsTrigger value="equipment" className="data-[state=active]:bg-zinc-800">
                <Truck size={14} className="mr-1" />
                Equipment ({equipmentCount})
              </TabsTrigger>
              <TabsTrigger value="subcontractor" className="data-[state=active]:bg-zinc-800">
                <Hammer size={14} className="mr-1" />
                Subcontractors ({subCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800 text-white"
          />
        </div>
      </div>

          {/* Table */}
          <DataTable
            columns={columns}
            data={filteredResources}
            onRowClick={handleEdit}
            emptyMessage="No resources found. Add your first resource to get started."
          />
        </TabsContent>

        <TabsContent value="allocation">
          <ResourceAllocation />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <ResourceForecast />
          <ResourceUtilization />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Resource</DialogTitle>
          </DialogHeader>
          <ResourceForm
            formData={formData}
            setFormData={setFormData}
            projects={projects}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Sheet */}
      <Sheet open={!!selectedResource} onOpenChange={(open) => !open && setSelectedResource(null)}>
        <SheetContent className="w-full sm:max-w-xl bg-zinc-900 border-zinc-800 text-white overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Edit Resource</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <ResourceForm
              formData={formData}
              setFormData={setFormData}
              projects={projects}
              onSubmit={handleSubmit}
              isLoading={updateMutation.isPending}
              isEdit
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteResource} onOpenChange={() => setDeleteResource(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Resource?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete "{deleteResource?.name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteResource.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>

        {/* CSV Import */}
        <CSVUpload
        entityName="Resource"
        templateFields={[
          { label: 'Type', key: 'type', example: 'labor' },
          { label: 'Name', key: 'name', example: 'John Smith' },
          { label: 'Classification', key: 'classification', example: 'Ironworker' },
          { label: 'Rate', key: 'rate', example: '45' },
          { label: 'Rate Type', key: 'rate_type', example: 'hourly' },
          { label: 'Contact Phone', key: 'contact_phone', example: '555-1234' },
        ]}
        transformRow={(row) => ({
          type: row.type || 'labor',
          name: row.name || '',
          classification: row.classification || '',
          rate: parseFloat(row.rate) || 0,
          rate_type: row.rate_type || 'hourly',
          contact_phone: row.contact_phone || '',
          status: 'available',
        })}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['resources'] });
        }}
        open={showCSVImport}
        onOpenChange={setShowCSVImport}
        />
        </div>
        );
        }

function ResourceForm({ formData, setFormData, projects, onSubmit, isLoading, isEdit }) {
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Resource Type *</Label>
        <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="labor">Labor</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
            <SelectItem value="subcontractor">Subcontractor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Name *</Label>
        <Input
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder={formData.type === 'labor' ? "John Smith" : formData.type === 'equipment' ? "50-Ton Crane" : "ABC Steel Erectors"}
          required
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="space-y-2">
        <Label>Classification</Label>
        <Input
          value={formData.classification}
          onChange={(e) => handleChange('classification', e.target.value)}
          placeholder={formData.type === 'labor' ? "Ironworker, Welder, Foreman" : formData.type === 'equipment' ? "Crane, Forklift, Welder" : "Erection, Fabrication"}
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Rate</Label>
          <Input
            type="number"
            value={formData.rate}
            onChange={(e) => handleChange('rate', e.target.value)}
            placeholder="0.00"
            className="bg-zinc-800 border-zinc-700"
          />
        </div>
        <div className="space-y-2">
          <Label>Rate Type</Label>
          <Select value={formData.rate_type} onValueChange={(v) => handleChange('rate_type', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="lump_sum">Lump Sum</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="unavailable">Unavailable</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Current Project</Label>
          <Select 
            value={formData.current_project_id} 
            onValueChange={(v) => handleChange('current_project_id', v)}
          >
            <SelectTrigger className="bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>None</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-4">
        <h4 className="text-sm font-medium text-zinc-400 mb-3">Contact Information</h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Contact Name</Label>
            <Input
              value={formData.contact_name}
              onChange={(e) => handleChange('contact_name', e.target.value)}
              className="bg-zinc-800 border-zinc-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => handleChange('contact_phone', e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleChange('contact_email', e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={2}
          className="bg-zinc-800 border-zinc-700"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          {isLoading ? 'Saving...' : isEdit ? 'Update' : 'Add Resource'}
        </Button>
      </div>
    </form>
  );
}