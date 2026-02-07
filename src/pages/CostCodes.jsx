import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Trash2 } from 'lucide-react';
import DataTable from '@/components/ui/DataTable';
import { Badge } from "@/components/ui/badge";
import { validateTextLength, validateForm } from '@/components/shared/validation';
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
import { cn } from '@/lib/utils';

const initialFormState = {
  code: '',
  name: '',
  category: 'labor',
  unit: '',
  is_active: true,
};

const categoryColors = {
  labor: "bg-blue-500/15 text-blue-600 border-blue-500/25",
  material: "bg-green-500/15 text-green-600 border-green-500/25",
  equipment: "bg-purple-500/15 text-purple-600 border-purple-500/25",
  subcontract: "bg-orange-500/15 text-orange-600 border-orange-500/25",
  other: "bg-muted text-muted-foreground border-border",
};

function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b border-border">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {subtitle ? <p className="text-xs text-muted-foreground mt-1">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function KPI({ label, value, tone }) {
  const toneClasses =
    tone === 'labor' ? "text-blue-600" :
    tone === 'material' ? "text-green-600" :
    tone === 'equipment' ? "text-purple-600" :
    tone === 'subcontract' ? "text-orange-600" :
    "text-muted-foreground";

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">
          {label}
        </div>
        <div className={cn("text-2xl font-bold", toneClasses)}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

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
    queryFn: () => base44.entities.CostCode.list('code'),
    staleTime: 10 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CostCode.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costCodes'] });
      setShowForm(false);
      setFormData(initialFormState);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CostCode.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costCodes'] });
      setShowForm(false);
      setEditingCode(null);
      setFormData(initialFormState);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CostCode.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costCodes'] });
      setDeleteCode(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const validation = validateForm({
      code: validateTextLength(formData.code, 'code'),
      name: validateTextLength(formData.name, 'name'),
      unit: validateTextLength(formData.unit, 'unit')
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

  const categoryCounts = useMemo(() => ({
    labor: costCodes.filter(c => c.category === 'labor').length,
    material: costCodes.filter(c => c.category === 'material').length,
    equipment: costCodes.filter(c => c.category === 'equipment').length,
    subcontract: costCodes.filter(c => c.category === 'subcontract').length,
    other: costCodes.filter(c => c.category === 'other').length,
  }), [costCodes]);

  const columns = [
    {
      header: 'Code',
      accessor: 'code',
      render: (row) => (
        <span className="font-mono font-semibold text-amber-600">{row.code}</span>
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
        <Badge variant="outline" className={cn("border font-medium", categoryColors[row.category] || categoryColors.other)}>
          {row.category?.replace('_', ' ').charAt(0).toUpperCase() + row.category?.replace('_', ' ').slice(1)}
        </Badge>
      ),
    },
    {
      header: 'Unit',
      accessor: 'unit',
      render: (row) => row.unit || '—',
    },
    {
      header: 'Status',
      accessor: 'is_active',
      render: (row) => (
        <Badge
          variant="outline"
          className={cn(
            "border",
            row.is_active
              ? "bg-green-500/15 text-green-600 border-green-500/25"
              : "bg-muted text-muted-foreground border-border"
          )}
        >
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
          className="text-muted-foreground hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cost Code Library</h1>
          <p className="text-muted-foreground mt-2">
            {filteredCodes.length} codes • {costCodes.length} total
          </p>
        </div>

        <Button
          onClick={() => {
            setFormData(initialFormState);
            setEditingCode(null);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Cost Code
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Labor" value={categoryCounts.labor} tone="labor" />
        <KPI label="Material" value={categoryCounts.material} tone="material" />
        <KPI label="Equipment" value={categoryCounts.equipment} tone="equipment" />
        <KPI label="Subcontract" value={categoryCounts.subcontract} tone="subcontract" />
        <KPI label="Other" value={categoryCounts.other} tone="other" />
      </div>

      {/* Search + Filter */}
      <Card>
        <SectionHeader
          title="Search & Filter"
          subtitle="Search by code or name. Filter by category."
        />
        <CardContent className="pt-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search codes…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="labor">Labor</SelectItem>
                <SelectItem value="material">Material</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="subcontract">Subcontract</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <SectionHeader
          title="Cost Codes"
          subtitle={isLoading ? "Loading…" : "Click a row to edit."}
          right={
            <Badge variant="outline">
              {filteredCodes.length} showing
            </Badge>
          }
        />
        <CardContent className="pt-4">
          <DataTable
            columns={columns}
            data={filteredCodes}
            onRowClick={handleEdit}
            emptyMessage="No cost codes found. Create your first cost code to get started."
          />
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) {
            setEditingCode(null);
            setFormData(initialFormState);
            setValidationErrors({});
          }
        }}
      >
        <DialogContent className="max-w-md">
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
                className="font-mono"
              />
              {validationErrors.code && (
                <p className="text-xs text-red-600">{validationErrors.code}</p>
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
              />
              {validationErrors.name && (
                <p className="text-xs text-red-600">{validationErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
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
              />
              {validationErrors.unit && (
                <p className="text-xs text-red-600">{validationErrors.unit}</p>
              )}
            </div>

            <div className="flex items-center justify-between py-2">
              <Label>Active</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCode} onOpenChange={() => setDeleteCode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cost Code?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deleteCode?.code} — {deleteCode?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteCode.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}