import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import MetricsBar from '@/components/layout/MetricsBar';
import FilterBar from '@/components/layout/FilterBar';
import ContentSection from '@/components/layout/ContentSection';
import SectionCard from '@/components/layout/SectionCard';
import DataTable from '@/components/ui/DataTable';
import { validateTextLength, validateForm } from '@/components/shared/validation';
import { Plus, Search, Trash2 } from 'lucide-react';

const initialFormState = {
  code: '',
  name: '',
  category: 'labor',
  unit: '',
  is_active: true,
};

const categoryColors = {
  labor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  material: "bg-green-500/20 text-green-400 border-green-500/30",
  equipment: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  subcontract: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  other: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

export default function CostCodes() {
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteCode, setDeleteCode] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const queryClient = useQueryClient();

  const { data: costCodes = [], isLoading } = useQuery({
    queryKey: ['costCodes'],
    queryFn: () => apiClient.entities.CostCode.list('code'),
    staleTime: 10 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => apiClient.entities.CostCode.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costCodes'] });
      setShowForm(false);
      setFormData(initialFormState);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.CostCode.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costCodes'] });
      setShowForm(false);
      setEditingCode(null);
      setFormData(initialFormState);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.entities.CostCode.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costCodes'] });
      setDeleteCode(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate
    const validation = validateForm({
      code: validateTextLength(formData.code, 'name'),
      name: validateTextLength(formData.name, 'name'),
      unit: validateTextLength(formData.unit, 'name')
    });
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }
    
    setValidationErrors({});
    
    if (editingCode) {
      updateMutation.mutate({ id: editingCode.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (code) => {
    setFormData(code);
    setEditingCode(code);
    setShowForm(true);
  };

  const filteredCodes = useMemo(() => 
    costCodes.filter(c => {
      const matchesSearch = 
        c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
      return matchesSearch && matchesCategory;
    }),
    [costCodes, searchTerm, categoryFilter]
  );

  const columns = [
    {
      header: 'Code',
      accessor: 'code',
      render: (row) => (
        <span className="font-mono text-amber-500 font-medium">{row.code}</span>
      ),
    },
    {
      header: 'Name',
      accessor: 'name',
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (row) => (
        <Badge variant="outline" className={`${categoryColors[row.category]} border font-medium`}>
          {row.category?.replace('_', ' ').toUpperCase()}
        </Badge>
      ),
    },
    {
      header: 'Unit',
      accessor: 'unit',
      render: (row) => row.unit || '-',
    },
    {
      header: 'Status',
      accessor: 'is_active',
      render: (row) => (
        <Badge variant="outline" className={row.is_active 
          ? "bg-green-500/20 text-green-400 border-green-500/30"
          : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
        }>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
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
            setDeleteCode(row);
          }}
          className="text-zinc-500 hover:text-red-500"
        >
          <Trash2 size={16} />
        </Button>
      ),
    },
  ];

  const categoryCounts = useMemo(() => ({
    labor: costCodes.filter(c => c.category === 'labor').length,
    material: costCodes.filter(c => c.category === 'material').length,
    equipment: costCodes.filter(c => c.category === 'equipment').length,
    subcontract: costCodes.filter(c => c.category === 'subcontract').length,
    other: costCodes.filter(c => c.category === 'other').length,
  }), [costCodes]);

  return (
    <PageShell>
      <PageHeader
        title="Cost Code Library"
        subtitle={`${filteredCodes.length} codes`}
        actions={
          <Button 
            onClick={() => {
              setFormData(initialFormState);
              setEditingCode(null);
              setShowForm(true);
            }}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
          >
            <Plus size={16} className="mr-2" />
            New Code
          </Button>
        }
      />

      <MetricsBar
        metrics={[
          { label: 'Labor', value: categoryCounts.labor, color: 'text-blue-400' },
          { label: 'Material', value: categoryCounts.material, color: 'text-green-400' },
          { label: 'Equipment', value: categoryCounts.equipment, color: 'text-purple-400' },
          { label: 'Subcontract', value: categoryCounts.subcontract, color: 'text-orange-400' },
          { label: 'Other', value: categoryCounts.other, color: 'text-zinc-400' }
        ]}
      />

      <FilterBar>
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800 text-white"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48 bg-zinc-900 border-zinc-800 text-white">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="labor">Labor</SelectItem>
            <SelectItem value="material">Material</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
            <SelectItem value="subcontract">Subcontract</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <ContentSection>
        <SectionCard>
          <DataTable
            columns={columns}
            data={filteredCodes}
            onRowClick={handleEdit}
            emptyMessage="No cost codes found. Create your first cost code to get started."
          />
        </SectionCard>
      </ContentSection>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>{editingCode ? 'Edit Cost Code' : 'New Cost Code'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., 05100"
                maxLength={50}
                required
                className="bg-zinc-800 border-zinc-700 font-mono"
              />
              {validationErrors.code && (
                <p className="text-xs text-red-400 mt-1">{validationErrors.code}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Cost code description"
                maxLength={100}
                required
                className="bg-zinc-800 border-zinc-700"
              />
              {validationErrors.name && (
                <p className="text-xs text-red-400 mt-1">{validationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="labor">Labor</SelectItem>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="subcontract">Subcontract</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit of Measure</Label>
              <Input
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g., LF, EA, TON, HR"
                maxLength={20}
                className="bg-zinc-800 border-zinc-700"
              />
              {validationErrors.unit && (
                <p className="text-xs text-red-400 mt-1">{validationErrors.unit}</p>
              )}
            </div>
            <div className="flex items-center justify-between py-2">
              <Label>Active</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCode} onOpenChange={() => setDeleteCode(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Cost Code?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete cost code "{deleteCode?.code} - {deleteCode?.name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-white hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteCode.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}